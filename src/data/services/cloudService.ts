import { ensureDeviceSession } from './supabase';
import { getOrCreateDeviceIdentity, signDeviceChallenge } from './deviceIdentity';
import * as Crypto from 'expo-crypto';

export type CloudDevice = {
  id: string;
  family_id: string;
  role: 'owner' | 'secondary';
  status: 'pending' | 'paired' | 'revoked';
  name: string | null;
  platform: string | null;
  last_seen_at: string | null;
  revoked_at: string | null;
};

export type PairingRequest = {
  id: string;
  family_id: string;
  requesting_device_id: string;
  device_name: string | null;
  platform: string | null;
  pairing_code: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled' | 'expired';
  expires_at: string;
};

export type CloudCommand = {
  id: string;
  family_id: string;
  source_device_id: string;
  target_device_id: string;
  command_type: string;
  payload: Record<string, unknown>;
  status: 'pending' | 'received' | 'executed' | 'failed' | 'expired' | 'cancelled';
  expires_at: string;
};

let deviceAuthentication: Promise<void> | null = null;

async function rpc<T>(name: string, params: Record<string, unknown>): Promise<T> {
  const client = await ensureDeviceSession();
  await authenticateDeviceWithServer(client);
  const { data, error } = await client.rpc(name, params);
  if (error) throw new Error(error.message);
  return data as T;
}

function authenticateDeviceWithServer(client: Awaited<ReturnType<typeof ensureDeviceSession>>) {
  if (deviceAuthentication) return deviceAuthentication;

  const authentication = authenticateDeviceWithServerOnce(client);
  deviceAuthentication = authentication;
  return authentication.finally(() => {
    if (deviceAuthentication === authentication) deviceAuthentication = null;
  });
}

async function authenticateDeviceWithServerOnce(
  client: Awaited<ReturnType<typeof ensureDeviceSession>>,
) {
  const identity = await getOrCreateDeviceIdentity();
  const challengeResult = await client.functions.invoke<{ nonce: string; expires_at: string }>(
    'device-auth',
    {
      body: {
        action: 'challenge',
        device_id: identity.deviceId,
        public_key: identity.publicKey,
      },
    },
  );
  if (challengeResult.error) throw new Error(challengeResult.error.message);
  const nonce = challengeResult.data?.nonce;
  if (!nonce) throw new Error('Supabase did not issue a device authentication challenge');
  const signature = await signDeviceChallenge(nonce);
  const verifyResult = await client.functions.invoke<{ authenticated_until: string }>(
    'device-auth',
    {
      body: {
        action: 'verify',
        device_id: identity.deviceId,
        public_key: identity.publicKey,
        signature,
      },
    },
  );
  if (verifyResult.error) throw new Error(verifyResult.error.message);
  if (!verifyResult.data?.authenticated_until) {
    throw new Error('Supabase could not authenticate this device');
  }
}

export async function claimCloudFamily(input: {
  familyId: string;
  familyName: string;
  familyDescription: string;
}) {
  const identity = await getOrCreateDeviceIdentity();
  return rpc<{ family_id: string; owner_device_id: string }>('claim_family', {
    p_family_id: input.familyId,
    p_family_name: input.familyName,
    p_family_description: input.familyDescription,
    p_device_id: identity.deviceId,
    p_public_key: identity.publicKey,
    p_device_name: 'Nest device',
    p_platform: 'Android',
  });
}

export async function createPairingRequest(familyId: string) {
  const identity = await getOrCreateDeviceIdentity();
  return rpc<{ request_id: string; pairing_code: string; expires_at: string }>(
    'create_pairing_request',
    {
      p_family_id: familyId,
      p_requesting_device_id: identity.deviceId,
      p_public_key: identity.publicKey,
      p_device_name: 'Nest device',
      p_platform: 'Android',
    },
  );
}

export async function approvePairingRequest(requestId: string) {
  return rpc<{ approved: boolean; device_id: string }>('approve_pairing_request', {
    p_request_id: requestId,
  });
}

export async function rejectPairingRequest(requestId: string) {
  return rpc<{ rejected: boolean }>('reject_pairing_request', {
    p_request_id: requestId,
  });
}

export async function cancelPairingRequest(requestId: string) {
  return rpc<{ cancelled: boolean }>('cancel_pairing_request', {
    p_request_id: requestId,
  });
}

export async function activatePairedDevice(requestId: string) {
  const identity = await getOrCreateDeviceIdentity();
  return rpc<{ paired: boolean; family_id: string; device_id: string }>(
    'activate_paired_device',
    {
      p_request_id: requestId,
      p_device_id: identity.deviceId,
      p_public_key: identity.publicKey,
    },
  );
}

export async function listCloudDevices(familyId: string) {
  const client = await ensureDeviceSession();
  await authenticateDeviceWithServer(client);
  const { data, error } = await client
    .from('family_devices')
    .select('*')
    .eq('family_id', familyId)
    .order('created_at');
  if (error) throw new Error(error.message);
  return (data ?? []) as CloudDevice[];
}

export async function listPairingRequests(familyId: string) {
  const client = await ensureDeviceSession();
  await authenticateDeviceWithServer(client);
  const { data, error } = await client
    .from('device_pairing_requests')
    .select('*')
    .eq('family_id', familyId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as PairingRequest[];
}

export async function revokeCloudDevice(deviceId: string) {
  return rpc<{ revoked: boolean }>('revoke_paired_device', {
    p_device_id: deviceId,
  });
}

export async function issueMemberLock(targetDeviceId: string, memberId: string) {
  return rpc<{ command_id: string; status: string; expires_at: string }>(
    'issue_member_lock_command',
    {
      p_target_device_id: targetDeviceId,
      p_member_id: memberId,
      p_expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    },
  );
}

export async function cancelCloudCommand(commandId: string) {
  return rpc<{ command_id: string; status: string }>('cancel_device_command', {
    p_command_id: commandId,
  });
}

export async function receivePendingCommands() {
  return rpc<CloudCommand[]>('receive_pending_commands', {});
}

export async function updateCloudFamilyDetails(
  familyId: string,
  familyName: string,
  familyDescription: string,
) {
  return rpc<{ family_id: string; updated: boolean }>('update_family_details', {
    p_family_id: familyId,
    p_family_name: familyName,
    p_family_description: familyDescription,
  });
}

export async function upsertCloudFamilyPolicy(
  familyId: string,
  policy: Record<string, unknown>,
) {
  const random = await Crypto.getRandomBytesAsync(16);
  const versionId = `policy-${Array.from(random, (byte) => byte.toString(16).padStart(2, '0')).join('')}`;
  return rpc<{ family_id: string; version_id: string }>('upsert_family_policy', {
    p_family_id: familyId,
    p_version_id: versionId,
    p_policy: policy,
  });
}

export async function reportCloudDeviceSync(familyId: string, error?: string) {
  return rpc<{ device_id: string; reported: boolean }>('report_device_sync', {
    p_family_id: familyId,
    p_error: error ?? null,
  });
}

export async function completeCloudCommand(
  commandId: string,
  result: 'executed' | 'failed',
  error?: string,
) {
  return rpc<{ command_id: string; status: string }>('complete_device_command', {
    p_command_id: commandId,
    p_result: result,
    p_error: error ?? null,
  });
}
