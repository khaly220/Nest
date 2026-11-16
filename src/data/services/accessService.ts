import { clearPermission, loadPermissions, savePermission } from '@/data/familyStore';
import {
  applyBlockedApps,
  getInstalledApps,
  installedAppCatalogSupported,
  isDeviceOwner,
} from '@/data/services/installedApps';
import { recommendedAccess, sampleApps } from '@/data/mock/apps';
import type { AgeGroup, AppCategory, CatalogApp, IconName, MemberAppAccess } from '@/types';
import type { InstalledApp } from './installedApps.types';

/** Permission rule keys for apps are namespaced so they share the existing table. */
export const appRuleKey = (appId: string) => `app:${appId}`;

/** Application-independent device rules that predate the app catalog. */
export const deviceRules: { key: string; label: string; description: string; icon: IconName }[] = [
  { key: 'camera', label: 'Camera', description: 'Let this profile use the camera on the shared device.', icon: 'camera-outline' },
  { key: 'install_apps', label: 'Install applications', description: 'Let this profile add new applications from a store.', icon: 'download-outline' },
  { key: 'web_access', label: 'Web access', description: 'Let this profile browse websites in a browser.', icon: 'globe-outline' },
];

export type DeviceRuleState = 'allowed' | 'restricted' | 'default';

export function deviceRuleState(stored: Record<string, boolean>, key: string): DeviceRuleState {
  if (!Object.prototype.hasOwnProperty.call(stored, key)) return 'default';
  return stored[key] ? 'allowed' : 'restricted';
}

/** Merges a catalog with the rules saved for one member. */
export function listAppsForMember(
  memberId: string,
  ageGroup: AgeGroup,
  stored: Record<string, boolean>,
  catalog: CatalogApp[],
): MemberAppAccess[] {
  void memberId;
  return catalog.map((app) => {
    const key = appRuleKey(app.id);
    const overridden = Object.prototype.hasOwnProperty.call(stored, key);
    return {
      ...app,
      allowed: overridden ? stored[key] : recommendedAccess(app, ageGroup),
      source: overridden ? 'custom' : 'recommended',
    };
  });
}

export function countAccess(apps: MemberAppAccess[]) {
  const allowed = apps.filter((app) => app.allowed).length;
  return { allowed, blocked: apps.length - allowed, total: apps.length };
}

export function filterApps(apps: MemberAppAccess[], filter: 'all' | 'allowed' | 'blocked', query: string) {
  const term = query.trim().toLowerCase();
  return apps.filter((app) => {
    if (filter === 'allowed' && !app.allowed) return false;
    if (filter === 'blocked' && app.allowed) return false;
    if (!term) return true;
    return app.name.toLowerCase().includes(term) || app.category.toLowerCase().includes(term) || app.summary.toLowerCase().includes(term);
  });
}

const discoveredApps = new Map<string, CatalogApp>();

export function findApp(appId: string): CatalogApp | undefined {
  return discoveredApps.get(appId) ?? sampleApps.find((app) => app.id === appId);
}

const appColors = ['#3F6E8C', '#39786B', '#6B5B95', '#7A8B5A', '#B4794A'];

function catalogApp(installed: InstalledApp, index: number): CatalogApp {
  const packageName = installed.id.toLowerCase();
  const category: AppCategory = packageName.match(/social|instagram|facebook|tiktok|snapchat|reddit|pinterest|linkedin/)
    ? 'social'
    : packageName.match(/classroom|duolingo|khanacademy|quizlet|school/)
      ? 'education'
      : packageName.match(/youtube|netflix|spotify|disney|twitch|video|music/)
        ? 'entertainment'
        : packageName.match(/game|roblox|minecraft/)
          ? 'games'
          : packageName.match(/whatsapp|messenger|telegram|signal|discord|dialer|phone|messages/)
            ? 'communication'
            : packageName.match(/gmail|docs|drive|calendar|office|notion/)
              ? 'productivity'
              : packageName.match(/maps|camera|settings|calculator|clock|files|browser|chrome/)
                ? 'utilities'
                : 'other';

  const icons: Record<AppCategory, IconName> = {
    social: 'people-outline',
    education: 'school-outline',
    entertainment: 'musical-notes-outline',
    games: 'game-controller-outline',
    communication: 'chatbubbles-outline',
    productivity: 'document-text-outline',
    utilities: 'construct-outline',
    other: 'apps-outline',
  };

  return {
    id: installed.id,
    name: installed.name,
    category,
    icon: icons[category],
    tint: appColors[index % appColors.length],
    summary: `Installed app · ${installed.id}`,
    sample: false,
    iconUri: installed.iconUri,
    isSystemApp: installed.isSystemApp,
  };
}

export async function loadMemberAccess(
  memberId: string,
  ageGroup: AgeGroup,
): Promise<{ apps: MemberAppAccess[]; stored: Record<string, boolean>; catalogSupported: boolean }> {
  const [stored, installed] = await Promise.all([loadPermissions(memberId), getInstalledApps()]);
  const catalog = installed
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name))
    .map(catalogApp);
  discoveredApps.clear();
  for (const app of catalog) discoveredApps.set(app.id, app);
  return {
    apps: listAppsForMember(memberId, ageGroup, stored, catalog),
    stored,
    catalogSupported: installedAppCatalogSupported,
  };
}

export async function applyMemberRestrictions(memberId: string, ageGroup: AgeGroup): Promise<number> {
  if (!(await isDeviceOwner())) throw new Error('DEVICE_OWNER_REQUIRED');

  await applyBlockedApps([]);
  const { apps } = await loadMemberAccess(memberId, ageGroup);
  const blockedPackages = apps
    .filter((app) => !app.allowed && !app.isSystemApp)
    .map((app) => app.id);
  await applyBlockedApps(blockedPackages);
  return blockedPackages.length;
}

export async function clearMemberRestrictions(): Promise<void> {
  if (await isDeviceOwner()) await applyBlockedApps([]);
}

export async function setAppAccess(administratorId: string, familyId: string, memberId: string, appId: string, allowed: boolean) {
  await savePermission(administratorId, familyId, memberId, appRuleKey(appId), allowed);
}

export async function resetAppAccess(administratorId: string, familyId: string, memberId: string, appId: string) {
  await clearPermission(administratorId, familyId, memberId, appRuleKey(appId));
}

export async function setDeviceRule(administratorId: string, familyId: string, memberId: string, key: string, allowed: boolean) {
  await savePermission(administratorId, familyId, memberId, key, allowed);
}

export async function resetDeviceRule(administratorId: string, familyId: string, memberId: string, key: string) {
  await clearPermission(administratorId, familyId, memberId, key);
}
