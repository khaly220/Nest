import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { Button } from '@/components/common/Button';
import { SectionHeader } from '@/components/common/Card';
import { InlineMessage, NoticeCard } from '@/components/common/InlineMessage';
import { ConfirmDialog } from '@/components/common/ModalSheet';
import { ScreenContainer } from '@/components/common/ScreenContainer';
import { PasswordField } from '@/components/common/TextField';
import { SettingsGroup, SettingsRow } from '@/components/cards/SettingsRow';
import { AppHeader } from '@/components/navigation/AppHeader';
import { useFamilySession } from '@/hooks/useFamilySession';
import { useToast } from '@/hooks/useToast';
import { makeStyles, spacing, typography, useTheme } from '@/theme';
import { passwordIsStrong } from '@/utils/validation';

/** Screen 15 — security: administrator password and session policy. */
export default function SecuritySettingsScreen() {
  const styles = useStyles();
  const { colors } = useTheme();
  const { changePassword, sessionExpired, clearSessionExpired } = useFamilySession();
  const router = useRouter();
  const toast = useToast();

  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const strength = passwordIsStrong(next);

  const review = () => {
    setError('');
    if (!current) {
      setError('Enter the password you use now.');
      return;
    }
    if (!strength) {
      setError('A new password needs at least 8 characters.');
      return;
    }
    if (next !== confirm) {
      setError('The two new passwords do not match.');
      return;
    }
    if (next === current) {
      setError('Choose a password that differs from the current one.');
      return;
    }
    setConfirmOpen(true);
  };

  const submit = async () => {
    setSaving(true);
    const result = await changePassword(current, next);
    setSaving(false);
    setConfirmOpen(false);
    if (!result.ok) {
      setError(result.error ?? 'The password could not be updated.');
      return;
    }
    clearSessionExpired();
    setCurrent('');
    setNext('');
    setConfirm('');
    setError('');
    toast.show('Administrator password updated', 'success');
  };

  return (
    <ScreenContainer scroll>
      <AppHeader
        eyebrow="Account"
        onBack={() => router.back()}
        subtitle="The password that unlocks every protected change on this device."
        title="Security"
      />

      {sessionExpired ? (
        <InlineMessage
          message="Your administrator window closed. Confirm your password to continue making protected changes."
          tone="warning"
        />
      ) : null}

      <SectionHeader subtitle="Changing the password asks for confirmation before it is saved." title="Change password" />

      <View style={styles.form}>
        <PasswordField label="Current password" onChangeText={setCurrent} placeholder="Your current password" value={current} />
        <PasswordField
          hint="At least 8 characters. Stored as a bcrypt hash, never in plain text."
          label="New password"
          onChangeText={setNext}
          placeholder="A new password"
          value={next}
        />
        <PasswordField label="Confirm new password" onChangeText={setConfirm} placeholder="Repeat the new password" value={confirm} />
        <View style={styles.strength}>
          <Ionicons
            color={strength ? colors.success : colors.inkMuted}
            name={strength ? 'checkmark-circle-outline' : 'ellipse-outline'}
            size={16}
          />
          <Text style={[styles.strengthLabel, strength && styles.strengthLabelMet]}>
            {strength ? 'Long enough to be accepted' : 'Needs 8 characters or more'}
          </Text>
        </View>
        <InlineMessage message={error} tone="danger" />
        <Button icon="shield-checkmark-outline" label="Change password" onPress={review} />
      </View>

      <SectionHeader subtitle="Behaviour that is built into the encrypted local store." title="Sign-in policy" />
      <SettingsGroup>
        <SettingsRow
          description="Writes to the store are only accepted inside this window."
          icon="time-outline"
          title="Administrator window"
          value="10 minutes"
        />
        <SettingsRow
          description="After this many wrong passwords the account pauses."
          icon="hand-left-outline"
          title="Attempt limit"
          value="5 attempts"
        />
        <SettingsRow description="How long a lockout lasts." icon="pause-circle-outline" title="Lockout" value="5 minutes" />
        <SettingsRow description="Hashing used for administrator passwords and member PINs." icon="key-outline" last title="Storage" value="bcrypt cost 12" />
      </SettingsGroup>

      <NoticeCard
        icon="lock-closed-outline"
        message="Passwords and PINs are hashed before they are written. Nest has no way to read them back, and they never leave this device."
        title="Stored as hashes"
      />

      <ConfirmDialog
        confirmLabel="Change password"
        icon="lock-closed-outline"
        loading={saving}
        message="Every protected change after this uses the new password. Member PINs are not affected."
        onCancel={() => setConfirmOpen(false)}
        onConfirm={submit}
        title="Update the administrator password?"
        visible={confirmOpen}
      />
    </ScreenContainer>
  );
}

const useStyles = makeStyles((t) => ({
  form: { gap: spacing.sm },
  strength: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  strengthLabel: { ...typography.micro, color: t.colors.inkMuted, fontWeight: '600' },
  strengthLabelMet: { color: t.colors.success },
}));
