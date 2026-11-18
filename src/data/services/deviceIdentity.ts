import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';
import { Platform } from 'react-native';
import { requireOptionalNativeModule, NativeModule } from 'expo';

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
  return /^[A-Za-z0-9+/]{64,}={0,2}$/.test(publicKey);
}

export async function getOrCreateDeviceIdentity(): Promise<DeviceIdentity> {
  let deviceId = await SecureStore.getItemAsync(DEVICE_ID_KEY);
  let publicKey = await SecureStore.getItemAsync(DEVICE_PUBLIC_KEY_KEY);

  if (!deviceId) {
    const random = await Crypto.getRandomBytesAsync(16);
    deviceId = Array.from(random, (byte) => byte.toString(16).padStart(2, '0')).join('');
    await SecureStore.setItemAsync(DEVICE_ID_KEY, deviceId);
  }

  if (!publicKey) {
    if (Platform.OS === 'android') {
      const module = requireOptionalNativeModule<DeviceIdentityModule>('AppDiscovery');
      if (!module) throw new Error('DEVICE_KEYSTORE_MODULE_UNAVAILABLE');
      publicKey = await module.generateDeviceKeyPair();
    } else {
      const privateKey = await Crypto.getRandomBytesAsync(32);
      const privateKeyHex = Array.from(privateKey, (byte) => byte.toString(16).padStart(2, '0')).join('');
      publicKey = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, privateKeyHex);
      await SecureStore.setItemAsync(DEVICE_PRIVATE_KEY_KEY, privateKeyHex);
    }
    await SecureStore.setItemAsync(DEVICE_PUBLIC_KEY_KEY, publicKey);
  }

  if (!isValidDevicePublicKey(publicKey)) {
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
  const privateKey = await SecureStore.getItemAsync(DEVICE_PRIVATE_KEY_KEY);
  if (!privateKey) throw new Error('DEVICE_PRIVATE_KEY_UNAVAILABLE');
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, `${privateKey}:${challenge}`);
}
