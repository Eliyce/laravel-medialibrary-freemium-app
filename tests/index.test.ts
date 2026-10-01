import { describe, expect, it } from 'vitest';
import { VERSION } from '../src/index.js';
import pkg from '../package.json' with { type: 'json' };

describe('media-pro', () => {
  it('exports a VERSION matching package.json', () => {
    expect(VERSION).toBe(pkg.version);
  });
});
