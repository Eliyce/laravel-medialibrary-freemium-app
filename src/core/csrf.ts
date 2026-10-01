/** The parts of `document` the CSRF lookup reads. */
export interface CsrfDocument {
  cookie: string;
  querySelector(selectors: string): { getAttribute(name: string): string | null } | null;
}

function readXsrfCookie(cookie: string): string | undefined {
  for (const part of cookie.split(';')) {
    const separator = part.indexOf('=');
    if (separator === -1) continue;
    if (part.slice(0, separator).trim() !== 'XSRF-TOKEN') continue;
    const raw = part.slice(separator + 1).trim();
    if (raw === '') return undefined;
    try {
      return decodeURIComponent(raw);
    } catch {
      // A malformed cookie cannot be sent as a token; the meta tag is the next source.
      return undefined;
    }
  }
  return undefined;
}

/**
 * Returns the CSRF header for Laravel: `X-XSRF-TOKEN` from the URL-decoded `XSRF-TOKEN` cookie,
 * else `X-CSRF-TOKEN` from `<meta name="csrf-token">`, else no header. Safe to call where
 * `document` does not exist (server rendering, workers): it then returns an empty object.
 */
export function getCsrfHeaders(doc?: CsrfDocument | null): Record<string, string> {
  const source =
    doc ?? (typeof document === 'undefined' ? undefined : (document as unknown as CsrfDocument));
  if (!source) return {};

  const cookieToken = typeof source.cookie === 'string' ? readXsrfCookie(source.cookie) : undefined;
  if (cookieToken !== undefined) return { 'X-XSRF-TOKEN': cookieToken };

  const meta =
    typeof source.querySelector === 'function'
      ? source.querySelector('meta[name="csrf-token"]')
      : null;
  const metaToken = meta?.getAttribute('content');
  if (typeof metaToken === 'string' && metaToken !== '') return { 'X-CSRF-TOKEN': metaToken };

  return {};
}
