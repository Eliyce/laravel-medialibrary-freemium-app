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

  describe('custom_properties from a Spatie backend', () => {
    // Spatie stores custom_properties as a PHP array, so an empty one arrives as [].
    const fromServer = (json: string) => JSON.parse(json) as ValueItemInput[];

    it('reads [] as no custom properties in a list (AC-125)', () => {
      const value = normalizeValue(
        fromServer(
          '[{"uuid":"u-1","name":"One","custom_properties":[]},{"uuid":"u-2","name":"Two","custom_properties":[]}]',
        ),
      );
      expect(Object.keys(value)).toEqual(['u-1', 'u-2']);
      for (const item of Object.values(value)) {
        expect(item.custom_properties).toEqual({});
        expect(Object.getPrototypeOf(item.custom_properties)).toBeNull();
      }
    });

    it('reads [] as no custom properties in a uuid-keyed value (AC-126)', () => {
      const keyed = JSON.parse(
        '{"u-1":{"uuid":"u-1","name":"One","order":0,"custom_properties":[]}}',
      ) as MediaValue;
      const properties = normalizeValue(keyed)['u-1']?.custom_properties;
      expect(properties).toEqual({});
      expect(Object.getPrototypeOf(properties)).toBeNull();
    });

    it('still defaults null and missing to {} and copies objects without unsafe keys (AC-127)', () => {
      const value = normalizeValue(
        fromServer(
          '[{"uuid":"a","name":"A","custom_properties":null},{"uuid":"b","name":"B"},{"uuid":"c","name":"C","custom_properties":{"alt":"Cat","tags":["x"],"constructor":"c","prototype":"p"}}]',
        ),
      );
      expect(value.a?.custom_properties).toEqual({});
      expect(value.b?.custom_properties).toEqual({});
      expect(value.c?.custom_properties).toEqual({ alt: 'Cat', tags: ['x'] });
      expect(Object.getPrototypeOf(value.c?.custom_properties)).toBeNull();
    });

    it('rejects a non-empty array, naming it (AC-128)', () => {
      expect(() =>
        normalizeValue(fromServer('[{"uuid":"u","name":"n","custom_properties":["x"]}]')),
      ).toThrow(new TypeError('custom_properties must be an object (got a non-empty array)'));
    });
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
