import { describe, expect, it } from 'vitest';
import { normalizeValue } from '../../src/core/index.js';
import type { MediaValue, ValueItemInput } from '../../src/core/index.js';

const A: ValueItemInput = {
  uuid: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  name: 'Alpha',
  file_name: 'alpha.png',
  preview_url: 'https://cdn.test/a.jpg',
  original_url: 'https://cdn.test/a.png',
  size: 10,
  mime_type: 'image/png',
  extension: 'png',
  order: 5,
  custom_properties: { alt: 'A' },
};
const B: ValueItemInput = {
  uuid: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  name: 'Beta',
  preview_url: null,
  order: 2,
};

describe('normalizeValue', () => {
  it('gives the same ordered value for a keyed object and a list (AC-17)', () => {
    const keyed: MediaValue = {
      [A.uuid]: { ...A, order: 5, custom_properties: { alt: 'A' } },
      [B.uuid]: { ...B, order: 2, custom_properties: {} },
    };
    const fromKeyed = normalizeValue(keyed);
    const fromList = normalizeValue([A, B]);

    expect(fromKeyed).toEqual(fromList);
    expect(Object.keys(fromList)).toEqual([B.uuid, A.uuid]);
    expect(fromList[B.uuid]).toEqual({
      uuid: B.uuid,
      name: 'Beta',
      preview_url: null,
      order: 0,
      custom_properties: {},
    });
    expect(fromList[A.uuid]?.order).toBe(1);
    expect(fromList[A.uuid]?.custom_properties).toEqual({ alt: 'A' });
  });

  it('keeps input order for items without an order and falls back to file_name for the name', () => {
    const value = normalizeValue([
      { uuid: 'x-1', name: undefined as never, file_name: 'one.pdf' },
      { uuid: 'x-2', name: 'Two' },
    ]);
    expect(Object.values(value).map((item) => [item.uuid, item.name, item.order])).toEqual([
      ['x-1', 'one.pdf', 0],
      ['x-2', 'Two', 1],
    ]);
  });

  it('returns an empty value for null, undefined and empty inputs', () => {
    expect(normalizeValue(undefined)).toEqual({});
    expect(normalizeValue(null)).toEqual({});
    expect(normalizeValue([])).toEqual({});
    expect(normalizeValue({})).toEqual({});
  });

  it('drops unsafe custom-property keys and uses null-prototype maps (AC-22)', () => {
    const input = JSON.parse(
      '[{"uuid":"u-1","name":"n","custom_properties":{"__proto__":{"polluted":1},"constructor":"c","prototype":"p","ok":"yes"}}]',
    ) as ValueItemInput[];
    const value = normalizeValue(input);
    const properties = value['u-1']?.custom_properties ?? {};
    expect(Object.keys(properties)).toEqual(['ok']);
    expect(Object.getPrototypeOf(properties)).toBeNull();
    expect(Object.getPrototypeOf(value)).toBeNull();
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });

  it('drops an item whose uuid is a prototype key', () => {
    expect(normalizeValue([{ uuid: '__proto__', name: 'x' }])).toEqual({});
  });

  it('ignores malformed optional fields', () => {
    const value = normalizeValue([
      { uuid: 'u', name: 'n', size: Number.NaN, extension: 5 as never, order: Infinity },
    ]);
    expect(value.u).toEqual({ uuid: 'u', name: 'n', order: 0, custom_properties: {} });
  });

  it('throws a TypeError for invalid input', () => {
    expect(() => normalizeValue('x' as never)).toThrow(TypeError);
    expect(() => normalizeValue([null as never])).toThrow(TypeError);
    expect(() => normalizeValue([{ uuid: '', name: 'x' }])).toThrow(TypeError);
    expect(() => normalizeValue([{ uuid: 'u', name: 3 as never }])).toThrow(TypeError);
    expect(() =>
      normalizeValue([{ uuid: 'u', name: 'n', custom_properties: 'bad' as never }]),
    ).toThrow(TypeError);
  });
});
