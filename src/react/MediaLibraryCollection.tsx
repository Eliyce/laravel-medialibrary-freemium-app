import { useEffect, useRef, useState } from 'react';
import type { DragEvent, ReactNode } from 'react';
import type { MediaObject } from '../core/index.js';
import { HiddenFields } from './components/HiddenFields.js';
import { Icon } from './components/Icon.js';
import { IconButton } from './components/IconButton.js';
import { ItemErrors } from './components/ItemErrors.js';
import { ListErrors } from './components/ListErrors.js';
import { NameField } from './components/NameField.js';
import { Thumb } from './components/Thumb.js';
import { Uploader } from './components/Uploader.js';
import type { MediaLibraryComponentProps } from './props.js';
import { useMediaLibrary } from './use-media-library.js';
import type { UseMediaLibraryResult } from './use-media-library.js';
import { cx, formatSize } from './utils.js';

/** What `fieldsView` and `propertiesView` receive for each item. */
export interface MediaLibraryViewProps {
  media: MediaObject;
  getNameInputProps: UseMediaLibraryResult['getNameInputProps'];
  getNameInputErrors: UseMediaLibraryResult['getNameInputErrors'];
  getCustomPropertyInputProps: UseMediaLibraryResult['getCustomPropertyInputProps'];
  getCustomPropertyInputErrors: UseMediaLibraryResult['getCustomPropertyInputErrors'];
}

export interface MediaLibraryCollectionProps extends MediaLibraryComponentProps {
  /** Lets users reorder items (drag handle plus move up and move down buttons). Default true. */
  sortable?: boolean | undefined;
  /** Renders the editable fields of an item. Default: an editable name input. */
  fieldsView?: ((props: MediaLibraryViewProps) => ReactNode) | undefined;
  /** Renders the read-only details of an item. Default: size and extension. */
  propertiesView?: ((props: MediaLibraryViewProps) => ReactNode) | undefined;
}

function moveTo(uuids: string[], from: number, to: number): string[] {
  const next = [...uuids];
  const [moved] = next.splice(from, 1);
  if (moved !== undefined) next.splice(to, 0, moved);
  return next;
}

/** Manage a sortable list of files (with names and custom properties) for a form field. */
export function MediaLibraryCollection({
  sortable = true,
  fieldsView,
  propertiesView,
  editableName = false,
  validationErrors,
  errors,
  fileTypeHelpText,
  setMediaLibrary,
  ...config
}: MediaLibraryCollectionProps) {
  const library = useMediaLibrary({
    ...config,
    multiple: true,
    validationErrors: validationErrors ?? errors,
  });
  const { mediaLibrary, state } = library;
  const t = mediaLibrary.translations;
  const dragged = useRef<string | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);

  useEffect(() => {
    setMediaLibrary?.(mediaLibrary);
  }, [mediaLibrary, setMediaLibrary]);

  const uuids = state.media.map((object) => object.attributes.uuid);
  const move = (from: number, to: number): void => {
    if (to < 0 || to >= uuids.length) return;
    library.setOrder(moveTo(uuids, from, to));
  };

  const handleDragStart = (event: DragEvent<HTMLElement>, object: MediaObject): void => {
    dragged.current = object.client_id;
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', object.attributes.name);
    }
  };
  const handleDragOver = (event: DragEvent<HTMLElement>, object: MediaObject): void => {
    if (dragged.current === null) return;
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
    setDropTarget(object.client_id);
  };
  const handleDrop = (event: DragEvent<HTMLElement>, index: number): void => {
    if (dragged.current === null) return;
    event.preventDefault();
    const from = state.media.findIndex((object) => object.client_id === dragged.current);
    dragged.current = null;
    setDropTarget(null);
    if (from !== -1 && from !== index) move(from, index);
  };
  const handleDragEnd = (): void => {
    dragged.current = null;
    setDropTarget(null);
  };

  return (
    <div
      className={cx(
        'media-library',
        'media-library-multiple',
        'media-library-collection',
        state.media.length === 0 && 'media-library-empty',
      )}
    >
      <ListErrors
        invalidMedia={state.invalidMedia}
        topLevelErrors={state.topLevelErrors}
        onClear={library.clearInvalidMedia}
        translations={t}
      />
      {state.media.length > 0 && (
        <ul className="media-library-items">
          {state.media.map((object, index) => {
            const view: MediaLibraryViewProps = {
              media: object,
              getNameInputProps: library.getNameInputProps,
              getNameInputErrors: library.getNameInputErrors,
              getCustomPropertyInputProps: library.getCustomPropertyInputProps,
              getCustomPropertyInputErrors: library.getCustomPropertyInputErrors,
            };
            const { name } = object.attributes;
            return (
              <li
                key={object.client_id}
                className={cx(
                  'media-library-item',
                  'media-library-item-row',
                  dropTarget === object.client_id && 'media-library-item-drop-target',
                )}
                onDragOver={sortable ? (event) => handleDragOver(event, object) : undefined}
                onDrop={sortable ? (event) => handleDrop(event, index) : undefined}
              >
                {sortable && (
                  <div className="media-library-sort">
                    <span
                      className="media-library-drag-handle"
                      draggable
                      aria-hidden="true"
                      onDragStart={(event) => handleDragStart(event, object)}
                      onDragEnd={handleDragEnd}
                    >
                      <Icon icon="drag" className="media-library-drag-handle-icon" />
                    </span>
                    <IconButton
                      icon="up"
                      label={`${t.moveUp} ${name}`}
                      className="media-library-sort-button"
                      disabled={index === 0}
                      onClick={() => move(index, index - 1)}
                    />
                    <IconButton
                      icon="down"
                      label={`${t.moveDown} ${name}`}
                      className="media-library-sort-button"
                      disabled={index === state.media.length - 1}
                      onClick={() => move(index, index + 1)}
                    />
                  </div>
                )}
                <Thumb
                  uploadInfo={object.upload}
                  validationRules={mediaLibrary.config.validationRules}
                  imgProps={library.getImgProps(object)}
                  onReplace={(file) => library.replaceMedia(object, file)}
                  translations={t}
                />
                <div className="media-library-properties">
                  {propertiesView ? (
                    propertiesView(view)
                  ) : (
                    <>
                      {!editableName && <span className="media-library-name">{name}</span>}
                      <span className="media-library-property">
                        {[formatSize(object.attributes.size), object.attributes.extension]
                          .filter(Boolean)
                          .join(' · ')}
                      </span>
                    </>
                  )}
                </div>
                <div className="media-library-fields">
                  {fieldsView ? (
                    fieldsView(view)
                  ) : (
                    <NameField
                      inputProps={library.getNameInputProps(object)}
                      errors={library.getNameInputErrors(object)}
                      translations={t}
                    />
                  )}
                </div>
                <ItemErrors
                  objectErrors={library.getErrors(object)}
                  onBack={() =>
                    object.upload.hasFailed
                      ? library.removeMedia(object)
                      : library.clearObjectErrors(object)
                  }
                  translations={t}
                />
                <IconButton
                  icon="remove"
                  label={`${t.remove} ${name}`}
                  className="media-library-item-remove"
                  onClick={() => library.removeMedia(object)}
                />
              </li>
            );
          })}
        </ul>
      )}
      <Uploader
        multiple
        validationRules={mediaLibrary.config.validationRules}
        maxItems={mediaLibrary.config.maxItems}
        fileTypeHelpText={fileTypeHelpText}
        onDrop={library.getDropZoneProps().onDrop}
        onChange={library.getFileInputProps().onChange}
        translations={t}
      />
      <HiddenFields name={mediaLibrary.config.name} mediaState={state.media} />
    </div>
  );
}
