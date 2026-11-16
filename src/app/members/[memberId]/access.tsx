import React, { useMemo, useState } from 'react';
import { Switch, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { AppRow } from '@/components/cards/AppCard';
import { Button } from '@/components/common/Button';
import { Card } from '@/components/common/Card';
import { EmptyState, LoadingState } from '@/components/common/EmptyState';
import { NoticeCard } from '@/components/common/InlineMessage';
import { ScreenContainer } from '@/components/common/ScreenContainer';
import { SearchBar } from '@/components/common/SearchBar';
import { FilterChips } from '@/components/forms/ChoiceRow';
import { AppHeader } from '@/components/navigation/AppHeader';
import { ageGroupLabel, appCategories, categoryLabel, recommendedAccess } from '@/data/mock/apps';
import { appRuleKey, countAccess, filterApps, resetAppAccess, setAppAccess } from '@/data/services/accessService';
import { useFamilySession, useMemberById } from '@/hooks/useFamilySession';
import { useMemberAccess } from '@/hooks/useMemberAccess';
import { useProtectedAction } from '@/hooks/useProtectedAction';
import { makeStyles, radius, spacing, typography, useTheme } from '@/theme';
import type { AccessFilter, MemberAppAccess } from '@/types';

/** Screen 11 — application access management for one member profile. */
export default function MemberAccessScreen() {
  const styles = useStyles();
  const { colors } = useTheme();
  const { memberId } = useLocalSearchParams<{ memberId: string }>();
  const router = useRouter();
  const member = useMemberById(memberId);
  const { admin, family } = useFamilySession();
  const runProtected = useProtectedAction();
  const { apps, loading, updateApp, setStoredRule, catalogSupported, error, reload } = useMemberAccess(member);

  const [query, setQuery] = useState('');
  const [stateFilter, setStateFilter] = useState<AccessFilter>('all');
  const [category, setCategory] = useState('all');

  const totals = useMemo(() => countAccess(apps), [apps]);
  const customCount = useMemo(() => apps.filter((app) => app.source === 'custom').length, [apps]);

  const visible = useMemo(
    () =>
      filterApps(apps, stateFilter, query).filter((app) => category === 'all' || app.category === category),
    [apps, category, query, stateFilter],
  );

  const stateChips = useMemo(
    () => [
      { id: 'all', label: 'All', count: apps.length },
      { id: 'allowed', label: 'Available', count: totals.allowed },
      { id: 'blocked', label: 'Blocked', count: totals.blocked },
    ],
    [apps.length, totals.allowed, totals.blocked],
  );

  const categoryChips = useMemo(
    () => [
      { id: 'all', label: 'All categories' },
      ...appCategories.map((item) => ({
        id: item.id as string,
        label: categoryLabel(item.id),
        count: apps.filter((app) => app.category === item.id).length,
      })),
    ],
    [apps],
  );

  if (!member) {
    return (
      <ScreenContainer scroll>
        <AppHeader eyebrow="Applications" subtitle="Boundaries are stored per profile." title="Unavailable" />
        <EmptyState icon="apps-outline" message="This member profile is no longer on this device." title="Profile not found" />
      </ScreenContainer>
    );
  }

  const toggle = (app: MemberAppAccess, next: boolean) => {
    if (!admin || !family) return;
    const recommended = recommendedAccess(app, member.ageGroup);
    updateApp(app.id, next, next === recommended ? 'recommended' : 'custom');
    setStoredRule(appRuleKey(app.id), next === recommended ? null : next);
    runProtected(async () => {
      if (next === recommended) await resetAppAccess(admin.id, family.id, member.id, app.id);
      else await setAppAccess(admin.id, family.id, member.id, app.id, next);
    }, next ? `${app.name} is available` : `${app.name} is blocked`);
  };

  const resetToRecommended = (app: MemberAppAccess) => {
    if (!admin || !family) return;
    updateApp(app.id, recommendedAccess(app, member.ageGroup), 'recommended');
    setStoredRule(appRuleKey(app.id), null);
    runProtected(async () => {
      await resetAppAccess(admin.id, family.id, member.id, app.id);
    }, `${app.name} follows the recommended default again`);
  };

  return (
    <ScreenContainer scroll>
      <AppHeader
        eyebrow="Application access"
        onBack={() => router.back()}
        subtitle={`${ageGroupLabel[member.ageGroup]} profile · ${totals.allowed} of ${totals.total} applications available`}
        title={member.fullName}
      />

      <Card style={styles.summaryCard}>
        <View style={styles.summaryTop}>
          <View style={styles.summaryCopy}>
            <Text style={styles.summaryTitle}>Availability</Text>
            <Text style={styles.summaryMeta}>
              {totals.allowed} available · {totals.blocked} blocked
            </Text>
          </View>
          <View style={styles.pill}>
            <Text style={styles.pillLabel}>{customCount} custom</Text>
          </View>
        </View>
        <View style={styles.bar}>
          <View style={[styles.barAllowed, { flex: Math.max(totals.allowed, 0.001) }]} />
          <View style={{ flex: Math.max(totals.blocked, 0.001) }} />
        </View>
        <Text style={styles.summaryNote}>
          Changes save on this device straight away. Long press a row to put it back to the recommended default.
        </Text>
      </Card>

      <SearchBar onChangeText={setQuery} placeholder="Search applications" value={query} />
      <FilterChips onChange={(id) => setStateFilter(id as AccessFilter)} options={stateChips} value={stateFilter} />
      <FilterChips onChange={setCategory} options={categoryChips} value={category} />

      {loading ? (
        <LoadingState message="Reading stored boundaries…" />
      ) : error ? (
        <NoticeCard message={`Installed applications could not be read: ${error}`} title="Catalog unavailable" tone="danger" />
      ) : !catalogSupported ? (
        <NoticeCard
          message="Installed-app discovery is available on Android only. iOS does not allow apps to list other installed applications, so no sample apps are shown here."
          title="App discovery is unavailable"
        />
      ) : apps.length === 0 ? (
        <EmptyState
          icon="apps-outline"
          message="No launchable applications were found on this device."
          title="No installed apps"
        />
      ) : visible.length ? (
        <View style={styles.group}>
          {visible.map((app, index) => (
            <AppRow
              app={app}
              key={app.id}
              last={index === visible.length - 1}
              onLongPress={app.source === 'custom' ? () => resetToRecommended(app) : undefined}
              trailing={
                <Switch
                  accessibilityLabel={`${app.name} available`}
                  ios_backgroundColor={colors.borderStrong}
                  onValueChange={(next) => toggle(app, next)}
                  thumbColor={colors.white}
                  trackColor={{ false: colors.borderStrong, true: colors.success }}
                  value={app.allowed}
                />
              }
            />
          ))}
        </View>
      ) : (
        <EmptyState
          icon="search-outline"
          message="No application matches the current search and filters. Clear the filters to see the whole catalog."
          title="Nothing matches"
        />
      )}

      {error ? (
        <Button icon="refresh-outline" label="Try again" onPress={() => void reload()} variant="secondary" />
      ) : null}

      <View style={styles.legend}>
        <Ionicons color={colors.inkSecondary} name="information-circle-outline" size={16} />
        <Text style={styles.legendText}>
          Removing an application here only removes the custom rule. It never uninstalls anything from the device.
        </Text>
      </View>
    </ScreenContainer>
  );
}

const useStyles = makeStyles((t) => ({
  summaryCard: { gap: spacing.sm },
  summaryTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  summaryCopy: { flex: 1, gap: 2 },
  summaryTitle: { ...typography.title3, color: t.colors.ink },
  summaryMeta: { ...typography.micro, color: t.colors.inkSecondary },
  pill: { paddingHorizontal: spacing.xs, paddingVertical: 5, borderRadius: radius.pill, backgroundColor: t.colors.brandSoft },
  pillLabel: { ...typography.micro, color: t.colors.brandInk, fontWeight: '700' },
  bar: { flexDirection: 'row', height: 8, borderRadius: radius.pill, overflow: 'hidden', backgroundColor: t.colors.surfaceMuted },
  barAllowed: { backgroundColor: t.colors.brandDeep },
  summaryNote: { ...typography.micro, color: t.colors.inkSecondary, lineHeight: 17 },
  group: {
    backgroundColor: t.colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: t.colors.border,
    paddingHorizontal: spacing.sm,
  },
  legend: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.xs },
  legendText: { ...typography.micro, color: t.colors.inkSecondary, flex: 1, lineHeight: 17 },
}));
