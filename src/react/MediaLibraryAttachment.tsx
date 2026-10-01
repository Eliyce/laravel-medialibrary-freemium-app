import { useEffect } from 'react';
import { HiddenFields } from './components/HiddenFields.js';
import { IconButton } from './components/IconButton.js';
import { ItemErrors } from './components/ItemErrors.js';
import { ListErrors } from './components/ListErrors.js';
import { NameField } from './components/NameField.js';
import { Thumb } from './components/Thumb.js';
import { Uploader } from './components/Uploader.js';
import type { MediaLibraryComponentProps } from './props.js';
import { useMediaLibrary } from './use-media-library.js';
import { cx, formatSize } from './utils.js';

export interface MediaLibraryAttachmentProps extends MediaLibraryComponentProps {
  /** Accept more than one file. Default false: a new file replaces the current one. */
  multiple?: boolean | undefined;
}

/** Upload one file (or several with `multiple`) for a form field. */
export function MediaLibraryAttachment({
  multiple = false,
  editableName = false,
  validationErrors,
  errors,
  fileTypeHelpText,
  setMediaLibrary,
  ...config
}: MediaLibraryAttachmentProps) {
  const library = useMediaLibrary({
    ...config,
    multiple,
    validationErrors: validationErrors ?? errors,
  });
  const { mediaLibrary, state } = library;
  const t = mediaLibrary.translations;

  useEffect(() => {
    setMediaLibrary?.(mediaLibrary);
  }, [mediaLibrary, setMediaLibrary]);

  return (
    <div
      className={cx(
        'media-library',
        multiple ? 'media-library-multiple' : 'media-library-single',
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
          {state.media.map((object) => (
            <li key={object.client_id} className="media-library-item">
              <Thumb
                uploadInfo={object.upload}
                validationRules={mediaLibrary.config.validationRules}
                imgProps={library.getImgProps(object)}
                onReplace={(file) => library.replaceMedia(object, file)}
                translations={t}
              />
              <div className="media-library-properties">
                {editableName ? (
                  <NameField
                    inputProps={library.getNameInputProps(object)}
                    errors={library.getNameInputErrors(object)}
                    translations={t}
                  />
                ) : (
                  <span className="media-library-name">{object.attributes.name}</span>
                )}
                <span className="media-library-property">
                  {[formatSize(object.attributes.size), object.attributes.extension]
                    .filter(Boolean)
                    .join(' · ')}
                </span>
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
                label={`${t.remove} ${object.attributes.name}`}
                className="media-library-item-remove"
                onClick={() => library.removeMedia(object)}
              />
            </li>
          ))}
        </ul>
      )}
      <Uploader
        multiple={multiple}
        validationRules={mediaLibrary.config.validationRules}
        maxItems={multiple ? mediaLibrary.config.maxItems : undefined}
        fileTypeHelpText={fileTypeHelpText}
        onDrop={library.getDropZoneProps().onDrop}
        onChange={library.getFileInputProps().onChange}
        translations={t}
      />
      <HiddenFields name={mediaLibrary.config.name} mediaState={state.media} />
    </div>
  );
}
