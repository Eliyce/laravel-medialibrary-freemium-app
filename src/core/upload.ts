import { getCsrfHeaders } from './csrf.js';
import type {
  Translations,
  UploadRequest,
  UploadResponse,
  UploadTransport,
  UploadTransportResponse,
} from './types.js';
import { isRecord } from './value.js';

/** Joins an optional domain and path parts into one URL, collapsing duplicate slashes. */
export function joinUrl(domain: string | undefined, ...parts: string[]): string {
  const base = (domain ?? '').replace(/\/+$/, '');
  const path = `/${parts.join('/')}`.replace(/\/{2,}/g, '/');
  return `${base}${path}`;
}

/** Creates an error that identifies an aborted request. */
export function createAbortError(): Error {
  const error = new Error('The upload was aborted');
  error.name = 'AbortError';
  return error;
}

export function isAbortError(error: unknown): boolean {
  return isRecord(error) && error.name === 'AbortError';
}

function parseJson(text: string): unknown {
  if (text === '') return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    // Not JSON (an HTML error page, for example); callers treat a null body as a failure.
    return null;
  }
}

/**
 * The default transport: XMLHttpRequest, because unlike `fetch` it reports upload progress.
 * Resolves with the status and parsed JSON body for every completed response (any status),
 * rejects on network errors and on abort.
 */
export function createXhrTransport(): UploadTransport {
  return (request: UploadRequest) =>
    new Promise<UploadTransportResponse>((resolve, reject) => {
      const Xhr = (globalThis as { XMLHttpRequest?: typeof XMLHttpRequest }).XMLHttpRequest;
      if (typeof Xhr !== 'function') {
        reject(new Error('XMLHttpRequest is not available here; pass a `fetch` transport'));
        return;
      }
      if (request.signal.aborted) {
        reject(createAbortError());
        return;
      }

      const xhr = new Xhr();
      const onAbortSignal = (): void => xhr.abort();
      const cleanup = (): void => request.signal.removeEventListener('abort', onAbortSignal);

      xhr.open(request.method, request.url, true);
      xhr.withCredentials = request.credentials === 'include';
      for (const [header, value] of Object.entries(request.headers)) {
        xhr.setRequestHeader(header, value);
      }
      const { onProgress } = request;
      if (onProgress) {
        xhr.upload.addEventListener('progress', (event: ProgressEvent) => {
          if (event.lengthComputable && event.total > 0) {
            onProgress(Math.round((event.loaded / event.total) * 100));
          }
        });
      }
      xhr.addEventListener('load', () => {
        cleanup();
        resolve({ status: xhr.status, body: parseJson(xhr.responseText) });
      });
      xhr.addEventListener('error', () => {
        cleanup();
        reject(new Error(`Network error while sending ${request.method} ${request.url}`));
      });
      xhr.addEventListener('abort', () => {
        cleanup();
        reject(createAbortError());
      });
      request.signal.addEventListener('abort', onAbortSignal, { once: true });
      xhr.send(request.body);
    });
}

/** Everything one upload needs. */
export interface UploadOptions {
  file: File;
  uuid: string;
  name: string;
  routePrefix: string;
  uploadDomain: string | undefined;
  vapor: boolean;
  vaporSignedStorageUrl: string;
  transport: UploadTransport;
  translations: Translations;
  signal: AbortSignal;
  onProgress: (percent: number) => void;
}

export type UploadOutcome =
  | { ok: true; response: Partial<UploadResponse> }
  | { ok: false; errors: string[]; status?: number; cause?: unknown };

function isSuccess(status: number): boolean {
  return status >= 200 && status < 300;
}

function baseHeaders(): Record<string, string> {
  return {
    Accept: 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
    ...getCsrfHeaders(),
  };
}

function credentialsFor(uploadDomain: string | undefined): UploadRequest['credentials'] {
  return uploadDomain ? 'include' : 'same-origin';
}

/** Reads the fields of an UploadResponse that have the expected type; ignores anything else. */
export function parseUploadResponse(body: unknown): Partial<UploadResponse> | null {
  if (!isRecord(body)) return null;
  const response: Partial<UploadResponse> = {};
  for (const field of ['uuid', 'name', 'file_name', 'mime_type', 'extension'] as const) {
    const value = body[field];
    if (typeof value === 'string') response[field] = value;
  }
  for (const field of ['preview_url', 'original_url'] as const) {
    const value = body[field];
    if (typeof value === 'string' || value === null) response[field] = value;
  }
  if (typeof body.size === 'number' && Number.isFinite(body.size)) response.size = body.size;
  return response;
}

function errorMessages(status: number, body: unknown, translations: Translations): string[] {
  if (status === 422 && isRecord(body)) {
    const messages: string[] = [];
    if (isRecord(body.errors)) {
      for (const value of Object.values(body.errors)) {
        if (typeof value === 'string') messages.push(value);
        else if (Array.isArray(value)) {
          messages.push(...value.filter((entry): entry is string => typeof entry === 'string'));
        }
      }
    }
    if (messages.length === 0 && typeof body.message === 'string') messages.push(body.message);
    if (messages.length > 0) return messages;
  }
  if (status === 429) return [translations.tryAgain];
  return [translations.somethingWentWrong];
}

function toOutcome(result: UploadTransportResponse, translations: Translations): UploadOutcome {
  if (isSuccess(result.status)) {
    const response = parseUploadResponse(result.body);
    if (response) return { ok: true, response };
    return { ok: false, errors: [translations.somethingWentWrong], status: result.status };
  }
  return {
    ok: false,
    errors: errorMessages(result.status, result.body, translations),
    status: result.status,
  };
}

async function uploadDirect(options: UploadOptions): Promise<UploadTransportResponse> {
  const body = new FormData();
  body.append('file', options.file);
  body.append('uuid', options.uuid);
  body.append('name', options.name);
  return options.transport({
    method: 'POST',
    url: joinUrl(options.uploadDomain, options.routePrefix, 'uploads'),
    headers: baseHeaders(),
    body,
    credentials: credentialsFor(options.uploadDomain),
    signal: options.signal,
    onProgress: options.onProgress,
  });
}

interface SignedStorage {
  url: string;
  key: string;
  bucket: string;
  headers: Record<string, string>;
}

function parseSignedStorage(body: unknown): SignedStorage | null {
  if (!isRecord(body) || typeof body.url !== 'string' || typeof body.key !== 'string') return null;
  const headers: Record<string, string> = {};
  if (isRecord(body.headers)) {
    for (const [header, value] of Object.entries(body.headers)) {
      if (header.toLowerCase() === 'host') continue;
      if (typeof value === 'string') headers[header] = value;
      else if (Array.isArray(value)) headers[header] = value.map(String).join(', ');
    }
  }
  return {
    url: body.url,
    key: body.key,
    bucket: typeof body.bucket === 'string' ? body.bucket : '',
    headers,
  };
}

async function uploadVapor(options: UploadOptions): Promise<UploadTransportResponse> {
  const jsonHeaders = { ...baseHeaders(), 'Content-Type': 'application/json' };
  const credentials = credentialsFor(options.uploadDomain);

  const signed = await options.transport({
    method: 'POST',
    url: joinUrl(options.uploadDomain, options.vaporSignedStorageUrl),
    headers: jsonHeaders,
    body: JSON.stringify({ bucket: '', content_type: options.file.type, visibility: null }),
    credentials,
    signal: options.signal,
  });
  if (!isSuccess(signed.status)) return signed;
  const storage = parseSignedStorage(signed.body);
  if (!storage) return { status: 500, body: null };

  // The PUT goes straight to S3: no CSRF token and no cookies may travel with it.
  const stored = await options.transport({
    method: 'PUT',
    url: storage.url,
    headers: storage.headers,
    body: options.file,
    credentials: 'omit',
    signal: options.signal,
    onProgress: options.onProgress,
  });
  if (!isSuccess(stored.status)) return { status: 500, body: null };

  return options.transport({
    method: 'POST',
    url: joinUrl(options.uploadDomain, options.routePrefix, 's3'),
    headers: jsonHeaders,
    body: JSON.stringify({
      key: storage.key,
      bucket: storage.bucket,
      uuid: options.uuid,
      name: options.name,
      content_type: options.file.type,
    }),
    credentials,
    signal: options.signal,
  });
}

/**
 * Uploads one file (directly, or through S3 in Vapor mode) and maps the result to either the
 * response fields or translated error messages. Rejects only when the upload was aborted.
 */
export async function uploadFile(options: UploadOptions): Promise<UploadOutcome> {
  let result: UploadTransportResponse;
  try {
    result = options.vapor ? await uploadVapor(options) : await uploadDirect(options);
  } catch (error) {
    if (isAbortError(error) || options.signal.aborted) throw createAbortError();
    return { ok: false, errors: [options.translations.somethingWentWrong], cause: error };
  }
  return toOutcome(result, options.translations);
}
