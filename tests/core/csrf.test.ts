import { afterEach, describe, expect, it, vi } from 'vitest';
import { getCsrfHeaders } from '../../src/core/index.js';
import type { CsrfDocument } from '../../src/core/index.js';

function fakeDocument(cookie: string, metaContent?: string | null): CsrfDocument {
  return {
    cookie,
    querySelector: (selector: string) =>
      selector === 'meta[name="csrf-token"]' && metaContent !== undefined
        ? { getAttribute: (name: string) => (name === 'content' ? metaContent : null) }
        : null,
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('getCsrfHeaders (AC-10)', () => {
  it('sends the URL-decoded XSRF-TOKEN cookie as X-XSRF-TOKEN', () => {
    const doc = fakeDocument('theme=dark; XSRF-TOKEN=abc%3D%3D%2Bdef; other=1', 'meta-token');
    expect(getCsrfHeaders(doc)).toEqual({ 'X-XSRF-TOKEN': 'abc==+def' });
  });

  it('falls back to the csrf-token meta tag as X-CSRF-TOKEN', () => {
    expect(getCsrfHeaders(fakeDocument('theme=dark', 'meta-token'))).toEqual({
      'X-CSRF-TOKEN': 'meta-token',
    });
  });

  it('uses the meta tag when the cookie is empty or not decodable', () => {
    expect(getCsrfHeaders(fakeDocument('XSRF-TOKEN=', 'meta'))).toEqual({ 'X-CSRF-TOKEN': 'meta' });
    expect(getCsrfHeaders(fakeDocument('XSRF-TOKEN=%E0%A4%A', 'meta'))).toEqual({
      'X-CSRF-TOKEN': 'meta',
    });
  });

  it('adds no header with neither source', () => {
    expect(getCsrfHeaders(fakeDocument(''))).toEqual({});
    expect(getCsrfHeaders(fakeDocument('', ''))).toEqual({});
    expect(getCsrfHeaders(fakeDocument('', null))).toEqual({});
  });

  it('does not throw where document is undefined', () => {
    expect(typeof document).toBe('undefined');
    expect(getCsrfHeaders()).toEqual({});
  });

  it('reads the global document when none is passed', () => {
    vi.stubGlobal('document', fakeDocument('XSRF-TOKEN=global'));
    expect(getCsrfHeaders()).toEqual({ 'X-XSRF-TOKEN': 'global' });
  });
});
