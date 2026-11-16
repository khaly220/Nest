import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshControl, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Href } from 'expo-router';
import { useRouter } from 'expo-router';

import { ActivityItem } from '@/components/cards/ActivityItem';
import { Card, SectionHeader } from '@/components/common/Card';
import { IconButton } from '@/components/common/Button';
import { EmptyState } from '@/components/common/EmptyState';
import { NoticeCard } from '@/components/common/InlineMessage';
import { HeroPanel, heroText } from '@/components/common/NestMark';
import { ScreenContainer } from '@/components/common/ScreenContainer';
import { StatRow, StatTile } from '@/components/cards/StatTile';
import { useFamilySession } from '@/hooks/useFamilySession';
import { countAccess, loadMemberAccess } from '@/data/services/accessService';
import { loadRecordedActivity, previewActivity } from '@/data/services/activityService';
import { loadDeviceState } from '@/data/mock/device';
import { makeStyles, radius, spacing, typography, useTheme } from '@/theme';
import type { ActivityEvent, IconName } from '@/types';
import { firstName, formatRelative, greeting } from '@/utils/format';

type MemberSummary = Record<string, { allowed: number; total: number }>;

const quickActions: { icon: IconName; title: string; body: string; href: Href }[] = [
  { icon: 'person-add-outline', title: 'Add a member', body: 'Create a profile', href: '/members/new' },
  { icon: 'shield-checkmark-outline', title: 'Review access', body: 'Adjust boundaries', href: '/access' },
  { icon: 'phone-portrait-outline', title: 'This device', body: 'Status and limits', href: '/device' },
];

/** Screen 7 — administrator dashboard. */
export default function AdministratorHomeScreen() {
  const styles = useStyles();
  const { colors } = useTheme();
  const { admin, family, members, memberNames, activeMember } = useFamilySession();
  const router = useRouter();
  const [summaries, setSummaries] = useState<MemberSummary>({});
  const [activity, setActivity] = useState<ActivityEvent[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [accessError, setAccessError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const next: MemberSummary = {};
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
    if (!family) {
      setActivity([]);
      return;
    }
    const recorded = await loadRecordedActivity(family.id, memberNames);
    setActivity(recorded.length ? recorded.slice(0, 3) : previewActivity().slice(0, 2));
  }, [family, memberNames, members]);

  useEffect(() => {
    void Promise.resolve().then(load);
  }, [load]);

  const totals = useMemo(() => {
    const values = Object.values(summaries);
    const allowed = values.reduce((sum, item) => sum + item.allowed, 0);
    const total = values.reduce((sum, item) => sum + item.total, 0);
    return { allowed, blocked: total - allowed, total };
  }, [summaries]);

  const device = loadDeviceState(activeMember?.fullName ?? null);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    void load().finally(() => setRefreshing(false));
  }, [load]);

  return (
    <ScreenContainer
      refreshControl={<RefreshControl onRefresh={onRefresh} refreshing={refreshing} tintColor={colors.brandInk} />}
      scroll
    >
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Text style={styles.eyebrow}>Administrator</Text>
          <Text style={styles.title}>
            {greeting()}, {firstName(admin?.username ?? 'there')}
          </Text>
        </View>
        <IconButton accessibilityLabel="Notification preferences" icon="notifications-outline" onPress={() => router.push('/settings/notifications')} />
      </View>

      <HeroPanel eyebrow={family ? 'FAMILY SPACE' : 'NO FAMILY YET'}>
        <Text style={heroText.title}>{family ? family.familyName : 'Create a family space'}</Text>
        <Text style={[heroText.body, styles.heroBody]}>
          {family
            ? members.length === 0
              ? 'No member profiles yet. Add the first one to start setting boundaries.'
              : `${members.length} ${members.length === 1 ? 'profile' : 'profiles'} · ${totals.allowed} of ${totals.total} applications available`
            : 'A family space holds every profile and boundary on this device.'}
        </Text>
        {!family ? (
          <Text style={[heroText.caption, styles.heroAction]} onPress={() => router.push('/create-family')}>
            Set it up now →
          </Text>
        ) : null}
      </HeroPanel>

      {accessError ? (
        <NoticeCard
          message={`Application access summaries could not be loaded: ${accessError}`}
          title="Installed apps unavailable"
          tone="danger"
        />
      ) : null}

      {family ? (
        <StatRow>
          <StatTile icon="people-outline" label="Members" value={`${members.length}`} />
          <StatTile icon="checkmark-circle-outline" label="Allowed" tone="forest" value={`${totals.allowed}`} />
          <StatTile icon="ban-outline" label="Blocked" tone="warning" value={`${totals.blocked}`} />
        </StatRow>
      ) : null}

      <SectionHeader subtitle="The three things you reach for most." title="Quick actions" />
      <View style={styles.actions}>
        {quickActions.map((action) => (
          <Card
            accessibilityLabel={action.title}
            key={action.title}
            onPress={() => (action.href === '/members/new' && !family ? router.push('/create-family') : router.push(action.href))}
            style={styles.actionCard}
          >
            <View style={styles.actionIcon}>
              <Ionicons color={colors.brandInk} name={action.icon} size={20} />
            </View>
            <Text style={styles.actionTitle}>{action.title}</Text>
            <Text style={styles.actionBody}>{action.body}</Text>
          </Card>
        ))}
      </View>

      <SectionHeader actionLabel="See all" onAction={() => router.push('/activity')} title="Recent activity" />
      {activity.length ? (
        <Card style={styles.activityCard}>
          {activity.map((event, index) => (
            <ActivityItem event={event} key={event.id} last={index === activity.length - 1} timestamp={formatRelative(event.createdAt)} />
          ))}
        </Card>
      ) : (
        <EmptyState compact icon="pulse-outline" message="Profile and boundary changes will appear here." title="Nothing recorded yet" />
      )}

      <SectionHeader subtitle="Who has the device right now." title="Device status" />
      {members.length === 0 ? (
        <EmptyState
          actionLabel="Add a member profile"
          icon="person-add-outline"
          message="Profiles give each family member their own sign-in and their own applications."
          onAction={() => router.push('/members/new')}
          title="Start with one profile"
        />
      ) : (
        <Card style={styles.deviceCard}>
          <View style={styles.deviceRow}>
            <View style={styles.deviceIcon}>
              <Ionicons color={colors.brandInk} name="phone-portrait-outline" size={20} />
            </View>
            <View style={styles.deviceCopy}>
              <Text style={styles.deviceTitle}>{device.model}</Text>
              <Text style={styles.deviceBody}>
                {device.platform} · {activeMember ? `Signed in as ${activeMember.fullName}` : 'No member signed in'}
              </Text>
            </View>
            <Text style={styles.deviceAction} onPress={() => router.push('/device')}>
              Manage
            </Text>
          </View>
        </Card>
      )}

      <NoticeCard message={device.capabilityNote} title="Check Android enforcement status" tone="warning" />
    </ScreenContainer>
  );
}

const useStyles = makeStyles((t) => ({
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingTop: spacing.xs },
  headerCopy: { flex: 1, gap: 2 },
  eyebrow: { ...typography.eyebrow, color: t.colors.inkSecondary },
  title: { ...typography.title1, color: t.colors.ink },
  heroBody: { marginTop: spacing.xxs },
  heroAction: { marginTop: spacing.xs, fontWeight: '800' },
  actions: { flexDirection: 'row', gap: spacing.xs },
  actionCard: { flex: 1, gap: spacing.xxs, padding: spacing.sm },
  actionIcon: {
    width: 38,
    height: 38,
    borderRadius: radius.sm,
    backgroundColor: t.colors.brandSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xxs,
  },
  actionTitle: { ...typography.micro, color: t.colors.ink, fontWeight: '700' },
  actionBody: { ...typography.micro, fontSize: 10, color: t.colors.inkMuted },
  activityCard: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs },
  deviceCard: { padding: spacing.sm },
  deviceRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  deviceIcon: {
    width: 42,
    height: 42,
    borderRadius: radius.sm,
    backgroundColor: t.colors.neutralTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deviceCopy: { flex: 1, gap: 2 },
  deviceTitle: { ...typography.bodyStrong, color: t.colors.ink },
  deviceBody: { ...typography.micro, color: t.colors.inkSecondary },
  deviceAction: { ...typography.caption, color: t.colors.success, fontWeight: '700' },
}));
