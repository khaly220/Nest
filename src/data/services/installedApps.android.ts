import { NativeModule, requireOptionalNativeModule } from 'expo';

import type { InstalledApp } from './installedApps.types';

declare class AppDiscoveryModule extends NativeModule {
  getInstalledApps: () => Promise<InstalledApp[]>;
  isDeviceOwner: () => Promise<boolean>;
  applyBlockedApps: (packageNames: string[]) => Promise<void>;
  generateDeviceKeyPair: () => Promise<string>;
  getDevicePublicKey: () => Promise<string>;
  signDeviceChallenge: (challenge: string) => Promise<string>;
}

const AppDiscovery = requireOptionalNativeModule<AppDiscoveryModule>('AppDiscovery');

export const installedAppCatalogSupported = true;

export async function getInstalledApps(): Promise<InstalledApp[]> {
  if (!AppDiscovery) {
    throw new Error(
      'AppDiscovery is not included in this Android build. Rebuild and reinstall the development app with "npx expo run:android".',
    );
  }

  try {
    return await AppDiscovery.getInstalledApps();
  } catch (cause) {
    const detail = cause instanceof Error ? cause.message : String(cause);
    throw new Error(`AppDiscovery could not read installed applications: ${detail}`);
  }
}

export async function isDeviceOwner(): Promise<boolean> {
  if (!AppDiscovery) {
    throw new Error(
      'AppDiscovery is not included in this Android build. Rebuild and reinstall the development app with "npx expo run:android".',
    );
  }
  return AppDiscovery.isDeviceOwner();
}

export async function applyBlockedApps(packageNames: string[]): Promise<void> {
  if (!AppDiscovery) {
    throw new Error(
      'AppDiscovery is not included in this Android build. Rebuild and reinstall the development app with "npx expo run:android".',
    );
  }
  await AppDiscovery.applyBlockedApps(packageNames);
}
