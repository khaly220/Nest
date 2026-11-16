import type { AgeGroup, AppCategory, CatalogApp } from '@/types';

export const appCategories: { id: AppCategory; label: string; icon: string }[] = [
  { id: 'social', label: 'Social', icon: 'people-outline' },
  { id: 'education', label: 'Education', icon: 'school-outline' },
  { id: 'entertainment', label: 'Entertainment', icon: 'musical-notes-outline' },
  { id: 'games', label: 'Games', icon: 'game-controller-outline' },
  { id: 'communication', label: 'Communication', icon: 'chatbubbles-outline' },
  { id: 'productivity', label: 'Productivity', icon: 'document-text-outline' },
  { id: 'utilities', label: 'Utilities', icon: 'construct-outline' },
  { id: 'other', label: 'Other', icon: 'grid-outline' },
];

export const categoryLabel = (category: AppCategory) =>
  appCategories.find((item) => item.id === category)?.label ?? 'Other';

const tints = {
  forest: '#14532D',
  green: '#16A34A',
  success: '#239B62',
  deep: '#0B2417',
  sage: '#6E9377',
  amber: '#C98A34',
  clay: '#B4794A',
  blue: '#3F6E8C',
  violet: '#6B5B95',
  teal: '#39786B',
  olive: '#7A8B5A',
  rose: '#B85C6E',
} as const;

/** Preview-only entries for flows that do not represent installed device apps. */
export const sampleApps: CatalogApp[] = [
  { id: 'app-tiktok', name: 'TikTok', category: 'social', icon: 'logo-tiktok', tint: tints.deep, summary: 'Short-form video feed with unlimited scrolling.', sample: true },
  { id: 'app-instagram', name: 'Instagram', category: 'social', icon: 'logo-instagram', tint: tints.rose, summary: 'Photo and story sharing with direct messages.', sample: true },
  { id: 'app-snapchat', name: 'Snapchat', category: 'social', icon: 'logo-snapchat', tint: tints.amber, summary: 'Disappearing messages and camera filters.', sample: true },
  { id: 'app-facebook', name: 'Facebook', category: 'social', icon: 'logo-facebook', tint: tints.blue, summary: 'Social network with groups and marketplace.', sample: true },
  { id: 'app-reddit', name: 'Reddit', category: 'social', icon: 'logo-reddit', tint: tints.clay, summary: 'Community forums and discussion threads.', sample: true },
  { id: 'app-pinterest', name: 'Pinterest', category: 'social', icon: 'logo-pinterest', tint: tints.rose, summary: 'Visual boards and idea collections.', sample: true },
  { id: 'app-linkedin', name: 'LinkedIn', category: 'social', icon: 'logo-linkedin', tint: tints.blue, summary: 'Professional network and job listings.', sample: true },

  { id: 'app-khan', name: 'Khan Academy', category: 'education', icon: 'school-outline', tint: tints.green, summary: 'Lessons and practice for school subjects.', sample: true },
  { id: 'app-classroom', name: 'Classroom', category: 'education', icon: 'book-outline', tint: tints.teal, summary: 'Class assignments and teacher updates.', sample: true },
  { id: 'app-duolingo', name: 'Language practice', category: 'education', icon: 'library-outline', tint: tints.success, summary: 'Short daily language exercises.', sample: true },
  { id: 'app-reference', name: 'Encyclopedia', category: 'education', icon: 'globe-outline', tint: tints.forest, summary: 'Reference articles for research and homework.', sample: true },

  { id: 'app-youtube', name: 'YouTube', category: 'entertainment', icon: 'logo-youtube', tint: tints.rose, summary: 'Video streaming with recommendations.', sample: true },
  { id: 'app-netflix', name: 'Netflix', category: 'entertainment', icon: 'videocam-outline', tint: tints.deep, summary: 'Films and series on demand.', sample: true },
  { id: 'app-spotify', name: 'Music streaming', category: 'entertainment', icon: 'musical-notes-outline', tint: tints.success, summary: 'Music, podcasts and playlists.', sample: true },
  { id: 'app-twitch', name: 'Twitch', category: 'entertainment', icon: 'logo-twitch', tint: tints.violet, summary: 'Live streams and creator channels.', sample: true },

  { id: 'app-roblox', name: 'Roblox', category: 'games', icon: 'game-controller-outline', tint: tints.rose, summary: 'Online games with social worlds.', sample: true },
  { id: 'app-blocks', name: 'Block crafting', category: 'games', icon: 'layers-outline', tint: tints.olive, summary: 'Building and exploration game.', sample: true },
  { id: 'app-arena', name: 'Arena battles', category: 'games', icon: 'trophy-outline', tint: tints.amber, summary: 'Competitive multiplayer matches.', sample: true },

  { id: 'app-whatsapp', name: 'WhatsApp', category: 'communication', icon: 'logo-whatsapp', tint: tints.success, summary: 'Messaging and voice calls.', sample: true },
  { id: 'app-discord', name: 'Discord', category: 'communication', icon: 'logo-discord', tint: tints.violet, summary: 'Group voice and text servers.', sample: true },
  { id: 'app-skype', name: 'Skype', category: 'communication', icon: 'logo-skype', tint: tints.blue, summary: 'Video calling for family and friends.', sample: true },
  { id: 'app-messages', name: 'Messages', category: 'communication', icon: 'chatbubbles-outline', tint: tints.green, summary: 'Text messages with contacts.', sample: true },
  { id: 'app-phone', name: 'Phone', category: 'communication', icon: 'call-outline', tint: tints.success, summary: 'Calls, including emergency numbers.', sample: true },
  { id: 'app-mail', name: 'Mail', category: 'communication', icon: 'mail-outline', tint: tints.blue, summary: 'Email inbox and composing.', sample: true },

  { id: 'app-drive', name: 'Cloud drive', category: 'productivity', icon: 'cloud-outline', tint: tints.blue, summary: 'Files and folders kept in the cloud.', sample: true },
  { id: 'app-notes', name: 'Notes', category: 'productivity', icon: 'create-outline', tint: tints.amber, summary: 'Written notes and checklists.', sample: true },
  { id: 'app-docs', name: 'Documents', category: 'productivity', icon: 'document-text-outline', tint: tints.blue, summary: 'Text documents and shared drafts.', sample: true },
  { id: 'app-calendar', name: 'Calendar', category: 'productivity', icon: 'calendar-outline', tint: tints.rose, summary: 'Schedule, reminders and events.', sample: true },

  { id: 'app-calculator', name: 'Calculator', category: 'utilities', icon: 'calculator-outline', tint: tints.forest, summary: 'Standard and scientific calculations.', sample: true },
  { id: 'app-camera', name: 'Camera', category: 'utilities', icon: 'camera-outline', tint: tints.clay, summary: 'Photo and video capture.', sample: true },
  { id: 'app-clock', name: 'Clock', category: 'utilities', icon: 'time-outline', tint: tints.olive, summary: 'Alarms, timers and stopwatch.', sample: true },
  { id: 'app-maps', name: 'Maps', category: 'utilities', icon: 'map-outline', tint: tints.teal, summary: 'Directions, places and travel times.', sample: true },
  { id: 'app-files', name: 'Files', category: 'utilities', icon: 'folder-open-outline', tint: tints.amber, summary: 'Browse files stored on the device.', sample: true },
  { id: 'app-photos', name: 'Gallery', category: 'utilities', icon: 'images-outline', tint: tints.green, summary: 'Saved photos and screenshots.', sample: true },
  { id: 'app-weather', name: 'Weather', category: 'utilities', icon: 'sunny-outline', tint: tints.amber, summary: 'Forecast and severe weather alerts.', sample: true },
  { id: 'app-browser', name: 'Web browser', category: 'utilities', icon: 'logo-chrome', tint: tints.blue, summary: 'Open websites and search the web.', sample: true },

  { id: 'app-fitness', name: 'Family fitness', category: 'other', icon: 'fitness-outline', tint: tints.success, summary: 'Step counts and daily activity goals.', sample: true },
  { id: 'app-reading', name: 'Reading time', category: 'other', icon: 'book-outline', tint: tints.olive, summary: 'Library of age-appropriate e-books.', sample: true },
];

/** Per-app access every new profile starts with, before the parent customises it. */
const recommendedRules: Record<AgeGroup, { categories: AppCategory[]; allow: string[]; block: string[] }> = {
  child: {
    categories: ['education', 'productivity', 'utilities', 'other'],
    allow: ['app-phone', 'app-messages', 'app-whatsapp'],
    block: ['app-browser', 'app-tiktok', 'app-instagram', 'app-snapchat', 'app-youtube', 'app-roblox'],
  },
  teen: {
    categories: ['education', 'productivity', 'utilities', 'other', 'entertainment', 'games', 'communication'],
    allow: [],
    block: ['app-tiktok', 'app-snapchat'],
  },
  adult: {
    categories: ['education', 'productivity', 'utilities', 'other', 'entertainment', 'games', 'communication', 'social'],
    allow: [],
    block: [],
  },
};

export const ageGroupLabel: Record<AgeGroup, string> = {
  child: 'Child',
  teen: 'Teen',
  adult: 'Adult',
};

export const ageGroupDescription: Record<AgeGroup, string> = {
  child: 'Essential learning and utility apps with calls to family.',
  teen: 'Learning, creativity and social apps are mixed with stronger boundaries.',
  adult: 'Full access to every category on this profile.',
};

/** The recommended access decision for an application, used as the profile default. */
export function recommendedAccess(app: CatalogApp, ageGroup: AgeGroup): boolean {
  const rule = recommendedRules[ageGroup];
  if (rule.block.includes(app.id)) return false;
  if (rule.allow.includes(app.id)) return true;
  if (!app.sample && app.category === 'other') return false;
  return rule.categories.includes(app.category);
}

export const sampleDeviceLabel = 'Sample catalog';
