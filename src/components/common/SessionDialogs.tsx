import React, { useState } from 'react';
import { Text, View } from 'react-native';

import { Button } from '@/components/common/Button';
import { InlineMessage } from '@/components/common/InlineMessage';
import { ModalSheet } from '@/components/common/ModalSheet';
import { PasswordField } from '@/components/common/TextField';
import { useFamilySession } from '@/hooks/useFamilySession';
import { makeStyles, spacing, typography } from '@/theme';

/**
 * Global prompts for protected administrator actions.
 * The local store refuses writes when the ten-minute administrator window has
 * closed; the session provider catches that and asks for the password again.
 */
export function SessionDialogs() {
  const { reauth, sessionExpired, clearSessionExpired, submitReauthentication, cancelReauthentication } = useFamilySession();
  const styles = useStyles();
  const [password, setPassword] = useState('');

  const confirm = () => {
    const value = password;
    setPassword('');
    submitReauthentication(value);
  };

  const cancel = () => {
    setPassword('');
    cancelReauthentication();
  };

  return (
    <>
      <ModalSheet
        dismissable={!reauth.busy}
        footer={
          <>
            <Button label="Confirm and continue" loading={reauth.busy} onPress={confirm} />
            <Button disabled={reauth.busy} label="Not now" onPress={cancel} variant="ghost" />
          </>
        }
        onClose={cancel}
        subtitle={reauth.reason}
        title="Confirm it's you"
        visible={reauth.visible}
      >
        <PasswordField
          autoFocus
          label="Administrator password"
          onChangeText={setPassword}
          onSubmitEditing={confirm}
          placeholder="Enter your current password"
          value={password}
        />
        <InlineMessage message={reauth.error} tone="danger" />
        <Text style={styles.note}>
          Protected changes save to the encrypted store on this device only after your password is confirmed.
        </Text>
      </ModalSheet>

      {sessionExpired ? (
        <View style={styles.banner}>
          <Text style={styles.bannerTitle}>Administrator session expired</Text>
          <Text style={styles.bannerBody}>
            Your ten-minute administration window closed. Try the change again and Nest will ask for your password.
          </Text>
          <Button label="Got it" onPress={clearSessionExpired} size="md" variant="secondary" />
        </View>
      ) : null}
    </>
  );
}

const useStyles = makeStyles((t) => ({
  note: { ...typography.micro, color: t.colors.inkSecondary, lineHeight: 17 },
  banner: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    bottom: spacing.md,
    gap: spacing.xs,
    padding: spacing.md,
    borderRadius: 18,
    backgroundColor: t.colors.warningTint,
    borderWidth: 1,
    borderColor: t.colors.warning,
  },
  bannerTitle: { ...typography.bodyStrong, color: t.colors.warning },
  bannerBody: { ...typography.micro, color: t.colors.inkSecondary, lineHeight: 17 },
}));
