create extension if not exists pgcrypto;

create table if not exists public.families (
  id text primary key,
  name text not null,
  description text not null default '',
  owner_device_id text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.family_devices (
  id text primary key,
  family_id text references public.families(id) on delete cascade,
  auth_user_id uuid unique,
  public_key text not null,
  role text not null check (role in ('owner', 'secondary')),
  status text not null default 'pending' check (status in ('pending', 'paired', 'revoked')),
  name text,
  platform text,
  last_seen_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.families
  add constraint families_owner_device_fk
  foreign key (owner_device_id) references public.family_devices(id) deferrable initially deferred;

create table if not exists public.device_pairing_requests (
  id text primary key,
  family_id text not null references public.families(id) on delete cascade,
  requesting_device_id text not null,
  device_name text,
  platform text,
  public_key text not null,
  pairing_code text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'cancelled', 'expired')),
  expires_at timestamptz not null,
  approved_by_device_id text,
  consumed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(pairing_code)
);

create table if not exists public.device_authorizations (
  id text primary key default gen_random_uuid()::text,
  family_id text not null references public.families(id) on delete cascade,
  device_id text not null references public.family_devices(id) on delete cascade,
  auth_user_id uuid not null,
  purpose text not null,
  nonce text not null,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now(),
  unique(family_id, device_id, nonce)
);

create table if not exists public.device_commands (
  id text primary key,
  family_id text not null references public.families(id) on delete cascade,
  source_device_id text not null,
  target_device_id text not null,
  command_type text not null,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'pending' check (status in ('pending', 'received', 'executed', 'failed', 'expired', 'cancelled')),
  expires_at timestamptz not null,
  received_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.device_command_receipts (
  id text primary key default gen_random_uuid()::text,
  command_id text not null references public.device_commands(id) on delete cascade,
  device_id text not null,
  result text not null,
  error text,
  created_at timestamptz not null default now(),
  unique(command_id, device_id)
);

create table if not exists public.family_policy_versions (
  id bigint generated always as identity primary key,
  family_id text not null references public.families(id) on delete cascade,
  source_device_id text not null,
  version_id text not null,
  policy jsonb not null,
  created_at timestamptz not null default now(),
  unique(family_id, version_id)
);

create table if not exists public.device_sync_state (
  device_id text primary key references public.family_devices(id) on delete cascade,
  family_id text not null references public.families(id) on delete cascade,
  last_successful_sync_at timestamptz,
  last_error text,
  updated_at timestamptz not null default now()
);

create table if not exists public.security_audit_events (
  id text primary key default gen_random_uuid()::text,
  family_id text references public.families(id) on delete cascade,
  auth_user_id uuid,
  device_id text,
  event_type text not null,
  subject_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.device_auth_sessions (
  auth_user_id uuid primary key,
  device_id text not null,
  public_key text not null,
  authenticated_until timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.device_auth_challenges (
  auth_user_id uuid primary key,
  device_id text not null,
  public_key text not null,
  nonce text not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

alter table public.device_auth_sessions enable row level security;
alter table public.device_auth_challenges enable row level security;

create index if not exists family_devices_family_status_idx on public.family_devices(family_id, status);
create index if not exists pairing_family_status_expiry_idx on public.device_pairing_requests(family_id, status, expires_at);
create index if not exists commands_target_status_expiry_idx on public.device_commands(target_device_id, status, expires_at);
create index if not exists audit_family_created_idx on public.security_audit_events(family_id, created_at desc);

alter table public.families enable row level security;
alter table public.family_devices enable row level security;
alter table public.device_pairing_requests enable row level security;
alter table public.device_authorizations enable row level security;
alter table public.device_commands enable row level security;
alter table public.device_command_receipts enable row level security;
alter table public.family_policy_versions enable row level security;
alter table public.device_sync_state enable row level security;
alter table public.security_audit_events enable row level security;

create or replace function public.current_paired_device()
returns table(device_id text, family_id text, role text)
language sql stable security definer set search_path = public
as $$
  select d.id, d.family_id, d.role
  from public.family_devices d
  where d.auth_user_id = auth.uid()
    and d.status = 'paired'
    and d.revoked_at is null
  limit 1;
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
language plpgsql security definer set search_path = public
as $$
declare
  v_family public.families%rowtype;
  v_existing_owner text;
begin
  if auth.uid() is null then raise exception 'authentication required'; end;
  if not exists (
    select 1 from public.device_auth_sessions s
    where s.auth_user_id = auth.uid()
      and s.device_id = p_device_id
      and s.public_key = p_public_key
      and s.authenticated_until > now()
  ) then raise exception 'device authentication required'; end;
  if coalesce(length(p_family_id), 0) = 0 or coalesce(length(p_device_id), 0) = 0 then
    raise exception 'family and device identifiers are required';
  end if;
  if coalesce(length(p_public_key), 0) < 64 then raise exception 'invalid device public key'; end;

  select owner_device_id into v_existing_owner from public.families where id = p_family_id;
  if v_existing_owner is not null then
    if not exists (
      select 1 from public.family_devices
      where id = v_existing_owner and auth_user_id = auth.uid() and role = 'owner' and status = 'paired'
    ) then raise exception 'family already has an owner'; end;
  else
    insert into public.family_devices (
      id, family_id, auth_user_id, public_key, role, status, name, platform
    ) values (
      p_device_id, p_family_id, auth.uid(), p_public_key, 'owner', 'paired', p_device_name, p_platform
    ) on conflict (id) do update set
      auth_user_id = excluded.auth_user_id,
      public_key = excluded.public_key,
      role = 'owner',
      status = 'paired',
      name = excluded.name,
      platform = excluded.platform,
      updated_at = now();

    insert into public.families (
      id, name, description, owner_device_id
    ) values (
      p_family_id, p_family_name, coalesce(p_family_description, ''), p_device_id
    );

    insert into public.security_audit_events(family_id, auth_user_id, device_id, event_type)
    values (p_family_id, auth.uid(), p_device_id, 'family_owner_claimed');
  end if;

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
begin
  if auth.uid() is null then raise exception 'authentication required'; end;
  if not exists (
    select 1 from public.device_auth_sessions s
    where s.auth_user_id = auth.uid()
      and s.device_id = p_requesting_device_id
      and s.public_key = p_public_key
      and s.authenticated_until > now()
  ) then raise exception 'device authentication required'; end;
  if coalesce(length(p_public_key), 0) < 64 then raise exception 'invalid device public key'; end;

  v_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
  insert into public.device_pairing_requests(
    id, family_id, requesting_device_id, device_name, platform, public_key, pairing_code, expires_at
  ) values (
    'pair-' || gen_random_uuid()::text,
    p_family_id,
    p_requesting_device_id,
    p_device_name,
    p_platform,
    p_public_key,
    v_code,
    now() + interval '15 minutes'
  ) returning * into v_request;

  insert into public.security_audit_events(family_id, auth_user_id, device_id, event_type, subject_id)
  values (p_family_id, auth.uid(), p_requesting_device_id, 'pairing_requested', v_request.id);

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
  v_owner text;
begin
  select * into v_request from public.device_pairing_requests where id = p_request_id for update;
  if v_request.id is null then raise exception 'pairing request not found'; end;
  if v_request.status <> 'pending' then raise exception 'pairing request is not pending'; end;
  if v_request.expires_at <= now() then
    update public.device_pairing_requests set status = 'expired', updated_at = now() where id = p_request_id;
    raise exception 'pairing request expired';
  end;

  select d.id into v_owner
  from public.family_devices d
  where d.family_id = v_request.family_id
    and d.auth_user_id = auth.uid()
    and d.role = 'owner'
    and d.status = 'paired';
  if v_owner is null then raise exception 'only the original owner may approve pairing'; end;

  insert into public.family_devices(
    id, family_id, auth_user_id, public_key, role, status, name, platform
  ) values (
    v_request.requesting_device_id,
    v_request.family_id,
    null::uuid,
    v_request.public_key,
    'secondary',
    'pending',
    v_request.device_name,
    v_request.platform
  ) on conflict (id) do update set
    family_id = excluded.family_id,
    public_key = excluded.public_key,
    role = excluded.role,
    status = excluded.status,
    name = excluded.name,
    platform = excluded.platform,
    updated_at = now();

  update public.device_pairing_requests
  set status = 'approved', approved_by_device_id = v_owner, consumed_at = now(), updated_at = now()
  where id = p_request_id;

  insert into public.security_audit_events(
    family_id, auth_user_id, device_id, event_type, subject_id
  ) values (
    v_request.family_id, auth.uid(), v_owner, 'pairing_approved', v_request.requesting_device_id
  );

  return jsonb_build_object('approved', true, 'device_id', v_request.requesting_device_id);
end;
$$;

create or replace function public.reject_pairing_request(p_request_id text)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_request public.device_pairing_requests%rowtype;
begin
  select * into v_request from public.device_pairing_requests where id = p_request_id for update;
  if v_request.id is null then raise exception 'pairing request not found'; end;
  if not exists (
    select 1 from public.family_devices d
    where d.family_id = v_request.family_id
      and d.auth_user_id = auth.uid()
      and d.role = 'owner'
      and d.status = 'paired'
  ) then raise exception 'only the original owner may reject pairing'; end;
  if v_request.status <> 'pending' then raise exception 'pairing request is not pending'; end;
  update public.device_pairing_requests
  set status = 'rejected', updated_at = now(), consumed_at = now()
  where id = p_request_id;
  insert into public.security_audit_events(
    family_id, auth_user_id, device_id, event_type, subject_id
  ) values (v_request.family_id, auth.uid(), v_request.requesting_device_id, 'pairing_rejected', p_request_id);
  return jsonb_build_object('rejected', true);
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
  select * into v_request
  from public.device_pairing_requests
  where id = p_request_id
    and status = 'approved'
    and requesting_device_id = p_device_id
  for update;
  if v_request.id is null then raise exception 'approved pairing not found'; end;
  if v_request.expires_at <= now() then
    update public.device_pairing_requests set status = 'expired', updated_at = now() where id = p_request_id;
    raise exception 'pairing request expired';
  end;
  if v_request.public_key <> p_public_key then raise exception 'device public key mismatch'; end;

  update public.family_devices
  set auth_user_id = auth.uid(), status = 'paired', updated_at = now()
  where id = p_device_id
    and family_id = v_request.family_id
    and role = 'secondary';
  if not found then raise exception 'paired device record not found'; end;

  insert into public.security_audit_events(
    family_id, auth_user_id, device_id, event_type, subject_id
  ) values (v_request.family_id, auth.uid(), p_device_id, 'pairing_activated', p_request_id);

  return jsonb_build_object(
    'paired', true,
    'family_id', v_request.family_id,
    'device_id', p_device_id
  );
end;
$$;

create or replace function public.revoke_paired_device(p_device_id text)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_device public.family_devices%rowtype;
  v_owner record;
begin
  select * into v_device from public.family_devices where id = p_device_id for update;
  if v_device.id is null then raise exception 'device not found'; end;
  select d.id into v_owner
  from public.family_devices d
  where d.family_id = v_device.family_id
    and d.auth_user_id = auth.uid()
    and d.role = 'owner'
    and d.status = 'paired';
  if v_owner.id is null then raise exception 'only the original owner may revoke devices'; end;
  if v_device.role = 'owner' then raise exception 'the original owner cannot be revoked'; end;

  update public.family_devices
  set status = 'revoked', revoked_at = now(), updated_at = now()
  where id = p_device_id;
  update public.device_commands
  set status = 'cancelled', completed_at = now(), updated_at = now()
  where target_device_id = p_device_id and status = 'pending';
  insert into public.security_audit_events(
    family_id, auth_user_id, device_id, event_type, subject_id
  ) values (v_device.family_id, auth.uid(), p_device_id, 'device_revoked', p_device_id);
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
  select * into v_target
  from public.family_devices
  where id = p_target_device_id and status = 'paired';
  if v_target.id is null then raise exception 'target device is not paired'; end;
  if p_expires_at <= now() then raise exception 'command expiry must be in the future'; end;

  select d.* into v_owner
  from public.family_devices d
  where d.family_id = v_target.family_id
    and d.auth_user_id = auth.uid()
    and d.role = 'owner'
    and d.status = 'paired';
  if v_owner.id is null then raise exception 'only the original owner may issue lock commands'; end;
  if coalesce(length(p_member_id), 0) = 0 then raise exception 'member identifier is required'; end;

  insert into public.device_commands(
    id, family_id, source_device_id, target_device_id, command_type, payload, expires_at
  ) values (
    'cmd-' || gen_random_uuid()::text,
    v_target.family_id,
    v_owner.id,
    p_target_device_id,
    'lock_nest_session',
    jsonb_build_object('member_id', p_member_id),
    p_expires_at
  ) returning * into v_command;

  insert into public.security_audit_events(
    family_id, auth_user_id, device_id, event_type, subject_id
  ) values (
    v_target.family_id, auth.uid(), v_owner.id, 'lock_command_issued', v_command.id
  );
  return jsonb_build_object(
    'command_id', v_command.id,
    'status', v_command.status,
    'expires_at', v_command.expires_at
  );
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
    and status = 'pending'
    and expires_at <= now();

  return query
  select c.*
  from public.device_commands c
  where c.target_device_id = v_device.id
    and c.status in ('pending', 'received')
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
  select d.* into v_device
  from public.family_devices d
  where d.auth_user_id = auth.uid()
    and d.status = 'paired'
    and d.revoked_at is null
  limit 1;
  if v_device.id is null then raise exception 'paired device authentication required'; end;
  if p_result not in ('received', 'executed', 'failed') then raise exception 'invalid command result'; end;

  select * into v_command
  from public.device_commands
  where id = p_command_id and target_device_id = v_device.id
  for update;
  if v_command.id is null then raise exception 'command not found for this device'; end;

  insert into public.device_command_receipts(command_id, device_id, result, error)
  values (p_command_id, v_device.id, p_result, p_error)
  on conflict (command_id, device_id) do update
  set result = excluded.result, error = excluded.error, created_at = now();

  update public.device_commands
  set status = p_result,
      received_at = case when p_result in ('received', 'executed', 'failed') then coalesce(received_at, now()) else received_at end,
      completed_at = case when p_result in ('executed', 'failed') then now() else completed_at end,
      updated_at = now()
  where id = p_command_id;

  insert into public.security_audit_events(
    family_id, auth_user_id, device_id, event_type, subject_id, metadata
  ) values (
    v_command.family_id, auth.uid(), v_device.id, 'lock_command_result', p_command_id,
    jsonb_build_object('result', p_result)
  );
  return jsonb_build_object('command_id', p_command_id, 'status', p_result);
end;
$$;

create policy "families readable by paired devices"
on public.families for select to authenticated
using (exists (
  select 1 from public.family_devices d
  where d.family_id = families.id
    and d.auth_user_id = auth.uid()
    and d.status = 'paired'
));

create policy "devices readable by paired family devices"
on public.family_devices for select to authenticated
using (
  auth_user_id = auth.uid()
  or exists (
    select 1 from public.family_devices owner
    where owner.family_id = family_devices.family_id
      and owner.auth_user_id = auth.uid()
      and owner.role = 'owner'
      and owner.status = 'paired'
  )
);

create policy "pairing requests readable by owner or unbound device"
on public.device_pairing_requests for select to authenticated
using (exists (
  select 1 from public.family_devices d
  where d.family_id = device_pairing_requests.family_id
    and d.auth_user_id = auth.uid()
    and d.role = 'owner'
    and d.status = 'paired'
) or requesting_device_id in (
  select id from public.family_devices where auth_user_id = auth.uid()
));

create policy "commands readable by owner or target"
on public.device_commands for select to authenticated
using (
  target_device_id in (
    select id from public.family_devices where auth_user_id = auth.uid() and status = 'paired'
  )
  or exists (
    select 1 from public.family_devices d
    where d.family_id = device_commands.family_id
      and d.auth_user_id = auth.uid()
      and d.role = 'owner'
      and d.status = 'paired'
  )
);

create policy "receipts readable by command family"
on public.device_command_receipts for select to authenticated
using (exists (
  select 1 from public.device_commands c
  join public.family_devices d on d.family_id = c.family_id
  where c.id = device_command_receipts.command_id
    and d.auth_user_id = auth.uid()
    and d.status = 'paired'
));

create policy "policy versions readable by paired devices"
on public.family_policy_versions for select to authenticated
using (exists (
  select 1 from public.family_devices d
  where d.family_id = family_policy_versions.family_id
    and d.auth_user_id = auth.uid()
    and d.status = 'paired'
));

create policy "sync state readable by own or owner"
on public.device_sync_state for select to authenticated
using (
  device_id in (select id from public.family_devices where auth_user_id = auth.uid())
  or exists (
    select 1 from public.family_devices d
    where d.family_id = device_sync_state.family_id
      and d.auth_user_id = auth.uid()
      and d.role = 'owner'
      and d.status = 'paired'
  )
);

create policy "audit events readable by owner"
on public.security_audit_events for select to authenticated
using (exists (
  select 1 from public.family_devices d
  where d.family_id = security_audit_events.family_id
    and d.auth_user_id = auth.uid()
    and d.role = 'owner'
    and d.status = 'paired'
));

revoke all on public.families from anon, authenticated;
revoke all on public.family_devices from anon, authenticated;
revoke all on public.device_pairing_requests from anon, authenticated;
revoke all on public.device_authorizations from anon, authenticated;
revoke all on public.device_commands from anon, authenticated;
revoke all on public.device_command_receipts from anon, authenticated;
revoke all on public.family_policy_versions from anon, authenticated;
revoke all on public.device_sync_state from anon, authenticated;
revoke all on public.security_audit_events from anon, authenticated;

grant select on public.families to authenticated;
grant select on public.family_devices to authenticated;
grant select on public.device_pairing_requests to authenticated;
grant select on public.device_commands to authenticated;
grant select on public.device_command_receipts to authenticated;
grant select on public.family_policy_versions to authenticated;
grant select on public.device_sync_state to authenticated;
grant select on public.security_audit_events to authenticated;

grant execute on function public.claim_family(text,text,text,text,text,text,text) to authenticated;
grant execute on function public.create_pairing_request(text,text,text,text,text) to authenticated;
grant execute on function public.approve_pairing_request(text) to authenticated;
grant execute on function public.reject_pairing_request(text) to authenticated;
grant execute on function public.activate_paired_device(text,text,text) to authenticated;
grant execute on function public.revoke_paired_device(text) to authenticated;
grant execute on function public.issue_member_lock_command(text,text,timestamptz) to authenticated;
grant execute on function public.receive_pending_commands() to authenticated;
grant execute on function public.complete_device_command(text,text,text) to authenticated;
