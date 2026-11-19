import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';
import { Platform } from 'react-native';
import { requireOptionalNativeModule, NativeModule } from 'expo';
import {
  createP256DeviceKeyPair,
  isP256SpkiPublicKey,
  signP256Challenge,
} from './deviceIdentityCrypto';

const DEVICE_ID_KEY = 'nest.cloud.device_id';
const DEVICE_PUBLIC_KEY_KEY = 'nest.cloud.device_public_key';
const DEVICE_PRIVATE_KEY_KEY = 'nest.cloud.device_private_key';

declare class DeviceIdentityModule extends NativeModule {
  generateDeviceKeyPair: () => Promise<string>;
  signDeviceChallenge: (challenge: string) => Promise<string>;
}

export type DeviceIdentity = {
  deviceId: string;
  publicKey: string;
};

export function isValidDevicePublicKey(publicKey: string) {
  return isP256SpkiPublicKey(publicKey);
}

export async function getOrCreateDeviceIdentity(): Promise<DeviceIdentity> {
  if (Platform.OS !== 'android' && Platform.OS !== 'ios') {
    throw new Error('SECURE_DEVICE_IDENTITY_UNSUPPORTED_PLATFORM');
  }

  let deviceId = await SecureStore.getItemAsync(DEVICE_ID_KEY);
  let publicKey = await SecureStore.getItemAsync(DEVICE_PUBLIC_KEY_KEY);

  if (Platform.OS === 'ios') {
    const privateKey = await SecureStore.getItemAsync(DEVICE_PRIVATE_KEY_KEY);
    if (!publicKey || !isValidDevicePublicKey(publicKey) || !privateKey) {
      if (deviceId) {
        await SecureStore.deleteItemAsync(DEVICE_ID_KEY);
      }
      await SecureStore.deleteItemAsync(DEVICE_PUBLIC_KEY_KEY);
      await SecureStore.deleteItemAsync(DEVICE_PRIVATE_KEY_KEY);
      deviceId = null;
      publicKey = null;
    }
  }

  if (!deviceId) {
    const random = await Crypto.getRandomBytesAsync(16);
    deviceId = Array.from(random, (byte) => byte.toString(16).padStart(2, '0')).join('');
    await SecureStore.setItemAsync(DEVICE_ID_KEY, deviceId);
  }

  if (!publicKey && Platform.OS === 'android') {
    const module = requireOptionalNativeModule<DeviceIdentityModule>('AppDiscovery');
    if (!module) throw new Error('DEVICE_KEYSTORE_MODULE_UNAVAILABLE');
    publicKey = await module.generateDeviceKeyPair();
    await SecureStore.setItemAsync(DEVICE_PUBLIC_KEY_KEY, publicKey);
  } else if (!publicKey && Platform.OS === 'ios') {
    const seed = await Crypto.getRandomBytesAsync(48);
    const identity = createP256DeviceKeyPair(seed);
    await SecureStore.setItemAsync(DEVICE_PRIVATE_KEY_KEY, identity.privateKey, {
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });
    publicKey = identity.publicKey;
    await SecureStore.setItemAsync(DEVICE_PUBLIC_KEY_KEY, publicKey);
  }

  if (!deviceId || !publicKey || !isValidDevicePublicKey(publicKey)) {
    throw new Error('The stored device public key is invalid. Pairing cannot continue.');
  }

  return { deviceId, publicKey };
}

export async function signDeviceChallenge(challenge: string): Promise<string> {
  if (Platform.OS === 'android') {
    const module = requireOptionalNativeModule<DeviceIdentityModule>('AppDiscovery');
    if (!module) throw new Error('DEVICE_KEYSTORE_MODULE_UNAVAILABLE');
    return module.signDeviceChallenge(challenge);
  }
  if (Platform.OS !== 'ios') throw new Error('SECURE_DEVICE_IDENTITY_UNSUPPORTED_PLATFORM');
  const privateKey = await SecureStore.getItemAsync(DEVICE_PRIVATE_KEY_KEY);
  if (!privateKey) throw new Error('DEVICE_PRIVATE_KEY_UNAVAILABLE');
  return signP256Challenge(privateKey, challenge);
}
