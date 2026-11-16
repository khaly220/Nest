import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { Button } from '@/components/common/Button';
import { Card } from '@/components/common/Card';
import { EmptyState } from '@/components/common/EmptyState';
import { InlineMessage, NoticeCard } from '@/components/common/InlineMessage';
import { ModalSheet } from '@/components/common/ModalSheet';
import { ScreenContainer } from '@/components/common/ScreenContainer';
import { PinDots, PinKeypad } from '@/components/forms/PinKeypad';
import { AppHeader } from '@/components/navigation/AppHeader';
import { ProfileAvatar } from '@/components/profiles/ProfileAvatar';
import { useFamilySession, useMemberById } from '@/hooks/useFamilySession';
import { makeStyles, radius, spacing, typography, useTheme } from '@/theme';
import { onlyDigits } from '@/utils/validation';

/** Screen 16 — PIN verification, with the face option as a design state. */
export default function MemberVerifyScreen() {
  const styles = useStyles();
  const { colors } = useTheme();
  const { memberId } = useLocalSearchParams<{ memberId?: string }>();
  const member = useMemberById(memberId);
  const { signInMember } = useFamilySession();
  const router = useRouter();

  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [faceOpen, setFaceOpen] = useState(false);

  if (!member) {
    return (
      <ScreenContainer scroll>
        <AppHeader backLabel="Choose another profile" eyebrow="Member sign-in" onBack={() => router.replace('/member')} title="Profile not found" />
        <EmptyState
          actionLabel="Choose a profile"
          icon="person-outline"
          message="This profile is no longer on the device. Pick another profile or ask the administrator to add it again."
          onAction={() => router.replace('/member')}
          title="Profile not found"
        />
      </ScreenContainer>
    );
  }

  const verify = async (value: string) => {
    if (busy || value.length < 6) return;
    setBusy(true);
    const result = await signInMember(member.id, value);
    setBusy(false);
    if (!result.ok) {
      setError(result.error ?? 'That PIN does not match this profile.');
      setPin('');
      return;
    }
    setError('');
    setPin('');
    router.replace('/member/home');
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
        backLabel="Choose another profile"
        eyebrow="Member sign-in"
        onBack={() => router.replace('/member')}
        subtitle="Your PIN keeps this profile separate from everybody else's."
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
          <Text style={styles.pinLabel}>Enter your PIN</Text>
          <PinDots error={Boolean(error)} filled={pin.length} length={8} />
          <PinKeypad
            biometricLabel="Use face recognition"
            disabled={busy}
            onBiometric={() => setFaceOpen(true)}
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
            label="Sign in"
            loading={busy}
            onPress={() => void verify(pin)}
            style={styles.signIn}
          />
        </View>
      ) : (
        <EmptyState
          actionLabel="Choose another profile"
          icon="key-outline"
          message="This profile has no PIN yet, so it cannot sign in. An administrator needs to set one from the family screen."
          onAction={() => router.replace('/member')}
          title="No PIN set"
        />
      )}

      <Button icon="people-outline" label="Not you? Choose another profile" onPress={() => router.replace('/member')} variant="ghost" />

      <ModalSheet
        footer={
          <>
            <Button icon="keypad-outline" label="Use my PIN instead" onPress={() => setFaceOpen(false)} />
            <Button label="Choose another profile" onPress={() => router.replace('/member')} variant="ghost" />
          </>
        }
        onClose={() => setFaceOpen(false)}
        subtitle="Framing preview for the camera step."
        title="Face recognition"
        visible={faceOpen}
      >
        <View style={styles.camera}>
          <View style={styles.cameraFrame}>
            <Ionicons color={colors.onDark} name="person-outline" size={54} />
          </View>
          <Text style={styles.cameraLabel}>Camera preview</Text>
        </View>
        <NoticeCard
          message="Face matching is not part of this build. Nothing is captured, nothing is compared, and no match is ever reported. This screen exists so the flow and its layout are ready for the on-device engine."
          title="Design state, not a working match"
          tone="warning"
        />
      </ModalSheet>
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
  camera: { alignItems: 'center', gap: spacing.sm },
  cameraFrame: {
    width: 168,
    height: 168,
    borderRadius: radius.xxl,
    backgroundColor: t.colors.brandDeep,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraLabel: { ...typography.caption, color: t.colors.inkSecondary, fontWeight: '700' },
}));
