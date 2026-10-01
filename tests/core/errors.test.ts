import { describe, expect, it } from 'vitest';
import { mapValidationErrors } from '../../src/core/index.js';

const U = '6f1c0b8e-6a46-4a8b-9c2f-0f8f7f0a1b2c';
const V = '7a2d1c9f-7b57-4b9c-8d30-1a9a8b1c2d3e';

describe('mapValidationErrors', () => {
  it('routes each key to the right bucket (AC-15)', () => {
    const mapped = mapValidationErrors(
      {
        images: 'Too many',
        [`images.${U}`]: ['Bad file'],
        [`images.${U}.name`]: ['Name required'],
        [`images.${U}.custom_properties.alt`]: ['Alt required'],
        'images.0.name': ['First bad'],
        'images.zzz': ['Orphan'],
      },
      'images',
      [U],
    );
    expect(mapped.topLevelErrors).toEqual(['Too many', 'Orphan']);
    expect(mapped.validationErrors[U]?.object).toEqual(['Bad file']);
    expect(mapped.validationErrors[U]?.name).toEqual(['Name required', 'First bad']);
    expect(mapped.validationErrors[U]?.customProperties.alt).toEqual(['Alt required']);
  });

  it('matches a bracketed component name against dot error keys', () => {
    const mapped = mapValidationErrors(
      {
        'post.images': 'Too many',
        [`post.images.${U}.name`]: ['Name required'],
        [`post.images.${U}.custom_properties.alt`]: ['Alt required'],
        'post.images.1': ['Second bad'],
        'post.images.zzz': ['Orphan'],
        'post[images]': ['Bracket key is not a Laravel key'],
        'post.title': ['Other field'],
      },
      'post[images]',
      [U, V],
    );
    expect(mapped.topLevelErrors).toEqual(['Too many', 'Orphan']);
    expect(mapped.validationErrors[U]?.name).toEqual(['Name required']);
    expect(mapped.validationErrors[U]?.customProperties.alt).toEqual(['Alt required']);
    expect(mapped.validationErrors[V]?.object).toEqual(['Second bad']);
    expect(mapValidationErrors({ 'a.b.c': 'Deep' }, 'a[b][c]', []).topLevelErrors).toEqual([
      'Deep',
    ]);
  });

  it('maps `<uuid>.uuid` and unknown sub-keys to object errors and numeric keys by position', () => {
    const mapped = mapValidationErrors(
      {
        [`images.${U}.uuid`]: 'Invalid uuid',
        'images.1': 'Second item',
        'images.1.order': 'Bad order',
        'images.7': 'Out of range',
      },
      'images',
      [U, V],
    );
    expect(mapped.validationErrors[U]?.object).toEqual(['Invalid uuid']);
    expect(mapped.validationErrors[V]?.object).toEqual(['Second item', 'Bad order']);
    expect(mapped.topLevelErrors).toEqual(['Out of range']);
  });

  it('ignores keys of other fields, empty messages and non-string values', () => {
    const mapped = mapValidationErrors(
      {
        title: 'Required',
        imagesExtra: 'Other field',
        images: [],
        [`images.${U}`]: [42, 'Kept'] as never,
      },
      'images',
      [U],
    );
    expect(mapped.topLevelErrors).toEqual([]);
    expect(mapped.validationErrors[U]?.object).toEqual(['Kept']);
  });

  it('drops prototype keys in any segment (AC-22)', () => {
    const bag = JSON.parse(
      JSON.stringify({
        [`images.${U}.custom_properties.__proto__`]: ['x'],
        'images.__proto__': ['y'],
        'images.constructor.name': ['z'],
        [`images.${U}.custom_properties.prototype`]: ['w'],
      }),
    ) as Record<string, string[]>;
    const mapped = mapValidationErrors(bag, 'images', [U]);
    expect(mapped.topLevelErrors).toEqual([]);
    expect(Object.keys(mapped.validationErrors)).toEqual([]);
    expect(({} as Record<string, unknown>).x).toBeUndefined();
    expect(Object.getPrototypeOf(mapped.validationErrors)).toBeNull();
  });

  it('returns empty results for a missing bag and validates its arguments', () => {
    expect(mapValidationErrors(null, 'images', [])).toEqual({
      topLevelErrors: [],
      validationErrors: {},
    });
    expect(() => mapValidationErrors({}, '', [])).toThrow(TypeError);
    expect(() => mapValidationErrors({}, 'images', 'x' as never)).toThrow(TypeError);
    expect(() => mapValidationErrors('bag' as never, 'images', [])).toThrow(TypeError);
  });
});
