import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MediaLibrary } from '../../src/core/index.js';
import type { MediaLibraryConfig, MediaObject, ValueItemInput } from '../../src/core/index.js';
import {
  createAutoTransport,
  createManualTransport,
  flush,
  makeFile,
  UUID_V4,
} from '../helpers.js';

const KB = 1024;

function create(config: Partial<MediaLibraryConfig> = {}) {
  const { transport, pending } = createManualTransport();
  const library = new MediaLibrary({ name: 'images', fetch: transport, ...config });
  return { library, transport, pending };
}

function media(library: MediaLibrary, index = 0): MediaObject {
  const object = library.getState().media[index];
  if (!object) throw new Error(`No media at ${index}`);
  return object;
}

let objectUrls: string[];
let createObjectURL: ReturnType<typeof vi.fn<(object: Blob | MediaSource) => string>>;
let revokeObjectURL: ReturnType<typeof vi.fn<(url: string) => void>>;

beforeEach(() => {
  objectUrls = [];
  createObjectURL = vi.fn<(object: Blob | MediaSource) => string>(() => {
    const url = `blob:test/${objectUrls.length + 1}`;
    objectUrls.push(url);
    return url;
  });
  revokeObjectURL = vi.fn<(url: string) => void>();
  vi.spyOn(URL, 'createObjectURL').mockImplementation(createObjectURL);
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(revokeObjectURL);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('config validation', () => {
  it.each([[undefined], [''], ['   '], [42]])(
    'throws a TypeError naming `name` for %j (AC-1)',
    (name) => {
      expect(() => new MediaLibrary({ name } as never)).toThrow(TypeError);
      expect(() => new MediaLibrary({ name } as never)).toThrow(/`name`/);
    },
  );

  it('throws a TypeError for a missing config', () => {
    expect(() => new MediaLibrary(undefined as never)).toThrow(TypeError);
  });

  it.each([
    [{ maxItems: 0 }, /maxItems/],
    [{ maxItems: 1.5 }, /maxItems/],
    [{ maxItems: Number.NaN }, /maxItems/],
    [{ maxSizeForPreviewInBytes: -1 }, /maxSizeForPreviewInBytes/],
    [{ maxSizeForPreviewInBytes: Infinity }, /maxSizeForPreviewInBytes/],
    [{ validationRules: { minSizeInKB: -1 } }, /minSizeInKB/],
    [{ validationRules: { maxSizeInKB: Number.POSITIVE_INFINITY } }, /maxSizeInKB/],
    [{ validationRules: { minSizeInKB: 10, maxSizeInKB: 5 } }, /minSizeInKB/],
  ])('throws a RangeError for %j (AC-2)', (config, message) => {
    expect(() => new MediaLibrary({ name: 'images', ...config })).toThrow(RangeError);
    expect(() => new MediaLibrary({ name: 'images', ...config })).toThrow(message);
  });

  it.each(['beforeUpload', 'afterUpload', 'onChange', 'onIsReadyToSubmitChange', 'fetch'])(
    'throws a TypeError for a non-function %s (AC-2)',
    (key) => {
      expect(() => new MediaLibrary({ name: 'images', [key]: 'nope' })).toThrow(TypeError);
      expect(() => new MediaLibrary({ name: 'images', [key]: 'nope' })).toThrow(key);
    },
  );

  it.each([
    [{ maxItems: '2' }],
    [{ maxSizeForPreviewInBytes: '5' }],
    [{ routePrefix: 3 }],
    [{ routePrefix: ' ' }],
    [{ uploadDomain: 1 }],
    [{ multiple: 'yes' }],
    [{ vapor: 1 }],
    [{ validationRules: 'x' }],
    [{ validationRules: { accept: 'image/*' } }],
    [{ validationRules: { maxSizeInKB: '10' } }],
  ])('throws a TypeError for %j', (config) => {
    expect(() => new MediaLibrary({ name: 'images', ...(config as object) })).toThrow(TypeError);
  });

  it('applies the defaults', () => {
    const library = new MediaLibrary({ name: 'images' });
    expect(library.config).toMatchObject({
      routePrefix: 'media-library-pro',
      uploadDomain: undefined,
      multiple: true,
      maxItems: undefined,
      vapor: false,
      vaporSignedStorageUrl: 'vapor/signed-storage-url',
      maxSizeForPreviewInBytes: 5242880,
    });
    expect(new MediaLibrary({ name: 'avatar', multiple: false }).config.maxItems).toBe(1);
  });
});

describe('client validation', () => {
  it('uploads accepted types only (AC-3)', async () => {
    const { library, transport } = create({
      validationRules: { accept: ['image/*', 'application/pdf'] },
    });
    library.addFiles([
      makeFile('a.png', 'image/png'),
      makeFile('b.pdf', 'application/pdf'),
      makeFile('c.txt', 'text/plain'),
    ]);
    await flush();

    expect(transport).toHaveBeenCalledTimes(2);
    expect(library.getState().media.map((item) => item.attributes.file_name)).toEqual([
      'a.png',
      'b.pdf',
    ]);
    expect(library.getState().invalidMedia).toEqual([
      {
        file: { name: 'c.txt' },
        errors: ['You must upload a file of type any image, application/pdf'],
      },
    ]);
  });

  it('applies inclusive size bounds (AC-4)', async () => {
    const { library, transport } = create({
      validationRules: { minSizeInKB: 10, maxSizeInKB: 100 },
    });
    library.addFiles([
      makeFile('5.png', 'image/png', 5 * KB),
      makeFile('10.png', 'image/png', 10 * KB),
      makeFile('100.png', 'image/png', 100 * KB),
      makeFile('200.png', 'image/png', 200 * KB),
    ]);
    await flush();

    expect(transport).toHaveBeenCalledTimes(2);
    expect(library.getState().media.map((item) => item.attributes.file_name)).toEqual([
      '10.png',
      '100.png',
    ]);
    expect(library.getState().invalidMedia.map((item) => item.errors[0])).toEqual([
      'File too small, min 10 KB',
      'File too large, max 100 KB',
    ]);
  });

  it('caps the item count with maxItems (AC-5)', async () => {
    const { library, transport } = create({ maxItems: 2 });
    library.addFiles([makeFile('a.png', 'image/png'), makeFile('b.png', 'image/png')]);
    await flush();
    expect(transport).toHaveBeenCalledTimes(2);

    library.addFile(makeFile('c.png', 'image/png'));
    await flush();
    expect(transport).toHaveBeenCalledTimes(2);
    expect(library.getState().media).toHaveLength(2);
    expect(library.getState().invalidMedia).toEqual([
      { file: { name: 'c.png' }, errors: ['Select or drag max 2 files'] },
    ]);
  });

  it('uses the singular file label when maxItems is 1 in multiple mode', () => {
    const { library } = create({ maxItems: 1 });
    library.addFiles([makeFile('a.png', 'image/png'), makeFile('b.png', 'image/png')]);
    expect(library.getState().invalidMedia[0]?.errors).toEqual(['Select or drag max 1 file']);
  });

  it('never sends an invalid file and is not ready until invalid media is cleared (AC-7)', async () => {
    const { library, transport } = create({ validationRules: { accept: ['image/png'] } });
    expect(library.isReadyToSubmit()).toBe(true);
    library.addFile(makeFile('a.gif', 'image/gif'));
    await flush();

    expect(transport).not.toHaveBeenCalled();
    expect(library.isReadyToSubmit()).toBe(false);
    library.clearInvalidMedia();
    expect(library.isReadyToSubmit()).toBe(true);
    expect(library.getState().invalidMedia).toEqual([]);
  });

  it('rejects non-file arguments', () => {
    const { library } = create();
    expect(() => library.addFile('a.png' as never)).toThrow(TypeError);
    expect(() => library.addFiles(null as never)).toThrow(TypeError);
    expect(() => library.addFiles(['a.png'] as never)).toThrow(TypeError);
  });
});

describe('single mode', () => {
  it('replaces the existing item and revokes its preview (AC-6)', async () => {
    const { library, pending } = create({ multiple: false });
    library.addFile(makeFile('first.png', 'image/png'));
    await flush();
    pending[0]!.succeed();
    await flush();
    const first = media(library);
    expect(first.client_preview).toBe('blob:test/1');

    library.addFiles([makeFile('second.png', 'image/png'), makeFile('third.png', 'image/png')]);
    await flush();
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:test/1');
    expect(library.getState().media).toHaveLength(1);
    expect(media(library).attributes.file_name).toBe('second.png');
    expect(pending).toHaveLength(2);

    pending[1]!.succeed();
    await flush();
    const value = library.getValue();
    expect(Object.keys(value)).toEqual([media(library).attributes.uuid]);
    expect(Object.keys(value)).not.toContain(first.attributes.uuid);
  });
});

describe('upload results', () => {
  it('fills the attributes from a 2xx response and keeps the client uuid (AC-12)', async () => {
    const afterUpload = vi.fn();
    const { library, pending } = create({ afterUpload });
    library.addFile(makeFile('cat.png', 'image/png', 2 * KB));
    await flush();
    const { uuid } = media(library).attributes;
    expect(uuid).toMatch(UUID_V4);

    pending[0]!.respond({
      status: 201,
      body: {
        uuid: 'server-should-not-win',
        name: 'Cat',
        file_name: 'cat-1.png',
        preview_url: 'https://cdn.test/preview.jpg',
        original_url: 'https://cdn.test/cat-1.png',
        size: 2048,
        mime_type: 'image/png',
        extension: 'png',
      },
    });
    await flush();

    expect(media(library).attributes).toMatchObject({
      uuid,
      name: 'Cat',
      file_name: 'cat-1.png',
      preview_url: 'https://cdn.test/preview.jpg',
      original_url: 'https://cdn.test/cat-1.png',
      size: 2048,
      mime_type: 'image/png',
      extension: 'png',
    });
    expect(media(library).upload).toEqual({
      hasFailed: false,
      isUploading: false,
      uploadProgress: 100,
    });
    expect(afterUpload).toHaveBeenCalledOnce();
    expect(afterUpload).toHaveBeenCalledWith({ success: true, uuid });
  });

  it('keeps a name edited during the upload when the response arrives', async () => {
    const { library, pending } = create();
    library.addFile(makeFile('cat.png', 'image/png', 2 * KB));
    await flush();
    expect(pending[0]!.request.body).toBeInstanceOf(FormData);
    expect((pending[0]!.request.body as FormData).get('name')).toBe('cat');

    library.setName(media(library), 'Renamed while uploading');
    pending[0]!.succeed({
      name: 'cat',
      file_name: 'cat-1.png',
      preview_url: 'https://cdn.test/p.jpg',
    });
    await flush();

    expect(media(library).attributes).toMatchObject({
      name: 'Renamed while uploading',
      file_name: 'cat-1.png',
      preview_url: 'https://cdn.test/p.jpg',
    });
    expect(media(library).upload.isUploading).toBe(false);
    const { uuid } = media(library).attributes;
    expect(library.getValue()[uuid]?.name).toBe('Renamed while uploading');
  });

  it('maps a 422 to item errors and blocks submitting (AC-13)', async () => {
    const afterUpload = vi.fn();
    const { library, pending } = create({ afterUpload });
    library.addFile(makeFile('big.png', 'image/png'));
    await flush();
    pending[0]!.respond({
      status: 422,
      body: { message: 'The given data was invalid.', errors: { file: ['The file is too big.'] } },
    });
    await flush();

    const object = media(library);
    expect(library.getErrors(object)).toEqual(['The file is too big.']);
    expect(object.upload.hasFailed).toBe(true);
    expect(library.isReadyToSubmit()).toBe(false);
    expect(afterUpload).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, uuid: object.attributes.uuid, status: 422 }),
    );
    expect(library.getValue()).toEqual({});
  });

  it.each([
    [{ status: 429, body: null }, 'please try uploading this file again'],
    [
      { status: 500, body: { message: 'Server Error' } },
      'Something went wrong while uploading this file',
    ],
    [{ status: 422, body: { message: 'Only a message' } }, 'Only a message'],
    [{ status: 422, body: { errors: { uuid: 'Taken' } } }, 'Taken'],
    [{ status: 422, body: 'html' }, 'Something went wrong while uploading this file'],
    [{ status: 200, body: 'not json' }, 'Something went wrong while uploading this file'],
  ])('maps %j to "%s" (AC-13)', async (response, message) => {
    const { library, pending } = create();
    library.addFile(makeFile('a.png', 'image/png'));
    await flush();
    pending[0]!.respond(response);
    await flush();
    expect(library.getErrors(media(library))).toEqual([message]);
  });

  it('maps a network failure to somethingWentWrong with the cause (AC-13)', async () => {
    const afterUpload = vi.fn();
    const { library, pending } = create({ afterUpload });
    library.addFile(makeFile('a.png', 'image/png'));
    await flush();
    const cause = new TypeError('Failed to fetch');
    pending[0]!.fail(cause);
    await flush();
    expect(library.getErrors(media(library))).toEqual([
      'Something went wrong while uploading this file',
    ]);
    expect(afterUpload).toHaveBeenCalledWith(expect.objectContaining({ success: false, cause }));
  });

  it('uses translated messages', async () => {
    const { library, pending } = create({ translations: { tryAgain: 'Nochmal' } });
    library.addFile(makeFile('a.png', 'image/png'));
    await flush();
    pending[0]!.respond({ status: 429, body: null });
    await flush();
    expect(library.getErrors(media(library))).toEqual(['Nochmal']);
  });
});

describe('value', () => {
  it('is keyed by uuid in display order and follows setOrder (AC-16)', async () => {
    const onChange = vi.fn();
    const transport = createAutoTransport();
    const library = new MediaLibrary({ name: 'images', fetch: transport, onChange });
    library.addFile(makeFile('a.png', 'image/png'));
    library.addFile(makeFile('b.pdf', 'application/pdf'));
    await flush();

    const [a, b] = library.getState().media.map((item) => item.attributes.uuid) as [string, string];
    const value = library.getValue();
    expect(Object.keys(value)).toEqual([a, b]);
    expect(value[a]).toEqual({
      uuid: a,
      name: 'a',
      file_name: 'a.png',
      preview_url: `https://cdn.test/${a}/preview.jpg`,
      original_url: `https://cdn.test/${a}/a.png`,
      size: 1024,
      mime_type: 'image/png',
      extension: 'png',
      order: 0,
      custom_properties: {},
    });
    expect(value[b]?.order).toBe(1);

    library.setOrder([b, a]);
    const reordered = library.getValue();
    expect(Object.keys(reordered)).toEqual([b, a]);
    expect(reordered[b]?.order).toBe(0);
    expect(reordered[a]?.order).toBe(1);
    expect(onChange).toHaveBeenLastCalledWith(reordered);
  });

  it('keeps unlisted items after the listed ones and ignores unknown uuids in setOrder', () => {
    const library = new MediaLibrary({
      name: 'images',
      initialValue: [
        { uuid: 'a', name: 'A' },
        { uuid: 'b', name: 'B' },
        { uuid: 'c', name: 'C' },
      ],
    });
    library.setOrder(['c', 'zzz', 'c']);
    expect(Object.keys(library.getValue())).toEqual(['c', 'a', 'b']);
    expect(() => library.setOrder('c' as never)).toThrow(TypeError);
    expect(() => library.setOrder([1] as never)).toThrow(TypeError);
  });

  it('loads an initialValue in either shape without uploading (AC-17)', () => {
    const items: ValueItemInput[] = [
      { uuid: 'u-2', name: 'Two', order: 1, custom_properties: { alt: 'b' } },
      { uuid: 'u-1', name: 'One', order: 0, preview_url: 'https://cdn.test/1.jpg' },
    ];
    const keyed = {
      'u-1': {
        uuid: 'u-1',
        name: 'One',
        order: 0,
        preview_url: 'https://cdn.test/1.jpg',
        custom_properties: {},
      },
      'u-2': { uuid: 'u-2', name: 'Two', order: 1, custom_properties: { alt: 'b' } },
    };
    const first = create({ initialValue: items });
    const second = create({ initialValue: keyed });

    expect(first.library.getValue()).toEqual(second.library.getValue());
    expect(Object.keys(first.library.getValue())).toEqual(['u-1', 'u-2']);
    for (const { library, transport } of [first, second]) {
      expect(transport).not.toHaveBeenCalled();
      expect(library.getState().media.map((item) => item.upload)).toEqual([
        { hasFailed: false, uploadProgress: 100, isUploading: false },
        { hasFailed: false, uploadProgress: 100, isUploading: false },
      ]);
      expect(library.isReadyToSubmit()).toBe(true);
    }
  });
});

describe('callbacks', () => {
  it('runs beforeUpload and turns a sync throw or a rejection into an item error (AC-19)', async () => {
    for (const beforeUpload of [
      () => {
        throw new Error('No cats');
      },
      () => Promise.reject(new Error('No cats')),
    ]) {
      const afterUpload = vi.fn();
      const { library, transport } = create({ beforeUpload, afterUpload });
      library.addFile(makeFile('cat.png', 'image/png'));
      await flush();
      expect(transport).not.toHaveBeenCalled();
      expect(library.getErrors(media(library))).toEqual(['No cats']);
      expect(media(library).upload.hasFailed).toBe(true);
      expect(library.isReadyToSubmit()).toBe(false);
      expect(afterUpload).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
    }
  });

  it('uploads only after an async beforeUpload resolves (AC-19)', async () => {
    let release!: () => void;
    const beforeUpload = vi.fn(() => new Promise<void>((resolve) => (release = resolve)));
    const { library, transport } = create({ beforeUpload });
    const file = makeFile('cat.png', 'image/png');
    library.addFile(file);
    await flush();
    expect(beforeUpload).toHaveBeenCalledWith(file);
    expect(transport).not.toHaveBeenCalled();
    release();
    await flush();
    expect(transport).toHaveBeenCalledOnce();
  });

  it('uses a string thrown by beforeUpload as the message', async () => {
    const { library } = create({
      beforeUpload: () => {
        throw 'Nope';
      },
    });
    library.addFile(makeFile('a.png', 'image/png'));
    await flush();
    expect(library.getErrors(media(library))).toEqual(['Nope']);
  });

  it('does not upload when the item is removed while beforeUpload runs', async () => {
    let release!: () => void;
    const { library, transport } = create({
      beforeUpload: () => new Promise<void>((resolve) => (release = resolve)),
    });
    library.addFile(makeFile('a.png', 'image/png'));
    library.removeMedia(media(library));
    release();
    await flush();
    expect(transport).not.toHaveBeenCalled();
  });

  it('fires onChange on value changes and onIsReadyToSubmitChange on flips only (AC-20)', async () => {
    const onChange = vi.fn();
    const onIsReadyToSubmitChange = vi.fn();
    const { library, pending } = create({ onChange, onIsReadyToSubmitChange });

    library.addFile(makeFile('a.png', 'image/png'));
    await flush();
    expect(onIsReadyToSubmitChange.mock.calls).toEqual([[false]]);
    expect(onChange).not.toHaveBeenCalled();

    pending[0]!.succeed();
    await flush();
    expect(onIsReadyToSubmitChange.mock.calls).toEqual([[false], [true]]);
    expect(onChange).toHaveBeenCalledTimes(1);
    const { uuid } = media(library).attributes;
    expect(Object.keys(onChange.mock.lastCall![0])).toEqual([uuid]);

    library.setName(media(library), 'Renamed');
    expect(onChange).toHaveBeenCalledTimes(2);
    expect(onChange.mock.lastCall![0][uuid].name).toBe('Renamed');

    library.removeMedia(media(library));
    expect(onChange).toHaveBeenCalledTimes(3);
    expect(onChange).toHaveBeenLastCalledWith({});
    expect(onIsReadyToSubmitChange).toHaveBeenCalledTimes(2);
  });
});

describe('object URLs and destroy', () => {
  it('previews small images only and revokes everything on destroy (AC-21)', async () => {
    const { library, pending } = create();
    const listener = vi.fn();
    library.subscribe(listener);

    library.addFile(makeFile('small.png', 'image/png', KB));
    library.addFile(makeFile('large.png', 'image/png', 6 * 1024 * KB));
    library.addFile(makeFile('doc.pdf', 'application/pdf'));
    await flush();

    expect(createObjectURL).toHaveBeenCalledTimes(1);
    expect(library.getState().media.map((item) => item.client_preview)).toEqual([
      'blob:test/1',
      undefined,
      undefined,
    ]);

    const signal = pending[0]!.request.signal;
    const calls = listener.mock.calls.length;
    library.destroy();
    expect(signal.aborted).toBe(true);
    expect(revokeObjectURL.mock.calls).toEqual([['blob:test/1']]);
    expect(library.isDestroyed).toBe(true);

    pending[1]!.succeed();
    library.addFile(makeFile('late.png', 'image/png'));
    library.clearInvalidMedia();
    await flush();
    expect(listener.mock.calls.length).toBe(calls);
    library.destroy();
    expect(revokeObjectURL).toHaveBeenCalledTimes(1);
  });

  it('honours maxSizeForPreviewInBytes', () => {
    const { library } = create({ maxSizeForPreviewInBytes: 10 });
    library.addFile(makeFile('a.png', 'image/png', 11));
    library.addFile(makeFile('b.png', 'image/png', 10));
    expect(library.getState().media.map((item) => item.client_preview)).toEqual([
      undefined,
      'blob:test/1',
    ]);
  });

  it('revokes the preview when an item is removed', () => {
    const { library } = create();
    library.addFile(makeFile('a.png', 'image/png'));
    library.removeMedia(media(library));
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:test/1');
    library.removeMedia({ client_id: 'gone', attributes: {} } as never);
    expect(revokeObjectURL).toHaveBeenCalledOnce();
  });

  it('works without URL.createObjectURL (server rendering)', () => {
    const original = URL.createObjectURL;
    Object.defineProperty(URL, 'createObjectURL', { value: undefined, configurable: true });
    try {
      const { library } = create();
      library.addFile(makeFile('a.png', 'image/png'));
      expect(media(library).client_preview).toBeUndefined();
    } finally {
      Object.defineProperty(URL, 'createObjectURL', { value: original, configurable: true });
    }
  });
});

describe('replaceMedia and removeMedia', () => {
  it('keeps the position, uploads under a fresh uuid and revokes the old preview (AC-23)', async () => {
    const transport = createAutoTransport();
    const library = new MediaLibrary({ name: 'images', fetch: transport });
    library.addFiles([
      makeFile('a.png', 'image/png'),
      makeFile('b.png', 'image/png'),
      makeFile('c.png', 'image/png'),
    ]);
    await flush();
    const target = media(library, 1);
    library.setCustomProperty(target, 'alt', 'Kept');

    library.replaceMedia(media(library, 1), makeFile('new.png', 'image/png'));
    expect(revokeObjectURL).toHaveBeenCalledWith(target.client_preview);
    const replaced = media(library, 1);
    expect(replaced.client_id).toBe(target.client_id);
    expect(replaced.attributes.uuid).not.toBe(target.attributes.uuid);
    expect(replaced.attributes.uuid).toMatch(UUID_V4);
    expect(replaced.upload.isUploading).toBe(true);
    await flush();

    expect(transport).toHaveBeenCalledTimes(4);
    const value = library.getValue();
    expect(value[replaced.attributes.uuid]).toMatchObject({
      order: 1,
      file_name: 'new.png',
      custom_properties: { alt: 'Kept' },
    });
    expect(value[target.attributes.uuid]).toBeUndefined();

    library.removeMedia(media(library, 1));
    expect(library.getState().media).toHaveLength(2);
    expect(library.getValue()[replaced.attributes.uuid]).toBeUndefined();
  });

  it('puts an invalid replacement in invalidMedia and keeps the item', async () => {
    const { library, pending } = create({ validationRules: { accept: ['image/*'] } });
    library.addFile(makeFile('a.png', 'image/png'));
    await flush();
    pending[0]!.succeed();
    await flush();
    const before = media(library);
    library.replaceMedia(before, makeFile('a.txt', 'text/plain'));
    expect(media(library)).toBe(before);
    expect(library.getState().invalidMedia).toHaveLength(1);
    expect(pending).toHaveLength(1);
  });

  it('aborts the previous upload of a replaced item and ignores its late response', async () => {
    const { library, pending } = create();
    library.addFile(makeFile('a.png', 'image/png'));
    await flush();
    library.replaceMedia(media(library), makeFile('b.png', 'image/png'));
    await flush();
    expect(pending[0]!.request.signal.aborted).toBe(true);
    pending[1]!.succeed();
    await flush();
    expect(media(library).attributes.file_name).toBe('b.png');
    expect(media(library).upload.hasFailed).toBe(false);
  });

  it('ignores stale objects', () => {
    const { library } = create({ initialValue: [{ uuid: 'a', name: 'A' }] });
    const stale = media(library);
    library.removeMedia(stale);
    library.removeMedia(stale);
    library.setName(stale, 'x');
    library.replaceMedia(stale, makeFile('a.png', 'image/png'));
    expect(library.getState().media).toEqual([]);
    expect(() => library.removeMedia({} as never)).toThrow(TypeError);
  });
});

describe('properties and errors', () => {
  const initialValue = [{ uuid: 'u', name: 'Cat', custom_properties: { alt: 'old' } }];

  it('sets names, custom properties and whitelisted attributes', () => {
    const { library } = create({ initialValue });
    library.setName(media(library), 'Dog');
    library.setCustomProperty(media(library), 'tags', ['a', 'b']);
    library.setProperty(media(library), 'attributes.custom_properties.alt', 'new');
    library.setProperty(media(library), 'attributes.preview_url', null);
    library.setProperty(media(library), 'attributes.size', 12);
    library.setProperty(media(library), 'client_preview', 'https://x.test/p.png');

    expect(media(library).client_preview).toBe('https://x.test/p.png');
    expect(library.getValue().u).toMatchObject({
      name: 'Dog',
      preview_url: null,
      size: 12,
      custom_properties: { alt: 'new', tags: ['a', 'b'] },
    });
    library.setProperty(media(library), 'client_preview', undefined);
    expect('client_preview' in media(library)).toBe(false);
  });

  it('revokes its own preview URL when client_preview is overwritten', () => {
    const { library } = create();
    library.addFile(makeFile('a.png', 'image/png'));
    library.setProperty(media(library), 'client_preview', 'https://x.test/p.png');
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:test/1');
  });

  it('rejects unknown paths and invalid values', () => {
    const { library } = create({ initialValue });
    const object = media(library);
    expect(() => library.setProperty(object, 'attributes.uuid', 'x')).toThrow(TypeError);
    expect(() => library.setProperty(object, 'upload.hasFailed', true)).toThrow(TypeError);
    expect(() => library.setProperty(object, 'attributes.size', -1)).toThrow(TypeError);
    expect(() => library.setProperty(object, 'attributes.name', 1)).toThrow(TypeError);
    expect(() => library.setProperty(object, 'client_preview', 1)).toThrow(TypeError);
    expect(() => library.setProperty(object, 1 as never, 'x')).toThrow(TypeError);
    expect(() => library.setName(object, 1 as never)).toThrow(TypeError);
    expect(() => library.setCustomProperty(object, '', 'x')).toThrow(TypeError);
  });

  it.each(['__proto__', 'constructor', 'prototype'])(
    'rejects the custom-property key %s (AC-22)',
    (key) => {
      const { library } = create({ initialValue });
      expect(() => library.setCustomProperty(media(library), key, { polluted: true })).toThrow(
        TypeError,
      );
      expect(() =>
        library.setProperty(media(library), `attributes.custom_properties.${key}`, 'x'),
      ).toThrow(TypeError);
      expect(({} as Record<string, unknown>).polluted).toBeUndefined();
      expect(Object.prototype).not.toHaveProperty('polluted');
    },
  );

  it('maps validation errors and clears object errors', () => {
    const { library } = create({
      initialValue,
      validationErrors: { images: ['Top'], 'images.u': 'Bad', 'images.u.name': 'Name!' },
    });
    const object = media(library);
    expect(library.getState().topLevelErrors).toEqual(['Top']);
    expect(library.getErrors(object)).toEqual(['Bad']);
    expect(library.getState().validationErrors.u?.name).toEqual(['Name!']);

    library.clearObjectErrors(object);
    expect(library.getErrors(object)).toEqual([]);
    expect(library.getState().validationErrors.u?.name).toEqual(['Name!']);

    const listener = vi.fn();
    library.subscribe(listener);
    library.setValidationErrors({ 'images.0.custom_properties.alt': 'Alt!' });
    expect(library.getState().validationErrors.u?.customProperties.alt).toEqual(['Alt!']);
    library.setValidationErrors({ 'images.0.custom_properties.alt': 'Alt!' });
    expect(listener).toHaveBeenCalledTimes(1);
    library.setValidationErrors(null);
    expect(library.getState().topLevelErrors).toEqual([]);
    expect(() => library.setValidationErrors('x' as never)).toThrow(TypeError);
  });

  it('validates subscribe and unsubscribes', () => {
    const { library } = create({ initialValue });
    const listener = vi.fn();
    const unsubscribe = library.subscribe(listener);
    library.setName(media(library), 'a');
    unsubscribe();
    library.setName(media(library), 'b');
    expect(listener).toHaveBeenCalledOnce();
    expect(() => library.subscribe('x' as never)).toThrow(TypeError);
    library.destroy();
    expect(typeof library.subscribe(listener)).toBe('function');
  });
});
