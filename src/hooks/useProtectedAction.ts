import { useCallback } from 'react';

import { useFamilySession } from '@/hooks/useFamilySession';
import { useToast } from '@/hooks/useToast';

/**
 * Runs a write against the encrypted local store.
 *
 * The store only accepts writes inside a short administrator window. When that
 * window has closed the action is retried after the password prompt instead of
 * failing silently, so no button ever ends in a dead end.
 */
export function useProtectedAction() {
  const { requestReauthentication } = useFamilySession();
  const toast = useToast();

  return useCallback(
    (run: () => Promise<void>, successMessage?: string) => {
      run()
        .then(() => {
          if (successMessage) toast.show(successMessage, 'success');
        })
        .catch((cause: unknown) => {
          if (cause instanceof Error && cause.message === 'ADMIN_AUTH_REQUIRED') {
            requestReauthentication('Your administrator session expired. Confirm your password to save this change.', run);
            return;
          }
          toast.show('That change could not be saved on this device.', 'danger');
        });
    },
    [requestReauthentication, toast],
  );
}
