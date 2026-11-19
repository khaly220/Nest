import { createPublicKey, randomBytes, verify } from 'node:crypto';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createP256DeviceKeyPair,
  decodeBase64,
  isP256SpkiPublicKey,
  signP256Challenge,
} from '../src/data/services/deviceIdentityCrypto';
import { derSignatureToRaw } from '../supabase/functions/_shared/ecdsa';

test('P-256 challenge signatures verify as raw SHA-256 ECDSA on the server', () => {
  const identity = createP256DeviceKeyPair(randomBytes(48));
  const challenge = 'one-time challenge: nest/é';
  const signature = decodeBase64(signP256Challenge(identity.privateKey, challenge));
  const publicKey = createPublicKey({
    key: Buffer.from(decodeBase64(identity.publicKey)),
    format: 'der',
    type: 'spki',
  });

  assert.equal(isP256SpkiPublicKey(identity.publicKey), true);
  assert.equal(
    verify(
      'sha256',
      Buffer.from(new TextEncoder().encode(challenge)),
      { key: publicKey, dsaEncoding: 'ieee-p1363' },
      Buffer.from(derSignatureToRaw(signature)),
    ),
    true,
  );
  assert.equal(
    verify(
      'sha256',
      Buffer.from('different challenge'),
      { key: publicKey, dsaEncoding: 'ieee-p1363' },
      Buffer.from(derSignatureToRaw(signature)),
    ),
    false,
  );
});

test('rejects malformed DER signatures and non-P-256 SPKI keys', () => {
  assert.throws(() => derSignatureToRaw(new Uint8Array([0x30, 0x00])));
  assert.equal(isP256SpkiPublicKey('a'.repeat(44)), false);
});
