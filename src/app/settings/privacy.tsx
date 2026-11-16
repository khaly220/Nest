import React from 'react';
import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { Card, SectionHeader } from '@/components/common/Card';
import { NoticeCard } from '@/components/common/InlineMessage';
import { ScreenContainer } from '@/components/common/ScreenContainer';
import { SettingsGroup, SettingsRow } from '@/components/cards/SettingsRow';
import { AppHeader } from '@/components/navigation/AppHeader';
import { makeStyles, radius, spacing, typography, useTheme } from '@/theme';
import type { IconName } from '@/types';

const promises: { icon: IconName; title: string; body: string }[] = [
  { icon: 'server-outline', title: 'No server', body: 'Nest has no backend. Every screen you see is powered by the database inside this app.' },
  { icon: 'analytics-outline', title: 'No tracking', body: 'There is no analytics, no advertising identifier and no crash reporting service.' },
  { icon: 'key-outline', title: 'Locked database', body: 'Records live in an encrypted SQLite file whose key is held in this device’s secure storage.' },
  { icon: 'shield-checkmark-outline', title: 'Hashes only', body: 'Passwords and PINs are stored as bcrypt hashes, so they cannot be read back.' },
];

/** Settings — privacy and data. */
export default function PrivacySettingsScreen() {
  const styles = useStyles();
  const { colors } = useTheme();
  const router = useRouter();

  return (
    <ScreenContainer scroll>
      <AppHeader
        eyebrow="Device"
        onBack={() => router.back()}
        subtitle="What Nest keeps, where it keeps it and what it never does."
        title="Privacy and data"
      />

      <Card style={styles.summary}>
        <View style={styles.summaryRow}>
          <View style={styles.summaryIcon}>
            <Ionicons color={colors.brandInk} name="shield-half-outline" size={24} />
          </View>
          <View style={styles.summaryCopy}>
            <Text style={styles.summaryTitle}>On-device by default</Text>
            <Text style={styles.summaryBody}>
              Nothing on the family screens is sent off this device. The encrypted local store is the only place Nest writes.
            </Text>
          </View>
        </View>
      </Card>

      <SectionHeader subtitle="Rows written to the encrypted local store." title="What is stored" />
      <SettingsGroup>
        <SettingsRow icon="home-outline" title="Family space" value="Name, description, created date" />
        <SettingsRow icon="people-outline" title="Member profiles" value="Name, age group, avatar" />
        <SettingsRow icon="key-outline" title="Credentials" value="bcrypt hashes only" />
        <SettingsRow icon="shield-checkmark-outline" title="Boundary rules" value="Per profile, per application" />
        <SettingsRow icon="pulse-outline" title="Activity history" value="Recorded events on this device" />
        <SettingsRow icon="link-outline" last title="Sign-in attempts" value="Counted to enforce lockouts" />
      </SettingsGroup>

      <SectionHeader subtitle="Things Nest deliberately does not do." title="What Nest never does" />
      <View style={styles.promises}>
        {promises.map((promise) => (
          <Card key={promise.title} style={styles.promiseCard}>
            <View style={styles.promiseRow}>
              <View style={styles.promiseIcon}>
                <Ionicons color={colors.brandInk} name={promise.icon} size={19} />
              </View>
              <View style={styles.summaryCopy}>
                <Text style={styles.promiseTitle}>{promise.title}</Text>
                <Text style={styles.summaryBody}>{promise.body}</Text>
              </View>
            </View>
          </Card>
        ))}
      </View>

      <NoticeCard
        message="Removing a member profile deletes that profile, its PIN hash and every stored boundary for it. Everything else stays until the app is uninstalled."
        title="Deleting data"
      />

      <NoticeCard
        message="Encrypted backup, family sharing across devices and remote sync are later engineering phases. Until they ship, this device is the only copy."
        title="Not built yet"
        tone="warning"
      />
    </ScreenContainer>
  );
}

const useStyles = makeStyles((t) => ({
  summary: { padding: spacing.md },
  summaryRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  summaryIcon: {
    width: 52,
    height: 52,
    borderRadius: radius.md,
    backgroundColor: t.colors.brandSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryCopy: { flex: 1, gap: 3 },
  summaryTitle: { ...typography.title3, color: t.colors.ink },
  summaryBody: { ...typography.micro, color: t.colors.inkSecondary, lineHeight: 18 },
  promises: { gap: spacing.xs },
  promiseCard: { padding: spacing.sm },
  promiseRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  promiseIcon: {
    width: 42,
    height: 42,
    borderRadius: radius.sm,
    backgroundColor: t.colors.neutralTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  promiseTitle: { ...typography.bodyStrong, color: t.colors.ink },
}));
