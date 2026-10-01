import { afterEach, describe, expect, it, vi } from 'vitest';
import { MediaLibrary } from '../../src/core/index.js';
import type { UploadTransportResponse } from '../../src/core/index.js';
import { createManualTransport, flush, makeFile, uploadResponse, UUID_V4 } from '../helpers.js';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('upload requests', () => {
  it('POSTs multipart file, uuid and name to the default route (AC-8)', async () => {
    const { transport, pending } = createManualTransport();
    const library = new MediaLibrary({ name: 'images', fetch: transport });

    library.addFile(makeFile('holiday.final.png', 'image/png'));
    await flush();

    expect(transport).toHaveBeenCalledTimes(1);
    const { request } = pending[0]!;
    expect(request.method).toBe('POST');
    expect(request.url).toBe('/media-library-pro/uploads');
    expect(request.credentials).toBe('same-origin');
    expect(request.headers).toEqual({
      Accept: 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
    });
    expect(request.body).toBeInstanceOf(FormData);
    const body = request.body as FormData;
    expect((body.get('file') as File).name).toBe('holiday.final.png');
    expect(body.get('uuid')).toMatch(UUID_V4);
    expect(body.get('uuid')).toBe(library.getState().media[0]?.attributes.uuid);
    expect(body.get('name')).toBe('holiday.final');
  });

  it('joins uploadDomain and routePrefix without duplicate slashes (AC-9)', async () => {
    const { transport, pending } = createManualTransport();
    const library = new MediaLibrary({
      name: 'images',
      uploadDomain: 'https://files.example.com/',
      routePrefix: '/custom/',
      fetch: transport,
    });
    library.addFile(makeFile('a.png', 'image/png'));
    await flush();

    expect(pending[0]?.request.url).toBe('https://files.example.com/custom/uploads');
    expect(pending[0]?.request.credentials).toBe('include');
  });

  it('adds the CSRF header from the document (AC-10)', async () => {
    vi.stubGlobal('document', { cookie: 'XSRF-TOKEN=a%2Bb', querySelector: () => null });
    const { transport, pending } = createManualTransport();
    new MediaLibrary({ name: 'images', fetch: transport }).addFile(makeFile('a.png', 'image/png'));
    await flush();
    expect(pending[0]?.request.headers['X-XSRF-TOKEN']).toBe('a+b');
  });

  it('runs the three-request Vapor flow (AC-14)', async () => {
    const calls: Array<{
      method: string;
      url: string;
      headers: Record<string, string>;
      body: unknown;
    }> = [];
    const transport = vi.fn(async (request): Promise<UploadTransportResponse> => {
      calls.push({ ...request, body: request.body });
      if (request.url === '/vapor/signed-storage-url') {
        return {
          status: 201,
          body: {
            uuid: 'vapor-uuid',
            bucket: 'my-bucket',
            key: 'tmp/vapor-uuid',
            url: 'https://s3.test/tmp/vapor-uuid?signature=x',
            headers: { Host: ['s3.test'], 'Content-Type': 'image/png', 'x-amz-acl': ['private'] },
          },
        };
      }
      if (request.method === 'PUT') return { status: 200, body: null };
      return { status: 200, body: uploadResponse(request, { name: 'photo' }) };
    });
    const library = new MediaLibrary({ name: 'images', vapor: true, fetch: transport });
    library.addFile(makeFile('photo.png', 'image/png'));
    await flush();

    const uuid = library.getState().media[0]?.attributes.uuid;
    expect(calls.map((call) => `${call.method} ${call.url}`)).toEqual([
      'POST /vapor/signed-storage-url',
      'PUT https://s3.test/tmp/vapor-uuid?signature=x',
      'POST /media-library-pro/s3',
    ]);
    expect(JSON.parse(calls[0]?.body as string)).toEqual({
      bucket: '',
      content_type: 'image/png',
      visibility: null,
    });
    expect(calls[1]?.headers).toEqual({ 'Content-Type': 'image/png', 'x-amz-acl': 'private' });
    expect(calls[1]?.body).toBeInstanceOf(File);
    expect(JSON.parse(calls[2]?.body as string)).toEqual({
      key: 'tmp/vapor-uuid',
      bucket: 'my-bucket',
      uuid,
      name: 'photo',
      content_type: 'image/png',
    });
    expect(library.getState().media[0]?.upload.hasFailed).toBe(false);
  });

  it('uses a custom vaporSignedStorageUrl and the upload domain', async () => {
    const urls: string[] = [];
    const transport = vi.fn(async (request): Promise<UploadTransportResponse> => {
      urls.push(request.url);
      return { status: 500, body: null };
    });
    const library = new MediaLibrary({
      name: 'images',
      vapor: true,
      vaporSignedStorageUrl: '/custom/signed',
      uploadDomain: 'https://app.test',
      fetch: transport,
    });
    library.addFile(makeFile('photo.png', 'image/png'));
    await flush();
    expect(urls).toEqual(['https://app.test/custom/signed']);
    expect(library.getErrors(library.getState().media[0]!)).toEqual([
      library.translations.somethingWentWrong,
    ]);
  });

  it('fails the Vapor upload when the signed response or the PUT is unusable', async () => {
    for (const [signedBody, putStatus] of [
      [{ nope: true }, 200],
      [{ url: 'https://s3.test/x', key: 'tmp/x' }, 403],
    ] as const) {
      const transport = vi.fn(async (request): Promise<UploadTransportResponse> =>
        request.method === 'PUT'
          ? { status: putStatus, body: null }
          : { status: 200, body: signedBody },
      );
      const library = new MediaLibrary({ name: 'images', vapor: true, fetch: transport });
      library.addFile(makeFile('photo.png', 'image/png'));
      await flush();
      expect(library.getState().media[0]?.upload.hasFailed).toBe(true);
      expect(transport.mock.calls.some(([request]) => request.url.endsWith('/s3'))).toBe(false);
    }
  });
});

class FakeXhr {
  static instances: FakeXhr[] = [];
  method = '';
  url = '';
  headers: Record<string, string> = {};
  withCredentials = false;
  status = 0;
  responseText = '';
  body: unknown;
  aborted = false;
  listeners = new Map<string, Array<(event?: unknown) => void>>();
  uploadListeners = new Map<string, Array<(event: unknown) => void>>();
  upload = {
    addEventListener: (type: string, listener: (event: unknown) => void) => {
      this.uploadListeners.set(type, [...(this.uploadListeners.get(type) ?? []), listener]);
    },
  };

  constructor() {
    FakeXhr.instances.push(this);
  }
  open(method: string, url: string): void {
    this.method = method;
    this.url = url;
  }
  setRequestHeader(name: string, value: string): void {
    this.headers[name] = value;
  }
  addEventListener(type: string, listener: () => void): void {
    this.listeners.set(type, [...(this.listeners.get(type) ?? []), listener]);
  }
  send(body: unknown): void {
    this.body = body;
  }
  abort(): void {
    this.aborted = true;
    this.emit('abort');
  }
  progress(loaded: number, total: number): void {
    for (const listener of this.uploadListeners.get('progress') ?? []) {
      listener({ lengthComputable: true, loaded, total });
    }
  }
  respond(status: number, body: unknown): void {
    this.status = status;
    this.responseText = typeof body === 'string' ? body : JSON.stringify(body);
    this.emit('load');
  }
  emit(type: string): void {
    for (const listener of this.listeners.get(type) ?? []) listener();
  }
}

describe('default XMLHttpRequest transport', () => {
  afterEach(() => {
    FakeXhr.instances = [];
  });

  it('reports progress and notifies subscribers until the response arrives (AC-11)', async () => {
    vi.stubGlobal('XMLHttpRequest', FakeXhr);
    const library = new MediaLibrary({ name: 'images' });
    const listener = vi.fn();
    library.subscribe(listener);

    library.addFile(makeFile('a.png', 'image/png'));
    await flush();
    const xhr = FakeXhr.instances[0]!;
    expect(xhr.method).toBe('POST');
    expect(xhr.url).toBe('/media-library-pro/uploads');
    expect(xhr.headers.Accept).toBe('application/json');
    expect(xhr.withCredentials).toBe(false);
    expect(library.hasUploadsInProgress()).toBe(true);

    const before = listener.mock.calls.length;
    xhr.progress(30, 100);
    expect(library.getState().media[0]?.upload.uploadProgress).toBe(30);
    expect(listener.mock.calls.length).toBe(before + 1);
    xhr.progress(100, 100);
    expect(library.getState().media[0]?.upload.uploadProgress).toBe(100);
    expect(listener.mock.calls.length).toBe(before + 2);
    expect(library.hasUploadsInProgress()).toBe(true);

    const uuid = library.getState().media[0]!.attributes.uuid;
    xhr.respond(200, { uuid, name: 'a', file_name: 'a.png', size: 1024 });
    await flush();
    expect(library.hasUploadsInProgress()).toBe(false);
    expect(library.getState().media[0]?.upload.hasFailed).toBe(false);
  });

  it('ignores progress events without a known total', async () => {
    vi.stubGlobal('XMLHttpRequest', FakeXhr);
    const library = new MediaLibrary({ name: 'images' });
    library.addFile(makeFile('a.png', 'image/png'));
    await flush();
    FakeXhr.instances[0]!.progress(10, 0);
    expect(library.getState().media[0]?.upload.uploadProgress).toBe(0);
  });

  it('sends credentials to an upload domain and fails on a non-JSON or network error', async () => {
    vi.stubGlobal('XMLHttpRequest', FakeXhr);
    const library = new MediaLibrary({ name: 'images', uploadDomain: 'https://files.test' });
    library.addFile(makeFile('a.png', 'image/png'));
    library.addFile(makeFile('b.png', 'image/png'));
    await flush();
    const [first, second] = FakeXhr.instances;
    expect(first?.withCredentials).toBe(true);

    first!.respond(200, '<html>oops</html>');
    second!.emit('error');
    await flush();
    const [a, b] = library.getState().media;
    expect(library.getErrors(a!)).toEqual([library.translations.somethingWentWrong]);
    expect(library.getErrors(b!)).toEqual([library.translations.somethingWentWrong]);
  });

  it('aborts the request when the item is removed', async () => {
    vi.stubGlobal('XMLHttpRequest', FakeXhr);
    const library = new MediaLibrary({ name: 'images' });
    library.addFile(makeFile('a.png', 'image/png'));
    await flush();
    library.removeMedia(library.getState().media[0]!);
    await flush();
    expect(FakeXhr.instances[0]?.aborted).toBe(true);
    expect(library.getState().media).toEqual([]);
  });

  it('fails the upload when XMLHttpRequest is unavailable', async () => {
    vi.stubGlobal('XMLHttpRequest', undefined);
    const afterUpload = vi.fn();
    const library = new MediaLibrary({ name: 'images', afterUpload });
    library.addFile(makeFile('a.png', 'image/png'));
    await flush();
    expect(library.getState().media[0]?.upload.hasFailed).toBe(true);
    expect(afterUpload).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, cause: expect.any(Error) }),
    );
  });
});
