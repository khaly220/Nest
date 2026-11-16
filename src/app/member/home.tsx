import React, { useEffect, useMemo } from 'react';
import { Platform, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { AppTile } from '@/components/cards/AppCard';
import { StatRow, StatTile } from '@/components/cards/StatTile';
import { Button, IconButton } from '@/components/common/Button';
import { Card, SectionHeader } from '@/components/common/Card';
import { LoadingState } from '@/components/common/EmptyState';
import { NoticeCard } from '@/components/common/InlineMessage';
import { HeroPanel, heroText } from '@/components/common/NestMark';
import { ScreenContainer } from '@/components/common/ScreenContainer';
import { AppHeader } from '@/components/navigation/AppHeader';
import { useFamilySession } from '@/hooks/useFamilySession';
import { useToast } from '@/hooks/useToast';
import { useMemberAccess } from '@/hooks/useMemberAccess';
import { makeStyles, spacing, typography, useTheme } from '@/theme';
import type { MemberAppAccess } from '@/types';
import { firstName, greeting } from '@/utils/format';

function rowsOf(items: MemberAppAccess[], size: number): MemberAppAccess[][] {
  const out: MemberAppAccess[][] = [];
  for (let index = 0; index < items.length; index += size) out.push(items.slice(index, index + size));
  return out;
}

/** Screen 17 — member home. */
export default function MemberHomeScreen() {
  const styles = useStyles();
  const { colors } = useTheme();
  const { activeMember, signOutMember, family } = useFamilySession();
  const toast = useToast();
  const router = useRouter();
  const { apps, loading } = useMemberAccess(activeMember);

  useEffect(() => {
    if (!activeMember) router.replace('/member');
  }, [activeMember, router]);

  const allowed = useMemo(() => apps.filter((app) => app.allowed), [apps]);
  const preview = useMemo(() => rowsOf(allowed.slice(0, 6), 3), [allowed]);

  if (!activeMember) {
    return (
      <ScreenContainer>
        <LoadingState fullScreen message="Returning to profile selection…" />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer scroll>
      <AppHeader
        eyebrow={family ? family.familyName : 'Member'}
        right={
          <IconButton
            accessibilityLabel="Switch profile"
            icon="swap-horizontal-outline"
            onPress={() => {
              void signOutMember()
                .then(() => router.replace('/member'))
                .catch(() => toast.show('Restrictions could not be cleared. Your profile remains active.', 'danger'));
            }}
            size={42}
            tone="mint"
          />
        }
        subtitle="Your own space on this device."
        title={`${greeting()}, ${firstName(activeMember.fullName)}`}
      />

      <HeroPanel eyebrow="YOUR PROFILE">
        <Text style={heroText.title}>
          {loading ? 'Reading your applications…' : `${allowed.length} of ${apps.length} applications`}
        </Text>
        <Text style={heroText.body}>
          These are the applications your administrator has made available to you on this device.
        </Text>
      </HeroPanel>

      <StatRow>
        <StatTile icon="checkmark-circle-outline" label="Available" tone="forest" value={`${allowed.length}`} />
        <StatTile icon="lock-closed-outline" label="Not available" tone="sage" value={`${apps.length - allowed.length}`} />
      </StatRow>

      <SectionHeader
        actionLabel="See all"
        onAction={() => router.push('/member/apps')}
        subtitle="Tap an application to open it."
        title="Your applications"
      />

      {loading ? (
        <LoadingState message="Reading your applications…" />
      ) : allowed.length === 0 ? (
        <NoticeCard
          message="No applications are available for this profile yet. Ask your administrator to open the boundary screen for you."
          title="Nothing available yet"
          tone="warning"
        />
      ) : (
        <View style={styles.grid}>
          {preview.map((row, rowIndex) => (
            <View key={rowIndex} style={styles.gridRow}>
              {row.map((app) => (
                <AppTile app={app} key={app.id} onPress={() => router.push('/member/apps')} />
              ))}
              {row.length < 3 ? <View style={styles.tileSpacer} /> : null}
            </View>
          ))}
        </View>
      )}

      <Card onPress={() => router.push('/member/restricted')} style={styles.helpCard} tone="sage">
        <View style={styles.helpRow}>
          <View style={styles.helpIcon}>
            <Ionicons color={colors.brandInk} name="chatbubble-ellipses-outline" size={20} />
          </View>
          <View style={styles.helpCopy}>
            <Text style={styles.helpTitle}>Something you need isn&apos;t here?</Text>
            <Text style={styles.helpBody}>See what to do when an application is not available to you.</Text>
          </View>
          <Ionicons color={colors.brandInk} name="chevron-forward" size={18} />
        </View>
      </Card>

      <Button icon="apps-outline" label="Open my applications" onPress={() => router.push('/member/apps')} variant="secondary" />

      <NoticeCard
        message="Your administrator decides which applications are available and can change them at any time. Nest stores those decisions on this device."
        title="Set by your administrator"
      />
      {Platform.OS !== 'android' ? (
        <NoticeCard
          message="This device does not support blocking other installed applications. Cross-app enforcement is available only on fully managed Android devices."
          title="Android app restrictions unavailable"
          tone="warning"
        />
      ) : null}
    </ScreenContainer>
  );
}

const useStyles = makeStyles((t) => ({
  grid: { gap: spacing.sm },
  gridRow: { flexDirection: 'row', gap: spacing.sm },
  tileSpacer: { flex: 1 },
  helpCard: { padding: spacing.sm },
  helpRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  helpIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: t.colors.brandSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  helpCopy: { flex: 1, gap: 2 },
  helpTitle: { ...typography.bodyStrong, color: t.colors.ink },
  helpBody: { ...typography.micro, color: t.colors.inkSecondary, lineHeight: 17 },
}));
