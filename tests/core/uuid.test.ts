import { webcrypto } from 'node:crypto';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { generateUuid } from '../../src/core/index.js';
import { UUID_V4 } from '../helpers.js';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('generateUuid', () => {
  it('uses crypto.randomUUID when available', () => {
    const randomUUID = vi.fn(() => '11111111-1111-4111-8111-111111111111');
    vi.stubGlobal('crypto', { randomUUID });
    expect(generateUuid()).toBe('11111111-1111-4111-8111-111111111111');
    expect(randomUUID).toHaveBeenCalledOnce();
  });

  it('falls back to getRandomValues with valid, distinct v4 uuids (AC-24)', () => {
    vi.stubGlobal('crypto', {
      getRandomValues: (array: Uint8Array<ArrayBuffer>) => webcrypto.getRandomValues(array),
    });
    const seen = new Set<string>();
    for (let i = 0; i < 1000; i += 1) {
      const uuid = generateUuid();
      expect(uuid).toMatch(UUID_V4);
      seen.add(uuid);
    }
    expect(seen.size).toBe(1000);
  });

  it('sets the version and variant bits even for all-zero or all-one bytes', () => {
    for (const fill of [0x00, 0xff]) {
      vi.stubGlobal('crypto', {
        getRandomValues: <T extends ArrayBufferView>(array: T) => {
          (array as unknown as Uint8Array).fill(fill);
          return array;
        },
      });
      expect(generateUuid()).toMatch(UUID_V4);
    }
  });

  it('throws when no cryptographic random source exists', () => {
    vi.stubGlobal('crypto', undefined);
    expect(() => generateUuid()).toThrow(/randomUUID or crypto.getRandomValues/);
  });
});
