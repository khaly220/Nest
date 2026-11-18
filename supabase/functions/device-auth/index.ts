import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function decodeBase64(value: string): Uint8Array {
  const binary = atob(value);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function derSignatureToRaw(signature: Uint8Array): Uint8Array {
  function readLength(index: number): [number, number] {
    const first = signature[index];
    if (first === undefined) throw new Error('Malformed DER signature');
    if ((first & 0x80) === 0) return [first, index + 1];
    const lengthBytes = first & 0x7f;
    if (lengthBytes === 0 || lengthBytes > 4) throw new Error('Malformed DER signature');
    let length = 0;
    for (let i = 0; i < lengthBytes; i++) {
      const next = signature[index + 1 + i];
      if (next === undefined) throw new Error('Malformed DER signature');
      length = length * 256 + next;
    }
    return [length, index + 1 + lengthBytes];
  }

  if (signature[0] !== 0x30) throw new Error('Malformed DER signature');
  const [sequenceLength, sequenceContentIndex] = readLength(1);
  if (sequenceContentIndex + sequenceLength !== signature.length) {
    throw new Error('Malformed DER signature');
  }
  let offset = sequenceContentIndex;

  if (signature[offset] !== 0x02) throw new Error('Malformed DER signature');
  const [rLength, rStartIndex] = readLength(offset + 1);
  const rStart = rStartIndex;
  if (rStart + rLength > signature.length) throw new Error('Malformed DER signature');
  let r = signature.slice(rStart, rStart + rLength);
  offset = rStart + rLength;

  if (signature[offset] !== 0x02) throw new Error('Malformed DER signature');
  const [sLength, sStartIndex] = readLength(offset + 1);
  const sStart = sStartIndex;
  if (sStart + sLength > signature.length) throw new Error('Malformed DER signature');
  let s = signature.slice(sStart, sStart + sLength);

  if (r[0] === 0 && r.length > 32) r = r.slice(1);
  if (s[0] === 0 && s.length > 32) s = s.slice(1);
  if (r.length > 32 || s.length > 32 || r.length === 0 || s.length === 0) {
    throw new Error('Malformed ECDSA signature');
  }

  const raw = new Uint8Array(64);
  raw.set(r, 32 - r.length);
  raw.set(s, 64 - s.length);
  return raw;
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

      await admin.from('device_auth_challenges').delete().eq('auth_user_id', userData.user.id);
      const authenticatedUntil = new Date(Date.now() + 10 * 60 * 1000).toISOString();
      const { error: sessionError } = await admin.from('device_auth_sessions').upsert({
        auth_user_id: userData.user.id,
        device_id: deviceId,
        public_key: publicKey,
        authenticated_until: authenticatedUntil,
      });
      if (sessionError) throw sessionError;

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
