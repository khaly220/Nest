import React, { useEffect, useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { AppTile } from '@/components/cards/AppCard';
import { Button } from '@/components/common/Button';
import { SectionHeader } from '@/components/common/Card';
import { EmptyState, LoadingState } from '@/components/common/EmptyState';
import { NoticeCard } from '@/components/common/InlineMessage';
import { ModalSheet } from '@/components/common/ModalSheet';
import { ScreenContainer } from '@/components/common/ScreenContainer';
import { SearchBar } from '@/components/common/SearchBar';
import { FilterChips } from '@/components/forms/ChoiceRow';
import { AppHeader } from '@/components/navigation/AppHeader';
import { appCategories, categoryLabel } from '@/data/mock/apps';
import { useFamilySession } from '@/hooks/useFamilySession';
import { useMemberAccess } from '@/hooks/useMemberAccess';
import { makeStyles, radius, spacing, typography } from '@/theme';
import type { AppCategory, MemberAppAccess } from '@/types';

type Availability = 'all' | 'allowed' | 'blocked';

function rowsOf(items: MemberAppAccess[], size: number): MemberAppAccess[][] {
  const out: MemberAppAccess[][] = [];
  for (let index = 0; index < items.length; index += size) out.push(items.slice(index, index + size));
  return out;
}

/** Screen 18 — the applications available to the signed-in member. */
export default function MemberAppsScreen() {
  const styles = useStyles();
  const { activeMember } = useFamilySession();
  const router = useRouter();
  const { apps, loading, catalogSupported, error } = useMemberAccess(activeMember);

  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<'all' | AppCategory>('all');
  const [availability, setAvailability] = useState<Availability>('all');
  const [launching, setLaunching] = useState<MemberAppAccess | null>(null);

  useEffect(() => {
    if (!activeMember) router.replace('/member');
  }, [activeMember, router]);

  const categoryOptions = useMemo(
    () => [
      { id: 'all', label: 'All categories' },
      ...appCategories
        .filter((item) => apps.some((app) => app.category === item.id))
        .map((item) => ({ id: item.id, label: item.label })),
    ],
    [apps],
  );

  const counts = useMemo(() => {
    const allowed = apps.filter((app) => app.allowed).length;
    return { allowed, blocked: apps.length - allowed };
  }, [apps]);

  const visible = useMemo(() => {
    const term = query.trim().toLowerCase();
    return apps.filter((app) => {
      if (category !== 'all' && app.category !== category) return false;
      if (availability === 'allowed' && !app.allowed) return false;
      if (availability === 'blocked' && app.allowed) return false;
      if (!term) return true;
      return app.name.toLowerCase().includes(term) || categoryLabel(app.category).toLowerCase().includes(term) || app.summary.toLowerCase().includes(term);
    });
  }, [apps, availability, category, query]);

  const grid = useMemo(() => rowsOf(visible, 3), [visible]);
  const filtered = query.length > 0 || category !== 'all' || availability !== 'all';

  if (!activeMember) {
    return (
      <ScreenContainer>
        <LoadingState fullScreen message="Returning to profile selection…" />
      </ScreenContainer>
    );
  }

  const openApp = (app: MemberAppAccess) => {
    if (!app.allowed) {
      router.push(`/member/restricted?appId=${app.id}`);
      return;
    }
    setLaunching(app);
  };

  return (
    <ScreenContainer scroll>
      <AppHeader
        backLabel="Back to my home"
        eyebrow="Your applications"
        onBack={() => router.back()}
        subtitle={`${counts.allowed} available · ${counts.blocked} not available for ${activeMember.fullName}`}
        title="Available applications"
      />

      <SearchBar onChangeText={setQuery} placeholder="Search applications" value={query} />

      <View style={styles.filters}>
        <FilterChips
          onChange={(id) => setAvailability(id as Availability)}
          options={[
            { id: 'all', label: 'All', count: apps.length },
            { id: 'allowed', label: 'Available', count: counts.allowed },
            { id: 'blocked', label: 'Not available', count: counts.blocked },
          ]}
          value={availability}
        />
        <FilterChips onChange={(id) => setCategory(id as 'all' | AppCategory)} options={categoryOptions} value={category} />
      </View>

      <SectionHeader
        subtitle="Applications that are not available cannot be opened from here."
        title={filtered ? `${visible.length} matching` : 'All applications'}
      />

      {loading ? (
        <LoadingState message="Reading your applications…" />
      ) : error ? (
        <NoticeCard message={`Installed applications could not be read: ${error}`} title="Applications unavailable" tone="danger" />
      ) : !catalogSupported ? (
        <NoticeCard
          message="Installed-app discovery is available on Android only. This device does not show sample applications."
          title="Applications unavailable"
        />
      ) : visible.length === 0 ? (
        <EmptyState
          actionLabel={apps.length ? 'Clear filters' : undefined}
          icon={apps.length ? 'search-outline' : 'apps-outline'}
          message={apps.length ? 'No application matches what you are looking for. Try another name or clear the filters.' : 'No launchable applications were found on this device.'}
          onAction={() => {
            setQuery('');
            setCategory('all');
            setAvailability('all');
          }}
          title={apps.length ? 'Nothing found' : 'No installed apps'}
        />
      ) : (
        <View style={styles.grid}>
          {grid.map((row, rowIndex) => (
            <View key={rowIndex} style={styles.gridRow}>
              {row.map((app) => (
                <AppTile app={app} key={app.id} onPress={() => openApp(app)} />
              ))}
              {row.length < 3 ? <View style={styles.tileSpacer} /> : null}
            </View>
          ))}
        </View>
      )}

      <NoticeCard
        message="This list comes from apps installed on Android. Nest does not launch apps from this screen; on a fully managed device, Android hides blocked user-installed apps while this profile is signed in. Open available apps from the Android launcher."
        title="Installed apps · simulated access"
        tone="warning"
      />

      <ModalSheet
        footer={
          <>
            <Button icon="checkmark-outline" label="Close" onPress={() => setLaunching(null)} />
            <Button label="Back to my applications" onPress={() => setLaunching(null)} variant="ghost" />
          </>
        }
        onClose={() => setLaunching(null)}
        subtitle={launching ? `${categoryLabel(launching.category)} · available to you` : undefined}
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
  filters: { gap: spacing.xs },
  grid: { gap: spacing.sm },
  gridRow: { flexDirection: 'row', gap: spacing.sm },
  tileSpacer: { flex: 1 },
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
