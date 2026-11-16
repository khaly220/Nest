import React, { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { AppRow } from '@/components/cards/AppCard';
import { StatRow, StatTile } from '@/components/cards/StatTile';
import { Badge } from '@/components/common/Badge';
import { Button } from '@/components/common/Button';
import { Card, SectionHeader } from '@/components/common/Card';
import { EmptyState, LoadingState } from '@/components/common/EmptyState';
import { InlineMessage, NoticeCard } from '@/components/common/InlineMessage';
import { ConfirmDialog } from '@/components/common/ModalSheet';
import { ScreenContainer } from '@/components/common/ScreenContainer';
import { PermissionRow } from '@/components/permissions/PermissionRow';
import { AppHeader } from '@/components/navigation/AppHeader';
import { ageGroupDescription, ageGroupLabel, recommendedAccess } from '@/data/mock/apps';
import { appRuleKey, resetAppAccess, setAppAccess } from '@/data/services/accessService';
import { useFamilySession, useMemberById } from '@/hooks/useFamilySession';
import { useMemberAccess } from '@/hooks/useMemberAccess';
import { useToast } from '@/hooks/useToast';
import { makeStyles, radius, spacing, typography, useTheme } from '@/theme';
import type { MemberAppAccess } from '@/types';

/** Screen 12 — permission overview with an explicit save step. */
export default function PermissionOverviewScreen() {
  const styles = useStyles();
  const { colors } = useTheme();
  const { memberId } = useLocalSearchParams<{ memberId: string }>();
  const router = useRouter();
  const member = useMemberById(memberId);
  const { admin, family, requestReauthentication } = useFamilySession();
  const toast = useToast();
  const { apps, stored, setStored, loading, reload, catalogSupported, error } = useMemberAccess(member);

  const [draft, setDraft] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);
  const [resetVisible, setResetVisible] = useState(false);

  const view = useMemo<MemberAppAccess[]>(() => {
    if (!member) return [];
    return apps.map((app) => {
      const key = appRuleKey(app.id);
      if (!Object.prototype.hasOwnProperty.call(draft, key)) return app;
      const recommended = recommendedAccess(app, member.ageGroup);
      const allowed = draft[key];
      return { ...app, allowed, source: allowed === recommended ? 'recommended' : 'custom' };
    });
  }, [apps, draft, member]);

  const totals = useMemo(() => {
    const allowed = view.filter((app) => app.allowed).length;
    const custom = view.filter((app) => app.source === 'custom').length;
    return { allowed, blocked: view.length - allowed, custom, total: view.length };
  }, [view]);

  const overrides = useMemo(() => view.filter((app) => app.source === 'custom'), [view]);
  const dirty = Object.keys(draft).length > 0;

  if (!member) {
    return (
      <ScreenContainer scroll>
        <AppHeader eyebrow="Permissions" onBack={() => router.back()} title="Unavailable" />
        <EmptyState icon="shield-checkmark-outline" message="This member profile is no longer on this device." title="Profile not found" />
      </ScreenContainer>
    );
  }

  const toggle = (app: MemberAppAccess, next: boolean) => {
    const baseline = apps.find((item) => item.id === app.id)?.allowed ?? false;
    const key = appRuleKey(app.id);
    setDraft((current) => {
      const updated = { ...current };
      if (next === baseline) delete updated[key];
      else updated[key] = next;
      return updated;
    });
  };

  async function commit() {
    if (!admin || !family || !member) return;
    setSaving(true);
    try {
      for (const [key, allowed] of Object.entries(draft)) {
        const appId = key.replace(/^app:/, '');
        const app = apps.find((item) => item.id === appId);
        const recommended = app ? recommendedAccess(app, member.ageGroup) : false;
        if (allowed === recommended) await resetAppAccess(admin.id, family.id, member.id, appId);
        else await setAppAccess(admin.id, family.id, member.id, appId, allowed);
      }
      setDraft({});
      toast.show('Permission changes saved on this device', 'success');
      await reload();
    } catch (cause) {
      if (cause instanceof Error && cause.message === 'ADMIN_AUTH_REQUIRED') {
        requestReauthentication('Confirm your administrator password to save these permission changes.', commit);
        return;
      }
      toast.show('Those changes could not be saved on this device.', 'danger');
    } finally {
      setSaving(false);
    }
  }

  async function resetAll() {
    if (!admin || !family || !member) return;
    setResetVisible(false);
    setSaving(true);
    try {
      const keys = Object.keys(stored).filter((key) => key.startsWith('app:'));
      for (const key of keys) {
        await resetAppAccess(admin.id, family.id, member.id, key.replace(/^app:/, ''));
      }
      setDraft({});
      setStored({});
      toast.show('Every application follows the recommended default again', 'success');
      await reload();
    } catch (cause) {
      if (cause instanceof Error && cause.message === 'ADMIN_AUTH_REQUIRED') {
        requestReauthentication('Confirm your administrator password to reset these permissions.', resetAll);
        return;
      }
      toast.show('The reset could not be saved on this device.', 'danger');
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScreenContainer
      footer={
        <View style={styles.footer}>
          <Button
            disabled={!dirty}
            icon="checkmark-circle-outline"
            label={dirty ? `Save ${Object.keys(draft).length} change${Object.keys(draft).length === 1 ? '' : 's'}` : 'No changes to save'}
            loading={saving}
            onPress={commit}
          />
          <Button
            disabled={saving}
            icon="refresh-outline"
            label="Reset to recommended"
            onPress={() => setResetVisible(true)}
            variant="secondary"
          />
        </View>
      }
      scroll
    >
      <AppHeader
        eyebrow="Permission overview"
        onBack={() => router.back()}
        subtitle={ageGroupDescription[member.ageGroup]}
        title={member.fullName}
      />

      <InlineMessage
        message={dirty ? 'You have unsaved changes. Save them to store the boundaries on this device.' : undefined}
        tone="warning"
      />

      <Card style={styles.policyCard}>
        <View style={styles.policyHeader}>
          <Ionicons color={colors.brandInk} name="shield-checkmark-outline" size={20} />
          <Text style={styles.policyTitle}>Default policy</Text>
        </View>
        <Text style={styles.policyBody}>
          New applications follow the recommended rule for a {ageGroupLabel[member.ageGroup].toLowerCase()} profile. Anything you change here
          becomes a custom rule that overrides it.
        </Text>
        <View style={styles.badges}>
          <Badge label={`Recommended: ${ageGroupLabel[member.ageGroup]}`} tone="mint" />
          <Badge label={`${totals.custom} custom override${totals.custom === 1 ? '' : 's'}`} tone={totals.custom ? 'warning' : 'neutral'} />
        </View>
      </Card>

      {loading ? (
        <LoadingState message="Reading stored boundaries…" />
      ) : (
        <StatRow>
          <StatTile icon="checkmark-circle-outline" label="Allowed" tone="forest" value={`${totals.allowed}`} />
          <StatTile icon="ban-outline" label="Blocked" tone="warning" value={`${totals.blocked}`} />
          <StatTile icon="options-outline" label="Custom" tone="sage" value={`${totals.custom}`} />
        </StatRow>
      )}

      <SectionHeader
        actionLabel="Reset all"
        onAction={() => setResetVisible(true)}
        subtitle="Applications that differ from the recommended rule."
        title="Custom overrides"
      />
      {overrides.length ? (
        <View style={styles.group}>
          {overrides.map((app, index) => (
            <AppRow
              app={app}
              key={app.id}
              last={index === overrides.length - 1}
              trailing={
                <Pressable
                  accessibilityLabel={`Return ${app.name} to the recommended rule`}
                  accessibilityRole="button"
                  hitSlop={8}
                  onPress={() => toggle(app, recommendedAccess(app, member.ageGroup))}
                  style={({ pressed }) => [styles.resetChip, pressed && styles.pressed]}
                >
                  <Text style={styles.resetLabel}>Reset</Text>
                </Pressable>
              }
            />
          ))}
        </View>
      ) : (
        <EmptyState
          compact
          icon="shield-checkmark-outline"
          message="Every application currently follows the recommended rule for this age group."
          title="Nothing customised yet"
        />
      )}

      <SectionHeader subtitle="Switch a row to queue a change, then save." title="Every application" />
      {error ? (
        <NoticeCard message={`Installed applications could not be read: ${error}`} title="Catalog unavailable" tone="danger" />
      ) : !catalogSupported ? (
        <NoticeCard
          message="Installed-app discovery is available on Android only. iOS does not allow apps to list other installed applications, so no sample apps are shown here."
          title="App discovery is unavailable"
        />
      ) : view.length ? (
        <View style={styles.group}>
          {view.map((app, index) => (
            <PermissionRow
              allowed={app.allowed}
              description={app.summary}
              icon={app.icon}
              key={app.id}
              last={index === view.length - 1}
              onChange={(next) => toggle(app, next)}
              source={app.source}
              title={app.name}
            />
          ))}
        </View>
      ) : (
        <EmptyState icon="apps-outline" message="No launchable applications were found on this device." title="No installed apps" />
      )}

      <NoticeCard
        message="Saving writes one rule per changed application to the encrypted database on this device. Long presses and resets only remove the custom rule; nothing is uninstalled."
        title="How saving works"
      />

      <ConfirmDialog
        confirmLabel="Reset everything"
        message="Every custom application rule for this profile is removed, so each application follows the recommended default for this age group again."
        onCancel={() => setResetVisible(false)}
        onConfirm={resetAll}
        title="Reset to the recommended set?"
        tone="danger"
        visible={resetVisible}
      />
    </ScreenContainer>
  );
}

const useStyles = makeStyles((t) => ({
  footer: { gap: spacing.xs },
  policyCard: { gap: spacing.xs },
  policyHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  policyTitle: { ...typography.title3, color: t.colors.ink },
  policyBody: { ...typography.micro, color: t.colors.inkSecondary, lineHeight: 18 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginTop: spacing.xxs },
  group: {
    backgroundColor: t.colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: t.colors.border,
    paddingHorizontal: spacing.sm,
  },
  resetChip: {
    paddingHorizontal: spacing.xs,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: t.colors.neutralTint,
    borderWidth: 1,
    borderColor: t.colors.border,
  },
  resetLabel: { ...typography.micro, color: t.colors.brandInk, fontWeight: '700' },
  pressed: { opacity: 0.8 },
}));
