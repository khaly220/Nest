import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim();
const supabasePublishableKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();

export type SupabaseConfiguration =
  | { ok: true; client: SupabaseClient }
  | { ok: false; error: string };

let supabaseClient: SupabaseClient | null = null;

export function getSupabaseConfiguration(): SupabaseConfiguration {
  if (!supabaseUrl || !supabasePublishableKey) {
    return {
      ok: false,
      error: 'Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY.',
    };
  }

  if (!/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/.test(supabaseUrl)) {
    return { ok: false, error: 'EXPO_PUBLIC_SUPABASE_URL is not a valid Supabase project URL.' };
  }

  if (supabasePublishableKey.startsWith('eyJ') || supabasePublishableKey.includes('service_role')) {
    return { ok: false, error: 'A publishable key is required; service-role and secret keys cannot be used.' };
  }

  if (!supabaseClient) {
    supabaseClient = createClient(supabaseUrl, supabasePublishableKey, {
      auth: {
        persistSession: true,
        storage: AsyncStorage,
        autoRefreshToken: true,
        detectSessionInUrl: false,
      },
      global: { headers: { 'X-Nest-Client': 'nest-mobile' } },
    });
  }

  return { ok: true, client: supabaseClient };
}

export async function ensureDeviceSession(): Promise<SupabaseClient> {
  const configuration = getSupabaseConfiguration();
  if (!configuration.ok) throw new Error(configuration.error);

  const client = configuration.client;
  const { data: sessionData } = await client.auth.getSession();
  if (!sessionData.session) {
    const { data, error } = await client.auth.signInAnonymously();
    if (error) throw new Error(`Supabase authentication failed: ${error.message}`);
    if (!data.session) throw new Error('Supabase did not create a device session.');
  }
  return client;
}
