import React, { useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { SettingsGroup, SettingsRow } from '@/components/cards/SettingsRow';
import { StatRow, StatTile } from '@/components/cards/StatTile';
import { Badge } from '@/components/common/Badge';
import { Button } from '@/components/common/Button';
import { Card, SectionHeader } from '@/components/common/Card';
import { EmptyState, LoadingState } from '@/components/common/EmptyState';
import { InlineMessage, NoticeCard } from '@/components/common/InlineMessage';
import { ConfirmDialog, ModalSheet } from '@/components/common/ModalSheet';
import { ScreenContainer } from '@/components/common/ScreenContainer';
import { TextField } from '@/components/common/TextField';
import { OptionCard } from '@/components/forms/ChoiceRow';
import { PinDots, PinKeypad } from '@/components/forms/PinKeypad';
import { AppHeader } from '@/components/navigation/AppHeader';
import { AvatarPicker } from '@/components/profiles/ProfileAvatar';
import { resetMemberPin } from '@/data/familyStore';
import { ageGroupDescription, ageGroupLabel } from '@/data/mock/apps';
import { countAccess } from '@/data/services/accessService';
import { useFamilySession, useMemberById } from '@/hooks/useFamilySession';
import { useMemberAccess } from '@/hooks/useMemberAccess';
import { useProtectedAction } from '@/hooks/useProtectedAction';
import { useToast } from '@/hooks/useToast';
import { makeStyles, spacing, typography, useTheme } from '@/theme';
import type { AgeGroup } from '@/types';
import { onlyDigits, isPinComplete } from '@/utils/validation';

const ageGroupIcon: Record<AgeGroup, 'happy-outline' | 'school-outline' | 'briefcase-outline'> = {
  child: 'happy-outline',
  teen: 'school-outline',
  adult: 'briefcase-outline',
};

/** Screen 10 — details and actions for a single member profile. */
export default function MemberDetailScreen() {
  const styles = useStyles();
  const { colors } = useTheme();
  const { memberId } = useLocalSearchParams<{ memberId: string }>();
  const router = useRouter();
  const member = useMemberById(memberId);
  const { admin, family, updateMemberProfile, removeMemberProfile, requestReauthentication } = useFamilySession();
  const runProtected = useProtectedAction();
  const toast = useToast();
  const { apps, loading } = useMemberAccess(member);

  const [editVisible, setEditVisible] = useState(false);
  const [draftName, setDraftName] = useState('');
  const [draftAge, setDraftAge] = useState<AgeGroup>('child');
  const [draftAvatar, setDraftAvatar] = useState('sprout');
  const [editError, setEditError] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  const [pinVisible, setPinVisible] = useState(false);
  const [newPin, setNewPin] = useState('');
  const [pinError, setPinError] = useState('');

  const [removeVisible, setRemoveVisible] = useState(false);
  const [removing, setRemoving] = useState(false);

  const totals = useMemo(() => {
    const counts = countAccess(apps);
    return { ...counts, custom: apps.filter((app) => app.source === 'custom').length };
  }, [apps]);

  if (!member) {
    return (
      <ScreenContainer scroll>
        <AppHeader eyebrow="Profile" onBack={() => router.back()} title="Unavailable" />
        <EmptyState
          actionLabel="Back to the family"
          icon="person-outline"
          message="This member profile is no longer on this device."
          onAction={() => router.replace('/family')}
          title="Profile not found"
        />
      </ScreenContainer>
    );
  }

  const openEdit = () => {
    setDraftName(member.fullName);
    setDraftAge(member.ageGroup);
    setDraftAvatar(member.avatar);
    setEditError('');
    setEditVisible(true);
  };

  async function saveEdit() {
    if (!member) return;
    if (draftName.trim().length < 2) {
      setEditError('Enter the name this family member will see.');
      return;
    }
    setSavingEdit(true);
    const result = await updateMemberProfile(member.id, {
      fullName: draftName.trim(),
      ageGroup: draftAge,
      avatar: draftAvatar,
    });
    setSavingEdit(false);
    if (result.ok) {
      setEditVisible(false);
      toast.show('Profile details updated', 'success');
      return;
    }
    setEditError(result.error ?? 'The profile could not be updated.');
    if (result.error?.includes('session expired')) {
      requestReauthentication('Confirm your administrator password to update this profile.', saveEdit);
    }
  }

  async function confirmRemove() {
    if (!member) return;
    setRemoving(true);
    const result = await removeMemberProfile(member.id);
    setRemoving(false);
    setRemoveVisible(false);
    if (result.ok) {
      toast.show(`${member.fullName} was removed from this device`, 'success');
      router.replace('/family');
      return;
    }
    toast.show(result.error ?? 'The profile could not be removed.', 'danger');
  }

  const submitPin = () => {
    if (!admin || !family || !member) return;
    if (!isPinComplete(newPin)) {
      setPinError('A sign-in PIN needs 6 to 8 digits.');
      return;
    }
    runProtected(async () => {
      await resetMemberPin(admin.id, family.id, member.id, newPin);
    }, 'Sign-in PIN updated');
    setPinVisible(false);
    setNewPin('');
    setPinError('');
  };

  return (
    <ScreenContainer scroll>
      <AppHeader
        eyebrow="Profile"
        onBack={() => router.back()}
        subtitle={ageGroupDescription[member.ageGroup]}
        title={member.fullName}
      />

      <Card style={styles.headerCard}>
        <View style={styles.headerRow}>
          <Ionicons color={colors.brandInk} name="person-circle-outline" size={26} />
          <View style={styles.headerCopy}>
            <Text style={styles.headerName}>{member.fullName}</Text>
            <Text style={styles.headerMeta}>
              {loading ? 'Reading stored boundaries…' : `${totals.allowed} of ${totals.total} applications available`}
            </Text>
          </View>
        </View>
        <View style={styles.badges}>
          <Badge label={`${ageGroupLabel[member.ageGroup]} profile`} tone="mint" />
          <Badge label={member.hasCredential ? 'PIN sign-in active' : 'PIN not set'} tone={member.hasCredential ? 'success' : 'warning'} />
          {totals.custom > 0 ? <Badge label={`${totals.custom} custom rules`} tone="neutral" /> : null}
        </View>
      </Card>

      {loading ? (
        <LoadingState message="Reading stored boundaries…" />
      ) : (
        <StatRow>
          <StatTile icon="checkmark-circle-outline" label="Available" tone="forest" value={`${totals.allowed}`} />
          <StatTile icon="ban-outline" label="Blocked" tone="warning" value={`${totals.blocked}`} />
          <StatTile icon="options-outline" label="Custom rules" tone="sage" value={`${totals.custom}`} />
        </StatRow>
      )}

      <SettingsGroup title="Boundaries">
        <SettingsRow
          description="Turn individual applications on or off"
          icon="apps-outline"
          onPress={() => router.push(`/members/${member.id}/access`)}
          title="Application access"
          value={`${totals.allowed}/${totals.total}`}
        />
        <SettingsRow
          description="Review everything in one place, then save or reset"
          icon="shield-checkmark-outline"
          last
          onPress={() => router.push(`/members/${member.id}/permissions`)}
          title="Permission overview"
          value={`${totals.custom} custom`}
        />
      </SettingsGroup>

      <SettingsGroup title="Profile">
        <SettingsRow
          description="Name, age group and profile picture"
          icon="create-outline"
          onPress={openEdit}
          title="Edit profile details"
        />
        <SettingsRow
          description="Replace the PIN this profile signs in with"
          icon="key-outline"
          last
          onPress={() => {
            setNewPin('');
            setPinError('');
            setPinVisible(true);
          }}
          title="Reset sign-in PIN"
        />
      </SettingsGroup>

      <SectionHeader subtitle="Removing a profile also removes its local PIN and its saved boundaries." title="Danger zone" />
      <Button icon="person-remove-outline" label="Remove this profile" onPress={() => setRemoveVisible(true)} variant="danger" />

      <NoticeCard
        message="Changing a profile or its PIN happens inside the ten-minute administrator window. If that window has closed, Nest asks for your password before saving."
        title="Protected changes"
      />

      <ModalSheet
        footer={
          <>
            <Button label="Save profile" loading={savingEdit} onPress={saveEdit} />
            <Button disabled={savingEdit} label="Cancel" onPress={() => setEditVisible(false)} variant="ghost" />
          </>
        }
        onClose={() => setEditVisible(false)}
        subtitle="Changes save to the encrypted store on this device."
        title="Edit profile details"
        visible={editVisible}
      >
        <TextField
          label="Full name"
          onChangeText={(value) => {
            setDraftName(value);
            setEditError('');
          }}
          placeholder="e.g. Lerato Mokoena"
          value={draftName}
        />
        <View style={styles.block}>
          <Text style={styles.blockLabel}>Profile picture</Text>
          <AvatarPicker onChange={setDraftAvatar} value={draftAvatar} />
        </View>
        <View style={styles.block}>
          <Text style={styles.blockLabel}>Age group</Text>
          <View style={styles.options}>
            {(['child', 'teen', 'adult'] as AgeGroup[]).map((group) => (
              <OptionCard
                description={ageGroupDescription[group]}
                icon={ageGroupIcon[group]}
                key={group}
                onPress={() => setDraftAge(group)}
                selected={draftAge === group}
                title={ageGroupLabel[group]}
              />
            ))}
          </View>
        </View>
        <InlineMessage message={editError} tone="danger" />
      </ModalSheet>

      <ModalSheet
        footer={
          <>
            <Button label="Save new PIN" onPress={submitPin} />
            <Button label="Cancel" onPress={() => setPinVisible(false)} variant="ghost" />
          </>
        }
        onClose={() => setPinVisible(false)}
        subtitle="Choose 6 to 8 digits this family member will remember."
        title="Reset sign-in PIN"
        visible={pinVisible}
      >
        <View style={styles.dots}>
          <PinDots filled={newPin.length} length={Math.max(6, newPin.length)} />
        </View>
        <View style={styles.keypadWrap}>
          <PinKeypad
            onDelete={() => setNewPin(newPin.slice(0, -1))}
            onDigit={(digit) => {
              setPinError('');
              setNewPin(onlyDigits(newPin + digit, 8));
            }}
          />
        </View>
        <InlineMessage message={pinError} tone="danger" />
      </ModalSheet>

      <ConfirmDialog
        confirmLabel="Remove profile"
        loading={removing}
        message={`This removes ${member.fullName}, the local PIN and every saved boundary for this profile. It cannot be undone.`}
        onCancel={() => setRemoveVisible(false)}
        onConfirm={confirmRemove}
        title="Remove this profile?"
        tone="danger"
        visible={removeVisible}
      />
    </ScreenContainer>
  );
}

const useStyles = makeStyles((t) => ({
  headerCard: { gap: spacing.sm },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  headerCopy: { flex: 1, gap: 2 },
  headerName: { ...typography.title3, color: t.colors.ink },
  headerMeta: { ...typography.micro, color: t.colors.inkSecondary },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  block: { gap: spacing.xs },
  blockLabel: { ...typography.caption, color: t.colors.ink, fontWeight: '700' },
  options: { gap: spacing.xs },
  dots: { alignItems: 'center', paddingVertical: spacing.md },
  keypadWrap: { alignItems: 'center' },
}));
