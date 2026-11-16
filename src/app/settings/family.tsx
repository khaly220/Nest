import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';

import { Button } from '@/components/common/Button';
import { SectionHeader } from '@/components/common/Card';
import { EmptyState } from '@/components/common/EmptyState';
import { InlineMessage, NoticeCard } from '@/components/common/InlineMessage';
import { ScreenContainer } from '@/components/common/ScreenContainer';
import { TextField } from '@/components/common/TextField';
import { SettingsGroup, SettingsRow } from '@/components/cards/SettingsRow';
import { AppHeader } from '@/components/navigation/AppHeader';
import type { Family } from '@/data/familyStore';
import { useFamilySession } from '@/hooks/useFamilySession';
import { useToast } from '@/hooks/useToast';
import { spacing } from '@/theme';
import { formatDate, pluralize } from '@/utils/format';

/**
 * Editable family details. Mounted only once a family exists, so the fields
 * start from the stored values without copying props into state in an effect.
 */
function FamilyDetailsForm({ family }: { family: Family }) {
  const { saveFamilyDetails } = useFamilySession();
  const toast = useToast();

  const [familyName, setFamilyName] = useState(family.familyName);
  const [description, setDescription] = useState(family.description);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const dirty = familyName !== family.familyName || description !== family.description;

  const save = async () => {
    setError('');
    if (familyName.trim().length < 2) {
      setError('A family name needs at least two characters.');
      return;
    }
    setSaving(true);
    const result = await saveFamilyDetails(familyName.trim(), description);
    setSaving(false);
    if (!result.ok) {
      setError(result.error ?? 'The family details could not be saved.');
      return;
    }
    toast.show('Family details updated', 'success');
  };

  return (
    <View style={styles.form}>
      <TextField
        hint="Shown on the dashboard, on member screens and in settings."
        label="Family name"
        maxLength={48}
        onChangeText={setFamilyName}
        placeholder="For example, the Okafor family"
        value={familyName}
      />
      <TextField
        hint="Optional. A short line about how this device is used at home."
        label="Description"
        maxLength={140}
        multiline
        onChangeText={setDescription}
        placeholder="One shared tablet in the living room"
        value={description}
      />
      <InlineMessage message={error} tone="danger" />
      <Button disabled={!dirty} icon="checkmark-outline" label="Save family details" loading={saving} onPress={save} />
      {dirty ? (
        <Button
          label="Discard changes"
          onPress={() => {
            setFamilyName(family.familyName);
            setDescription(family.description);
            setError('');
          }}
          variant="ghost"
        />
      ) : null}
    </View>
  );
}

/** Settings — family details. */
export default function FamilySettingsScreen() {
  const { admin, family, members } = useFamilySession();
  const router = useRouter();

  return (
    <ScreenContainer scroll>
      <AppHeader
        eyebrow="Family"
        onBack={() => router.back()}
        subtitle="How this family space is named across Nest."
        title="Family details"
      />

      {!family ? (
        <EmptyState
          actionLabel="Create the family space"
          icon="home-outline"
          message="A family space keeps member profiles and their boundaries together."
          onAction={() => router.push('/create-family')}
          title="No family space yet"
        />
      ) : (
        <>
          <FamilyDetailsForm family={family} />

          <SectionHeader subtitle="Who this family space belongs to." title="Overview" />
          <SettingsGroup>
            <SettingsRow icon="home-outline" title="Family space" value={family.familyName} />
            <SettingsRow
              icon="people-outline"
              title="Member profiles"
              onPress={() => router.push('/family')}
              value={`${members.length} ${pluralize(members.length, 'profile')}`}
            />
            <SettingsRow icon="calendar-outline" title="Created" value={formatDate(family.createdAt)} />
            <SettingsRow icon="person-circle-outline" last title="Administrator" value={`@${admin?.username ?? 'unknown'}`} />
          </SettingsGroup>

          <Button icon="person-add-outline" label="Add a family member" onPress={() => router.push('/members/new')} variant="secondary" />

          <NoticeCard
            message="Family details are written to the encrypted local store on this device. Changing them here never touches member PINs or their saved boundaries."
            title="Stored locally"
          />
        </>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  form: { gap: spacing.sm },
});
