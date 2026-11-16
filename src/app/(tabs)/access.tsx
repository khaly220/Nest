import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { Button } from '@/components/common/Button';
import { Card, SectionHeader } from '@/components/common/Card';
import { EmptyState, LoadingState } from '@/components/common/EmptyState';
import { NoticeCard } from '@/components/common/InlineMessage';
import { AppHeader } from '@/components/navigation/AppHeader';
import { ScreenContainer } from '@/components/common/ScreenContainer';
import { FilterChips } from '@/components/forms/ChoiceRow';
import { PermissionRow } from '@/components/permissions/PermissionRow';
import { deviceRules, deviceRuleState, resetDeviceRule, setDeviceRule } from '@/data/services/accessService';
import { ageGroupDescription, ageGroupLabel, appCategories, categoryLabel } from '@/data/mock/apps';
import { useFamilySession } from '@/hooks/useFamilySession';
import { useMemberAccess } from '@/hooks/useMemberAccess';
import { useProtectedAction } from '@/hooks/useProtectedAction';
import { makeStyles, radius, spacing, typography } from '@/theme';
import type { AppCategory } from '@/types';

/** Screen 12 entry point — a per-profile overview of every boundary. */
export default function AccessScreen() {
  const styles = useStyles();
  const { admin, family, members } = useFamilySession();
  const router = useRouter();
  const runProtected = useProtectedAction();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selected = members.find((member) => member.id === selectedId) ?? members[0] ?? null;
  const { apps, stored, loading, setStoredRule, catalogSupported, error } = useMemberAccess(selected);

  const totals = useMemo(() => {
    const allowed = apps.filter((app) => app.allowed).length;
    const custom = apps.filter((app) => app.source === 'custom').length;
    return { allowed, blocked: apps.length - allowed, custom, total: apps.length };
  }, [apps]);

  const categoryRows = useMemo(() => {
    const rows: { id: AppCategory; label: string; allowed: number; total: number }[] = [];
    for (const category of appCategories) {
      const scoped = apps.filter((app) => app.category === category.id);
      if (!scoped.length) continue;
      rows.push({
        id: category.id,
        label: categoryLabel(category.id),
        allowed: scoped.filter((app) => app.allowed).length,
        total: scoped.length,
      });
    }
    return rows;
  }, [apps]);

  const toggleDeviceRule = (key: string, allowed: boolean) => {
    if (!admin || !family || !selected) return;
    setStoredRule(key, allowed);
    runProtected(async () => {
      await setDeviceRule(admin.id, family.id, selected.id, key, allowed);
    }, 'Device rule saved on this device');
  };

  const clearDeviceRule = (key: string) => {
    if (!admin || !family || !selected) return;
    setStoredRule(key, null);
    runProtected(async () => {
      await resetDeviceRule(admin.id, family.id, selected.id, key);
    }, 'Device rule returned to the default');
  };

  if (!members.length) {
    return (
      <ScreenContainer scroll>
        <AppHeader eyebrow="Access" subtitle="Boundaries are set per member profile." title="Access" />
        <EmptyState
          actionLabel="Add a member profile"
          icon="person-add-outline"
          message="Add a profile first, then choose exactly which applications it can open."
          onAction={() => router.push('/members/new')}
          title="No profiles yet"
        />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer scroll>
      <AppHeader
        eyebrow="Access"
        subtitle="Pick a profile, then adjust what it can open on this device."
        title="Boundaries"
      />

      <FilterChips
        onChange={setSelectedId}
        options={members.map((member) => ({ id: member.id, label: member.fullName }))}
        value={selected?.id ?? ''}
      />

      {selected ? (
        <>
          <Card style={styles.summaryCard}>
            <View style={styles.summaryTop}>
              <View style={styles.summaryCopy}>
                <Text style={styles.summaryName}>{selected.fullName}</Text>
                <Text style={styles.summaryMeta}>
                  {ageGroupLabel[selected.ageGroup]} profile · {totals.allowed} of {totals.total} applications available
                </Text>
              </View>
              <View style={styles.pill}>
                <Text style={styles.pillLabel}>{totals.custom} custom</Text>
              </View>
            </View>
            <View style={styles.bar}>
              <View style={[styles.barFill, { flex: Math.max(totals.allowed, 0.001) }]} />
              <View style={{ flex: Math.max(totals.blocked, 0.001) }} />
            </View>
            <Text style={styles.summaryNote}>{ageGroupDescription[selected.ageGroup]}</Text>
          </Card>

          <SectionHeader
            subtitle="These device-wide rules are stored locally; Android app blocking requires Device Owner provisioning."
            title="Device rules"
          />
          {loading ? (
            <LoadingState message="Reading stored boundaries…" />
          ) : (
            <View style={styles.group}>
              {deviceRules.map((rule, index) => {
                const state = deviceRuleState(stored, rule.key);
                return (
                  <PermissionRow
                    allowed={state === 'allowed'}
                    description={rule.description}
                    icon={rule.icon}
                    key={rule.key}
                    last={index === deviceRules.length - 1}
                    onChange={(next) => toggleDeviceRule(rule.key, next)}
                    onLongPress={state === 'default' ? undefined : () => clearDeviceRule(rule.key)}
                    source={state === 'default' ? 'recommended' : 'custom'}
                    title={rule.label}
                  />
                );
              })}
            </View>
          )}

          <SectionHeader
            actionLabel="All applications"
            onAction={() => router.push(`/members/${selected.id}/access`)}
            subtitle="How many applications are open inside each category."
            title="Category breakdown"
          />
          <Card style={styles.categoryCard}>
            {categoryRows.map((row, index) => (
              <View key={row.id} style={[styles.categoryRow, index < categoryRows.length - 1 && styles.categoryDivider]}>
                <Text style={styles.categoryLabel}>{row.label}</Text>
                <View style={styles.categoryBar}>
                  <View style={[styles.categoryBarFill, { flex: Math.max(row.allowed, 0.001) }]} />
                  <View style={{ flex: Math.max(row.total - row.allowed, 0.001) }} />
                </View>
                <Text style={styles.categoryCount}>
                  {row.allowed}/{row.total}
                </Text>
              </View>
            ))}
          </Card>

          <View style={styles.actions}>
            <Button
              icon="shield-checkmark-outline"
              label="Permission overview"
              onPress={() => router.push(`/members/${selected.id}/permissions`)}
            />
            <Button
              icon="apps-outline"
              label="Manage applications"
              onPress={() => router.push(`/members/${selected.id}/access`)}
              variant="secondary"
            />
          </View>

          {error ? (
            <NoticeCard message={`Installed applications could not be read: ${error}`} title="Catalog unavailable" tone="danger" />
          ) : !catalogSupported ? (
            <NoticeCard
              message="Installed-app discovery is available on Android only. iOS does not allow apps to list other installed applications, so no sample apps are shown here."
              title="App discovery is unavailable"
            />
          ) : (
            <NoticeCard
              message="This list contains launchable apps installed on this Android device. On a fully managed device where Nest is the Device Owner, blocked user-installed apps are hidden when a member signs in. System apps are not hidden."
              title="Installed apps"
            />
          )}
        </>
      ) : null}
    </ScreenContainer>
  );
}

const useStyles = makeStyles((t) => ({
  summaryCard: { gap: spacing.sm },
  summaryTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  summaryCopy: { flex: 1, gap: 2 },
  summaryName: { ...typography.title3, color: t.colors.ink },
  summaryMeta: { ...typography.micro, color: t.colors.inkSecondary },
  pill: { paddingHorizontal: spacing.xs, paddingVertical: 5, borderRadius: radius.pill, backgroundColor: t.colors.brandSoft },
  pillLabel: { ...typography.micro, color: t.colors.brandInk, fontWeight: '700' },
  bar: {
    flexDirection: 'row',
    height: 8,
    borderRadius: radius.pill,
    overflow: 'hidden',
    backgroundColor: t.colors.surfaceMuted,
  },
  barFill: { backgroundColor: t.colors.brandDeep },
  summaryNote: { ...typography.micro, color: t.colors.inkSecondary, lineHeight: 17 },
  group: {
    backgroundColor: t.colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: t.colors.border,
    paddingHorizontal: spacing.sm,
  },
  categoryCard: { gap: 0 },
  categoryRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xs },
  categoryDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: t.colors.border },
  categoryLabel: { ...typography.caption, color: t.colors.ink, width: 104 },
  categoryBar: { flex: 1, flexDirection: 'row', height: 6, borderRadius: radius.pill, overflow: 'hidden', backgroundColor: t.colors.surfaceMuted },
  categoryBarFill: { backgroundColor: t.colors.success },
  categoryCount: { ...typography.micro, color: t.colors.inkSecondary, fontWeight: '700', width: 46, textAlign: 'right' },
  actions: { gap: spacing.xs },
}));
