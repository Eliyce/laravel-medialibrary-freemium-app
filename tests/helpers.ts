import { vi } from 'vitest';
import type {
  UploadRequest,
  UploadResponse,
  UploadTransport,
  UploadTransportResponse,
} from '../src/core/index.js';

export const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

/** A file of `size` bytes. */
export function makeFile(name: string, type: string, size = 1024): File {
  return new File([new Uint8Array(size)], name, { type });
}

/** The UploadResponse the server would send for a request. */
export function uploadResponse(
  request: UploadRequest,
  overrides: Partial<UploadResponse> = {},
): UploadResponse {
  const body = request.body instanceof FormData ? request.body : null;
  const file = body?.get('file');
  const uuid = String(body?.get('uuid') ?? overrides.uuid ?? 'missing');
  const name = String(body?.get('name') ?? 'file');
  const fileName = file instanceof File ? file.name : `${name}.png`;
  return {
    uuid,
    name,
    file_name: fileName,
    preview_url: `https://cdn.test/${uuid}/preview.jpg`,
    original_url: `https://cdn.test/${uuid}/${fileName}`,
    size: file instanceof File ? file.size : 1024,
    mime_type: file instanceof File ? file.type : 'image/png',
    extension: fileName.split('.').pop() ?? '',
    ...overrides,
  };
}

export interface PendingRequest {
  request: UploadRequest;
  respond: (response: UploadTransportResponse) => void;
  fail: (error: unknown) => void;
  /** Responds 200 with an UploadResponse built from the request. */
  succeed: (overrides?: Partial<UploadResponse>) => void;
}

/**
 * A transport whose requests stay pending until the test answers them. Aborting a request
 * rejects it with an AbortError, like the real transport.
 */
export function createManualTransport() {
  const pending: PendingRequest[] = [];
  const transport = vi.fn<UploadTransport>(
    (request) =>
      new Promise<UploadTransportResponse>((resolve, reject) => {
        const entry: PendingRequest = {
          request,
          respond: resolve,
          fail: reject,
          succeed: (overrides) =>
            resolve({ status: 200, body: uploadResponse(request, overrides) }),
        };
        pending.push(entry);
        request.signal.addEventListener('abort', () => {
          const error = new Error('aborted');
          error.name = 'AbortError';
          reject(error);
        });
      }),
  );
  return { transport, pending };
}

/** A transport that answers every request immediately with a 200 UploadResponse. */
export function createAutoTransport() {
  return vi.fn<UploadTransport>(async (request) => ({
    status: 200,
    body: uploadResponse(request),
  }));
}

/** Lets pending promise callbacks run. */
export async function flush(): Promise<void> {
  for (let i = 0; i < 5; i += 1) {
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
  }
}
