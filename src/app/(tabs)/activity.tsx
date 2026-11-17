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
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!family) return null;
    return {
      familyId: family.id,
      events: await loadRecordedActivity(family.id, memberNames),
    };
  }, [family, memberNames]);

  useEffect(() => {
    let active = true;
    void load()
      .then((result) => {
        if (active && result) {
          setRecorded(result);
          setLoadError(null);
        }
      })
      .catch((cause: unknown) => {
        if (active) setLoadError(cause instanceof Error ? cause.message : 'Unknown error');
      });
    return () => {
      active = false;
    };
  }, [load]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    void load()
      .then((result) => {
        if (result) {
          setRecorded(result);
          setLoadError(null);
        }
      })
      .catch((cause: unknown) => setLoadError(cause instanceof Error ? cause.message : 'Unknown error'))
      .finally(() => setRefreshing(false));
  }, [load]);

  const all = useMemo(
    () =>
      family && recorded?.familyId === family.id ? recorded.events : [],
    [family, recorded],
  );

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
        subtitle="Changes recorded in this family's local history."
        title="History"
      />

      <StatRow>
        <StatTile icon="pulse-outline" label="Recorded events" tone="forest" value={`${all.length}`} />
      </StatRow>

      {loadError ? <NoticeCard message={`Local activity could not be loaded: ${loadError}`} title="Activity unavailable" tone="danger" /> : null}

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
      ) : loadError ? null : (
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
    </ScreenContainer>
  );
}
