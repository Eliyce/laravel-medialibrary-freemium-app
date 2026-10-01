import { afterEach, describe, expect, it } from 'vitest';
import { defaultTranslations, resolveTranslations, translate } from '../../src/core/index.js';
import type { Translations } from '../../src/core/index.js';

const globals = globalThis as { mediaLibraryTranslations?: unknown };

afterEach(() => {
  delete globals.mediaLibraryTranslations;
});

describe('defaultTranslations', () => {
  it('carries the Spatie keys plus the extra keys', () => {
    expect(Object.keys(defaultTranslations).sort()).toEqual(
      [
        'fileTypeNotAllowed',
        'tooLarge',
        'tooSmall',
        'tryAgain',
        'somethingWentWrong',
        'selectOrDrag',
        'selectOrDragMax',
        'file',
        'anyImage',
        'anyVideo',
        'goBack',
        'dropFile',
        'dragHere',
        'remove',
        'download',
        'replace',
        'name',
        'uploading',
        'moveUp',
        'moveDown',
      ].sort(),
    );
    expect(defaultTranslations.file).toEqual({ singular: 'file', plural: 'files' });
    expect(Object.isFrozen(defaultTranslations)).toBe(true);
  });
});

describe('resolveTranslations', () => {
  it('merges defaults, then the global translations, then the config ones (AC-18)', () => {
    globals.mediaLibraryTranslations = { remove: 'delete', somethingWentWrong: 'whoops' };
    const t = resolveTranslations({ remove: 'Trash' });

    expect(t.remove).toBe('Trash');
    expect(t.somethingWentWrong).toBe('whoops');
    for (const key of Object.keys(defaultTranslations) as Array<keyof Translations>) {
      if (key === 'remove' || key === 'somethingWentWrong') continue;
      expect(t[key]).toEqual(defaultTranslations[key]);
    }
    expect(translate(t, 'selectOrDragMax', { maxItems: 3, file: 'files' })).toBe(
      'Select or drag max 3 files',
    );
  });

  it('merges the nested file key part by part', () => {
    globals.mediaLibraryTranslations = { file: { singular: 'Datei' } };
    const t = resolveTranslations({ file: { plural: 'Dateien' } });
    expect(t.file).toEqual({ singular: 'Datei', plural: 'Dateien' });
  });

  it('returns the defaults without overrides and never mutates them', () => {
    const t = resolveTranslations();
    t.remove = 'changed';
    expect(resolveTranslations().remove).toBe('Remove');
    expect(resolveTranslations(null)).toEqual(resolveTranslations(undefined));
  });

  it('ignores unknown keys, non-string values and prototype keys', () => {
    const overrides = JSON.parse(
      '{"remove": 42, "unknown": "x", "__proto__": {"polluted": "yes"}, "goBack": "Back"}',
    ) as Record<string, unknown>;
    const t = resolveTranslations(overrides);
    expect(t.remove).toBe('Remove');
    expect(t.goBack).toBe('Back');
    expect('unknown' in t).toBe(false);
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });

  it('ignores a malformed global and rejects malformed config translations', () => {
    globals.mediaLibraryTranslations = 'not an object';
    expect(resolveTranslations().remove).toBe('Remove');
    expect(() => resolveTranslations('nope' as never)).toThrow(TypeError);
  });
});

describe('translate', () => {
  const t = resolveTranslations();

  it('replaces every placeholder and leaves unknown ones in place', () => {
    expect(translate(t, 'selectOrDragMax', { maxItems: 1 })).toBe('Select or drag max 1 {file}');
    expect(translate(t, 'remove')).toBe('Remove');
  });

  it('throws on unknown keys and bad arguments', () => {
    expect(() => translate(t, 'nope' as never)).toThrow(TypeError);
    expect(() => translate(null as never, 'remove')).toThrow(TypeError);
    expect(() => translate(t, 'remove', 'x' as never)).toThrow(TypeError);
  });
});
