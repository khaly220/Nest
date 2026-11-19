export function derSignatureToRaw(signature: Uint8Array): Uint8Array {
  function readLength(index: number): [number, number] {
    const first = signature[index];
    if (first === undefined) throw new Error('Malformed DER signature');
    if ((first & 0x80) === 0) return [first, index + 1];
    const lengthBytes = first & 0x7f;
    if (lengthBytes === 0 || lengthBytes > 4) throw new Error('Malformed DER signature');
    let length = 0;
    for (let i = 0; i < lengthBytes; i++) {
      const next = signature[index + 1 + i];
      if (next === undefined) throw new Error('Malformed DER signature');
      length = length * 256 + next;
    }
    return [length, index + 1 + lengthBytes];
  }

  if (signature[0] !== 0x30) throw new Error('Malformed DER signature');
  const [sequenceLength, sequenceContentIndex] = readLength(1);
  if (sequenceContentIndex + sequenceLength !== signature.length) {
    throw new Error('Malformed DER signature');
  }
  let offset = sequenceContentIndex;

  if (signature[offset] !== 0x02) throw new Error('Malformed DER signature');
  const [rLength, rStart] = readLength(offset + 1);
  if (rStart + rLength > signature.length) throw new Error('Malformed DER signature');
  let r = signature.slice(rStart, rStart + rLength);
  offset = rStart + rLength;

  if (signature[offset] !== 0x02) throw new Error('Malformed DER signature');
  const [sLength, sStart] = readLength(offset + 1);
  if (sStart + sLength > signature.length) throw new Error('Malformed DER signature');
  let s = signature.slice(sStart, sStart + sLength);
  if (r[0] === 0 && r.length > 32) r = r.slice(1);
  if (s[0] === 0 && s.length > 32) s = s.slice(1);
  if (r.length > 32 || s.length > 32 || r.length === 0 || s.length === 0) {
    throw new Error('Malformed ECDSA signature');
  }

  const raw = new Uint8Array(64);
  raw.set(r, 32 - r.length);
  raw.set(s, 64 - s.length);
  return raw;
}
