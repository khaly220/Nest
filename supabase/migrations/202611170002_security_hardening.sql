alter table public.device_pairing_requests
  add column if not exists activated_at timestamptz;

alter table public.device_auth_challenges
  add column if not exists consumed_at timestamptz;

alter table public.device_auth_sessions
  alter column authenticated_until set not null;

alter table public.family_devices
  drop constraint if exists family_devices_family_id_fkey;

alter table public.family_devices
  add constraint family_devices_family_id_fkey
  foreign key (family_id) references public.families(id)
  on delete cascade deferrable initially deferred;

create unique index if not exists one_pending_pairing_request_per_device
  on public.device_pairing_requests(family_id, requesting_device_id)
  where status = 'pending';

create unique index if not exists one_pending_lock_per_target_member
  on public.device_commands(target_device_id, ((payload->>'member_id')))
  where status = 'pending' and command_type = 'lock_nest_session';

create unique index if not exists one_active_owner_per_family
  on public.family_devices(family_id)
  where role = 'owner' and status = 'paired';

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
language plpgsql security definer set search_path = public
as $$
declare
  v_family public.families%rowtype;
  v_existing_owner text;
begin
  if auth.uid() is null then raise exception 'authentication required'; end;
  if coalesce(length(p_family_id), 0) not between 1 and 128
     or coalesce(length(p_device_id), 0) not between 1 and 128
     or coalesce(length(p_family_name), 0) not between 1 and 128
  then raise exception 'invalid ownership identifiers'; end;
  if coalesce(length(p_public_key), 0) < 64
     or coalesce(length(p_public_key), 0) > 4096
  then raise exception 'invalid device public key'; end;
  if not exists (
    select 1 from public.device_auth_sessions s
    where s.auth_user_id = auth.uid()
      and s.device_id = p_device_id
      and s.public_key = p_public_key
      and s.authenticated_until > now()
  ) then raise exception 'device authentication required'; end;
  if exists (
    select 1 from public.family_devices d
    where d.id = p_device_id
      and d.role = 'owner'
      and d.status = 'paired'
      and d.family_id is distinct from p_family_id
  ) then raise exception 'this device already owns another family'; end;

  perform pg_advisory_xact_lock(hashtext(p_family_id));

  select owner_device_id into v_existing_owner
  from public.families
  where id = p_family_id
  for update;

  if v_existing_owner is not null then
    if not exists (
      select 1
      from public.families f
      join public.family_devices d on d.id = f.owner_device_id
      where f.id = p_family_id
        and d.id = p_device_id
        and d.auth_user_id = auth.uid()
        and d.role = 'owner'
        and d.status = 'paired'
        and d.revoked_at is null
    ) then raise exception 'family already has an original owner'; end;
  else
    insert into public.family_devices(
      id, family_id, auth_user_id, public_key, role, status, name, platform
    ) values (
      p_device_id, p_family_id, auth.uid(), p_public_key, 'owner', 'paired',
      nullif(trim(p_device_name), ''), nullif(trim(p_platform), '')
    )
    on conflict (id) do update set
      family_id = excluded.family_id,
      auth_user_id = excluded.auth_user_id,
      public_key = excluded.public_key,
      role = 'owner',
      status = 'paired',
      revoked_at = null,
      name = excluded.name,
      platform = excluded.platform,
      updated_at = now();

    insert into public.families(id, name, description, owner_device_id)
    values (p_family_id, trim(p_family_name), coalesce(p_family_description, ''), p_device_id);

    insert into public.security_audit_events(
      family_id, auth_user_id, device_id, event_type
    ) values (
      p_family_id, auth.uid(), p_device_id, 'family_owner_claimed'
    );
  end;

  select * into v_family from public.families where id = p_family_id;
  return jsonb_build_object('family_id', v_family.id, 'owner_device_id', v_family.owner_device_id);
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
language plpgsql security definer set search_path = public
as $$
declare
  v_request public.device_pairing_requests%rowtype;
  v_code text;
  v_pending_count integer;
begin
  if auth.uid() is null then raise exception 'authentication required'; end;
  if coalesce(length(p_family_id), 0) not between 1 and 128
     or coalesce(length(p_requesting_device_id), 0) not between 1 and 128
  then raise exception 'invalid pairing identifiers'; end;
  if coalesce(length(p_public_key), 0) not between 64 and 4096
  then raise exception 'invalid device public key'; end;
  if not exists (
    select 1 from public.device_auth_sessions s
    where s.auth_user_id = auth.uid()
      and s.device_id = p_requesting_device_id
      and s.public_key = p_public_key
      and s.authenticated_until > now()
  ) then raise exception 'device authentication required'; end;
  if not exists (select 1 from public.families where id = p_family_id)
  then raise exception 'family not found'; end;
  if exists (
    select 1 from public.family_devices
    where id = p_requesting_device_id
      and family_id = p_family_id
      and status <> 'revoked'
  ) then raise exception 'device is already registered with this family'; end;

  select count(*) into v_pending_count
  from public.device_pairing_requests
  where family_id = p_family_id
    and status = 'pending'
    and expires_at > now();
  if v_pending_count >= 20 then raise exception 'too many pending pairing requests'; end;

  v_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
  insert into public.device_pairing_requests(
    id, family_id, requesting_device_id, device_name, platform,
    public_key, pairing_code, expires_at
  ) values (
    'pair-' || gen_random_uuid()::text,
    p_family_id, p_requesting_device_id, nullif(trim(p_device_name), ''),
    nullif(trim(p_platform), ''), p_public_key, v_code, now() + interval '15 minutes'
  ) returning * into v_request;

  insert into public.security_audit_events(
    family_id, auth_user_id, device_id, event_type, subject_id
  ) values (
    p_family_id, auth.uid(), p_requesting_device_id, 'pairing_requested', v_request.id
  );

  return jsonb_build_object(
    'request_id', v_request.id,
    'pairing_code', v_request.pairing_code,
    'expires_at', v_request.expires_at
  );
end;
$$;

create or replace function public.approve_pairing_request(p_request_id text)
returns jsonb
language plpgsql security definer set search_path = public
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
  end;

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
      and (role = 'owner' or status = 'paired')
  ) then raise exception 'requesting device is already registered'; end;

  insert into public.family_devices(
    id, family_id, auth_user_id, public_key, role, status,
    name, platform
  ) values (
    v_request.requesting_device_id,
    v_request.family_id,
    null::uuid,
    v_request.public_key,
    'secondary',
    'pending',
    v_request.device_name,
    v_request.platform
  )
  on conflict (id) do update set
    family_id = excluded.family_id,
    auth_user_id = null,
    public_key = excluded.public_key,
    role = 'secondary',
    status = 'pending',
    revoked_at = null,
    name = excluded.name,
    platform = excluded.platform,
    updated_at = now();

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

create or replace function public.activate_paired_device(
  p_request_id text,
  p_device_id text,
  p_public_key text
)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_request public.device_pairing_requests%rowtype;
begin
  if auth.uid() is null then raise exception 'authentication required'; end;
  if not exists (
    select 1 from public.device_auth_sessions s
    where s.auth_user_id = auth.uid()
      and s.device_id = p_device_id
      and s.public_key = p_public_key
      and s.authenticated_until > now()
  ) then raise exception 'device authentication required'; end;

  select * into v_request
  from public.device_pairing_requests
  where id = p_request_id
    and requesting_device_id = p_device_id
  for update;
  if v_request.id is null then raise exception 'approved pairing not found'; end;
  if v_request.status <> 'approved' then raise exception 'pairing request is not approved'; end;
  if v_request.activated_at is not null then
    return jsonb_build_object(
      'paired', true, 'family_id', v_request.family_id, 'device_id', p_device_id
    );
  end;
  if v_request.expires_at <= now() then
    update public.device_pairing_requests
    set status = 'expired', updated_at = now()
    where id = p_request_id;
    raise exception 'pairing request expired';
  end;
  if v_request.public_key <> p_public_key then raise exception 'device public key mismatch'; end;

  update public.family_devices
  set auth_user_id = auth.uid(),
      status = 'paired',
      revoked_at = null,
      public_key = p_public_key,
      updated_at = now()
  where id = p_device_id
    and family_id = v_request.family_id
    and role = 'secondary';
  if not found then raise exception 'paired device record not found'; end;

  update public.device_pairing_requests
  set activated_at = now(), updated_at = now()
  where id = p_request_id;

  insert into public.security_audit_events(
    family_id, auth_user_id, device_id, event_type, subject_id
  ) values (
    v_request.family_id, auth.uid(), p_device_id,
    'pairing_activated', p_request_id
  );

  return jsonb_build_object(
    'paired', true, 'family_id', v_request.family_id, 'device_id', p_device_id
  );
end;
$$;

create or replace function public.cancel_pairing_request(p_request_id text)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_request public.device_pairing_requests%rowtype;
begin
  select * into v_request
  from public.device_pairing_requests
  where id = p_request_id
  for update;
  if v_request.id is null then raise exception 'pairing request not found'; end;
  if v_request.status <> 'pending' then raise exception 'pairing request is not pending'; end;
  if not exists (
    select 1 from public.family_devices d
    where d.family_id = v_request.family_id
      and d.auth_user_id = auth.uid()
      and d.role = 'owner'
      and d.status = 'paired'
  ) and not exists (
    select 1 from public.device_auth_sessions s
    where s.auth_user_id = auth.uid()
      and s.device_id = v_request.requesting_device_id
      and s.authenticated_until > now()
  ) then raise exception 'not authorized to cancel pairing'; end;

  update public.device_pairing_requests
  set status = 'cancelled', consumed_at = now(), updated_at = now()
  where id = p_request_id;
  insert into public.security_audit_events(
    family_id, auth_user_id, device_id, event_type, subject_id
  ) values (
    v_request.family_id, auth.uid(), v_request.requesting_device_id,
    'pairing_cancelled', p_request_id
  );
  return jsonb_build_object('cancelled', true);
end;
$$;

create or replace function public.update_family_details(
  p_family_id text,
  p_family_name text,
  p_family_description text
)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_owner text;
begin
  if coalesce(length(p_family_name), 0) not between 1 and 128
  then raise exception 'invalid family name'; end;
  if coalesce(length(p_family_description), 0) > 2000
  then raise exception 'family description is too long'; end;

  select f.owner_device_id into v_owner
  from public.families f
  join public.family_devices d on d.id = f.owner_device_id
  where f.id = p_family_id
    and d.auth_user_id = auth.uid()
    and d.role = 'owner'
    and d.status = 'paired'
    and d.revoked_at is null
  for update;
  if v_owner is null then raise exception 'only the original owner may modify family rules'; end;

  update public.families
  set name = trim(p_family_name),
      description = coalesce(p_family_description, ''),
      updated_at = now()
  where id = p_family_id;
  insert into public.security_audit_events(
    family_id, auth_user_id, device_id, event_type
  ) values (p_family_id, auth.uid(), v_owner, 'family_updated');

  return jsonb_build_object('family_id', p_family_id, 'updated', true);
end;
$$;

create or replace function public.upsert_family_policy(
  p_family_id text,
  p_version_id text,
  p_policy jsonb
)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_owner public.family_devices%rowtype;
begin
  select d.* into v_owner
  from public.family_devices d
  join public.families f on f.owner_device_id = d.id
  where f.id = p_family_id
    and d.auth_user_id = auth.uid()
    and d.role = 'owner'
    and d.status = 'paired'
    and d.revoked_at is null;
  if v_owner.id is null then raise exception 'only the original owner may modify family policies'; end;
  if coalesce(length(p_version_id), 0) not between 1 and 128
  then raise exception 'invalid policy version'; end;
  if p_policy is null then raise exception 'policy payload is required'; end;

  insert into public.family_policy_versions(
    family_id, source_device_id, version_id, policy
  ) values (
    p_family_id, v_owner.id, p_version_id, p_policy
  )
  on conflict (family_id, version_id) do update
  set policy = excluded.policy,
      source_device_id = excluded.source_device_id,
      created_at = now();

  insert into public.security_audit_events(
    family_id, auth_user_id, device_id, event_type, subject_id
  ) values (
    p_family_id, auth.uid(), v_owner.id,
    'family_policy_updated', p_version_id
  );
  return jsonb_build_object('family_id', p_family_id, 'version_id', p_version_id);
end;
$$;

create or replace function public.revoke_paired_device(p_device_id text)
returns jsonb
language plpgsql security definer set search_path = public
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
      revoked_at = now(),
      auth_user_id = null,
      updated_at = now()
  where id = p_device_id;
  update public.device_commands
  set status = 'cancelled',
      completed_at = now(),
      updated_at = now()
  where target_device_id = p_device_id
    and status in ('pending', 'received');
  insert into public.security_audit_events(
    family_id, auth_user_id, device_id, event_type, subject_id
  ) values (
    v_device.family_id, auth.uid(), p_device_id,
    'device_revoked', p_device_id
  );
  return jsonb_build_object('revoked', true);
end;
$$;

create or replace function public.issue_member_lock_command(
  p_target_device_id text,
  p_member_id text,
  p_expires_at timestamptz default now() + interval '24 hours'
)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_target public.family_devices%rowtype;
  v_owner public.family_devices%rowtype;
  v_command public.device_commands%rowtype;
begin
  if coalesce(length(p_member_id), 0) not between 1 and 128
  then raise exception 'invalid member identifier'; end;
  if p_expires_at is null
     or p_expires_at <= now()
     or p_expires_at > now() + interval '7 days'
  then raise exception 'command expiry must be within seven days'; end;

  select d.* into v_target
  from public.family_devices d
  where d.id = p_target_device_id
    and d.status = 'paired'
    and d.revoked_at is null;
  if v_target.id is null then raise exception 'target device is not paired'; end;

  select d.* into v_owner
  from public.family_devices d
  join public.families f on f.owner_device_id = d.id
  where f.id = v_target.family_id
    and d.auth_user_id = auth.uid()
    and d.role = 'owner'
    and d.status = 'paired'
    and d.revoked_at is null;
  if v_owner.id is null then raise exception 'only the original owner may issue lock commands'; end;

  if exists (
    select 1 from public.device_commands
    where target_device_id = p_target_device_id
      and status = 'pending'
      and payload->>'member_id' = p_member_id
      and expires_at > now()
  ) then
    select * into v_command
    from public.device_commands
    where target_device_id = p_target_device_id
      and status = 'pending'
      and payload->>'member_id' = p_member_id
      and expires_at > now()
    order by created_at desc
    limit 1;
  else
    insert into public.device_commands(
      id, family_id, source_device_id, target_device_id,
      command_type, payload, expires_at
    ) values (
      'cmd-' || gen_random_uuid()::text,
      v_target.family_id, v_owner.id, p_target_device_id,
      'lock_nest_session',
      jsonb_build_object('member_id', p_member_id),
      p_expires_at
    ) returning * into v_command;
  end;

  insert into public.security_audit_events(
    family_id, auth_user_id, device_id, event_type, subject_id
  ) values (
    v_target.family_id, auth.uid(), v_owner.id,
    'lock_command_issued', v_command.id
  );
  return jsonb_build_object(
    'command_id', v_command.id,
    'status', v_command.status,
    'expires_at', v_command.expires_at
  );
end;
$$;

create or replace function public.cancel_device_command(p_command_id text)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_command public.device_commands%rowtype;
begin
  select c.* into v_command
  from public.device_commands c
  where c.id = p_command_id
  for update;
  if v_command.id is null then raise exception 'command not found'; end;
  if not exists (
    select 1
    from public.family_devices d
    join public.families f on f.owner_device_id = d.id
    where f.id = v_command.family_id
      and d.auth_user_id = auth.uid()
      and d.role = 'owner'
      and d.status = 'paired'
  ) then raise exception 'only the original owner may cancel commands'; end;
  if v_command.status in ('executed', 'failed', 'expired', 'cancelled')
  then raise exception 'command is already terminal'; end;

  update public.device_commands
  set status = 'cancelled', completed_at = now(), updated_at = now()
  where id = p_command_id;
  insert into public.security_audit_events(
    family_id, auth_user_id, device_id, event_type, subject_id
  ) values (
    v_command.family_id, auth.uid(), v_command.source_device_id,
    'lock_command_cancelled', p_command_id
  );
  return jsonb_build_object('command_id', p_command_id, 'status', 'cancelled');
end;
$$;

create or replace function public.receive_pending_commands()
returns setof public.device_commands
language plpgsql security definer set search_path = public
as $$
declare
  v_device public.family_devices%rowtype;
begin
  select d.* into v_device
  from public.family_devices d
  where d.auth_user_id = auth.uid()
    and d.status = 'paired'
    and d.revoked_at is null
  limit 1;
  if v_device.id is null then raise exception 'paired device authentication required'; end;

  update public.device_commands
  set status = 'expired', completed_at = now(), updated_at = now()
  where target_device_id = v_device.id
    and status in ('pending', 'received')
    and expires_at <= now();

  update public.device_commands
  set status = 'received',
      received_at = coalesce(received_at, now()),
      updated_at = now()
  where target_device_id = v_device.id
    and status = 'pending'
    and expires_at > now();

  update public.family_devices
  set last_seen_at = now(), updated_at = now()
  where id = v_device.id;

  return query
  select c.*
  from public.device_commands c
  where c.target_device_id = v_device.id
    and c.status = 'received'
    and c.expires_at > now()
  order by c.created_at;
end;
$$;

create or replace function public.complete_device_command(
  p_command_id text,
  p_result text,
  p_error text default null
)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_command public.device_commands%rowtype;
  v_device public.family_devices%rowtype;
begin
  if p_result not in ('executed', 'failed') then
    raise exception 'invalid terminal command result';
  end;
  select d.* into v_device
  from public.family_devices d
  where d.auth_user_id = auth.uid()
    and d.status = 'paired'
    and d.revoked_at is null
  limit 1;
  if v_device.id is null then raise exception 'paired device authentication required'; end;

  select c.* into v_command
  from public.device_commands c
  where c.id = p_command_id
    and c.target_device_id = v_device.id
  for update;
  if v_command.id is null then raise exception 'command not found for this device'; end;
  if v_command.status = p_result
     or v_command.status in ('executed', 'failed', 'cancelled', 'expired')
  then
    return jsonb_build_object(
      'command_id', p_command_id,
      'status', v_command.status,
      'idempotent', true
    );
  end;
  if v_command.expires_at <= now() then
    update public.device_commands
    set status = 'expired', completed_at = now(), updated_at = now()
    where id = p_command_id;
    return jsonb_build_object(
      'command_id', p_command_id, 'status', 'expired', 'idempotent', false
    );
  end;
  if v_command.status not in ('pending', 'received') then
    raise exception 'command is not executable';
  end;

  insert into public.device_command_receipts(
    command_id, device_id, result, error
  ) values (
    p_command_id, v_device.id, p_result, nullif(p_error, '')
  )
  on conflict (command_id, device_id) do update
  set result = excluded.result,
      error = excluded.error,
      created_at = now();

  update public.device_commands
  set status = p_result,
      received_at = coalesce(received_at, now()),
      completed_at = now(),
      updated_at = now()
  where id = p_command_id;

  insert into public.security_audit_events(
    family_id, auth_user_id, device_id, event_type, subject_id, metadata
  ) values (
    v_command.family_id, auth.uid(), v_device.id,
    'lock_command_result', p_command_id,
    jsonb_build_object('result', p_result)
  );
  return jsonb_build_object(
    'command_id', p_command_id, 'status', p_result, 'idempotent', false
  );
end;
$$;

create or replace function public.report_device_sync(
  p_family_id text,
  p_error text default null
)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_device public.family_devices%rowtype;
begin
  select d.* into v_device
  from public.family_devices d
  where d.family_id = p_family_id
    and d.auth_user_id = auth.uid()
    and d.status = 'paired'
    and d.revoked_at is null
  limit 1;
  if v_device.id is null then raise exception 'paired device authentication required'; end;

  insert into public.device_sync_state(
    device_id, family_id, last_successful_sync_at, last_error, updated_at
  ) values (
    v_device.id,
    p_family_id,
    case when p_error is null then now() else null end,
    nullif(p_error, ''),
    now()
  )
  on conflict (device_id) do update
  set family_id = excluded.family_id,
      last_successful_sync_at =
        case when excluded.last_error is null
             then now()
             else device_sync_state.last_successful_sync_at
        end,
      last_error = excluded.last_error,
      updated_at = now();

  update public.family_devices
  set last_seen_at = now(), updated_at = now()
  where id = v_device.id;

  return jsonb_build_object('device_id', v_device.id, 'reported', true);
end;
$$;

revoke execute on function public.claim_family(text,text,text,text,text,text,text) from public, anon;
revoke execute on function public.create_pairing_request(text,text,text,text,text) from public, anon;
revoke execute on function public.approve_pairing_request(text) from public, anon;
revoke execute on function public.reject_pairing_request(text) from public, anon;
revoke execute on function public.activate_paired_device(text,text,text) from public, anon;
revoke execute on function public.cancel_pairing_request(text) from public, anon;
revoke execute on function public.revoke_paired_device(text) from public, anon;
revoke execute on function public.issue_member_lock_command(text,text,timestamptz) from public, anon;
revoke execute on function public.cancel_device_command(text) from public, anon;
revoke execute on function public.receive_pending_commands() from public, anon;
revoke execute on function public.complete_device_command(text,text,text) from public, anon;
revoke execute on function public.update_family_details(text,text,text) from public, anon;
revoke execute on function public.upsert_family_policy(text,text,jsonb) from public, anon;
revoke execute on function public.report_device_sync(text,text) from public, anon;

grant execute on function public.claim_family(text,text,text,text,text,text,text) to authenticated;
grant execute on function public.create_pairing_request(text,text,text,text,text) to authenticated;
grant execute on function public.approve_pairing_request(text) to authenticated;
grant execute on function public.reject_pairing_request(text) to authenticated;
grant execute on function public.activate_paired_device(text,text,text) to authenticated;
grant execute on function public.cancel_pairing_request(text) to authenticated;
grant execute on function public.revoke_paired_device(text) to authenticated;
grant execute on function public.issue_member_lock_command(text,text,timestamptz) to authenticated;
grant execute on function public.cancel_device_command(text) to authenticated;
grant execute on function public.receive_pending_commands() to authenticated;
grant execute on function public.complete_device_command(text,text,text) to authenticated;
grant execute on function public.update_family_details(text,text,text) to authenticated;
grant execute on function public.upsert_family_policy(text,text,jsonb) to authenticated;
grant execute on function public.report_device_sync(text,text) to authenticated;

revoke all on public.device_auth_sessions from anon, authenticated;
revoke all on public.device_auth_challenges from anon, authenticated;
