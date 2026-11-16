import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { MemberCard } from '@/components/cards/MemberCard';
import { SettingsGroup, SettingsRow } from '@/components/cards/SettingsRow';
import { Button } from '@/components/common/Button';
import { Card, SectionHeader } from '@/components/common/Card';
import { InlineMessage, NoticeCard } from '@/components/common/InlineMessage';
import { ScreenContainer } from '@/components/common/ScreenContainer';
import { TextField } from '@/components/common/TextField';
import { OptionCard } from '@/components/forms/ChoiceRow';
import { PinDots, PinKeypad } from '@/components/forms/PinKeypad';
import { StepProgress } from '@/components/forms/StepProgress';
import { AppHeader } from '@/components/navigation/AppHeader';
import { AvatarPicker, avatarOptions } from '@/components/profiles/ProfileAvatar';
import { ageGroupDescription, ageGroupLabel } from '@/data/mock/apps';
import { installedAppCatalogSupported } from '@/data/services/installedApps';
import type { FamilyMember } from '@/data/familyStore';
import { useFamilySession } from '@/hooks/useFamilySession';
import { useToast } from '@/hooks/useToast';
import { makeStyles, spacing, typography, useTheme } from '@/theme';
import type { AgeGroup } from '@/types';
import { isPinComplete, onlyDigits } from '@/utils/validation';

const stepLabels = ['Personal info', 'Authentication', 'Application access', 'Review'];

const ageGroupIcon: Record<AgeGroup, 'happy-outline' | 'school-outline' | 'briefcase-outline'> = {
  child: 'happy-outline',
  teen: 'school-outline',
  adult: 'briefcase-outline',
};

/** Screen 9 — guided four-step wizard for adding a family member profile. */
export default function AddMemberScreen() {
  const styles = useStyles();
  const { colors } = useTheme();
  const { family, addMemberProfile, requestReauthentication } = useFamilySession();
  const router = useRouter();
  const toast = useToast();

  const [step, setStep] = useState(1);
  const [fullName, setFullName] = useState('');
  const [ageGroup, setAgeGroup] = useState<AgeGroup>('child');
  const [avatar, setAvatar] = useState(avatarOptions[0].id);
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [pinStage, setPinStage] = useState<'create' | 'confirm'>('create');
  const [accessMode, setAccessMode] = useState<'recommended' | 'customise'>('recommended');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const activePin = pinStage === 'create' ? pin : confirmPin;

  const handleDigit = (digit: string) => {
    setError('');
    if (pinStage === 'create') {
      const next = onlyDigits(pin + digit, 8);
      setPin(next);
      if (next.length === 8) setPinStage('confirm');
      return;
    }
    setConfirmPin(onlyDigits(confirmPin + digit, 8));
  };

  const handleDelete = () => {
    setError('');
    if (pinStage === 'create') setPin(pin.slice(0, -1));
    else setConfirmPin(confirmPin.slice(0, -1));
  };

  async function submit() {
    setError('');
    if (fullName.trim().length < 2) {
      setStep(1);
      setError('Enter the name this family member will see.');
      return;
    }
    if (!isPinComplete(pin)) {
      setStep(2);
      setPinStage('create');
      setError('A sign-in PIN needs 6 to 8 digits.');
      return;
    }
    setSaving(true);
    const result = await addMemberProfile({ fullName: fullName.trim(), ageGroup, avatar, pin });
    setSaving(false);
    if (result.ok) {
      toast.show(`${fullName.trim()} was added to the family`, 'success');
      router.replace(accessMode === 'customise' ? `/members/${result.member.id}/access` : `/members/${result.member.id}`);
      return;
    }
    setError(result.error ?? 'The member profile could not be saved.');
    if (result.error?.includes('session expired')) {
      requestReauthentication('Confirm your administrator password to finish adding this profile.', submit);
    }
  }

  const goBack = () => {
    setError('');
    if (step === 2 && pinStage === 'confirm') {
      setPinStage('create');
      return;
    }
    setStep((current) => Math.max(1, current - 1));
  };

  const goNext = () => {
    setError('');
    if (step === 1) {
      if (fullName.trim().length < 2) {
        setError('Enter the name this family member will see.');
        return;
      }
      setStep(2);
      return;
    }
    if (step === 2) {
      if (pinStage === 'create') {
        if (!isPinComplete(pin)) {
          setError('A sign-in PIN needs 6 to 8 digits.');
          return;
        }
        setPinStage('confirm');
        return;
      }
      if (pin !== confirmPin) {
        setConfirmPin('');
        setError('Those PINs do not match. Enter the confirmation again.');
        return;
      }
      setStep(3);
      return;
    }
    if (step === 3) {
      setStep(4);
      return;
    }
    void submit();
  };

  const previewMember: FamilyMember = {
    id: 'preview',
    familyId: family?.id ?? 'preview',
    fullName: fullName.trim() || 'New profile',
    ageGroup,
    avatar,
    authMethod: 'pin',
    createdAt: new Date().toISOString(),
    hasCredential: true,
  };

  return (
    <ScreenContainer
      footer={
        <View style={styles.footer}>
          {step > 1 ? (
            <Button label="Back" onPress={goBack} style={styles.footerButton} variant="secondary" />
          ) : null}
          <Button
            icon={step === 4 ? 'checkmark-circle-outline' : undefined}
            label={step === 4 ? 'Create profile' : 'Continue'}
            loading={saving}
            onPress={goNext}
            style={styles.footerButton}
          />
        </View>
      }
      keyboardAware
      scroll
    >
      <AppHeader
        eyebrow="New profile"
        onBack={() => (step === 1 ? router.back() : goBack())}
        subtitle="Each profile gets its own sign-in and its own set of applications."
        title="Add a family member"
      />

      <StepProgress current={step} labels={stepLabels} total={4} />

      {step === 1 ? (
        <>
          <Card style={styles.card}>
            <TextField
              autoFocus
              hint="First and last name, or however this person is known at home."
              label="Full name"
              onChangeText={(value) => {
                setFullName(value);
                setError('');
              }}
              placeholder="e.g. Lerato Mokoena"
              returnKeyType="done"
              value={fullName}
            />
          </Card>

          <SectionHeader subtitle="Shown across the family lists and on this profile's sign-in screen." title="Profile picture" />
          <Card style={styles.card}>
            <AvatarPicker onChange={setAvatar} value={avatar} />
          </Card>

          <SectionHeader subtitle="The starting point for the recommended boundaries." title="Age group" />
          <View style={styles.options}>
            {(['child', 'teen', 'adult'] as AgeGroup[]).map((group) => (
              <OptionCard
                description={ageGroupDescription[group]}
                icon={ageGroupIcon[group]}
                key={group}
                onPress={() => {
                  setAgeGroup(group);
                  setError('');
                }}
                selected={ageGroup === group}
                title={ageGroupLabel[group]}
              />
            ))}
          </View>
        </>
      ) : null}

      {step === 2 ? (
        <>
          <Card style={styles.card}>
            <View style={styles.pinHeader}>
              <Ionicons color={colors.brandInk} name="key-outline" size={18} />
              <Text style={styles.pinTitle}>
                {pinStage === 'create' ? 'Choose a sign-in PIN' : 'Enter the PIN again'}
              </Text>
            </View>
            <Text style={styles.pinBody}>
              {pinStage === 'create'
                ? 'This PIN is what makes the profile personal. Use 6 to 8 digits that this family member will remember.'
                : 'Confirmation protects against a mistyped PIN locking the profile later.'}
            </Text>
          </Card>

          <View style={styles.dots}>
            <PinDots filled={activePin.length} length={Math.max(6, activePin.length)} />
          </View>

          <View style={styles.keypadWrap}>
            <PinKeypad disabled={saving} onDelete={handleDelete} onDigit={handleDigit} />
          </View>

          <Text style={styles.pinHint}>
            {pinStage === 'create'
              ? 'Six digits can be confirmed straight away; a longer PIN confirms automatically at eight digits.'
              : 'Enter the same digits again, then continue.'}
          </Text>

          {pinStage === 'confirm' ? (
            <Button
              label="Start the PIN again"
              onPress={() => {
                setPinStage('create');
                setPin('');
                setConfirmPin('');
                setError('');
              }}
              variant="ghost"
            />
          ) : null}
        </>
      ) : null}

      {step === 3 ? (
        <>
          <SectionHeader subtitle="You can change these boundaries after the profile is created." title="Starting boundaries" />
          <View style={styles.options}>
            <OptionCard
              description="Installed apps start blocked. You can allow the apps this profile should use after setup."
              icon="shield-checkmark-outline"
              onPress={() => setAccessMode('recommended')}
              selected={accessMode === 'recommended'}
              title="Start with safe defaults"
            />
            <OptionCard
              description="Create the profile, then choose which installed apps it can use."
              icon="apps-outline"
              onPress={() => setAccessMode('customise')}
              selected={accessMode === 'customise'}
              title="Choose applications myself"
            />
          </View>

          <NoticeCard
            message={
              installedAppCatalogSupported
                ? 'Nest will show launchable apps installed on this Android device. Blocking apps requires Device Owner provisioning; member profiles cannot sign in until Android enforcement is active.'
                : 'Installed-app discovery is available on Android only. This device will not show sample applications.'
            }
            title={installedAppCatalogSupported ? 'Installed apps' : 'App discovery is unavailable'}
          />
        </>
      ) : null}

      {step === 4 ? (
        <>
          <SectionHeader subtitle="Check the details before the profile is created." title="Review" />
          <MemberCard
            member={previewMember}
            summary={accessMode === 'customise' ? 'Choose installed apps after creation' : 'Installed apps start blocked'}
          />

          <SettingsGroup title="Profile">
            <SettingsRow icon="person-outline" title="Name" value={previewMember.fullName} />
            <SettingsRow icon="people-outline" title="Age group" value={ageGroupLabel[ageGroup]} />
            <SettingsRow icon="key-outline" title="Sign-in PIN" value={`${pin.length} digits`} />
            <SettingsRow
              icon="shield-checkmark-outline"
              last
              title="Starting boundaries"
              value={accessMode === 'customise' ? 'Choose myself' : `Recommended (${ageGroupLabel[ageGroup].toLowerCase()})`}
            />
          </SettingsGroup>

          <NoticeCard
            message="The profile, its PIN and its boundary decisions are written to the encrypted database on this device. Nothing is sent anywhere."
            title="Saved on this device"
          />
        </>
      ) : null}

      <InlineMessage message={error} tone="danger" />
    </ScreenContainer>
  );
}

const useStyles = makeStyles((t) => ({
  footer: { flexDirection: 'row', gap: spacing.xs },
  footerButton: { flex: 1 },
  card: { gap: spacing.sm },
  options: { gap: spacing.xs },
  pinHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  pinTitle: { ...typography.title3, color: t.colors.ink },
  pinBody: { ...typography.micro, color: t.colors.inkSecondary, lineHeight: 18 },
  dots: { alignItems: 'center', paddingVertical: spacing.md },
  keypadWrap: { alignItems: 'center' },
  pinHint: { ...typography.micro, color: t.colors.inkMuted, textAlign: 'center', lineHeight: 17 },
}));
