import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { Button } from '@/components/common/Button';
import { IconBubble } from '@/components/common/NestMark';
import { NoticeCard } from '@/components/common/InlineMessage';
import { ModalSheet } from '@/components/common/ModalSheet';
import { ScreenContainer } from '@/components/common/ScreenContainer';
import { AppHeader } from '@/components/navigation/AppHeader';
import { findApp } from '@/data/services/accessService';
import { useToast } from '@/hooks/useToast';
import { makeStyles, radius, spacing, typography } from '@/theme';

/** Screen 19 — shown when a member opens something outside their boundaries. */
export default function MemberRestrictedScreen() {
  const styles = useStyles();
  const { appId } = useLocalSearchParams<{ appId?: string }>();
  const app = appId ? findApp(appId) : undefined;
  const router = useRouter();
  const toast = useToast();
  const [askOpen, setAskOpen] = useState(false);

  return (
    <ScreenContainer scroll>
      <AppHeader backLabel="Back to my home" eyebrow="Not available" onBack={() => router.back()} title="Restricted" />

      <View style={styles.hero}>
        <IconBubble icon="lock-closed-outline" size={64} tone="forest" />
        <Text style={styles.headline}>This app isn&apos;t available right now.</Text>
        <Text style={styles.body}>
          {app
            ? `${app.name} is not part of the applications your administrator has made available to you on this device.`
            : 'The application you tried to open is not part of the applications available to you on this device.'}
        </Text>
      </View>

      {app ? (
        <View style={styles.appRow}>
          <View style={[styles.appIcon, { backgroundColor: `${app.tint}1A`, borderColor: `${app.tint}33` }]}>
            <Ionicons color={app.tint} name={app.icon} size={24} />
          </View>
          <View style={styles.appCopy}>
            <Text style={styles.appName}>{app.name}</Text>
            <Text style={styles.appBody}>{app.summary}</Text>
          </View>
          <View style={styles.blockedPill}>
            <Text style={styles.blockedLabel}>Blocked</Text>
          </View>
        </View>
      ) : null}

      <View style={styles.actions}>
        <Button icon="home-outline" label="Back to my home" onPress={() => router.replace('/member/home')} />
        <Button icon="chatbubble-ellipses-outline" label="Ask for more access" onPress={() => setAskOpen(true)} variant="secondary" />
        <Button icon="apps-outline" label="See what is available" onPress={() => router.push('/member/apps')} variant="ghost" />
      </View>

      <NoticeCard
        message="Only an administrator can change what is available to a profile. Once a change is saved on this device, it applies the next time you sign in with your PIN."
        title="Who can change this"
      />

      <ModalSheet
        footer={
          <>
            <Button
              icon="checkmark-outline"
              label="Got it"
              onPress={() => {
                setAskOpen(false);
                toast.show('Show this screen to your administrator', 'default');
              }}
            />
            <Button label="Back to my home" onPress={() => router.replace('/member/home')} variant="ghost" />
          </>
        }
        onClose={() => setAskOpen(false)}
        subtitle={app ? `About ${app.name}` : 'About this application'}
        title="Ask for more access"
        visible={askOpen}
      >
        <Text style={styles.askBody}>
          Ask the administrator of this family space to open the Access screen, choose your profile and make this application
          available. The change is saved here on this device, so it applies straight away.
        </Text>
        <NoticeCard
          message="Sending a request from this screen is a preview in this build. Nothing is sent anywhere, and no request is stored — talking to your administrator is what makes the change happen."
          title="Preview only"
          tone="warning"
        />
      </ModalSheet>
    </ScreenContainer>
  );
}

const useStyles = makeStyles((t) => ({
  hero: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.lg },
  headline: { ...typography.title1, color: t.colors.ink, textAlign: 'center' },
  body: { ...typography.caption, color: t.colors.inkSecondary, textAlign: 'center', lineHeight: 21 },
  appRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: radius.lg,
    backgroundColor: t.colors.surface,
    borderWidth: 1,
    borderColor: t.colors.border,
  },
  appIcon: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  appCopy: { flex: 1, gap: 2 },
  appName: { ...typography.bodyStrong, color: t.colors.ink },
  appBody: { ...typography.micro, color: t.colors.inkSecondary, lineHeight: 17 },
  blockedPill: { paddingHorizontal: spacing.xs, paddingVertical: 5, borderRadius: radius.pill, backgroundColor: t.colors.surfaceMuted },
  blockedLabel: { ...typography.micro, color: t.colors.inkSecondary, fontWeight: '800' },
  actions: { gap: spacing.xs },
  askBody: { ...typography.caption, color: t.colors.inkSecondary, lineHeight: 21 },
}));
