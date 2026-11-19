create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

alter function public.claim_family(text, text, text, text, text, text, text)
  set schema private;
alter function public.create_pairing_request(text, text, text, text, text)
  set schema private;
alter function public.approve_pairing_request(text) set schema private;
alter function public.reject_pairing_request(text) set schema private;
alter function public.activate_paired_device(text, text, text) set schema private;
alter function public.cancel_pairing_request(text) set schema private;
alter function public.update_family_details(text, text, text) set schema private;
alter function public.upsert_family_policy(text, text, jsonb) set schema private;
alter function public.revoke_paired_device(text) set schema private;
alter function public.issue_member_lock_command(text, text, timestamptz) set schema private;
alter function public.cancel_device_command(text) set schema private;
alter function public.receive_pending_commands() set schema private;
alter function public.complete_device_command(text, text, text) set schema private;
alter function public.report_device_sync(text, text) set schema private;

do $$
declare
  v_function record;
begin
  for v_function in
    select p.oid::regprocedure as signature
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'private'
  loop
    execute format(
      'revoke all on function %s from public, anon, authenticated',
      v_function.signature
    );
  end loop;
end;
$$;

create or replace function public.require_device_session(
  p_expected_device_id text default null,
  p_allow_unregistered boolean default false,
  p_allow_pending boolean default false,
  p_allow_paired boolean default true
)
returns text
language plpgsql volatile security definer
set search_path = public, pg_temp
as $$
declare
  v_session public.device_auth_sessions%rowtype;
  v_device public.family_devices%rowtype;
begin
  if auth.uid() is null then raise exception 'authentication required'; end;

  select s.* into v_session
  from public.device_auth_sessions s
  where s.auth_user_id = auth.uid()
    and s.authenticated_until > now()
    and (p_expected_device_id is null or s.device_id = p_expected_device_id);
  if v_session.auth_user_id is null then
    raise exception 'device authentication required';
  end if;

  select d.* into v_device
  from public.family_devices d
  where d.id = v_session.device_id
  for update;

  if found then
    if v_device.status = 'revoked' or v_device.revoked_at is not null then
      raise exception 'device authentication required';
    end if;
    if v_device.public_key <> v_session.public_key then
      raise exception 'device authentication required';
    end if;
    if v_device.auth_user_id is not null and v_device.auth_user_id <> auth.uid() then
      raise exception 'device authentication required';
    end if;
    if v_device.status = 'paired' then
      if not p_allow_paired or v_device.auth_user_id <> auth.uid() then
        raise exception 'device authentication required';
      end if;
    elsif v_device.status = 'pending' then
      if not p_allow_pending
         or v_device.role <> 'secondary'
         or v_device.auth_user_id is not null
      then raise exception 'device authentication required'; end if;
    else
      raise exception 'device authentication required';
    end if;
  elsif not p_allow_unregistered then
    raise exception 'device authentication required';
  end if;

  if exists (
    select 1
    from public.family_devices d
    where d.auth_user_id = auth.uid()
      and d.id <> v_session.device_id
  ) then raise exception 'device authentication required'; end if;

  return v_session.device_id;
end;
$$;

create or replace function public.require_active_family_device(
  p_family_id text,
  p_owner_only boolean default false
)
returns text
language plpgsql volatile security definer
set search_path = public, pg_temp
as $$
declare
  v_device_id text;
begin
  v_device_id := public.require_device_session(null, false, false, true);
  if not exists (
    select 1
    from public.family_devices d
    join public.families f on f.id = d.family_id
    where d.id = v_device_id
      and d.family_id = p_family_id
      and d.status = 'paired'
      and d.revoked_at is null
      and d.auth_user_id = auth.uid()
      and (not p_owner_only or (d.role = 'owner' and f.owner_device_id = d.id))
  ) then raise exception 'device is not authorized for this family'; end if;
  return v_device_id;
end;
$$;

create or replace function public.has_active_family_access(
  p_family_id text,
  p_owner_only boolean default false
)
returns boolean
language sql stable security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.device_auth_sessions s
    join public.family_devices d on d.id = s.device_id
    join public.families f on f.id = d.family_id
    where s.auth_user_id = auth.uid()
      and s.authenticated_until > now()
      and s.public_key = d.public_key
      and d.auth_user_id = auth.uid()
      and d.family_id = p_family_id
      and d.status = 'paired'
      and d.revoked_at is null
      and (not p_owner_only or (d.role = 'owner' and f.owner_device_id = d.id))
  );
$$;

create or replace function public.can_read_family_device(
  p_device_id text,
  p_family_id text
)
returns boolean
language sql stable security definer
set search_path = public, pg_temp
as $$
  select public.has_active_family_access(p_family_id, true)
    or exists (
      select 1
      from public.device_auth_sessions s
      join public.family_devices current_device on current_device.id = s.device_id
      where s.auth_user_id = auth.uid()
        and s.authenticated_until > now()
        and s.public_key = current_device.public_key
        and current_device.id = p_device_id
        and current_device.family_id = p_family_id
        and current_device.auth_user_id = auth.uid()
        and current_device.status = 'paired'
        and current_device.revoked_at is null
    );
$$;

create or replace function public.can_read_pairing_request(
  p_family_id text,
  p_requesting_device_id text
)
returns boolean
language sql stable security definer
set search_path = public, pg_temp
as $$
  select public.has_active_family_access(p_family_id, true)
    or exists (
      select 1
      from public.device_auth_sessions s
      where s.auth_user_id = auth.uid()
        and s.device_id = p_requesting_device_id
        and s.authenticated_until > now()
        and not exists (
          select 1
          from public.family_devices d
          where d.id = p_requesting_device_id
            and (
              d.family_id is distinct from p_family_id
              or d.public_key <> s.public_key
              or (d.auth_user_id is not null and d.auth_user_id <> auth.uid())
              or d.status not in ('paired', 'pending')
            )
        )
        and not exists (
          select 1
          from public.family_devices d
          where d.id = p_requesting_device_id
            and (d.status = 'revoked' or d.revoked_at is not null)
        )
    );
$$;

create or replace function public.can_read_device_command(
  p_family_id text,
  p_target_device_id text
)
returns boolean
language sql stable security definer
set search_path = public, pg_temp
as $$
  select public.has_active_family_access(p_family_id, true)
    or exists (
      select 1
      from public.device_auth_sessions s
      join public.family_devices d on d.id = s.device_id
      where s.auth_user_id = auth.uid()
        and s.authenticated_until > now()
        and s.public_key = d.public_key
        and d.id = p_target_device_id
        and d.family_id = p_family_id
        and d.auth_user_id = auth.uid()
        and d.status = 'paired'
        and d.revoked_at is null
    );
$$;

create or replace function public.current_paired_device()
returns table(device_id text, family_id text, role text)
language sql stable security definer
set search_path = public, pg_temp
as $$
  select d.id, d.family_id, d.role
  from public.device_auth_sessions s
  join public.family_devices d on d.id = s.device_id
  where s.auth_user_id = auth.uid()
    and s.authenticated_until > now()
    and s.public_key = d.public_key
    and d.auth_user_id = auth.uid()
    and d.status = 'paired'
    and d.revoked_at is null
  limit 1;
$$;

create or replace function public.guard_device_auth_row()
returns trigger
language plpgsql security definer
set search_path = public, pg_temp
as $$
declare
  v_device public.family_devices%rowtype;
begin
  select d.* into v_device
  from public.family_devices d
  where d.id = new.device_id
  for update;

  if found then
    if v_device.status = 'revoked' or v_device.revoked_at is not null
       or v_device.public_key <> new.public_key
       or (v_device.auth_user_id is not null and v_device.auth_user_id <> new.auth_user_id)
       or (v_device.status = 'paired' and v_device.auth_user_id is distinct from new.auth_user_id)
       or (v_device.status = 'pending'
           and (v_device.role <> 'secondary' or v_device.auth_user_id is not null))
       or v_device.status not in ('paired', 'pending')
    then raise exception 'device authentication is revoked or mismatched'; end if;
  end if;

  if exists (
    select 1
    from public.family_devices d
    where d.auth_user_id = new.auth_user_id
      and d.id <> new.device_id
  ) then raise exception 'device authentication is bound to another device'; end if;
  return new;
end;
$$;

drop trigger if exists guard_device_auth_session on public.device_auth_sessions;
create trigger guard_device_auth_session
before insert or update on public.device_auth_sessions
for each row execute function public.guard_device_auth_row();

drop trigger if exists guard_device_auth_challenge on public.device_auth_challenges;
create trigger guard_device_auth_challenge
before insert or update on public.device_auth_challenges
for each row execute function public.guard_device_auth_row();

create or replace function public.guard_approved_device_not_revoked()
returns trigger
language plpgsql security definer
set search_path = public, pg_temp
as $$
begin
  if exists (
    select 1 from public.family_devices d
    where d.id = new.requesting_device_id
      and (d.status = 'revoked' or d.revoked_at is not null)
  ) then raise exception 'revoked devices cannot be paired again'; end if;
  return new;
end;
$$;

drop trigger if exists guard_pairing_request_device on public.device_pairing_requests;
create trigger guard_pairing_request_device
before insert or update of status, requesting_device_id
on public.device_pairing_requests
for each row
when (new.status in ('pending', 'approved'))
execute function public.guard_approved_device_not_revoked();

create or replace function private.revoke_paired_device(p_device_id text)
returns jsonb
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_device public.family_devices%rowtype;
  v_owner public.family_devices%rowtype;
begin
  select d.* into v_device
  from public.family_devices d
  where d.id = p_device_id
  for update;
  if v_device.id is null then raise exception 'device not found'; end;

  select d.* into v_owner
  from public.family_devices d
  join public.families f on f.owner_device_id = d.id
  where f.id = v_device.family_id
    and d.auth_user_id = auth.uid()
    and d.role = 'owner'
    and d.status = 'paired'
    and d.revoked_at is null;
  if v_owner.id is null then raise exception 'only the original owner may revoke devices'; end;
  if v_device.role = 'owner' then raise exception 'the original owner cannot be revoked'; end;

  update public.family_devices
  set status = 'revoked',
      revoked_at = coalesce(revoked_at, now()),
      updated_at = now()
  where id = p_device_id;

  delete from public.device_auth_challenges
  where device_id = p_device_id or auth_user_id = v_device.auth_user_id;
  delete from public.device_auth_sessions
  where device_id = p_device_id or auth_user_id = v_device.auth_user_id;
  delete from public.device_authorizations
  where device_id = p_device_id;

  update public.device_pairing_requests
  set status = 'cancelled',
      consumed_at = coalesce(consumed_at, now()),
      updated_at = now()
  where requesting_device_id = p_device_id
    and status in ('pending', 'approved');

  update public.device_commands
  set status = 'cancelled',
      completed_at = now(),
      updated_at = now()
  where target_device_id = p_device_id
    and status in ('pending', 'received');

  insert into public.security_audit_events(
    family_id, auth_user_id, device_id, event_type, subject_id
  ) values (
    v_device.family_id, auth.uid(), p_device_id, 'device_revoked', p_device_id
  );
  return jsonb_build_object('revoked', true);
end;
$$;

create or replace function private.approve_pairing_request(p_request_id text)
returns jsonb
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_request public.device_pairing_requests%rowtype;
  v_owner public.family_devices%rowtype;
begin
  if auth.uid() is null then raise exception 'authentication required'; end;

  select * into v_request
  from public.device_pairing_requests
  where id = p_request_id
  for update;
  if v_request.id is null then raise exception 'pairing request not found'; end;
  if v_request.status <> 'pending' then raise exception 'pairing request is not pending'; end;
  if v_request.expires_at <= now() then
    update public.device_pairing_requests
    set status = 'expired', updated_at = now()
    where id = p_request_id;
    raise exception 'pairing request expired';
  end if;

  select d.* into v_owner
  from public.family_devices d
  join public.families f on f.owner_device_id = d.id
  where f.id = v_request.family_id
    and d.auth_user_id = auth.uid()
    and d.role = 'owner'
    and d.status = 'paired'
    and d.revoked_at is null;
  if v_owner.id is null then raise exception 'only the original owner may approve pairing'; end;

  if exists (
    select 1 from public.family_devices
    where id = v_request.requesting_device_id
      and (role = 'owner' or status = 'paired' or revoked_at is not null)
  ) then raise exception 'requesting device is already registered or revoked'; end;

  insert into public.family_devices(
    id, family_id, auth_user_id, public_key, role, status, name, platform
  ) values (
    v_request.requesting_device_id, v_request.family_id, null::uuid,
    v_request.public_key, 'secondary', 'pending',
    v_request.device_name, v_request.platform
  );

  update public.device_pairing_requests
  set status = 'approved',
      approved_by_device_id = v_owner.id,
      consumed_at = now(),
      updated_at = now()
  where id = p_request_id;

  insert into public.security_audit_events(
    family_id, auth_user_id, device_id, event_type, subject_id
  ) values (
    v_request.family_id, auth.uid(), v_owner.id,
    'pairing_approved', v_request.requesting_device_id
  );

  return jsonb_build_object('approved', true, 'device_id', v_request.requesting_device_id);
end;
$$;

create or replace function public.claim_family(
  p_family_id text,
  p_family_name text,
  p_family_description text,
  p_device_id text,
  p_public_key text,
  p_device_name text default null,
  p_platform text default null
)
returns jsonb
language plpgsql security definer set search_path = public, pg_temp
as $$
begin
  perform public.require_device_session(p_device_id, true, false, true);
  return private.claim_family(
    p_family_id, p_family_name, p_family_description, p_device_id,
    p_public_key, p_device_name, p_platform
  );
end;
$$;

create or replace function public.create_pairing_request(
  p_family_id text,
  p_requesting_device_id text,
  p_public_key text,
  p_device_name text,
  p_platform text
)
returns jsonb
language plpgsql security definer set search_path = public, pg_temp
as $$
begin
  perform public.require_device_session(p_requesting_device_id, true, false, false);
  return private.create_pairing_request(
    p_family_id, p_requesting_device_id, p_public_key, p_device_name, p_platform
  );
end;
$$;

create or replace function public.approve_pairing_request(p_request_id text)
returns jsonb
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_family_id text;
begin
  select family_id into v_family_id
  from public.device_pairing_requests where id = p_request_id;
  if v_family_id is null then raise exception 'pairing request not found'; end;
  perform public.require_active_family_device(v_family_id, true);
  return private.approve_pairing_request(p_request_id);
end;
$$;

create or replace function public.reject_pairing_request(p_request_id text)
returns jsonb
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_family_id text;
begin
  select family_id into v_family_id
  from public.device_pairing_requests where id = p_request_id;
  if v_family_id is null then raise exception 'pairing request not found'; end;
  perform public.require_active_family_device(v_family_id, true);
  return private.reject_pairing_request(p_request_id);
end;
$$;

create or replace function public.activate_paired_device(
  p_request_id text,
  p_device_id text,
  p_public_key text
)
returns jsonb
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_family_id text;
begin
  select family_id into v_family_id
  from public.device_pairing_requests
  where id = p_request_id and requesting_device_id = p_device_id;
  if v_family_id is null then raise exception 'approved pairing not found'; end;
  perform public.require_device_session(p_device_id, false, true, false);
  return private.activate_paired_device(p_request_id, p_device_id, p_public_key);
end;
$$;

create or replace function public.cancel_pairing_request(p_request_id text)
returns jsonb
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_request public.device_pairing_requests%rowtype;
  v_device_id text;
begin
  select * into v_request
  from public.device_pairing_requests where id = p_request_id;
  if v_request.id is null then raise exception 'pairing request not found'; end;

  v_device_id := public.require_device_session(null, true, true, true);
  if v_device_id <> v_request.requesting_device_id then
    perform public.require_active_family_device(v_request.family_id, true);
  end if;
  return private.cancel_pairing_request(p_request_id);
end;
$$;

create or replace function public.update_family_details(
  p_family_id text,
  p_family_name text,
  p_family_description text
)
returns jsonb
language plpgsql security definer set search_path = public, pg_temp
as $$
begin
  perform public.require_active_family_device(p_family_id, true);
  return private.update_family_details(p_family_id, p_family_name, p_family_description);
end;
$$;

create or replace function public.upsert_family_policy(
  p_family_id text,
  p_version_id text,
  p_policy jsonb
)
returns jsonb
language plpgsql security definer set search_path = public, pg_temp
as $$
begin
  perform public.require_active_family_device(p_family_id, true);
  return private.upsert_family_policy(p_family_id, p_version_id, p_policy);
end;
$$;

create or replace function public.revoke_paired_device(p_device_id text)
returns jsonb
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_family_id text;
begin
  select family_id into v_family_id
  from public.family_devices where id = p_device_id;
  if v_family_id is null then raise exception 'device not found'; end;
  perform public.require_active_family_device(v_family_id, true);
  return private.revoke_paired_device(p_device_id);
end;
$$;

create or replace function public.issue_member_lock_command(
  p_target_device_id text,
  p_member_id text,
  p_expires_at timestamptz default now() + interval '24 hours'
)
returns jsonb
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_family_id text;
begin
  select family_id into v_family_id
  from public.family_devices
  where id = p_target_device_id and status = 'paired' and revoked_at is null;
  if v_family_id is null then raise exception 'target device is not paired'; end;
  perform public.require_active_family_device(v_family_id, true);
  perform 1
  from public.family_devices
  where id = p_target_device_id
    and family_id = v_family_id
    and status = 'paired'
    and revoked_at is null
  for update;
  if not found then raise exception 'target device is not paired'; end if;
  return private.issue_member_lock_command(
    p_target_device_id, p_member_id, p_expires_at
  );
end;
$$;

create or replace function public.cancel_device_command(p_command_id text)
returns jsonb
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_family_id text;
begin
  select family_id into v_family_id
  from public.device_commands where id = p_command_id;
  if v_family_id is null then raise exception 'command not found'; end;
  perform public.require_active_family_device(v_family_id, true);
  return private.cancel_device_command(p_command_id);
end;
$$;

create or replace function public.receive_pending_commands()
returns setof public.device_commands
language plpgsql security definer set search_path = public, pg_temp
as $$
begin
  perform public.require_device_session(null, false, false, true);
  return query select * from private.receive_pending_commands();
end;
$$;

create or replace function public.complete_device_command(
  p_command_id text,
  p_result text,
  p_error text default null
)
returns jsonb
language plpgsql security definer set search_path = public, pg_temp
as $$
begin
  perform public.require_device_session(null, false, false, true);
  return private.complete_device_command(p_command_id, p_result, p_error);
end;
$$;

create or replace function public.report_device_sync(
  p_family_id text,
  p_error text default null
)
returns jsonb
language plpgsql security definer set search_path = public, pg_temp
as $$
begin
  perform public.require_active_family_device(p_family_id, false);
  return private.report_device_sync(p_family_id, p_error);
end;
$$;

drop policy if exists "families readable by paired devices" on public.families;
create policy "families readable by authenticated paired devices"
on public.families for select to authenticated
using (public.has_active_family_access(families.id, false));

drop policy if exists "devices readable by paired family devices" on public.family_devices;
create policy "devices readable by authenticated paired family devices"
on public.family_devices for select to authenticated
using (public.can_read_family_device(family_devices.id, family_devices.family_id));

drop policy if exists "pairing requests readable by owner or unbound device"
on public.device_pairing_requests;
create policy "pairing requests readable by authenticated devices"
on public.device_pairing_requests for select to authenticated
using (public.can_read_pairing_request(
  device_pairing_requests.family_id,
  device_pairing_requests.requesting_device_id
));

drop policy if exists "commands readable by owner or target" on public.device_commands;
create policy "commands readable by authenticated family devices"
on public.device_commands for select to authenticated
using (public.can_read_device_command(
  device_commands.family_id,
  device_commands.target_device_id
));

drop policy if exists "receipts readable by command family" on public.device_command_receipts;
create policy "receipts readable by authenticated family devices"
on public.device_command_receipts for select to authenticated
using (exists (
  select 1 from public.device_commands c
  where c.id = device_command_receipts.command_id
    and public.has_active_family_access(c.family_id, false)
));

drop policy if exists "policy versions readable by paired devices"
on public.family_policy_versions;
create policy "policy versions readable by authenticated paired devices"
on public.family_policy_versions for select to authenticated
using (public.has_active_family_access(family_policy_versions.family_id, false));

drop policy if exists "sync state readable by own or owner" on public.device_sync_state;
create policy "sync state readable by authenticated paired devices"
on public.device_sync_state for select to authenticated
using (public.can_read_family_device(device_sync_state.device_id, device_sync_state.family_id));

drop policy if exists "audit events readable by owner" on public.security_audit_events;
create policy "audit events readable by authenticated owner"
on public.security_audit_events for select to authenticated
using (public.has_active_family_access(security_audit_events.family_id, true));

revoke execute on function public.require_device_session(text, boolean, boolean, boolean)
  from public, anon;
revoke execute on function public.require_active_family_device(text, boolean)
  from public, anon;
revoke execute on function public.has_active_family_access(text, boolean)
  from public, anon;
revoke execute on function public.can_read_family_device(text, text)
  from public, anon;
revoke execute on function public.can_read_pairing_request(text, text)
  from public, anon;
revoke execute on function public.can_read_device_command(text, text)
  from public, anon;
revoke execute on function public.current_paired_device() from public, anon;
revoke execute on function public.guard_device_auth_row() from public, anon, authenticated;
revoke execute on function public.guard_approved_device_not_revoked()
  from public, anon, authenticated;

revoke execute on function public.claim_family(text, text, text, text, text, text, text)
  from public, anon;
revoke execute on function public.create_pairing_request(text, text, text, text, text)
  from public, anon;
revoke execute on function public.approve_pairing_request(text) from public, anon;
revoke execute on function public.reject_pairing_request(text) from public, anon;
revoke execute on function public.activate_paired_device(text, text, text) from public, anon;
revoke execute on function public.cancel_pairing_request(text) from public, anon;
revoke execute on function public.update_family_details(text, text, text) from public, anon;
revoke execute on function public.upsert_family_policy(text, text, jsonb) from public, anon;
revoke execute on function public.revoke_paired_device(text) from public, anon;
revoke execute on function public.issue_member_lock_command(text, text, timestamptz)
  from public, anon;
revoke execute on function public.cancel_device_command(text) from public, anon;
revoke execute on function public.receive_pending_commands() from public, anon;
revoke execute on function public.complete_device_command(text, text, text)
  from public, anon;
revoke execute on function public.report_device_sync(text, text) from public, anon;

grant execute on function public.require_device_session(text, boolean, boolean, boolean)
  to authenticated;
grant execute on function public.require_active_family_device(text, boolean)
  to authenticated;
grant execute on function public.has_active_family_access(text, boolean)
  to authenticated;
grant execute on function public.can_read_family_device(text, text) to authenticated;
grant execute on function public.can_read_pairing_request(text, text) to authenticated;
grant execute on function public.can_read_device_command(text, text) to authenticated;
grant execute on function public.current_paired_device() to authenticated;
grant execute on function public.claim_family(text, text, text, text, text, text, text)
  to authenticated;
grant execute on function public.create_pairing_request(text, text, text, text, text)
  to authenticated;
grant execute on function public.approve_pairing_request(text) to authenticated;
grant execute on function public.reject_pairing_request(text) to authenticated;
grant execute on function public.activate_paired_device(text, text, text) to authenticated;
grant execute on function public.cancel_pairing_request(text) to authenticated;
grant execute on function public.update_family_details(text, text, text) to authenticated;
grant execute on function public.upsert_family_policy(text, text, jsonb) to authenticated;
grant execute on function public.revoke_paired_device(text) to authenticated;
grant execute on function public.issue_member_lock_command(text, text, timestamptz)
  to authenticated;
grant execute on function public.cancel_device_command(text) to authenticated;
grant execute on function public.receive_pending_commands() to authenticated;
grant execute on function public.complete_device_command(text, text, text) to authenticated;
grant execute on function public.report_device_sync(text, text) to authenticated;
