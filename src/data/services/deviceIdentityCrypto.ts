import { p256 } from '@noble/curves/nist.js';

const SPKI_PREFIX = Uint8Array.from([
  0x30, 0x59, 0x30, 0x13, 0x06, 0x07, 0x2a, 0x86, 0x48, 0xce, 0x3d, 0x02, 0x01,
  0x06, 0x08, 0x2a, 0x86, 0x48, 0xce, 0x3d, 0x03, 0x01, 0x07, 0x03, 0x42, 0x00,
]);
const BASE64_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

export function encodeBase64(bytes: Uint8Array) {
  let encoded = '';
  for (let index = 0; index < bytes.length; index += 3) {
    const first = bytes[index]!;
    const second = bytes[index + 1];
    const third = bytes[index + 2];
    const combined = (first << 16) | ((second ?? 0) << 8) | (third ?? 0);

    encoded += BASE64_ALPHABET[(combined >> 18) & 63];
    encoded += BASE64_ALPHABET[(combined >> 12) & 63];
    encoded += second === undefined ? '=' : BASE64_ALPHABET[(combined >> 6) & 63];
    encoded += third === undefined ? '=' : BASE64_ALPHABET[combined & 63];
  }
  return encoded;
}

export function decodeBase64(value: string) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const padding = value.endsWith('==') ? 2 : value.endsWith('=') ? 1 : 0;
  const bytes = new Uint8Array((value.length * 3) / 4 - padding);
  let byteIndex = 0;

  for (let index = 0; index < value.length; index += 4) {
    const first = alphabet.indexOf(value[index]!);
    const second = alphabet.indexOf(value[index + 1]!);
    const third = value[index + 2] === '=' ? 0 : alphabet.indexOf(value[index + 2]!);
    const fourth = value[index + 3] === '=' ? 0 : alphabet.indexOf(value[index + 3]!);
    if (first < 0 || second < 0 || third < 0 || fourth < 0) {
      throw new Error('Invalid base64 value');
    }

    const combined = (first << 18) | (second << 12) | (third << 6) | fourth;
    if (byteIndex < bytes.length) bytes[byteIndex++] = (combined >> 16) & 255;
    if (byteIndex < bytes.length) bytes[byteIndex++] = (combined >> 8) & 255;
    if (byteIndex < bytes.length) bytes[byteIndex++] = combined & 255;
  }
  return bytes;
}

export function isP256SpkiPublicKey(publicKey: string) {
  try {
    if (!/^[A-Za-z0-9+/]{122}==$/.test(publicKey)) return false;
    const decoded = decodeBase64(publicKey);
    return (
      decoded.length === SPKI_PREFIX.length + 65 &&
      SPKI_PREFIX.every((byte, index) => decoded[index] === byte) &&
      p256.utils.isValidPublicKey(decoded.slice(SPKI_PREFIX.length), false)
    );
  } catch {
    return false;
  }
}

export function createP256DeviceKeyPair(seed?: Uint8Array) {
  const privateKey = p256.utils.randomSecretKey(seed);
  const rawPublicKey = p256.getPublicKey(privateKey, false);
  const spkiPublicKey = new Uint8Array(SPKI_PREFIX.length + rawPublicKey.length);
  spkiPublicKey.set(SPKI_PREFIX);
  spkiPublicKey.set(rawPublicKey, SPKI_PREFIX.length);

  return {
    privateKey: Array.from(privateKey, (byte) => byte.toString(16).padStart(2, '0')).join(''),
    publicKey: encodeBase64(spkiPublicKey),
  };
}

export function signP256Challenge(privateKeyHex: string, challenge: string) {
  if (!/^[0-9a-f]{64}$/i.test(privateKeyHex)) {
    throw new Error('The stored device private key is invalid.');
  }

  const signature = p256.sign(
    new TextEncoder().encode(challenge),
    Uint8Array.from(privateKeyHex.match(/.{2}/g)!, (byte) => Number.parseInt(byte, 16)),
    { prehash: true, format: 'der' },
  );
  return encodeBase64(signature.toBytes('der'));
}
