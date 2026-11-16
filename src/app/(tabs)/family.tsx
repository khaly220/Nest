import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshControl, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { MemberCard } from '@/components/cards/MemberCard';
import { SettingsGroup, SettingsRow } from '@/components/cards/SettingsRow';
import { Button, IconButton } from '@/components/common/Button';
import { Card, SectionHeader } from '@/components/common/Card';
import { EmptyState } from '@/components/common/EmptyState';
import { InlineMessage, NoticeCard } from '@/components/common/InlineMessage';
import { ConfirmDialog, ModalSheet } from '@/components/common/ModalSheet';
import { SearchBar } from '@/components/common/SearchBar';
import { ScreenContainer } from '@/components/common/ScreenContainer';
import { TextField } from '@/components/common/TextField';
import { PinDots, PinKeypad } from '@/components/forms/PinKeypad';
import { AppHeader } from '@/components/navigation/AppHeader';
import type { FamilyMember } from '@/data/familyStore';
import { resetMemberPin } from '@/data/familyStore';
import { countAccess, loadMemberAccess } from '@/data/services/accessService';
import { useFamilySession } from '@/hooks/useFamilySession';
import { useProtectedAction } from '@/hooks/useProtectedAction';
import { useToast } from '@/hooks/useToast';
import { makeStyles, spacing, typography, useTheme } from '@/theme';
import { formatDate } from '@/utils/format';

/** Screen 8 — family management. */
export default function FamilyScreen() {
  const styles = useStyles();
  const { colors } = useTheme();
  const { admin, family, members, refreshMembers, saveFamilyDetails, removeMemberProfile } = useFamilySession();
  const router = useRouter();
  const toast = useToast();
  const runProtected = useProtectedAction();

  const [query, setQuery] = useState('');
  const [summaries, setSummaries] = useState<Record<string, { allowed: number; total: number }>>({});
  const [accessError, setAccessError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [selected, setSelected] = useState<FamilyMember | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [familyName, setFamilyName] = useState(family?.familyName ?? '');
  const [description, setDescription] = useState(family?.description ?? '');
  const [detailsError, setDetailsError] = useState('');
  const [detailsBusy, setDetailsBusy] = useState(false);
  const [pinTarget, setPinTarget] = useState<FamilyMember | null>(null);
  const [newPin, setNewPin] = useState('');
  const [removeTarget, setRemoveTarget] = useState<FamilyMember | null>(null);
  const [removeBusy, setRemoveBusy] = useState(false);

  const load = useCallback(async () => {
    const next: Record<string, { allowed: number; total: number }> = {};
    try {
      for (const member of members) {
        const { apps } = await loadMemberAccess(member.id, member.ageGroup);
        const counts = countAccess(apps);
        next[member.id] = { allowed: counts.allowed, total: counts.total };
      }
      setSummaries(next);
      setAccessError(null);
    } catch (cause) {
      setAccessError(cause instanceof Error ? cause.message : 'Unknown error');
    }
  }, [members]);

  useEffect(() => {
    void Promise.resolve().then(load);
  }, [load]);

  const openDetails = () => {
    setFamilyName(family?.familyName ?? '');
    setDescription(family?.description ?? '');
    setDetailsError('');
    setDetailsOpen(true);
  };

  const visibleMembers = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return members;
    return members.filter((member) => member.fullName.toLowerCase().includes(term));
  }, [members, query]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    void refreshMembers()
      .then(() => load())
      .finally(() => setRefreshing(false));
  }, [load, refreshMembers]);

  const saveDetails = async () => {
    if (familyName.trim().length < 2) {
      setDetailsError('Family names need at least two characters.');
      return;
    }
    setDetailsBusy(true);
    setDetailsError('');
    const result = await saveFamilyDetails(familyName, description);
    setDetailsBusy(false);
    if (!result.ok) {
      setDetailsError(result.error ?? 'The family details could not be saved.');
      return;
    }
    setDetailsOpen(false);
    toast.show('Family details updated', 'success');
  };

  const submitPin = () => {
    if (!admin || !family || !pinTarget) return;
    runProtected(async () => {
      await resetMemberPin(admin.id, family.id, pinTarget.id, newPin);
    }, `New PIN saved for ${pinTarget.fullName}`);
    setPinTarget(null);
    setNewPin('');
  };

  const confirmRemove = async () => {
    if (!removeTarget) return;
    setRemoveBusy(true);
    const result = await removeMemberProfile(removeTarget.id);
    setRemoveBusy(false);
    if (!result.ok) {
      toast.show(result.error ?? 'The profile could not be removed.', 'danger');
      return;
    }
    setRemoveTarget(null);
    toast.show(`${removeTarget.fullName} was removed from this device`, 'success');
  };

  return (
    <ScreenContainer
      refreshControl={<RefreshControl onRefresh={onRefresh} refreshing={refreshing} tintColor={colors.brandInk} />}
      scroll
    >
      <AppHeader
        eyebrow="Family"
        right={<IconButton accessibilityLabel="Add a family member" icon="person-add-outline" onPress={() => router.push('/members/new')} tone="mint" />}
        subtitle={family ? `${members.length} ${members.length === 1 ? 'profile' : 'profiles'} on this device` : 'No family space yet'}
        title={family?.familyName ?? 'Your family'}
      />

      {accessError ? (
        <NoticeCard
          message={`Application access summaries could not be loaded: ${accessError}`}
          title="Installed apps unavailable"
          tone="danger"
        />
      ) : null}

      {!family ? (
        <EmptyState
          actionLabel="Create the family space"
          icon="home-outline"
          message="Nest needs a family space before member profiles can be added."
          onAction={() => router.push('/create-family')}
          title="No family yet"
        />
      ) : (
        <>
          <Card style={styles.detailsCard}>
            <View style={styles.detailsRow}>
              <View style={styles.detailsCopy}>
                <Text style={styles.detailsLabel}>Family description</Text>
                <Text style={styles.detailsValue}>{family.description || 'No description yet'}</Text>
                <Text style={styles.detailsMeta}>Created {formatDate(family.createdAt)} · administrator @{admin?.username}</Text>
              </View>
              <IconButton accessibilityLabel="Edit family details" icon="create-outline" onPress={openDetails} />
            </View>
          </Card>

          {members.length > 3 ? (
            <SearchBar onChangeText={setQuery} placeholder="Search profiles" value={query} />
          ) : null}

          <SectionHeader
            actionLabel="Add member"
            onAction={() => router.push('/members/new')}
            subtitle="Tap a profile to review its details, applications and boundaries."
            title="Member profiles"
          />

          {members.length === 0 ? (
            <EmptyState
              actionLabel="Add the first member"
              icon="person-add-outline"
              message="Each member gets their own PIN and their own set of available applications."
              onAction={() => router.push('/members/new')}
              title="No profiles yet"
            />
          ) : visibleMembers.length === 0 ? (
            <EmptyState
              actionLabel="Clear search"
              icon="search-outline"
              message={`No profile matches “${query}”.`}
              onAction={() => setQuery('')}
              title="Nothing found"
            />
          ) : (
            <View style={styles.list}>
              {visibleMembers.map((member) => {
                const summary = summaries[member.id];
                return (
                  <MemberCard
                    key={member.id}
                    member={member}
                    onPress={() => router.push(`/members/${member.id}`)}
                    summary={summary ? `${summary.allowed} of ${summary.total} applications available` : 'Calculating boundaries…'}
                    trailing={
                      <IconButton
                        accessibilityLabel={`Options for ${member.fullName}`}
                        icon="ellipsis-horizontal"
                        onPress={() => setSelected(member)}
                        size={36}
                        tone="mint"
                      />
                    }
                  />
                );
              })}
            </View>
          )}

          <NoticeCard
            message="Boundary decisions are stored in this device's encrypted database. Android hides blocked user-installed apps when Nest is provisioned as Device Owner and that member signs in. Check Device status to confirm provisioning."
            title="Android enforcement requires Device Owner"
            tone="warning"
          />
        </>
      )}

      <ModalSheet
        footer={<Button label="Close" onPress={() => setSelected(null)} variant="ghost" />}
        onClose={() => setSelected(null)}
        subtitle={selected ? 'Choose what to review for this profile.' : undefined}
        title={selected?.fullName ?? 'Profile'}
        visible={Boolean(selected)}
      >
        {selected ? (
          <SettingsGroup>
            <SettingsRow
              description="Age group, avatar and sign-in status."
              icon="person-outline"
              onPress={() => {
                const id = selected.id;
                setSelected(null);
                router.push(`/members/${id}`);
              }}
              title="Profile details"
            />
            <SettingsRow
              description="Search, filter and switch single applications on or off."
              icon="apps-outline"
              onPress={() => {
                const id = selected.id;
                setSelected(null);
                router.push(`/members/${id}/access`);
              }}
              title="Application access"
            />
            <SettingsRow
              description="Default policy, device rules and custom overrides."
              icon="shield-checkmark-outline"
              onPress={() => {
                const id = selected.id;
                setSelected(null);
                router.push(`/members/${id}/permissions`);
              }}
              title="Permission overview"
            />
            <SettingsRow
              description="Replace the six-digit PIN this profile signs in with."
              icon="key-outline"
              onPress={() => {
                setNewPin('');
                setPinTarget(selected);
                setSelected(null);
              }}
              title="Reset sign-in PIN"
            />
            <SettingsRow
              description="Deletes the profile and its local PIN from this device."
              icon="person-remove-outline"
              last
              onPress={() => {
                setRemoveTarget(selected);
                setSelected(null);
              }}
              title="Remove profile"
              tone="danger"
            />
          </SettingsGroup>
        ) : null}
      </ModalSheet>

      <ModalSheet
        footer={
          <>
            <Button disabled={newPin.length < 6} label="Save new PIN" onPress={submitPin} />
            <Button
              label="Cancel"
              onPress={() => {
                setPinTarget(null);
                setNewPin('');
              }}
              variant="ghost"
            />
          </>
        }
        onClose={() => {
          setPinTarget(null);
          setNewPin('');
        }}
        subtitle={pinTarget ? `Set a new six-digit PIN for ${pinTarget.fullName}.` : undefined}
        title="Reset sign-in PIN"
        visible={Boolean(pinTarget)}
      >
        <View style={styles.pinBlock}>
          <PinDots filled={newPin.length} length={6} />
          <PinKeypad onDelete={() => setNewPin((current) => current.slice(0, -1))} onDigit={(digit) => setNewPin((current) => (current.length < 6 ? current + digit : current))} />
          <InlineMessage message="PINs are stored as a bcrypt hash and are unique to one profile." tone="info" />
        </View>
      </ModalSheet>

      <ModalSheet
        footer={
          <>
            <Button label="Save details" loading={detailsBusy} onPress={saveDetails} />
            <Button disabled={detailsBusy} label="Cancel" onPress={() => setDetailsOpen(false)} variant="ghost" />
          </>
        }
        onClose={() => setDetailsOpen(false)}
        subtitle="Shown on the dashboard and to every member profile."
        title="Family details"
        visible={detailsOpen}
      >
        <TextField label="Family name" maxLength={48} onChangeText={setFamilyName} value={familyName} />
        <TextField label="Description" maxLength={140} multiline onChangeText={setDescription} value={description} />
        <InlineMessage message={detailsError} tone="danger" />
      </ModalSheet>

      <ConfirmDialog
        confirmLabel="Remove profile"
        icon="person-remove-outline"
        loading={removeBusy}
        message={
          removeTarget
            ? `${removeTarget.fullName}, the local PIN and every stored boundary for this profile will be deleted from this device. This cannot be undone.`
            : ''
        }
        onCancel={() => setRemoveTarget(null)}
        onConfirm={confirmRemove}
        title="Remove this profile?"
        tone="danger"
        visible={Boolean(removeTarget)}
      />
    </ScreenContainer>
  );
}

const useStyles = makeStyles((t) => ({
  detailsCard: { padding: spacing.sm },
  detailsRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  detailsCopy: { flex: 1, gap: 2 },
  detailsLabel: { ...typography.eyebrow, color: t.colors.inkSecondary },
  detailsValue: { ...typography.bodyStrong, color: t.colors.ink },
  detailsMeta: { ...typography.micro, color: t.colors.inkMuted },
  list: { gap: spacing.xs },
  pinBlock: { gap: spacing.lg, alignItems: 'center' },
}));
