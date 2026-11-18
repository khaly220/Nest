# Nest Supabase deployment

1. Create a Supabase project and set the two public values in `.env`:
   - `EXPO_PUBLIC_SUPABASE_URL`
   - `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

2. Authenticate the Supabase CLI:

   ```sh
   npx supabase login
   npx supabase link --project-ref <project-ref>
   ```

3. Apply the versioned migration:

   ```sh
   npx supabase db push
   ```

   This applies both `202611170001_initial_cloud_security.sql` and
   `202611170002_security_hardening.sql`. Do not apply only one migration.

4. Deploy the signing challenge Edge Function:

   ```sh
   npx supabase functions deploy device-auth
   ```

   Set these Edge Function secrets in the Supabase project:

   ```sh
   npx supabase secrets set SUPABASE_PUBLISHABLE_KEY="<publishable key>"
   ```

   `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are provided automatically by Supabase to deployed functions.

5. Enable Anonymous Sign-In in Supabase Authentication:
   - Authentication -> Providers -> Anonymous Sign-ins: enabled.

6. Rebuild the Android development build after native AppDiscovery key changes:

   ```sh
   npx expo run:android
   ```

The migration enables RLS and defines server-side RPC authorization. Direct public writes are revoked; sensitive operations are only available through authenticated RPC calls.
