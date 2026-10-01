import type { ChangeEvent } from 'react';
import { resolveTranslations } from '../../core/index.js';
import type { MediaObject, Translations, ValidationRules } from '../../core/index.js';
import { Icon } from './Icon.js';
import { ProgressBar } from './ProgressBar.js';

export interface ThumbProps {
  uploadInfo: MediaObject['upload'];
  validationRules?: Partial<ValidationRules> | undefined;
  imgProps: {
    src: string | undefined;
    alt: string;
    extension: string | undefined;
  };
  onReplace: (file: File) => void;
  translations?: Translations | undefined;
}

/**
 * An item's thumbnail: the preview image, else its extension. Shows upload progress and offers
 * a labelled file input to replace the file.
 */
export function Thumb({
  uploadInfo,
  validationRules,
  imgProps,
  onReplace,
  translations,
}: ThumbProps) {
  const t = translations ?? resolveTranslations();
  const handleChange = (event: ChangeEvent<HTMLInputElement>): void => {
    const file = event.target.files?.[0];
    if (file) onReplace(file);
    event.target.value = '';
  };
  return (
    <div className="media-library-thumb">
      {imgProps.src ? (
        <img className="media-library-thumb-img" src={imgProps.src} alt={imgProps.alt} />
      ) : (
        <span className="media-library-thumb-extension">
          <span className="media-library-thumb-extension-truncate">{imgProps.extension}</span>
        </span>
      )}
      {uploadInfo.isUploading && (
        <ProgressBar
          progress={uploadInfo.uploadProgress}
          label={`${t.uploading} ${imgProps.alt}`}
        />
      )}
      <label className="media-library-replace">
        <input
          type="file"
          className="media-library-input-file"
          accept={validationRules?.accept?.join(',')}
          aria-label={`${t.replace} ${imgProps.alt}`}
          onChange={handleChange}
        />
        <Icon icon="replace" className="media-library-replace-icon" />
      </label>
    </div>
  );
}
