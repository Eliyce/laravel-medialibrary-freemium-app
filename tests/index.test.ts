import { describe, expect, it } from 'vitest';
import * as root from '../src/index.js';
import * as core from '../src/core/index.js';
import { VERSION } from '../src/index.js';
import pkg from '../package.json' with { type: 'json' };

const CORE_EXPORTS = [
  'MediaLibrary',
  'defaultTranslations',
  'translate',
  'normalizeValue',
  'mapValidationErrors',
  'validateFile',
  'getCsrfHeaders',
  'generateUuid',
];

describe('media-pro', () => {
  it('exports a VERSION matching package.json', () => {
    expect(VERSION).toBe(pkg.version);
  });

  it('exposes the core API from both `.` and `./core` (AC-25)', () => {
    for (const name of CORE_EXPORTS) {
      expect(Object.keys(core)).toContain(name);
      expect(Object.keys(root)).toContain(name);
      expect(root[name as keyof typeof root]).toBe(core[name as keyof typeof core]);
    }
    expect(Object.keys(root)).toContain('VERSION');
    expect(Object.keys(core)).not.toContain('VERSION');
  });

  it('exposes no default export', () => {
    expect('default' in root).toBe(false);
    expect('default' in core).toBe(false);
  });
});
