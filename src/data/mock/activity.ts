import type { ActivityEvent, ActivityTone, IconName } from '@/types';

/**
 * Preview history entries.
 * Real events are read from the encrypted local audit table; these entries only
 * fill out the timeline while the audit backend phase is pending, and are always
 * labelled as preview data in the interface.
 */
export const sampleActivity: ActivityEvent[] = [
  {
    id: 'sample-1',
    title: 'Weekly review reminder',
    description: 'Nest suggests reviewing application access before the weekend.',
    memberName: 'All members',
    createdAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    icon: 'sparkles-outline',
    tone: 'info',
    sample: true,
  },
  {
    id: 'sample-2',
    title: 'Boundary suggestion for TikTok',
    description: 'Typical families block short-form video for child profiles.',
    memberName: 'Lerato',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 20).toISOString(),
    icon: 'information-circle-outline',
    tone: 'neutral',
    sample: true,
  },
  {
    id: 'sample-3',
    title: 'Homework apps left open',
    description: 'Education apps stayed available during the evening routine.',
    memberName: 'Thabo',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 30).toISOString(),
    icon: 'school-outline',
    tone: 'success',
    sample: true,
  },
];

/** Human wording for the event types written by the local store. */
export function describeEventType(eventType: string): { title: string; description: string; icon: IconName; tone: ActivityTone } {
  switch (eventType) {
    case 'family_created':
      return { title: 'Family created', description: 'The family space was created on this device.', icon: 'home-outline', tone: 'success' };
    case 'family_updated':
      return { title: 'Family details updated', description: 'Family name or description was changed.', icon: 'create-outline', tone: 'info' };
    case 'member_created':
      return { title: 'Member profile created', description: 'A new profile was added to the family.', icon: 'person-add-outline', tone: 'success' };
    case 'member_updated':
      return { title: 'Member profile updated', description: 'Profile details were edited.', icon: 'person-outline', tone: 'info' };
    case 'member_updated_pin_reset':
      return { title: 'Member PIN reset', description: 'The sign-in PIN was replaced by an administrator.', icon: 'key-outline', tone: 'warning' };
    case 'member_pin_reset':
      return { title: 'Member PIN reset', description: 'Sign-in credentials were reset for this member.', icon: 'key-outline', tone: 'warning' };
    case 'member_removed':
      return { title: 'Member removed', description: 'A profile and its local PIN were removed.', icon: 'person-remove-outline', tone: 'danger' };
    default:
      return { title: 'Family activity', description: 'A change was recorded for this family.', icon: 'pulse-outline', tone: 'neutral' };
  }
}
