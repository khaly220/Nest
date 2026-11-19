import { createClient } from 'npm:@supabase/supabase-js@2';
import { derSignatureToRaw } from '../_shared/ecdsa.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function decodeBase64(value: string): Uint8Array {
  const binary = atob(value);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const publishableKey = Deno.env.get('SUPABASE_PUBLISHABLE_KEY');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !publishableKey || !serviceRoleKey) {
      throw new Error('Supabase Edge Function secrets are not configured');
    }

    const authHeader = request.headers.get('Authorization');
    if (!authHeader) return new Response('Authentication required', { status: 401, headers: corsHeaders });
    const userClient = createClient(supabaseUrl, publishableKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userError } = await userClient.auth.getUser();
    if (userError || !userData.user) {
      return new Response('Invalid device session', { status: 401, headers: corsHeaders });
    }

    const body = await request.json();
    const action = body.action;
    const deviceId = String(body.device_id ?? '');
    const publicKey = String(body.public_key ?? '');
    if (!deviceId || publicKey.length < 64) {
      return new Response('Invalid device identity', { status: 400, headers: corsHeaders });
    }

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: registeredDevice, error: deviceError } = await admin
      .from('family_devices')
      .select('auth_user_id, public_key, role, status, revoked_at')
      .eq('id', deviceId)
      .maybeSingle();
    if (deviceError) throw deviceError;
    if (
      registeredDevice &&
      (registeredDevice.status === 'revoked' ||
        registeredDevice.revoked_at !== null ||
        registeredDevice.public_key !== publicKey ||
        (registeredDevice.status === 'paired' &&
          registeredDevice.auth_user_id !== userData.user.id) ||
        (registeredDevice.status === 'pending' &&
          (registeredDevice.role !== 'secondary' || registeredDevice.auth_user_id !== null)) ||
        !['paired', 'pending'].includes(registeredDevice.status))
    ) {
      return new Response('Device is not authorized', { status: 403, headers: corsHeaders });
    }

    if (action === 'challenge') {
      const nonce = crypto.randomUUID();
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
      const { error } = await admin.from('device_auth_challenges').upsert({
        auth_user_id: userData.user.id,
        device_id: deviceId,
        public_key: publicKey,
        nonce,
        expires_at: expiresAt,
        consumed_at: null,
      });
      if (error) throw error;
      return new Response(JSON.stringify({ nonce, expires_at: expiresAt }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'verify') {
      const signature = String(body.signature ?? '');
      const { data: challenge, error: challengeError } = await admin
        .from('device_auth_challenges')
        .select('*')
        .eq('auth_user_id', userData.user.id)
        .maybeSingle();
      if (challengeError) throw challengeError;
      if (!challenge) return new Response('Challenge not found', { status: 400, headers: corsHeaders });
      if (challenge.device_id !== deviceId || challenge.public_key !== publicKey) {
        return new Response('Device identity mismatch', { status: 403, headers: corsHeaders });
      }
      if (new Date(challenge.expires_at).getTime() <= Date.now()) {
        return new Response('Challenge expired', { status: 400, headers: corsHeaders });
      }
      if (challenge.consumed_at) {
        return new Response('Challenge already used', { status: 409, headers: corsHeaders });
      }

      const consumedAt = new Date().toISOString();
      const { data: consumed, error: consumeError } = await admin
        .from('device_auth_challenges')
        .update({ consumed_at: consumedAt })
        .eq('auth_user_id', userData.user.id)
        .eq('nonce', challenge.nonce)
        .is('consumed_at', null)
        .select('nonce')
        .maybeSingle();
      if (consumeError) throw consumeError;
      if (!consumed) {
        return new Response('Challenge already used', { status: 409, headers: corsHeaders });
      }

      const publicKeyBytes = decodeBase64(publicKey);
      const key = await crypto.subtle.importKey(
        'spki',
        publicKeyBytes,
        { name: 'ECDSA', namedCurve: 'P-256' },
        false,
        ['verify'],
      );
      const rawSignature = derSignatureToRaw(decodeBase64(signature));
      const verified = await crypto.subtle.verify(
        { name: 'ECDSA', hash: 'SHA-256' },
        key,
        rawSignature,
        new TextEncoder().encode(challenge.nonce),
      );
      if (!verified) return new Response('Invalid signature', { status: 403, headers: corsHeaders });

      const authenticatedUntil = new Date(Date.now() + 10 * 60 * 1000).toISOString();
      const { error: sessionError } = await admin.from('device_auth_sessions').upsert({
        auth_user_id: userData.user.id,
        device_id: deviceId,
        public_key: publicKey,
        authenticated_until: authenticatedUntil,
      });
      if (sessionError) throw sessionError;

      const { error: deleteChallengeError } = await admin
        .from('device_auth_challenges')
        .delete()
        .eq('auth_user_id', userData.user.id)
        .eq('nonce', challenge.nonce);
      if (deleteChallengeError) throw deleteChallengeError;

      return new Response(JSON.stringify({ authenticated_until: authenticatedUntil }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response('Unknown action', { status: 400, headers: corsHeaders });
  } catch (error) {
    console.error('[Nest device-auth]', error instanceof Error ? error.message : 'Unknown error');
    return new Response('Device authentication failed', { status: 500, headers: corsHeaders });
  }
});
