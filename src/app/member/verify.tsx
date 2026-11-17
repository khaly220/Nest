import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { Button } from '@/components/common/Button';
import { Card } from '@/components/common/Card';
import { EmptyState } from '@/components/common/EmptyState';
import { InlineMessage } from '@/components/common/InlineMessage';
import { ScreenContainer } from '@/components/common/ScreenContainer';
import { PinDots, PinKeypad } from '@/components/forms/PinKeypad';
import { AppHeader } from '@/components/navigation/AppHeader';
import { ProfileAvatar } from '@/components/profiles/ProfileAvatar';
import { useFamilySession, useMemberById } from '@/hooks/useFamilySession';
import { makeStyles, spacing, typography } from '@/theme';
import { onlyDigits } from '@/utils/validation';

/** Screen 16 — member PIN verification. */
export default function MemberVerifyScreen() {
  const styles = useStyles();
  const { memberId } = useLocalSearchParams<{ memberId?: string }>();
  const member = useMemberById(memberId);
  const { lockedMemberId, signInMember } = useFamilySession();
  const router = useRouter();
  const isSessionLocked = Boolean(memberId && lockedMemberId === memberId);

  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (!member) {
    return (
      <ScreenContainer scroll>
        <AppHeader
          backLabel={isSessionLocked ? 'Administrator sign-in' : 'Choose another profile'}
          eyebrow="Member sign-in"
          onBack={() => router.replace(isSessionLocked ? '/sign-in' : '/member')}
          title="Profile not found"
        />
        <EmptyState
          actionLabel={isSessionLocked ? 'Administrator sign-in' : 'Choose a profile'}
          icon="person-outline"
          message={
            isSessionLocked
              ? 'This locked profile is no longer on the device. Ask the administrator to sign in.'
              : 'This profile is no longer on the device. Pick another profile or ask the administrator to add it again.'
          }
          onAction={() => router.replace(isSessionLocked ? '/sign-in' : '/member')}
          title="Profile not found"
        />
      </ScreenContainer>
    );
  }

  const verify = async (value: string) => {
    if (busy || value.length < 6) return;
    setBusy(true);
    try {
      const result = await signInMember(member.id, value);
      if (!result.ok) {
        setError(result.error ?? 'That PIN does not match this profile.');
        setPin('');
        return;
      }
      setError('');
      setPin('');
      router.replace('/member/home');
    } catch {
      setError('Could not verify this PIN. Please try again.');
      setPin('');
    } finally {
      setBusy(false);
    }
  };

  const handleDigit = (digit: string) => {
    if (busy) return;
    setError('');
    const next = onlyDigits(pin + digit, 8);
    setPin(next);
    if (next.length === 8) void verify(next);
  };

  return (
    <ScreenContainer scroll>
      <AppHeader
        backLabel={isSessionLocked ? 'Administrator sign-in' : 'Choose another profile'}
        eyebrow="Member sign-in"
        onBack={() => router.replace(isSessionLocked ? '/sign-in' : '/member')}
        subtitle={
          isSessionLocked
            ? 'Nest locked this profile when the app left the foreground. Enter its PIN to continue.'
            : "Your PIN keeps this profile separate from everybody else's."
        }
        title={member.fullName}
      />

      <Card style={styles.identity}>
        <View style={styles.identityRow}>
          <ProfileAvatar avatar={member.avatar} name={member.fullName} size={56} />
          <View style={styles.identityCopy}>
            <Text numberOfLines={1} style={styles.name}>
              {member.fullName}
            </Text>
            <Text style={styles.meta}>
              {member.ageGroup === 'child' ? 'Child profile' : member.ageGroup === 'teen' ? 'Teen profile' : 'Adult profile'}
            </Text>
          </View>
        </View>
      </Card>

      {member.hasCredential ? (
        <View style={styles.pinBlock}>
          <Text style={styles.pinLabel}>{isSessionLocked ? 'Enter your PIN to unlock' : 'Enter your PIN'}</Text>
          <PinDots error={Boolean(error)} filled={pin.length} length={8} />
          <PinKeypad
            disabled={busy}
            onDelete={() => {
              setError('');
              setPin((current) => current.slice(0, -1));
            }}
            onDigit={handleDigit}
          />
          <Text style={styles.pinHint}>PINs are 6 to 8 digits. Eight digits signs you in automatically.</Text>
          <InlineMessage message={error} tone="danger" />
          <Button
            disabled={pin.length < 6}
            icon="log-in-outline"
            label={isSessionLocked ? 'Unlock profile' : 'Sign in'}
            loading={busy}
            onPress={() => void verify(pin)}
            style={styles.signIn}
          />
        </View>
      ) : (
        <EmptyState
          actionLabel={isSessionLocked ? 'Administrator sign-in' : 'Choose another profile'}
          icon="key-outline"
          message="This profile has no PIN yet, so it cannot sign in. An administrator needs to set one from the family screen."
          onAction={() => router.replace(isSessionLocked ? '/sign-in' : '/member')}
          title="No PIN set"
        />
      )}

      {isSessionLocked ? (
        <Button
          icon="settings-outline"
          label="I'm the administrator"
          onPress={() => router.replace('/sign-in')}
          variant="ghost"
        />
      ) : (
        <Button
          icon="people-outline"
          label="Not you? Choose another profile"
          onPress={() => router.replace('/member')}
          variant="ghost"
        />
      )}

    </ScreenContainer>
  );
}

const useStyles = makeStyles((t) => ({
  identity: { padding: spacing.sm },
  identityRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  identityCopy: { flex: 1, gap: 2 },
  name: { ...typography.title3, color: t.colors.ink },
  meta: { ...typography.micro, color: t.colors.inkSecondary },
  pinBlock: { alignItems: 'center', gap: spacing.md },
  pinLabel: { ...typography.eyebrow, color: t.colors.inkSecondary },
  pinHint: { ...typography.micro, color: t.colors.inkMuted, textAlign: 'center' },
  signIn: { alignSelf: 'stretch' },
}));
