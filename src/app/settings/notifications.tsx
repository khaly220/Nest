import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';

import { SectionHeader } from '@/components/common/Card';
import { NoticeCard } from '@/components/common/InlineMessage';
import { ScreenContainer } from '@/components/common/ScreenContainer';
import { SettingsGroup } from '@/components/cards/SettingsRow';
import { SegmentedControl, SwitchRow } from '@/components/forms/ChoiceRow';
import { AppHeader } from '@/components/navigation/AppHeader';
import { useToast } from '@/hooks/useToast';
import { makeStyles, spacing } from '@/theme';

type Preference = {
  id: string;
  title: string;
  description: string;
  icon: 'person-outline' | 'shield-checkmark-outline' | 'alert-circle-outline' | 'mail-outline';
};

const preferences: Preference[] = [
  {
    id: 'memberSignIn',
    title: 'Member sign-in',
    description: 'Tell me whenever a family member signs in on this device.',
    icon: 'person-outline',
  },
  {
    id: 'boundaryChanges',
    title: 'Boundary changes',
    description: 'Tell me when application access changes for a profile.',
    icon: 'shield-checkmark-outline',
  },
  {
    id: 'blockedAttempts',
    title: 'Blocked attempts',
    description: 'Tell me when a profile opens something that is not available.',
    icon: 'alert-circle-outline',
  },
];

const digestOptions = [
  { id: 'off', label: 'Off' },
  { id: 'weekly', label: 'Weekly' },
  { id: 'monthly', label: 'Monthly' },
];

/** Settings — notification preferences (preview). */
export default function NotificationSettingsScreen() {
  const styles = useStyles();
  const router = useRouter();
  const toast = useToast();
  const [values, setValues] = useState<Record<string, boolean>>({
    memberSignIn: true,
    boundaryChanges: true,
    blockedAttempts: false,
    weeklyDigest: false,
  });
  const [digest, setDigest] = useState('off');

  const update = (id: string, title: string, next: boolean) => {
    setValues((current) => ({ ...current, [id]: next }));
    toast.show(`${title} alerts ${next ? 'on' : 'off'}`, 'default');
  };

  return (
    <ScreenContainer scroll>
      <AppHeader
        eyebrow="Device"
        onBack={() => router.back()}
        subtitle="Choose what Nest should tell you about."
        title="Notifications"
      />

      <NoticeCard
        message="This screen previews the notification preferences. Delivery through the operating system is part of a later phase, so nothing is sent from this build yet — your choices stay on this device."
        title="Preview preferences"
        tone="warning"
      />

      <SectionHeader subtitle="Activity on this shared device." title="Alerts" />
      <SettingsGroup>
        {preferences.map((preference, index) => (
          <View key={preference.id} style={index < preferences.length - 1 ? styles.divider : undefined}>
            <SwitchRow
              description={preference.description}
              icon={preference.icon}
              onChange={(next) => update(preference.id, preference.title, next)}
              title={preference.title}
              value={Boolean(values[preference.id])}
            />
          </View>
        ))}
      </SettingsGroup>

      <SectionHeader subtitle="A quiet summary instead of individual alerts." title="Summary email" />
      <View style={styles.digest}>
        <SwitchRow
          description="Send a summary of family activity."
          icon="mail-outline"
          onChange={(next) => {
            setValues((current) => ({ ...current, weeklyDigest: next }));
            if (!next) setDigest('off');
          }}
          title="Activity summary"
          value={Boolean(values.weeklyDigest)}
        />
        <SegmentedControl
          onChange={(id) => {
            setDigest(id);
            setValues((current) => ({ ...current, weeklyDigest: id !== 'off' }));
            toast.show(id === 'off' ? 'Activity summary off' : `Activity summary set to ${id}`, 'default');
          }}
          options={digestOptions}
          value={values.weeklyDigest ? digest : 'off'}
        />
      </View>
    </ScreenContainer>
  );
}

const useStyles = makeStyles((t) => ({
  divider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: t.colors.border },
  digest: { gap: spacing.sm },
}));
