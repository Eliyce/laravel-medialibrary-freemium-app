import type { MouseEvent } from 'react';
import { resolveTranslations } from '../../core/index.js';
import type { Translations } from '../../core/index.js';
import { Icon } from './Icon.js';

export interface ItemErrorsProps {
  objectErrors: string[];
  onBack?: ((event: MouseEvent<HTMLButtonElement>) => void) | undefined;
  translations?: Translations | undefined;
}

/** The errors of one media item, announced through `role="alert"`. Renders nothing when empty. */
export function ItemErrors({ objectErrors, onBack, translations }: ItemErrorsProps) {
  if (objectErrors.length === 0) return null;
  const t = translations ?? resolveTranslations();
  return (
    <div className="media-library-item-errors" role="alert">
      <Icon icon="error" className="media-library-item-errors-icon" />
      <ul className="media-library-item-errors-list">
        {objectErrors.map((error, index) => (
          <li key={index} className="media-library-item-error">
            {error}
          </li>
        ))}
      </ul>
      {onBack && (
        <button type="button" className="media-library-item-errors-back" onClick={onBack}>
          {t.goBack}
        </button>
      )}
    </div>
  );
}
