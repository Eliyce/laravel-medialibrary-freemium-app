import { mapValidationErrors } from './errors.js';
import { resolveTranslations, translate } from './translations.js';
import type {
  AfterUploadResult,
  FileLike,
  MediaLibraryConfig,
  MediaLibraryState,
  MediaObject,
  MediaValue,
  Translations,
  UploadTransport,
  ValidationErrorBag,
  ValidationRules,
  ValueItem,
} from './types.js';
import { createXhrTransport, isAbortError, uploadFile } from './upload.js';
import { generateUuid } from './uuid.js';
import { assertValidationRules, validateFile } from './validation.js';
import { copyCustomProperties, createMap, isRecord, isSafeKey, normalizeValue } from './value.js';

/** The configuration after defaults and validation. */
export interface ResolvedMediaLibraryConfig {
  name: string;
  routePrefix: string;
  uploadDomain: string | undefined;
  validationRules: ValidationRules;
  multiple: boolean;
  /** Always 1 in single mode; undefined means unlimited. */
  maxItems: number | undefined;
  vapor: boolean;
  vaporSignedStorageUrl: string;
  maxSizeForPreviewInBytes: number;
  translations: Translations;
}

const DEFAULT_MAX_SIZE_FOR_PREVIEW_IN_BYTES = 5 * 1024 * 1024;
const ATTRIBUTE_CHECKS: Record<string, (value: unknown) => boolean> = {
  name: (value) => typeof value === 'string',
  file_name: (value) => typeof value === 'string',
  mime_type: (value) => typeof value === 'string',
  extension: (value) => typeof value === 'string',
  preview_url: (value) => typeof value === 'string' || value === null,
  original_url: (value) => typeof value === 'string' || value === null,
  size: (value) => typeof value === 'number' && Number.isFinite(value) && value >= 0,
};
const CALLBACK_OPTIONS = [
  'beforeUpload',
  'afterUpload',
  'onChange',
  'onIsReadyToSubmitChange',
  'fetch',
] as const;

function optionalString(config: Record<string, unknown>, key: string): string | undefined {
  const value = config[key];
  if (value === undefined) return undefined;
  if (typeof value !== 'string') throw new TypeError(`${key} must be a string`);
  return value;
}

function optionalBoolean(config: Record<string, unknown>, key: string): boolean | undefined {
  const value = config[key];
  if (value === undefined) return undefined;
  if (typeof value !== 'boolean') throw new TypeError(`${key} must be a boolean`);
  return value;
}

function resolveConfig(config: MediaLibraryConfig): ResolvedMediaLibraryConfig {
  if (!isRecord(config)) throw new TypeError('MediaLibrary expects a config object');
  const options = config as unknown as Record<string, unknown>;

  if (typeof config.name !== 'string' || config.name.trim() === '') {
    throw new TypeError('The `name` option must be a non-empty string');
  }
  for (const key of CALLBACK_OPTIONS) {
    if (options[key] !== undefined && typeof options[key] !== 'function') {
      throw new TypeError(`The \`${key}\` option must be a function`);
    }
  }

  const routePrefix = optionalString(options, 'routePrefix') ?? 'media-library-pro';
  if (routePrefix.trim() === '') throw new TypeError('The `routePrefix` option must not be empty');
  const uploadDomain = optionalString(options, 'uploadDomain') || undefined;
  const multiple = optionalBoolean(options, 'multiple') ?? true;
  const vapor = optionalBoolean(options, 'vapor') ?? false;
  const vaporSignedStorageUrl =
    optionalString(options, 'vaporSignedStorageUrl') ?? 'vapor/signed-storage-url';

  let maxItems: number | undefined;
  if (config.maxItems !== undefined) {
    if (typeof config.maxItems !== 'number') throw new TypeError('`maxItems` must be a number');
    if (!Number.isInteger(config.maxItems) || config.maxItems < 1) {
      throw new RangeError('`maxItems` must be an integer of at least 1');
    }
    maxItems = config.maxItems;
  }
  if (!multiple) maxItems = 1;

  let maxSizeForPreviewInBytes = DEFAULT_MAX_SIZE_FOR_PREVIEW_IN_BYTES;
  if (config.maxSizeForPreviewInBytes !== undefined) {
    if (typeof config.maxSizeForPreviewInBytes !== 'number') {
      throw new TypeError('`maxSizeForPreviewInBytes` must be a number');
    }
    if (!Number.isFinite(config.maxSizeForPreviewInBytes) || config.maxSizeForPreviewInBytes < 0) {
      throw new RangeError('`maxSizeForPreviewInBytes` must be a finite number of at least 0');
    }
    maxSizeForPreviewInBytes = config.maxSizeForPreviewInBytes;
  }

  assertValidationRules(config.validationRules);
  const validationRules: ValidationRules = { ...config.validationRules };
  if (validationRules.accept) validationRules.accept = [...validationRules.accept];

  return {
    name: config.name,
    routePrefix,
    uploadDomain,
    validationRules,
    multiple,
    maxItems,
    vapor,
    vaporSignedStorageUrl,
    maxSizeForPreviewInBytes,
    translations: resolveTranslations(config.translations),
  };
}

function assertFile(file: unknown): asserts file is File {
  if (
    !isRecord(file) ||
    typeof file.name !== 'string' ||
    typeof file.size !== 'number' ||
    typeof file.type !== 'string'
  ) {
    throw new TypeError('Expected a File');
  }
}

function assertMediaObject(object: unknown): asserts object is MediaObject {
  if (!isRecord(object) || typeof object.client_id !== 'string' || !isRecord(object.attributes)) {
    throw new TypeError('Expected a media object from the library state');
  }
}

function splitFileName(fileName: string): { base: string; extension: string } {
  const dot = fileName.lastIndexOf('.');
  if (dot <= 0) return { base: fileName, extension: '' };
  return { base: fileName.slice(0, dot), extension: fileName.slice(dot + 1).toLowerCase() };
}

function isSettled(object: MediaObject): boolean {
  return !object.upload.isUploading && !object.upload.hasFailed;
}

function errorMessage(error: unknown): string {
  if (error instanceof Error && error.message !== '') return error.message;
  if (typeof error === 'string' && error !== '') return error;
  return String(error);
}

/**
 * Framework-agnostic observable store behind every media component: it validates files,
 * uploads them (directly or through Vapor), tracks progress and errors, and produces the
 * uuid-keyed form value. It touches no DOM API until a method needs one.
 */
export class MediaLibrary {
  /** The configuration after defaults and validation. */
  readonly config: Readonly<ResolvedMediaLibraryConfig>;

  #state: MediaLibraryState;
  #listeners = new Set<() => void>();
  #uploads = new Map<string, AbortController>();
  #objectUrls = new Map<string, string>();
  #transport: UploadTransport;
  #callbacks: {
    [K in 'beforeUpload' | 'afterUpload' | 'onChange' | 'onIsReadyToSubmitChange']:
      MediaLibraryConfig[K] | undefined;
  };
  #errorBagKey = 'null';
  #destroyed = false;
  #nextClientId = 0;
  #lastReady: boolean;
  #lastValueKey: string;
  #valueCache: { state: MediaLibraryState; value: MediaValue } | null = null;

  constructor(config: MediaLibraryConfig) {
    this.config = Object.freeze(resolveConfig(config));
    this.#transport = config.fetch ?? createXhrTransport();
    this.#callbacks = {
      beforeUpload: config.beforeUpload,
      afterUpload: config.afterUpload,
      onChange: config.onChange,
      onIsReadyToSubmitChange: config.onIsReadyToSubmitChange,
    };

    const initial = normalizeValue(config.initialValue);
    this.#state = {
      media: Object.keys(initial).map((uuid) => ({
        attributes: initial[uuid] as ValueItem,
        upload: { hasFailed: false, uploadProgress: 100, isUploading: false },
        client_validation_errors: [],
        client_id: this.#createClientId(),
      })),
      invalidMedia: [],
      validationErrors: createMap(),
      topLevelErrors: [],
    };
    if (config.validationErrors !== undefined && config.validationErrors !== null) {
      this.#applyValidationErrors(config.validationErrors);
    }
    this.#lastReady = this.isReadyToSubmit();
    this.#lastValueKey = JSON.stringify(this.getValue());
  }

  /** The effective translations (defaults, then the global ones, then the config ones). */
  get translations(): Translations {
    return this.config.translations;
  }

  /** True once `destroy()` has run. */
  get isDestroyed(): boolean {
    return this.#destroyed;
  }

  /** The current state. The object is replaced, never mutated, on every change. */
  getState(): MediaLibraryState {
    return this.#state;
  }

  /** Registers a listener called after every state change; returns the unsubscribe function. */
  subscribe(listener: () => void): () => void {
    if (typeof listener !== 'function') throw new TypeError('subscribe() expects a function');
    if (this.#destroyed) return () => undefined;
    this.#listeners.add(listener);
    return () => {
      this.#listeners.delete(listener);
    };
  }

  /** Validates and uploads one file. Invalid files go to `state.invalidMedia` and never upload. */
  addFile(file: File): void {
    assertFile(file);
    if (this.#destroyed) return;

    const { validationRules, multiple, maxItems, translations } = this.config;
    const errors = validateFile(file, validationRules, translations);
    if (errors.length > 0) {
      this.#addInvalid(file, errors);
      return;
    }
    if (multiple && maxItems !== undefined && this.#state.media.length >= maxItems) {
      const label = maxItems === 1 ? translations.file.singular : translations.file.plural;
      this.#addInvalid(file, [
        translate(translations, 'selectOrDragMax', { maxItems, file: label }),
      ]);
      return;
    }

    const object = this.#createObject(file, this.#createClientId(), createMap());
    let media: MediaObject[];
    if (multiple) {
      media = [...this.#state.media, object];
    } else {
      this.#state.media.forEach((previous) => this.#release(previous.client_id));
      media = [object];
    }
    this.#setState({ ...this.#state, media });
    void this.#upload(object.client_id, object.attributes.uuid, file);
  }

  /** Adds several files; in single mode only the first one is used. */
  addFiles(files: Iterable<File> | ArrayLike<File>): void {
    if (files === null || typeof files !== 'object') {
      throw new TypeError('addFiles() expects a FileList or an array of files');
    }
    const list = Array.from(files);
    list.forEach(assertFile);
    (this.config.multiple ? list : list.slice(0, 1)).forEach((file) => this.addFile(file));
  }

  /** Removes an item, aborting its upload and revoking its preview URL. */
  removeMedia(object: MediaObject): void {
    assertMediaObject(object);
    if (this.#destroyed || !this.#find(object)) return;
    this.#release(object.client_id);
    this.#setState({
      ...this.#state,
      media: this.#state.media.filter((item) => item.client_id !== object.client_id),
    });
  }

  /**
   * Replaces an item's file: the item keeps its position and custom properties and the new file
   * uploads under a fresh uuid. An invalid file goes to `state.invalidMedia` and the item stays.
   */
  replaceMedia(object: MediaObject, file: File): void {
    assertMediaObject(object);
    assertFile(file);
    if (this.#destroyed) return;
    const current = this.#find(object);
    if (!current) return;

    const errors = validateFile(file, this.config.validationRules, this.config.translations);
    if (errors.length > 0) {
      this.#addInvalid(file, errors);
      return;
    }

    this.#release(current.client_id);
    const replacement = this.#createObject(
      file,
      current.client_id,
      copyCustomProperties(current.attributes.custom_properties),
    );
    this.#replaceObject(current.client_id, () => replacement);
    void this.#upload(replacement.client_id, replacement.attributes.uuid, file);
  }

  /** Reorders items by uuid; uuids not listed keep their relative order after the listed ones. */
  setOrder(uuids: string[]): void {
    if (!Array.isArray(uuids) || uuids.some((uuid) => typeof uuid !== 'string')) {
      throw new TypeError('setOrder() expects an array of uuids');
    }
    if (this.#destroyed) return;
    const byUuid = new Map(this.#state.media.map((item) => [item.attributes.uuid, item]));
    const ordered: MediaObject[] = [];
    for (const uuid of uuids) {
      const item = byUuid.get(uuid);
      if (item && !ordered.includes(item)) ordered.push(item);
    }
    const rest = this.#state.media.filter((item) => !ordered.includes(item));
    this.#setState({ ...this.#state, media: [...ordered, ...rest] });
  }

  /**
   * Sets one property of an item. Allowed paths: `client_preview`, `attributes.<field>` for
   * name, file_name, preview_url, original_url, size, mime_type and extension, and
   * `attributes.custom_properties.<key>`.
   */
  setProperty(object: MediaObject, path: string, value: unknown): void {
    assertMediaObject(object);
    if (typeof path !== 'string') throw new TypeError('setProperty() expects a string path');
    const segments = path.split('.');
    if (
      segments.length === 3 &&
      segments[0] === 'attributes' &&
      segments[1] === 'custom_properties'
    ) {
      this.setCustomProperty(object, segments[2] as string, value);
      return;
    }
    if (path === 'client_preview') {
      if (value !== undefined && typeof value !== 'string') {
        throw new TypeError('client_preview must be a string URL');
      }
      this.#updateObject(object, (item) => {
        const owned = this.#objectUrls.get(item.client_id);
        if (owned !== undefined && owned !== value) this.#revoke(item.client_id);
        const next: MediaObject = { ...item };
        if (value === undefined) delete next.client_preview;
        else next.client_preview = value;
        return next;
      });
      return;
    }
    const field = segments.length === 2 && segments[0] === 'attributes' ? segments[1] : undefined;
    const check =
      field !== undefined && Object.hasOwn(ATTRIBUTE_CHECKS, field)
        ? ATTRIBUTE_CHECKS[field]
        : undefined;
    if (field === undefined || check === undefined) {
      throw new TypeError(`setProperty() cannot set "${path}"`);
    }
    if (!check(value)) throw new TypeError(`setProperty() got an invalid value for "${path}"`);
    this.#updateObject(object, (item) => ({
      ...item,
      attributes: { ...item.attributes, [field]: value },
    }));
  }

  /** Sets one custom property. Keys `__proto__`, `constructor` and `prototype` throw a TypeError. */
  setCustomProperty(object: MediaObject, key: string, value: unknown): void {
    assertMediaObject(object);
    if (typeof key !== 'string' || key === '') {
      throw new TypeError('Custom property keys must be non-empty strings');
    }
    if (!isSafeKey(key)) throw new TypeError(`"${key}" cannot be used as a custom property key`);
    this.#updateObject(object, (item) => {
      const customProperties = copyCustomProperties(item.attributes.custom_properties);
      customProperties[key] = value;
      return { ...item, attributes: { ...item.attributes, custom_properties: customProperties } };
    });
  }

  /** Renames an item. */
  setName(object: MediaObject, name: string): void {
    assertMediaObject(object);
    if (typeof name !== 'string') throw new TypeError('setName() expects a string');
    this.#updateObject(object, (item) => ({ ...item, attributes: { ...item.attributes, name } }));
  }

  /** Client errors plus backend object errors for one item. */
  getErrors(object: MediaObject): string[] {
    assertMediaObject(object);
    const current = this.#find(object) ?? object;
    const backend = this.#state.validationErrors[current.attributes.uuid]?.object ?? [];
    return [...current.client_validation_errors, ...backend];
  }

  /** Clears the client and backend object errors of one item. */
  clearObjectErrors(object: MediaObject): void {
    assertMediaObject(object);
    const current = this.#find(object);
    if (this.#destroyed || !current) return;
    const { uuid } = current.attributes;
    const validationErrors = createMap<MediaLibraryState['validationErrors'][string]>();
    for (const key of Object.keys(this.#state.validationErrors)) {
      const entry = this.#state.validationErrors[key];
      if (!entry) continue;
      validationErrors[key] = key === uuid ? { ...entry, object: [] } : entry;
    }
    this.#setState({
      ...this.#state,
      validationErrors,
      media: this.#state.media.map((item) =>
        item.client_id === current.client_id ? { ...item, client_validation_errors: [] } : item,
      ),
    });
  }

  /** Empties `state.invalidMedia`. */
  clearInvalidMedia(): void {
    if (this.#destroyed || this.#state.invalidMedia.length === 0) return;
    this.#setState({ ...this.#state, invalidMedia: [] });
  }

  /** Maps a Laravel error bag onto the items (see `mapValidationErrors`). */
  setValidationErrors(errors: ValidationErrorBag | null | undefined): void {
    if (errors !== undefined && errors !== null && !isRecord(errors)) {
      throw new TypeError('setValidationErrors() expects an error bag object');
    }
    if (this.#destroyed) return;
    if (JSON.stringify(errors ?? null) === this.#errorBagKey) return;
    this.#applyValidationErrors(errors ?? null);
    this.#emit();
  }

  /** True when no upload is running, none failed and no file was rejected client-side. */
  isReadyToSubmit(): boolean {
    const { media, invalidMedia } = this.#state;
    return invalidMedia.length === 0 && media.every(isSettled);
  }

  hasUploadsInProgress(): boolean {
    return this.#state.media.some((item) => item.upload.isUploading);
  }

  /** The form value: uploaded items keyed by uuid in display order with zero-based `order`. */
  getValue(): MediaValue {
    if (this.#valueCache?.state === this.#state) return this.#valueCache.value;
    const value = createMap<ValueItem>();
    this.#state.media.filter(isSettled).forEach((item, order) => {
      value[item.attributes.uuid] = {
        ...item.attributes,
        order,
        custom_properties: copyCustomProperties(item.attributes.custom_properties),
      };
    });
    this.#valueCache = { state: this.#state, value };
    return value;
  }

  /** Aborts every upload, revokes every preview URL and stops all notifications. */
  destroy(): void {
    if (this.#destroyed) return;
    this.#destroyed = true;
    for (const controller of this.#uploads.values()) controller.abort();
    this.#uploads.clear();
    for (const clientId of [...this.#objectUrls.keys()]) this.#revoke(clientId);
    this.#listeners.clear();
  }

  #createClientId(): string {
    this.#nextClientId += 1;
    return `media-${this.#nextClientId}`;
  }

  #createObject(
    file: File,
    clientId: string,
    customProperties: Record<string, unknown>,
  ): MediaObject {
    const { base, extension } = splitFileName(file.name);
    const attributes: ValueItem = {
      uuid: generateUuid(),
      name: base,
      file_name: file.name,
      size: file.size,
      mime_type: file.type,
      order: 0,
      custom_properties: customProperties,
    };
    if (extension !== '') attributes.extension = extension;
    const object: MediaObject = {
      attributes,
      upload: { hasFailed: false, uploadProgress: 0, isUploading: true },
      client_validation_errors: [],
      client_id: clientId,
    };
    const preview = this.#createPreview(file, clientId);
    if (preview !== undefined) object.client_preview = preview;
    return object;
  }

  #createPreview(file: File, clientId: string): string | undefined {
    if (!file.type.startsWith('image/') || file.size > this.config.maxSizeForPreviewInBytes) {
      return undefined;
    }
    if (typeof URL === 'undefined' || typeof URL.createObjectURL !== 'function') return undefined;
    const url = URL.createObjectURL(file);
    this.#objectUrls.set(clientId, url);
    return url;
  }

  #revoke(clientId: string): void {
    const url = this.#objectUrls.get(clientId);
    if (url === undefined) return;
    this.#objectUrls.delete(clientId);
    if (typeof URL !== 'undefined' && typeof URL.revokeObjectURL === 'function') {
      URL.revokeObjectURL(url);
    }
  }

  /** Aborts an item's upload and revokes its preview URL. */
  #release(clientId: string): void {
    this.#uploads.get(clientId)?.abort();
    this.#uploads.delete(clientId);
    this.#revoke(clientId);
  }

  #find(object: MediaObject): MediaObject | undefined {
    return this.#state.media.find((item) => item.client_id === object.client_id);
  }

  #addInvalid(file: FileLike, errors: string[]): void {
    this.#setState({
      ...this.#state,
      invalidMedia: [...this.#state.invalidMedia, { file: { name: file.name }, errors }],
    });
  }

  #replaceObject(clientId: string, update: (item: MediaObject) => MediaObject): void {
    this.#setState({
      ...this.#state,
      media: this.#state.media.map((item) => (item.client_id === clientId ? update(item) : item)),
    });
  }

  #updateObject(object: MediaObject, update: (item: MediaObject) => MediaObject): void {
    if (this.#destroyed || !this.#find(object)) return;
    this.#replaceObject(object.client_id, update);
  }

  #applyValidationErrors(errors: ValidationErrorBag | null): void {
    const uuids = this.#state.media.filter(isSettled).map((item) => item.attributes.uuid);
    const mapped = mapValidationErrors(errors, this.config.name, uuids);
    this.#errorBagKey = JSON.stringify(errors);
    this.#state = {
      ...this.#state,
      validationErrors: mapped.validationErrors,
      topLevelErrors: mapped.topLevelErrors,
    };
  }

  #setState(state: MediaLibraryState): void {
    if (this.#destroyed) return;
    this.#state = state;
    this.#emit();
  }

  #emit(): void {
    if (this.#destroyed) return;
    for (const listener of [...this.#listeners]) listener();

    const ready = this.isReadyToSubmit();
    if (ready !== this.#lastReady) {
      this.#lastReady = ready;
      this.#callbacks.onIsReadyToSubmitChange?.(ready);
    }
    const value = this.getValue();
    const valueKey = JSON.stringify(value);
    if (valueKey !== this.#lastValueKey) {
      this.#lastValueKey = valueKey;
      this.#callbacks.onChange?.(value);
    }
  }

  #isCurrentUpload(clientId: string, uuid: string): boolean {
    if (this.#destroyed) return false;
    return this.#state.media.some(
      (item) => item.client_id === clientId && item.attributes.uuid === uuid,
    );
  }

  #finishUpload(clientId: string, uuid: string, update: (item: MediaObject) => MediaObject): void {
    this.#replaceObject(clientId, (item) => (item.attributes.uuid === uuid ? update(item) : item));
  }

  #fail(clientId: string, uuid: string, result: AfterUploadResult): void {
    const errors = result.errors ?? [];
    this.#finishUpload(clientId, uuid, (item) => ({
      ...item,
      upload: { ...item.upload, hasFailed: true, isUploading: false },
      client_validation_errors: errors,
    }));
    this.#callbacks.afterUpload?.(result);
  }

  async #upload(clientId: string, uuid: string, file: File): Promise<void> {
    const controller = new AbortController();
    this.#uploads.set(clientId, controller);
    const done = (): void => {
      if (this.#uploads.get(clientId) === controller) this.#uploads.delete(clientId);
    };

    if (this.#callbacks.beforeUpload) {
      try {
        await this.#callbacks.beforeUpload(file);
      } catch (error) {
        done();
        if (controller.signal.aborted || !this.#isCurrentUpload(clientId, uuid)) return;
        this.#fail(clientId, uuid, {
          success: false,
          uuid,
          errors: [errorMessage(error)],
          cause: error,
        });
        return;
      }
      if (controller.signal.aborted || !this.#isCurrentUpload(clientId, uuid)) {
        done();
        return;
      }
    }

    const current = this.#state.media.find((item) => item.client_id === clientId);
    const sentName = current?.attributes.name ?? file.name;
    try {
      const outcome = await uploadFile({
        file,
        uuid,
        name: sentName,
        routePrefix: this.config.routePrefix,
        uploadDomain: this.config.uploadDomain,
        vapor: this.config.vapor,
        vaporSignedStorageUrl: this.config.vaporSignedStorageUrl,
        transport: this.#transport,
        translations: this.config.translations,
        signal: controller.signal,
        onProgress: (percent) => {
          if (!this.#isCurrentUpload(clientId, uuid)) return;
          const uploadProgress = Math.min(100, Math.max(0, Math.round(percent)));
          this.#finishUpload(clientId, uuid, (item) => ({
            ...item,
            upload: { ...item.upload, uploadProgress },
          }));
        },
      });
      done();
      if (!this.#isCurrentUpload(clientId, uuid)) return;

      if (outcome.ok) {
        // The client uuid stays authoritative; the server echoes it back.
        const fields = { ...outcome.response };
        delete fields.uuid;
        this.#finishUpload(clientId, uuid, (item) => {
          // The server echoes the name sent at upload start; a rename made since then wins.
          const merged = { ...fields };
          if (item.attributes.name !== sentName) delete merged.name;
          return {
            ...item,
            attributes: { ...item.attributes, ...merged, uuid },
            upload: { hasFailed: false, uploadProgress: 100, isUploading: false },
            client_validation_errors: [],
          };
        });
        this.#callbacks.afterUpload?.({ success: true, uuid });
        return;
      }
      const result: AfterUploadResult = { success: false, uuid, errors: outcome.errors };
      if (outcome.status !== undefined) result.status = outcome.status;
      if (outcome.cause !== undefined) result.cause = outcome.cause;
      this.#fail(clientId, uuid, result);
    } catch (error) {
      done();
      // An abort we caused (remove, replace, destroy) is expected and needs no error state.
      if (controller.signal.aborted || !this.#isCurrentUpload(clientId, uuid)) return;
      const result: AfterUploadResult = {
        success: false,
        uuid,
        errors: [this.config.translations.somethingWentWrong],
      };
      if (!isAbortError(error)) result.cause = error;
      this.#fail(clientId, uuid, result);
    }
  }
}
