import React, { useEffect, useState } from 'react';
import {
  Text,
  View,
  Keyboard,
  TouchableWithoutFeedback,
  Pressable,
  Modal,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';

import { Button } from '@/components/common/Button';
import { InlineMessage } from '@/components/common/InlineMessage';
import { ScreenContainer } from '@/components/common/ScreenContainer';
import {
  PasswordField,
  TextField,
} from '@/components/common/TextField';
import { NestMark } from '@/components/common/NestMark';
import { useFamilySession } from '@/hooks/useFamilySession';
import { useToast } from '@/hooks/useToast';
import { makeStyles, spacing, typography } from '@/theme';
import { passwordIsStrong, usernameIsValid } from '@/utils/validation';

export default function SignInScreen() {
  const { admin, family, registerAdministrator, signInAdministrator } = useFamilySession();
  const router = useRouter();
  const toast = useToast();
  const styles = useStyles();

  const [mode, setMode] = useState<'sign-in' | 'sign-up'>('sign-in');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [aboutVisible, setAboutVisible] = useState(false);

  const submitSignUp = async () => {
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

    Keyboard.dismiss();
    setBusy(true);
    setError('');
    try {
      const result = await registerAdministrator(username.trim(), password);
      if (!result.ok) {
        setError(result.error ?? 'The account could not be created.');
        return;
      }
      toast.show('Administrator account created', 'success');
      setSubmitted(true);
    } catch {
      setError('Nest could not save the administrator account on this device. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const submit = async () => {
    if (busy) return;

    if (mode === 'sign-up') {
      await submitSignUp();
      return;
    }

    if (!username.trim() || !password) {
      setError('Please enter your username and password.');
      return;
    }

    Keyboard.dismiss();
    setBusy(true);
    setError('');

    try {
      const result = await signInAdministrator(
        username.trim(),
        password
      );

      if (!result.ok) {
        setError(
          result.error ?? 'Unable to sign in. Please try again.'
        );
        return;
      }

      setSubmitted(true);
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (!submitted || !admin) return;

    router.replace(family ? '/home' : '/create-family');
  }, [admin, family, router, submitted]);

  return (
    <>
      <ScreenContainer
        background="mint"
        keyboardAware
        scroll
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.container}>

            {/* Top Bar / Header */}
            <View style={styles.topBar}>
              <View style={styles.brandRow}>
                <NestMark size={40} />
                <Text style={styles.brandName}>nest</Text>
              </View>

              <Pressable
                onPress={() => {
                  Keyboard.dismiss();
                  setAboutVisible(true);
                }}
                style={styles.helpButton}
                accessibilityRole="button"
                accessibilityLabel="About Nest"
              >
                <Text style={styles.helpIcon}>?</Text>
              </Pressable>
            </View>

            {/* Welcome Title */}
            <View style={styles.heading}>
              <Text style={styles.headingTitle}>{mode === 'sign-in' ? 'Welcome Back' : 'Create your account'}</Text>
              <Text style={styles.subtitle}>
                {mode === 'sign-in' ? 'Sign in to manage your family.' : 'Create an administrator account to get started.'}
              </Text>
            </View>

            {/* Main Card Container (Shadow removed & fills screen width) */}
            <View style={styles.card}>
              {/* Segmented Tab Selector */}
              <View style={styles.tabContainer}>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => {
                    setMode('sign-in');
                    setError('');
                    setPassword('');
                    setConfirmation('');
                  }}
                  style={[styles.tab, mode === 'sign-in' && styles.activeTab]}
                >
                  <Text style={[styles.tabText, mode === 'sign-in' && styles.activeTabText]}>Sign in</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => {
                    setMode('sign-up');
                    setError('');
                    setPassword('');
                    setConfirmation('');
                  }}
                  style={[styles.tab, mode === 'sign-up' && styles.activeTab]}
                >
                  <Text style={[styles.tabText, mode === 'sign-up' && styles.activeTabText]}>Sign up</Text>
                </Pressable>
              </View>

              {/* Form Fields */}
              <View style={styles.form}>
                <TextField
                  autoCapitalize="none"
                  autoCorrect={false}
                  icon="person-outline"
                  hint={mode === 'sign-up' ? '3–32 characters. Letters, numbers, dot, underscore or hyphen.' : undefined}
                  label={mode === 'sign-up' ? 'Administrator username' : 'Username'}
                  maxLength={mode === 'sign-up' ? 32 : undefined}
                  onChangeText={(value) => {
                    setUsername(value);
                    setError('');
                  }}
                  placeholder={mode === 'sign-up' ? 'Choose a username' : 'Enter your username'}
                  value={username}
                />

                <PasswordField
                  hint={mode === 'sign-up' ? 'At least 8 characters.' : undefined}
                  label={mode === 'sign-up' ? 'Choose a password' : 'Password'}
                  onChangeText={(value) => {
                    setPassword(value);
                    setError('');
                  }}
                  onSubmitEditing={mode === 'sign-up' ? submitSignUp : submit}
                  placeholder={mode === 'sign-up' ? 'Choose a password' : 'Enter your Password'}
                  returnKeyType={mode === 'sign-up' ? 'next' : 'done'}
                  value={password}
                />

                {mode === 'sign-up' ? (
                  <PasswordField
                    label="Confirm password"
                    onChangeText={(value) => {
                      setConfirmation(value);
                      setError('');
                    }}
                    onSubmitEditing={submitSignUp}
                    placeholder="Repeat your password"
                    returnKeyType="done"
                    value={confirmation}
                  />
                ) : null}

                {error ? (
                  <InlineMessage
                    message={error}
                    tone="danger"
                  />
                ) : null}

                {/* Login Button */}
                <Button
                  label={mode === 'sign-up' ? 'Create account' : 'Sign in'}
                  loading={busy}
                  onPress={mode === 'sign-up' ? submitSignUp : submit}
                />

              </View>
            </View>

          </View>
        </TouchableWithoutFeedback>
      </ScreenContainer>

      {/* About Nest modal */}
      <Modal
        visible={aboutVisible}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setAboutVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <Pressable
            style={styles.modalBackdrop}
            onPress={() => setAboutVisible(false)}
          />

          <View style={styles.aboutCard}>
            <View style={styles.modalHeader}>
              <View style={styles.modalBrand}>
                <NestMark size={32} />
                <Text style={styles.modalBrandName}>About Nest</Text>
              </View>

              <Pressable
                onPress={() => setAboutVisible(false)}
                style={styles.closeButton}
                accessibilityRole="button"
                accessibilityLabel="Close About Nest"
              >
                <Text style={styles.closeIcon}>×</Text>
              </Pressable>
            </View>

            <ScrollView
              style={styles.aboutScroll}
              showsVerticalScrollIndicator={false}
            >
              <Text style={styles.aboutIntro}>
                A safer digital home.
              </Text>

              <Text style={styles.aboutDescription}>
                Nest helps parents set app boundaries for family members on supported Android devices.
              </Text>

              <View style={styles.aboutPrivacy}>
                <Text style={styles.aboutPrivacyTitle}>
                  Local data
                </Text>
                <Text style={styles.aboutPrivacyText}>
                  Family data stays on this device. Some restrictions require Android Device Owner setup.
                </Text>
              </View>
            </ScrollView>

            <Button
              label="Got it"
              onPress={() => setAboutVisible(false)}
            />
          </View>
        </View>
      </Modal>
    </>
  );
}

const useStyles = makeStyles((t) => ({
  container: {
    width: '100%',
    alignSelf: 'stretch',
    flexGrow: 1,
    gap: spacing.md,
    paddingBottom: spacing.xl,
    paddingHorizontal: 0,
  },

  topBar: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.sm,
    paddingHorizontal: spacing.sm,
  },

  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },

  brandName: {
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: -1,
    color: t.colors.brandInk,
  },

  helpButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(29, 70, 85, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  helpIcon: {
    fontSize: 18,
    fontWeight: '700',
    color: t.colors.brandInk,
  },

  heading: {
    width: '100%',
    alignItems: 'center',
    gap: 4,
    marginVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },

  headingTitle: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
    color: t.colors.brandInk,
    textAlign: 'center',
  },

  subtitle: {
    fontSize: 13,
    color: t.colors.inkSecondary,
    textAlign: 'center',
  },

  card: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    padding: spacing.lg,
    width: '100%',
    alignSelf: 'stretch',
    flex: 1,
    gap: spacing.md,
    marginTop: spacing.sm,
  },

  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: 30,
    padding: 4,
  },

  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 26,
  },

  activeTab: { backgroundColor: '#FFFFFF' },

  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },

  activeTabText: {
    color: '#111827',
  },

  form: {
    width: '100%',
    gap: spacing.md,
  },

  // About modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.48)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 22,
  },

  modalBackdrop: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },

  aboutCard: {
    width: '100%',
    maxWidth: 440,
    maxHeight: '82%',
    backgroundColor: t.colors.surface,
    borderRadius: 24,
    padding: spacing.lg,
    gap: spacing.md,
  },

  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  modalBrand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },

  modalBrandName: {
    fontSize: 18,
    fontWeight: '800',
    color: t.colors.brandInk,
  },

  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(29, 70, 85, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  closeIcon: {
    fontSize: 22,
    lineHeight: 25,
    color: t.colors.brandInk,
  },

  aboutScroll: {
    flexShrink: 1,
  },

  aboutIntro: {
    fontSize: 17,
    fontWeight: '800',
    color: t.colors.brandInk,
    marginBottom: spacing.sm,
  },

  aboutDescription: {
    ...typography.body,
    color: t.colors.inkSecondary,
    lineHeight: 22,
    marginBottom: spacing.md,
  },

  aboutPrivacy: {
    padding: spacing.md,
    borderRadius: 15,
    backgroundColor: 'rgba(29, 70, 85, 0.08)',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },

  aboutPrivacyTitle: {
    ...typography.bodyStrong,
    color: t.colors.brandInk,
  },

  aboutPrivacyText: {
    ...typography.micro,
    color: t.colors.inkSecondary,
    lineHeight: 18,
  },
}));