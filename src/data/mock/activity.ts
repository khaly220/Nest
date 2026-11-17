import type { ActivityTone, IconName } from '@/types';

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
    case 'administrator_sign_in_succeeded':
      return { title: 'Administrator signed in', description: 'The administrator authenticated on this device.', icon: 'log-in-outline', tone: 'success' };
    case 'administrator_sign_in_failed':
      return { title: 'Administrator sign-in failed', description: 'An incorrect administrator password was entered.', icon: 'lock-closed-outline', tone: 'warning' };
    case 'member_sign_in_succeeded':
      return { title: 'Member signed in', description: 'A family member authenticated on this device.', icon: 'log-in-outline', tone: 'success' };
    case 'member_sign_in_failed':
      return { title: 'Member sign-in failed', description: 'An incorrect member PIN was entered.', icon: 'lock-closed-outline', tone: 'warning' };
    default:
      return { title: 'Family activity', description: 'A change was recorded for this family.', icon: 'pulse-outline', tone: 'neutral' };
  }
}
