import React from 'react';
import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { Button } from '@/components/common/Button';
import { Card } from '@/components/common/Card';
import { HeroPanel, heroText } from '@/components/common/NestMark';
import { EmptyState } from '@/components/common/EmptyState';
import { ScreenContainer } from '@/components/common/ScreenContainer';
import { SettingsGroup, SettingsRow } from '@/components/cards/SettingsRow';
import { useFamilySession } from '@/hooks/useFamilySession';
import { makeStyles, radius, spacing, typography, useTheme } from '@/theme';
import { formatDate } from '@/utils/format';

/** Step 6 of the public flow: confirmation that the family space is ready. */
export default function FamilyCreatedScreen() {
  const { admin, family, members } = useFamilySession();
  const router = useRouter();
  const styles = useStyles();
  const { colors } = useTheme();

  if (!family) {
    return (
      <ScreenContainer padded>
        <EmptyState
          actionLabel="Back to welcome"
          icon="home-outline"
          message="No family space was found on this device. Create one to continue."
          onAction={() => router.replace('/welcome')}
          title="Nothing to show yet"
        />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer
      footer={
        <View style={styles.footer}>
          <Button icon="person-add-outline" label="Add a family member" onPress={() => router.replace('/members/new')} />
          <Button label="Go to the dashboard" onPress={() => router.replace('/home')} variant="secondary" />
        </View>
      }
      scroll
    >
      <HeroPanel eyebrow="Setup complete">
        <View style={styles.heroTop}>
          <View style={styles.check}>
            <Ionicons color={colors.brandInk} name="checkmark-done-outline" size={26} />
          </View>
          <Text style={heroText.caption}>FAMILY SPACE READY</Text>
        </View>
        <Text style={[heroText.title, styles.heroTitle]}>{family.familyName}</Text>
        <Text style={heroText.body}>
          {family.description || 'Every profile on this device now lives inside this family space.'}
        </Text>
      </HeroPanel>

      <Card style={styles.summary}>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Administrator</Text>
          <Text style={styles.summaryValue}>@{admin?.username ?? 'unknown'}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Members</Text>
          <Text style={styles.summaryValue}>{members.length === 0 ? 'None yet' : `${members.length}`}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Created</Text>
          <Text style={styles.summaryValue}>{formatDate(family.createdAt)}</Text>
        </View>
      </Card>

      <SettingsGroup title="Next steps">
        <SettingsRow
          description="Name, age group, avatar and a six-digit PIN."
          icon="person-add-outline"
          onPress={() => router.replace('/members/new')}
          title="Add your first member profile"
        />
        <SettingsRow
          description="Review the recommended boundaries before you hand the device over."
          icon="shield-checkmark-outline"
          onPress={() => router.replace('/access')}
          title="Review access defaults"
        />
        <SettingsRow
          description="See how Nest runs on this device and what it can already do."
          icon="phone-portrait-outline"
          last
          onPress={() => router.replace('/device')}
          title="Check this device"
        />
      </SettingsGroup>
    </ScreenContainer>
  );
}

const useStyles = makeStyles((t) => ({
  footer: { gap: spacing.xs },
  heroTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: spacing.xs },
  check: {
    width: 46,
    height: 46,
    borderRadius: radius.md,
    backgroundColor: t.colors.brandSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTitle: { marginBottom: spacing.xxs },
  summary: { gap: spacing.sm },
  summaryRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  summaryLabel: { ...typography.caption, color: t.colors.inkSecondary },
  summaryValue: { ...typography.bodyStrong, color: t.colors.ink },
}));
