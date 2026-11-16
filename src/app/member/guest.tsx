import React, { useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { AppTile } from '@/components/cards/AppCard';
import { Button } from '@/components/common/Button';
import { SectionHeader } from '@/components/common/Card';
import { NoticeCard } from '@/components/common/InlineMessage';
import { ModalSheet } from '@/components/common/ModalSheet';
import { IconBubble } from '@/components/common/NestMark';
import { ScreenContainer } from '@/components/common/ScreenContainer';
import { AppHeader } from '@/components/navigation/AppHeader';
import { findApp } from '@/data/services/accessService';
import { useToast } from '@/hooks/useToast';
import { makeStyles, radius, spacing, typography } from '@/theme';
import type { CatalogApp, MemberAppAccess } from '@/types';

const guestAppIds = ['app-phone', 'app-clock', 'app-calculator'];

/** Screen 20 — guest experience: essentials only, no administrative access. */
export default function MemberGuestScreen() {
  const styles = useStyles();
  const router = useRouter();
  const toast = useToast();
  const [launching, setLaunching] = useState<MemberAppAccess | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);

  const essentials: MemberAppAccess[] = useMemo(
    () =>
      guestAppIds
        .map((id) => findApp(id))
        .filter((app): app is CatalogApp => Boolean(app))
        .map((app) => ({ ...app, allowed: true, source: 'recommended' })),
    [],
  );

  return (
    <ScreenContainer scroll>
      <AppHeader
        backLabel="Back to profile selection"
        eyebrow="Guest access"
        onBack={() => router.replace('/member')}
        subtitle="Essentials only — family profiles, boundaries and settings stay locked."
        title="Using this device as a guest"
      />

      <View style={styles.hero}>
        <IconBubble icon="person-outline" size={60} tone="forest" />
        <Text style={styles.heroTitle}>A limited way to use this device</Text>
        <Text style={styles.heroBody}>
          Guests can use a few device essentials without signing in. Nothing about the family space is shown, and nothing can be
          changed from here.
        </Text>
      </View>

      <SectionHeader subtitle="The only applications a guest can open." title="Guest essentials" />
      <View style={styles.grid}>
        {essentials.map((app) => (
          <AppTile app={app} key={app.id} onPress={() => setLaunching(app)} />
        ))}
      </View>

      <Button icon="home-outline" label="Back to profile selection" onPress={() => router.replace('/member')} />

      <SectionHeader subtitle="What to do when something is missing." title="Need something else?" />
      <Button
        icon="hand-right-outline"
        label="Ask a parent for help"
        onPress={() => setHelpOpen(true)}
        variant="secondary"
      />

      <NoticeCard
        message="Guest mode cannot open the family settings, change a profile, or read the family space. Those screens only exist behind an administrator sign-in."
        title="No administrative access"
      />

      <NoticeCard
        message="The guest essentials above are a preview of how a limited session will look. This build does not restrict other applications yet, so handing the device to a guest is a display of intent rather than an enforced lock."
        title="Preview, not enforcement"
        tone="warning"
      />

      <ModalSheet
        footer={
          <>
            <Button
              icon="checkmark-outline"
              label="Got it"
              onPress={() => {
                setHelpOpen(false);
                toast.show('Ask a family member to sign in for you', 'default');
              }}
            />
            <Button label="Back to profile selection" onPress={() => router.replace('/member')} variant="ghost" />
          </>
        }
        onClose={() => setHelpOpen(false)}
        subtitle="Sending a request is not built yet."
        title="Ask for help"
        visible={helpOpen}
      >
        <Text style={styles.helpBody}>
          Ask an adult in the family to sign in with their own profile or as the administrator. A member profile signs in with its
          PIN, and the administrator signs in with the account password.
        </Text>
        <NoticeCard
          message="Guest requests cannot be sent from this build. Nothing leaves the device, and no message is delivered to anyone."
          title="Preview only"
          tone="warning"
        />
      </ModalSheet>

      <ModalSheet
        footer={
          <>
            <Button icon="checkmark-outline" label="Close" onPress={() => setLaunching(null)} />
            <Button label="Sign in instead" onPress={() => router.replace('/member')} variant="ghost" />
          </>
        }
        onClose={() => setLaunching(null)}
        subtitle={launching ? 'Available in guest mode' : undefined}
        title={launching ? `Opening ${launching.name}` : 'Opening'}
        visible={Boolean(launching)}
      >
        {launching ? (
          <>
            <View style={styles.launchRow}>
              <View style={[styles.launchIcon, { backgroundColor: `${launching.tint}1A`, borderColor: `${launching.tint}33` }]}>
                <Ionicons color={launching.tint} name={launching.icon} size={30} />
              </View>
              <View style={styles.launchCopy}>
                <Text style={styles.launchName}>{launching.name}</Text>
                <Text style={styles.launchBody}>{launching.summary}</Text>
              </View>
            </View>
            <NoticeCard
              message="Launching is simulated in this build. Nest does not start other applications yet, so nothing was opened on this device."
              title="Simulated launch"
              tone="warning"
            />
          </>
        ) : null}
      </ModalSheet>
    </ScreenContainer>
  );
}

const useStyles = makeStyles((t) => ({
  hero: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.md },
  heroTitle: { ...typography.title2, color: t.colors.ink, textAlign: 'center' },
  heroBody: { ...typography.caption, color: t.colors.inkSecondary, textAlign: 'center', lineHeight: 21 },
  grid: { flexDirection: 'row', gap: spacing.sm },
  helpBody: { ...typography.caption, color: t.colors.inkSecondary, lineHeight: 21 },
  launchRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  launchIcon: {
    width: 62,
    height: 62,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  launchCopy: { flex: 1, gap: 3 },
  launchName: { ...typography.title3, color: t.colors.ink },
  launchBody: { ...typography.micro, color: t.colors.inkSecondary, lineHeight: 17 },
}));
