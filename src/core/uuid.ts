interface CryptoLike {
  randomUUID?: () => string;
  getRandomValues?: <T extends ArrayBufferView>(array: T) => T;
}

/**
 * Generates an RFC 4122 version 4 uuid. Uses `crypto.randomUUID` when available (it is missing
 * outside secure contexts) and falls back to `crypto.getRandomValues`. Throws when the runtime
 * has no cryptographic random source, rather than degrading to a predictable id.
 */
export function generateUuid(): string {
  const crypto = (globalThis as { crypto?: CryptoLike }).crypto;
  if (crypto && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  if (crypto && typeof crypto.getRandomValues === 'function') {
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x40;
    bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80;
    const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }
  throw new Error('generateUuid() needs crypto.randomUUID or crypto.getRandomValues');
}
