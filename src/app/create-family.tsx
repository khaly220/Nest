import React, { useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';

import { Button } from '@/components/common/Button';
import { Card } from '@/components/common/Card';
import { InlineMessage } from '@/components/common/InlineMessage';
import { ScreenContainer } from '@/components/common/ScreenContainer';
import { PasswordField, TextField } from '@/components/common/TextField';
import { StepProgress } from '@/components/forms/StepProgress';
import { AppHeader } from '@/components/navigation/AppHeader';
import { useFamilySession } from '@/hooks/useFamilySession';
import { useToast } from '@/hooks/useToast';
import { makeStyles, spacing } from '@/theme';
import { passwordIsStrong, usernameIsValid } from '@/utils/validation';

const stepLabels = ['Your account', 'Family details'];

/** Step 4 of the public flow: create the family space and its administrator. */
export default function CreateFamilyScreen() {
  const { admin, registerAdministrator, createFamily } = useFamilySession();
  const router = useRouter();
  const toast = useToast();
  const styles = useStyles();

  const [step, setStep] = useState(admin ? 2 : 1);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [familyName, setFamilyName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submitAccount = async () => {
    if (busy) return;
    if (!usernameIsValid(username)) {
      setError('Use 3–32 characters: letters, numbers, dot, underscore or hyphen.');
      return;
    }
    if (!passwordIsStrong(password)) {
      setError('Your password needs at least 8 characters.');
      return;
    }
    if (password !== confirmation) {
      setError('The two passwords do not match.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const result = await registerAdministrator(username, password);
      if (!result.ok) {
        setError(result.error ?? 'The account could not be created.');
        return;
      }
      toast.show('Administrator account created', 'success');
      setStep(2);
    } catch {
      setError('Nest could not save the administrator account on this device. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const submitFamily = async () => {
    if (busy) return;
    if (familyName.trim().length < 2) {
      setError('Give the family a name with at least two characters.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const result = await createFamily(familyName, description);
      if (!result.ok) {
        setError(result.error ?? 'The family could not be saved.');
        return;
      }
      router.replace('/success');
    } catch {
      setError('Nest could not save the family to this device. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScreenContainer
      footer={
        <View style={styles.footer}>
          <Button
            label={step === 1 ? 'Create account and continue' : 'Create family space'}
            loading={busy}
            onPress={() => (step === 1 ? submitAccount() : submitFamily())}
          />
          <Button
            disabled={busy}
            label={step === 1 ? 'I already have an account' : 'Back to account'}
            onPress={() => (step === 1 ? router.replace('/sign-in') : setStep(1))}
            variant="ghost"
          />
        </View>
      }
      keyboardAware
      scroll
    >
      <AppHeader
        eyebrow="Family setup"
        onBack={() => (step === 1 ? router.back() : setStep(1))}
        subtitle={
          step === 1
            ? 'Create the administrator account.'
            : 'Choose a name for your family.'
        }
        title="Create your family"
      />

      <StepProgress current={step} labels={stepLabels} total={2} />

      {step === 1 ? (
        <Card style={styles.form}>
          <TextField
            autoCapitalize="none"
            autoFocus
            hint="3–32 characters. Letters, numbers, dot, underscore or hyphen."
            icon="person-outline"
            label="Administrator username"
            onChangeText={setUsername}
            placeholder="e.g. mama.thabo"
            value={username}
          />
          <PasswordField
            hint="At least 8 characters."
            label="Password"
            onChangeText={setPassword}
            placeholder="Choose a password"
            value={password}
          />
          <PasswordField
            label="Confirm password"
            onChangeText={setConfirmation}
            onSubmitEditing={submitAccount}
            placeholder="Repeat the password"
            returnKeyType="done"
            value={confirmation}
          />
          <InlineMessage message={error} tone="danger" />
        </Card>
      ) : (
        <Card style={styles.form}>
          {admin ? <InlineMessage message={`Signed in as @${admin.username}`} tone="success" /> : null}
          <TextField
            autoFocus
            hint="Shown on the dashboard and to members."
            icon="home-outline"
            label="Family name"
            maxLength={48}
            onChangeText={setFamilyName}
            placeholder="e.g. The Mokoena family"
            value={familyName}
          />
          <TextField
            label="Description"
            maxLength={140}
            multiline
            onChangeText={setDescription}
            placeholder="A short note about this family and its device."
            value={description}
          />
          <InlineMessage message={error} tone="danger" />
        </Card>
      )}
    </ScreenContainer>
  );
}

const useStyles = makeStyles(() => ({
  footer: { gap: spacing.xs },
  form: { gap: spacing.md },
}));
