begin;

select plan(14);

insert into public.families(id, name, description, owner_device_id)
values ('revocation-test-family', 'Revocation test', '', 'revocation-test-owner');

insert into public.family_devices(
  id, family_id, auth_user_id, public_key, role, status
) values
  (
    'revocation-test-owner',
    'revocation-test-family',
    '10000000-0000-0000-0000-000000000001',
    'owner-test-public-key',
    'owner',
    'paired'
  ),
  (
    'revocation-test-secondary',
    'revocation-test-family',
    '10000000-0000-0000-0000-000000000002',
    'secondary-test-public-key',
    'secondary',
    'paired'
  );

insert into public.device_auth_sessions(
  auth_user_id, device_id, public_key, authenticated_until
) values
  (
    '10000000-0000-0000-0000-000000000001',
    'revocation-test-owner',
    'owner-test-public-key',
    now() + interval '10 minutes'
  ),
  (
    '10000000-0000-0000-0000-000000000002',
    'revocation-test-secondary',
    'secondary-test-public-key',
    now() + interval '10 minutes'
  );

select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-0000-0000-000000000001',
  true
);
select lives_ok(
  $$ select public.require_device_session(
    'revocation-test-owner', false, false, true
  ) $$,
  'active owner session is accepted'
);

select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-0000-0000-000000000002',
  true
);
select lives_ok(
  $$ select public.require_device_session(
    'revocation-test-secondary', false, false, true
  ) $$,
  'active secondary session is accepted'
);
select lives_ok(
  $$ insert into public.device_auth_challenges(
    auth_user_id, device_id, public_key, nonce, expires_at
  ) values (
    '10000000-0000-0000-0000-000000000002',
    'revocation-test-secondary',
    'secondary-test-public-key',
    'challenge-before-revocation',
    now() + interval '5 minutes'
  ) $$,
  'active device can receive a challenge'
);

select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-0000-0000-000000000001',
  true
);
select lives_ok(
  $$ select public.revoke_paired_device('revocation-test-secondary') $$,
  'owner revocation completes'
);
select is(
  (select status from public.family_devices where id = 'revocation-test-secondary'),
  'revoked',
  'revocation status is persisted'
);
select is(
  (select count(*) from public.device_auth_sessions
   where device_id = 'revocation-test-secondary'),
  0::bigint,
  'revocation removes existing authentication sessions'
);
select is(
  (select count(*) from public.device_auth_challenges
   where device_id = 'revocation-test-secondary'),
  0::bigint,
  'revocation removes outstanding challenges'
);

select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-0000-0000-000000000002',
  true
);
select ok(
  not public.has_active_family_access('revocation-test-family', false),
  'revoked session cannot read protected family data'
);
select throws_ok(
  $$ select public.require_device_session(
    'revocation-test-secondary', false, false, true
  ) $$,
  'P0001',
  'device authentication required',
  'an existing session cannot be reused after revocation'
);
select throws_ok(
  $$ insert into public.device_auth_sessions(
    auth_user_id, device_id, public_key, authenticated_until
  ) values (
    '10000000-0000-0000-0000-000000000002',
    'revocation-test-secondary',
    'secondary-test-public-key',
    now() + interval '10 minutes'
  ) $$,
  'P0001',
  'device authentication is revoked or mismatched',
  'a revoked device cannot refresh its authentication session'
);
select throws_ok(
  $$ insert into public.device_auth_challenges(
    auth_user_id, device_id, public_key, nonce, expires_at
  ) values (
    '10000000-0000-0000-0000-000000000002',
    'revocation-test-secondary',
    'secondary-test-public-key',
    'challenge-after-revocation',
    now() + interval '5 minutes'
  ) $$,
  'P0001',
  'device authentication is revoked or mismatched',
  'a revoked device cannot obtain a new challenge'
);
select throws_ok(
  $$ select public.report_device_sync('revocation-test-family', null) $$,
  'P0001',
  'device authentication required',
  'a revoked device cannot call privileged synchronization RPCs'
);
select throws_ok(
  $$ select * from public.receive_pending_commands() $$,
  'P0001',
  'device authentication required',
  'a revoked device cannot receive remote commands'
);
select is(
  (select count(*) from public.security_audit_events
   where event_type = 'device_revoked'
     and device_id = 'revocation-test-secondary'),
  1::bigint,
  'revocation audit history is retained'
);

select * from finish();
rollback;
