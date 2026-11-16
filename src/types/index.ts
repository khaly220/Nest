/** Shared domain types for the Nest frontend. */

import type { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';

/** Every glyph name Ionicons actually ships, so a typo fails the type check. */
export type IconName = ComponentProps<typeof Ionicons>['name'];

export type AgeGroup = 'child' | 'teen' | 'adult';
export type AuthMethod = 'pin' | 'face';

export type AppCategory =
  | 'social'
  | 'education'
  | 'entertainment'
  | 'games'
  | 'communication'
  | 'productivity'
  | 'utilities'
  | 'other';

export type AccessFilter = 'all' | 'allowed' | 'blocked';

/** Where an application's access decision comes from. */
export type PermissionSource = 'recommended' | 'custom';

export type CatalogApp = {
  id: string;
  name: string;
  category: AppCategory;
  /** Ionicons glyph name. */
  icon: IconName;
  tint: string;
  summary: string;
  /** True while the entry comes from the sample catalog rather than device discovery. */
  sample: boolean;
  /** Android package icon data URI, when available. */
  iconUri?: string | null;
  /** True when Android marks the package as a system app. */
  isSystemApp?: boolean;
};

export type MemberAppAccess = CatalogApp & {
  allowed: boolean;
  source: PermissionSource;
};

export type ActivityTone = 'success' | 'info' | 'warning' | 'danger' | 'neutral';

export type ActivityEvent = {
  id: string;
  title: string;
  description: string;
  memberName?: string;
  createdAt: string;
  icon: IconName;
  tone: ActivityTone;
  /** Marks preview entries used until the audit backend phase lands. */
  sample?: boolean;
};

export type DevicePlatform = 'Android' | 'iOS' | 'Web';

export type DeviceState = {
  name: string;
  platform: DevicePlatform;
  model: string;
  connection: 'paired' | 'unpaired';
  connectionNote: string;
  lastCheckedAt: string;
  capability: 'available' | 'unavailable';
  capabilityNote: string;
  protection: 'protected' | 'partial' | 'not-configured';
  protectionNote: string;
};

export type ToastTone = 'default' | 'success' | 'warning' | 'danger';

export type ToastMessage = { id: string; message: string; tone: ToastTone };

/** Result shape used by frontend actions so screens can render inline feedback. */
export type ActionResult = { ok: boolean; error?: string };
