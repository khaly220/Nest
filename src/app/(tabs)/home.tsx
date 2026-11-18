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
import { loadMemberAccess } from '@/data/services/accessService';
import { loadRecordedActivity } from '@/data/services/activityService';
import { loadDeviceState } from '@/data/mock/device';
import { makeStyles, radius, spacing, typography, useTheme } from '@/theme';
import type { ActivityEvent, IconName } from '@/types';
import { firstName, formatRelative, greeting } from '@/utils/format';

type MemberSummary = Record<string, { installedApps: number; restrictedAppIds: string[]; savedRules: number }>;

const quickActions: { icon: IconName; title: string; body: string; href: Href }[] = [
  { icon: 'person-add-outline', title: 'Add a member', body: 'Create a profile', href: '/members/new' },
  { icon: 'apps-outline', title: 'Discover apps', body: 'View installed apps', href: '/access' },
  { icon: 'shield-checkmark-outline', title: 'Manage rules', body: 'Adjust restrictions', href: '/access' },
  { icon: 'pulse-outline', title: 'View activity', body: 'See local history', href: '/activity' },
];

/** Screen 7 — administrator dashboard. */
export default function AdministratorHomeScreen() {
  const styles = useStyles();
  const { colors } = useTheme();
  const { admin, family, members, memberNames, activeMember, memberRestrictionWarning } = useFamilySession();
  const router = useRouter();
  const [summaries, setSummaries] = useState<MemberSummary>({});
  const [activity, setActivity] = useState<ActivityEvent[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [accessError, setAccessError] = useState<string | null>(null);
  const [activityError, setActivityError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const next: MemberSummary = {};
    try {
      for (const member of members) {
        const { apps, stored } = await loadMemberAccess(member.id, member.ageGroup);
        next[member.id] = {
          installedApps: apps.length,
          restrictedAppIds: apps
            .filter((app) => stored[`app:${app.id}`] === false)
            .map((app) => app.id),
          savedRules: Object.keys(stored).length,
        };
      }
      setSummaries(next);
      setAccessError(null);
    } catch (cause) {
      setAccessError(cause instanceof Error ? cause.message : 'Unknown error');
    }
    if (!family) {
      setActivity([]);
      setActivityError(null);
      return;
    }
    try {
      const recorded = await loadRecordedActivity(family.id, memberNames);
      setActivity(recorded.slice(0, 3));
      setActivityError(null);
    } catch (cause) {
      setActivity([]);
      setActivityError(cause instanceof Error ? cause.message : 'Unknown error');
    }
  }, [family, memberNames, members]);

  useEffect(() => {
    void Promise.resolve().then(load);
  }, [load]);

  const totals = useMemo(() => {
    const values = Object.values(summaries);
    const restrictedApps = new Set(values.flatMap((item) => item.restrictedAppIds));
    const installedApps = values.reduce((count, item) => Math.max(count, item.installedApps), 0);
    const savedRules = values.reduce((count, item) => count + item.savedRules, 0);
    return { restrictedApps: restrictedApps.size, installedApps, savedRules };
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
              : `${members.length} ${members.length === 1 ? 'profile' : 'profiles'} · ${totals.restrictedApps} app restrictions saved`
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
      {memberRestrictionWarning ? (
        <NoticeCard message={memberRestrictionWarning} title="App access needs attention" tone="warning" />
      ) : null}

      {family ? (
        <StatRow>
          <StatTile icon="people-outline" label="Members" value={`${members.length}`} />
          <StatTile icon="ban-outline" label="Restricted apps" tone="warning" value={`${totals.restrictedApps}`} />
          <StatTile icon="shield-checkmark-outline" label="Saved rules" tone="forest" value={`${totals.savedRules}`} />
        </StatRow>
      ) : null}
      {family ? <Text style={styles.catalogCaption}>{totals.installedApps} launchable apps discovered on this device</Text> : null}

      <SectionHeader subtitle="Common family-management tasks." title="Quick actions" />
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
      {activityError ? (
        <NoticeCard message={`Local activity could not be loaded: ${activityError}`} title="Activity unavailable" tone="danger" />
      ) : activity.length ? (
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
  catalogCaption: { ...typography.micro, color: t.colors.inkMuted, marginTop: spacing.xxs },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  actionCard: { flexBasis: '48%', flexGrow: 1, gap: spacing.xxs, padding: spacing.sm },
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
