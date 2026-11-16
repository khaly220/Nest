import React, { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { Button } from '@/components/common/Button';
import { Card } from '@/components/common/Card';
import { InlineMessage, NoticeCard } from '@/components/common/InlineMessage';
import { ScreenContainer } from '@/components/common/ScreenContainer';
import { PasswordField, TextField } from '@/components/common/TextField';
import { AppHeader } from '@/components/navigation/AppHeader';
import { NestMark } from '@/components/common/NestMark';
import { useFamilySession } from '@/hooks/useFamilySession';
import { makeStyles, spacing, typography } from '@/theme';

/** Administrator sign-in for a family that already exists on this device. */
export default function SignInScreen() {
  const { admin, family, signInAdministrator } = useFamilySession();
  const router = useRouter();
  const styles = useStyles();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const submit = async () => {
    if (!username.trim() || !password) {
      setError('Enter your username and password.');
      return;
    }
    setBusy(true);
    setError('');
    const result = await signInAdministrator(username, password);
    setBusy(false);
    if (!result.ok) {
      setError(result.error ?? 'Sign-in could not be completed.');
      return;
    }
    setSubmitted(true);
  };

  useEffect(() => {
    if (!submitted || !admin) return;
    router.replace(family ? '/home' : '/create-family');
  }, [admin, family, router, submitted]);

  return (
    <ScreenContainer
      background="mint"
      footer={
        <View style={styles.footer}>
          <Button label="Sign in" loading={busy} onPress={submit} />
          <Button disabled={busy} label="Create a new family instead" onPress={() => router.replace('/create-family')} variant="ghost" />
        </View>
      }
      keyboardAware
      scroll
    >
      <View style={styles.brandRow}>
        <NestMark size={40} />
        <Text style={styles.word}>nest</Text>
      </View>

      <AppHeader
        eyebrow="Administrator"
        onBack={() => router.back()}
        subtitle="Sign in to review and change boundaries for this family."
        title="Welcome back"
      />

      <Card style={styles.form}>
        <TextField
          autoCapitalize="none"
          autoFocus
          icon="person-outline"
          label="Username"
          onChangeText={setUsername}
          placeholder="Your administrator username"
          value={username}
        />
        <PasswordField
          label="Password"
          onChangeText={setPassword}
          onSubmitEditing={submit}
          placeholder="Your password"
          returnKeyType="done"
          value={password}
        />
        <InlineMessage message={error} tone="danger" />
      </Card>

      <NoticeCard
        message="Nest locks an account for five minutes after five incorrect attempts. This protects the family profiles stored on a shared device."
        title="Five attempts, then a short pause"
        tone="warning"
      />

      <Card onPress={() => router.push('/member')} accessibilityLabel="Open family member sign-in">
        <View style={styles.memberRow}>
          <View style={styles.memberCopy}>
            <Text style={styles.memberTitle}>Not the administrator?</Text>
            <Text style={styles.memberBody}>Family members sign in with their own profile and PIN.</Text>
          </View>
          <Text style={styles.memberAction}>Member sign-in</Text>
        </View>
      </Card>

      <Text style={styles.note}>Accounts are checked against the encrypted store on this device. Nothing is sent anywhere.</Text>
    </ScreenContainer>
  );
}

const useStyles = makeStyles((t) => ({
  footer: { gap: spacing.xs },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingTop: spacing.xs },
  word: { fontSize: 22, fontWeight: '800', letterSpacing: -1, color: t.colors.brandInk },
  form: { gap: spacing.md },
  memberRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  memberCopy: { flex: 1, gap: 2 },
  memberTitle: { ...typography.bodyStrong, color: t.colors.ink },
  memberBody: { ...typography.micro, color: t.colors.inkSecondary, lineHeight: 17 },
  memberAction: { ...typography.caption, color: t.colors.success, fontWeight: '700' },
  note: { ...typography.micro, color: t.colors.inkSecondary, lineHeight: 18, textAlign: 'center' },
}));
