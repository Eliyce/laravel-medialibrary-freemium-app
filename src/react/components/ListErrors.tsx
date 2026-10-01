import { resolveTranslations } from '../../core/index.js';
import type { MediaLibraryState, Translations } from '../../core/index.js';
import { Icon } from './Icon.js';
import { IconButton } from './IconButton.js';

export interface ListErrorsProps {
  invalidMedia: MediaLibraryState['invalidMedia'];
  topLevelErrors?: string[] | undefined;
  onClear: () => void;
  translations?: Translations | undefined;
}

/**
 * Component-level errors: backend errors that belong to no single item and files rejected by
 * client validation. Announced through `role="alert"`; renders nothing when there are none.
 */
export function ListErrors({
  invalidMedia,
  topLevelErrors = [],
  onClear,
  translations,
}: ListErrorsProps) {
  if (invalidMedia.length === 0 && topLevelErrors.length === 0) return null;
  const t = translations ?? resolveTranslations();
  return (
    <div className="media-library-listerrors" role="alert">
      <ul className="media-library-listerrors-list">
        {topLevelErrors.map((error, index) => (
          <li key={`top-${index}`} className="media-library-listerror">
            <Icon icon="error" className="media-library-listerror-icon" />
            <span className="media-library-listerror-text">{error}</span>
          </li>
        ))}
        {invalidMedia.map((invalid, index) => (
          <li key={`invalid-${index}`} className="media-library-listerror">
            <Icon icon="error" className="media-library-listerror-icon" />
            {invalid.file && (
              <span className="media-library-listerror-title">{invalid.file.name}</span>
            )}
            <span className="media-library-listerror-text">{invalid.errors.join(' ')}</span>
          </li>
        ))}
      </ul>
      {invalidMedia.length > 0 && (
        <IconButton
          icon="remove"
          label={t.remove}
          className="media-library-listerrors-clear"
          onClick={onClear}
        />
      )}
    </div>
  );
}
