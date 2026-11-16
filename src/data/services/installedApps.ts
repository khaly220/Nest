import type { InstalledApp } from './installedApps.types';

export const installedAppCatalogSupported = false;

export async function getInstalledApps(): Promise<InstalledApp[]> {
  return [];
}

export async function isDeviceOwner(): Promise<boolean> {
  return false;
}

export async function applyBlockedApps(_packageNames: string[]): Promise<void> {
  throw new Error('Android Device Owner enforcement is only available on Android.');
}
