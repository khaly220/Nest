import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshControl } from 'react-native';

import { ActivityGroup, ActivityItem } from '@/components/cards/ActivityItem';
import { StatRow, StatTile } from '@/components/cards/StatTile';
import { EmptyState } from '@/components/common/EmptyState';
import { NoticeCard } from '@/components/common/InlineMessage';
import { ScreenContainer } from '@/components/common/ScreenContainer';
import { SearchBar } from '@/components/common/SearchBar';
import { FilterChips } from '@/components/forms/ChoiceRow';
import { AppHeader } from '@/components/navigation/AppHeader';
import {
  activityFilters,
  filterActivity,
  loadRecordedActivity,
  previewActivity,
} from '@/data/services/activityService';
import type { ActivityFilter } from '@/data/services/activityService';
import { useFamilySession } from '@/hooks/useFamilySession';
import { useTheme } from '@/theme';
import type { ActivityEvent } from '@/types';
import { formatDate, formatRelative } from '@/utils/format';

/** Screen 14 — activity and audit history for the family space. */
export default function ActivityScreen() {
  const { colors } = useTheme();
  const { family, memberNames } = useFamilySession();
  const [recorded, setRecorded] = useState<{ familyId: string; events: ActivityEvent[] } | null>(null);
  const [filter, setFilter] = useState<ActivityFilter>('all');
  const [query, setQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!family) return null;
    return {
      familyId: family.id,
      events: await loadRecordedActivity(family.id, memberNames),
    };
  }, [family, memberNames]);

  useEffect(() => {
    let active = true;
    void load().then((result) => {
      if (active && result) setRecorded(result);
    });
    return () => {
      active = false;
    };
  }, [load]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    void load()
      .then((result) => {
        if (result) setRecorded(result);
      })
      .finally(() => setRefreshing(false));
  }, [load]);

  const all = useMemo(
    () =>
      [
        ...(family && recorded?.familyId === family.id ? recorded.events : []),
        ...previewActivity(),
      ].sort((first, second) => second.createdAt.localeCompare(first.createdAt)),
    [family, recorded],
  );

  const counts = useMemo(() => {
    const preview = all.filter((event) => event.sample).length;
    return { total: all.length, recorded: all.length - preview, preview };
  }, [all]);

  const chipOptions = useMemo(
    () => activityFilters.map((option) => ({ ...option, count: filterActivity(all, option.id).length })),
    [all],
  );

  const visible = useMemo(() => {
    const term = query.trim().toLowerCase();
    return filterActivity(all, filter).filter(
      (event) =>
        !term ||
        event.title.toLowerCase().includes(term) ||
        event.description.toLowerCase().includes(term) ||
        (event.memberName ?? '').toLowerCase().includes(term),
    );
  }, [all, filter, query]);

  const groups = useMemo(() => {
    const buckets = new Map<string, ActivityEvent[]>();
    for (const event of visible) {
      const key = formatDate(event.createdAt);
      const bucket = buckets.get(key);
      if (bucket) bucket.push(event);
      else buckets.set(key, [event]);
    }
    return [...buckets.entries()];
  }, [visible]);

  return (
    <ScreenContainer
      refreshControl={<RefreshControl onRefresh={onRefresh} refreshing={refreshing} tintColor={colors.brandInk} />}
      scroll
    >
      <AppHeader
        eyebrow="Activity"
        subtitle="Every change recorded on this device. Preview entries are labelled so they are never mistaken for real history."
        title="History"
      />

      <StatRow>
        <StatTile icon="pulse-outline" label="Recorded" tone="forest" value={`${counts.recorded}`} />
        <StatTile icon="sparkles-outline" label="Preview entries" tone="sage" value={`${counts.preview}`} />
      </StatRow>

      <SearchBar onChangeText={setQuery} placeholder="Search history" value={query} />
      <FilterChips onChange={(id) => setFilter(id as ActivityFilter)} options={chipOptions} value={filter} />

      {groups.length ? (
        groups.map(([title, events]) => (
          <ActivityGroup key={title} title={title}>
            {events.map((event, index) => (
              <ActivityItem
                event={event}
                key={event.id}
                last={index === events.length - 1}
                timestamp={formatRelative(event.createdAt)}
              />
            ))}
          </ActivityGroup>
        ))
      ) : (
        <EmptyState
          icon="pulse-outline"
          message={
            query
              ? 'No entry matches that search. Try a different word or clear the filters.'
              : 'Profile and boundary changes are recorded here as soon as they are saved on this device.'
          }
          title={query ? 'Nothing matches' : 'Nothing recorded yet'}
        />
      )}

      <NoticeCard
        message="Entries tagged Preview come from a sample history used while the audit backend phase is pending. Everything else was written by the encrypted store on this device."
        title="About this timeline"
      />
    </ScreenContainer>
  );
}
