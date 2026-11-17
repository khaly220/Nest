import { listAuditEvents } from '@/data/familyStore';
import { describeEventType } from '@/data/mock/activity';
import type { ActivityEvent } from '@/types';

export type ActivityFilter = 'all' | 'members' | 'family';

export const activityFilters: { id: ActivityFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'members', label: 'Members' },
  { id: 'family', label: 'Family' },
];

/** Real events recorded in the encrypted local store, newest first. */
export async function loadRecordedActivity(familyId: string, memberNames: Record<string, string>): Promise<ActivityEvent[]> {
  const records = await listAuditEvents(familyId);
  return records.map((record) => {
    const meta = describeEventType(record.eventType);
    return {
      id: record.id,
      title: meta.title,
      description: meta.description,
      icon: meta.icon,
      tone: meta.tone,
      memberName: record.subjectId ? memberNames[record.subjectId] : undefined,
      createdAt: record.createdAt,
    };
  });
}

export function categorize(event: ActivityEvent): Exclude<ActivityFilter, 'all'> {
  return /member/i.test(event.title) || Boolean(event.memberName) ? 'members' : 'family';
}

export function filterActivity(events: ActivityEvent[], filter: ActivityFilter) {
  if (filter === 'all') return events;
  return events.filter((event) => categorize(event) === filter);
}
