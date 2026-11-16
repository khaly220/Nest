import { Platform } from 'react-native';
import type { DevicePlatform, DeviceState } from '@/types';

const startedAt = new Date();

function platformName(): DevicePlatform {
  if (Platform.OS === 'android') return 'Android';
  if (Platform.OS === 'ios') return 'iOS';
  return 'Web';
}

function deviceModel() {
  if (Platform.OS === 'android') {
    const constants = Platform.constants as unknown as { Model?: string; Brand?: string };
    const brand = constants.Brand?.replace(/^./, (letter) => letter.toUpperCase());
    return [brand, constants.Model].filter(Boolean).join(' ') || 'Android device';
  }
  if (Platform.OS === 'ios') return 'iPhone or iPad';
  return 'Browser preview';
}

/**
 * Honest description of what this build can and cannot do.
 * Nest never reports a restriction as enforced when the platform has not
 * actually applied it.
 */
export function loadDeviceState(activeProfileName: string | null): DeviceState {
  const platform = platformName();
  return {
    name: 'This device',
    platform,
    model: deviceModel(),
    connection: 'paired',
    connectionNote: 'Nest is running on this device, so the local store is reachable right now.',
    lastCheckedAt: startedAt.toISOString(),
    capability: 'unavailable',
    capabilityNote:
      'Android app restrictions require Nest to be provisioned as the Device Owner on a fully managed device. Check this screen to confirm whether enforcement is active.',
    protection: activeProfileName ? 'partial' : 'not-configured',
    protectionNote: activeProfileName
      ? `Personalised boundaries for ${activeProfileName} are saved on this device.`
      : 'No member profile is active on this device at the moment.',
  };
}

export const devicePairingSteps = [
  'Confirm the device you are holding is the one the family shares.',
  'Sign in with an administrator account on the new device.',
  'Move or re-create the family profiles for that device.',
  'Review each profile before the device leaves the house.',
];
