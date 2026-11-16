import React from 'react';
import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';

import { Card, SectionHeader } from '@/components/common/Card';
import { NoticeCard } from '@/components/common/InlineMessage';
import { NestWordmark } from '@/components/common/NestMark';
import { ScreenContainer } from '@/components/common/ScreenContainer';
import { SettingsGroup, SettingsRow } from '@/components/cards/SettingsRow';
import { AppHeader } from '@/components/navigation/AppHeader';
import { makeStyles, radius, spacing, typography, useTheme } from '@/theme';

/** Settings — about Nest. */
export default function AboutSettingsScreen() {
  const styles = useStyles();
  const { colors } = useTheme();
  const router = useRouter();
  const version = Constants.expoConfig?.version ?? '1.0.0';
  const sdk = Constants.expoConfig?.sdkVersion ?? 'Expo SDK 58';

  return (
    <ScreenContainer scroll>
      <AppHeader eyebrow="Support" onBack={() => router.back()} subtitle="What this build contains." title="About Nest" />

      <Card style={styles.brandCard}>
        <NestWordmark />
        <Text style={styles.tagline}>One device. Every family member. Personalised digital boundaries.</Text>
        <View style={styles.versionPill}>
          <Text style={styles.versionLabel}>Version {version}</Text>
        </View>
      </Card>

      <SettingsGroup title="Build">
        <SettingsRow icon="information-circle-outline" title="App version" value={version} />
        <SettingsRow icon="layers-outline" title="Runtime" value={sdk} />
        <SettingsRow icon="lock-closed-outline" title="Data store" value="Encrypted SQLite" />
        <SettingsRow icon="shield-checkmark-outline" last title="Network use" value="None" />
      </SettingsGroup>

      <SectionHeader subtitle="Phases that follow this interface work." title="What is not in this build" />
      <View style={styles.list}>
        {[
          { title: 'Device enforcement', body: 'Android Device Owner policy hides blocked user-installed applications while a member profile is active.' },
          { title: 'Face verification engine', body: 'On-device face matching. The camera screen is a design state today.' },
          { title: 'Cloud accounts and sync', body: 'Sharing one family space across several devices.' },
        ].map((item) => (
          <Card key={item.title} style={styles.phaseCard}>
            <View style={styles.phaseRow}>
              <View style={styles.phaseIcon}>
                <Ionicons color={colors.inkSecondary} name="ellipse-outline" size={16} />
              </View>
              <View style={styles.phaseCopy}>
                <Text style={styles.phaseTitle}>{item.title}</Text>
                <Text style={styles.phaseBody}>{item.body}</Text>
              </View>
            </View>
          </Card>
        ))}
      </View>

      <NoticeCard
        icon="heart-outline"
        message="Nest is designed so families understand exactly what it does. When a capability is missing, the interface says so instead of pretending."
        title="Built for trust"
      />
    </ScreenContainer>
  );
}

const useStyles = makeStyles((t) => ({
  brandCard: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.lg },
  tagline: { ...typography.caption, color: t.colors.inkSecondary, textAlign: 'center', lineHeight: 20, paddingHorizontal: spacing.sm },
  versionPill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    borderRadius: radius.pill,
    backgroundColor: t.colors.brandSoft,
  },
  versionLabel: { ...typography.micro, color: t.colors.brandInk, fontWeight: '800' },
  list: { gap: spacing.xs },
  phaseCard: { padding: spacing.sm },
  phaseRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  phaseIcon: {
    width: 38,
    height: 38,
    borderRadius: radius.sm,
    backgroundColor: t.colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  phaseCopy: { flex: 1, gap: 2 },
  phaseTitle: { ...typography.bodyStrong, color: t.colors.ink },
  phaseBody: { ...typography.micro, color: t.colors.inkSecondary, lineHeight: 17 },
}));
