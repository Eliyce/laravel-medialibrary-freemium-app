import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import type { ChangeEvent, DragEvent } from 'react';
import { MediaLibrary } from '../core/index.js';
import type { MediaLibraryConfig, MediaLibraryState, MediaObject } from '../core/index.js';

/** Hook parameters: the core config plus `initialMedia`, an alias of `initialValue`. */
export interface UseMediaLibraryParams extends MediaLibraryConfig {
  initialMedia?: MediaLibraryConfig['initialValue'];
}

/** Props for an `<img>` showing an item's preview. */
export interface MediaImgProps {
  src: string | undefined;
  alt: string;
  extension: string | undefined;
}

/** Props for a text input bound to an item's name or one of its custom properties. */
export interface MediaTextInputProps {
  value: string;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  'aria-invalid': boolean;
}

/** Props for an `<input type="file">` that adds files (or replaces one item's file). */
export interface MediaFileInputProps {
  type: 'file';
  multiple: boolean;
  accept: string | undefined;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
}

/** Props for an element that accepts dropped files. */
export interface MediaDropZoneProps {
  onDrop: (event: DragEvent<HTMLElement>) => void;
}

export interface UseMediaLibraryResult {
  mediaLibrary: MediaLibrary;
  state: MediaLibraryState;
  isReadyToSubmit: boolean;
  hasUploadsInProgress: boolean;
  getImgProps: (object: MediaObject) => MediaImgProps;
  getNameInputProps: (object: MediaObject) => MediaTextInputProps;
  getNameInputErrors: (object: MediaObject) => string[];
  getCustomPropertyInputProps: (object: MediaObject, key: string) => MediaTextInputProps;
  getCustomPropertyInputErrors: (object: MediaObject, key: string) => string[];
  getFileInputProps: (object?: MediaObject) => MediaFileInputProps;
  getDropZoneProps: (object?: MediaObject) => MediaDropZoneProps;
  addFile: (file: File) => void;
  removeMedia: (object: MediaObject) => void;
  setOrder: (uuids: string[]) => void;
  setProperty: (object: MediaObject, path: string, value: unknown) => void;
  setCustomProperty: (object: MediaObject, key: string, value: unknown) => void;
  replaceMedia: (object: MediaObject, file: File) => void;
  getErrors: (object: MediaObject) => string[];
  clearObjectErrors: (object: MediaObject) => void;
  clearInvalidMedia: () => void;
}

function createLibrary(params: { current: UseMediaLibraryParams }): MediaLibrary {
  const { initialMedia, initialValue, ...config } = params.current;
  // Callbacks go through the ref so the latest props are used without recreating the library.
  return new MediaLibrary({
    ...config,
    initialValue: initialValue ?? initialMedia,
    beforeUpload: (file) => params.current.beforeUpload?.(file),
    afterUpload: (result) => params.current.afterUpload?.(result),
    onChange: (value) => params.current.onChange?.(value),
    onIsReadyToSubmitChange: (ready) => params.current.onIsReadyToSubmitChange?.(ready),
  });
}

function filesOf(list: FileList | null | undefined): File[] {
  return list ? Array.from(list) : [];
}

/**
 * Binds a MediaLibrary to a React component: one instance per mount (destroyed on unmount),
 * state through `useSyncExternalStore`, and `validationErrors` changes pushed into the
 * instance. Safe to render on the server; side effects run in effects only.
 */
export function useMediaLibrary(params: UseMediaLibraryParams): UseMediaLibraryResult {
  const latest = useRef(params);
  useEffect(() => {
    latest.current = params;
  });

  const [mediaLibrary, setMediaLibrary] = useState(() => createLibrary(latest));

  useEffect(() => {
    if (mediaLibrary.isDestroyed) {
      // React StrictMode unmounts and remounts effects once; start again with a fresh instance.
      setMediaLibrary(createLibrary(latest));
      return undefined;
    }
    return () => mediaLibrary.destroy();
  }, [mediaLibrary]);

  const { validationErrors } = params;
  useEffect(() => {
    mediaLibrary.setValidationErrors(validationErrors ?? null);
  }, [mediaLibrary, validationErrors]);

  const subscribe = useCallback(
    (listener: () => void) => mediaLibrary.subscribe(listener),
    [mediaLibrary],
  );
  const getSnapshot = useCallback(() => mediaLibrary.getState(), [mediaLibrary]);
  const state = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  const textInputProps = (
    value: unknown,
    errors: string[],
    update: (value: string) => void,
  ): MediaTextInputProps => ({
    value: value === undefined || value === null ? '' : String(value),
    onChange: (event) => update(event.target.value),
    'aria-invalid': errors.length > 0,
  });

  const getNameInputErrors = (object: MediaObject): string[] =>
    state.validationErrors[object.attributes.uuid]?.name ?? [];
  const getCustomPropertyInputErrors = (object: MediaObject, key: string): string[] =>
    state.validationErrors[object.attributes.uuid]?.customProperties[key] ?? [];

  const addFiles = (files: File[], object?: MediaObject): void => {
    if (object) {
      const [file] = files;
      if (file) mediaLibrary.replaceMedia(object, file);
      return;
    }
    mediaLibrary.addFiles(files);
  };

  return {
    mediaLibrary,
    state,
    isReadyToSubmit:
      state.invalidMedia.length === 0 &&
      state.media.every((object) => !object.upload.isUploading && !object.upload.hasFailed),
    hasUploadsInProgress: state.media.some((object) => object.upload.isUploading),
    getImgProps: (object) => ({
      src: object.client_preview ?? object.attributes.preview_url ?? undefined,
      alt: object.attributes.name,
      extension: object.attributes.extension,
    }),
    getNameInputProps: (object) =>
      textInputProps(object.attributes.name, getNameInputErrors(object), (name) =>
        mediaLibrary.setName(object, name),
      ),
    getNameInputErrors,
    getCustomPropertyInputProps: (object, key) =>
      textInputProps(
        object.attributes.custom_properties[key],
        getCustomPropertyInputErrors(object, key),
        (value) => mediaLibrary.setCustomProperty(object, key, value),
      ),
    getCustomPropertyInputErrors,
    getFileInputProps: (object) => ({
      type: 'file',
      multiple: object === undefined && mediaLibrary.config.multiple,
      accept: mediaLibrary.config.validationRules.accept?.join(','),
      onChange: (event) => {
        addFiles(filesOf(event.target.files), object);
        // Reset so picking the same file again still fires a change event.
        event.target.value = '';
      },
    }),
    getDropZoneProps: (object) => ({
      onDrop: (event) => addFiles(filesOf(event.dataTransfer?.files), object),
    }),
    addFile: (file) => mediaLibrary.addFile(file),
    removeMedia: (object) => mediaLibrary.removeMedia(object),
    setOrder: (uuids) => mediaLibrary.setOrder(uuids),
    setProperty: (object, path, value) => mediaLibrary.setProperty(object, path, value),
    setCustomProperty: (object, key, value) => mediaLibrary.setCustomProperty(object, key, value),
    replaceMedia: (object, file) => mediaLibrary.replaceMedia(object, file),
    getErrors: (object) => mediaLibrary.getErrors(object),
    clearObjectErrors: (object) => mediaLibrary.clearObjectErrors(object),
    clearInvalidMedia: () => mediaLibrary.clearInvalidMedia(),
  };
}
