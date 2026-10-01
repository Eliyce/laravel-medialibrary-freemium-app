import { useId, useRef } from 'react';
import type { ChangeEvent, DragEvent } from 'react';
import { describeAccept, resolveTranslations, translate } from '../../core/index.js';
import type { MediaObject, Translations, ValidationRules } from '../../core/index.js';
import { cx } from '../utils.js';
import { DropZone } from './DropZone.js';
import { Icon } from './Icon.js';
import { ProgressBar } from './ProgressBar.js';

export interface UploaderProps {
  add?: boolean | undefined;
  uploadInfo?: MediaObject['upload'] | undefined;
  multiple: boolean;
  validationRules?: Partial<ValidationRules> | undefined;
  maxItems?: number | undefined;
  fileTypeHelpText?: string | undefined;
  onDrop: (event: DragEvent<HTMLDivElement>) => void;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  translations?: Translations | undefined;
}

/**
 * Adds files (or replaces one): a labelled file input plus a keyboard-operable drop zone that
 * opens the file picker on click, Enter or Space.
 */
export function Uploader({
  add = true,
  uploadInfo,
  multiple,
  validationRules,
  maxItems,
  fileTypeHelpText,
  onDrop,
  onChange,
  translations,
}: UploaderProps) {
  const t = translations ?? resolveTranslations();
  const inputRef = useRef<HTMLInputElement>(null);
  const id = useId();
  const labelId = `${id}-label`;
  const helpId = `${id}-help`;
  const accept = validationRules?.accept;

  const label =
    multiple && maxItems !== undefined
      ? translate(t, 'selectOrDragMax', {
          maxItems,
          file: maxItems === 1 ? t.file.singular : t.file.plural,
        })
      : t.selectOrDrag;
  const typeHelp =
    fileTypeHelpText ?? (accept && accept.length > 0 ? describeAccept(accept, t) : undefined);

  return (
    <div className={cx('media-library-uploader', add && 'media-library-uploader-add')}>
      <input
        ref={inputRef}
        type="file"
        className="media-library-input-file"
        tabIndex={-1}
        multiple={multiple}
        accept={accept?.join(',')}
        aria-labelledby={labelId}
        aria-describedby={typeHelp === undefined ? undefined : helpId}
        onChange={onChange}
      />
      <DropZone
        validationAccept={accept}
        onDrop={onDrop}
        onActivate={() => inputRef.current?.click()}
        aria-describedby={typeHelp === undefined ? undefined : helpId}
      >
        {({ hasDragObject, isValid }) => (
          <div
            className={cx(
              'media-library-placeholder',
              hasDragObject &&
                (isValid ? 'media-library-dropzone-drag' : 'media-library-dropzone-invalid'),
            )}
          >
            <Icon icon={add ? 'add' : 'replace'} className="media-library-placeholder-icon" />
            <span className="media-library-help">
              <span id={labelId} className="media-library-help-label">
                {hasDragObject ? (isValid ? t.dropFile : t.fileTypeNotAllowed) : label}
              </span>
              {typeHelp !== undefined && (
                <span id={helpId} className="media-library-help-types">
                  {typeHelp}
                </span>
              )}
            </span>
            {uploadInfo?.isUploading && (
              <ProgressBar progress={uploadInfo.uploadProgress} label={t.uploading} />
            )}
          </div>
        )}
      </DropZone>
    </div>
  );
}
