import { useId } from 'react';
import type { Translations } from '../../core/index.js';
import type { MediaTextInputProps } from '../use-media-library.js';

export interface NameFieldProps {
  inputProps: MediaTextInputProps;
  errors: string[];
  translations: Translations;
}

/** The labelled, editable name input of one item, with its backend errors. */
export function NameField({ inputProps, errors, translations }: NameFieldProps) {
  const id = useId();
  const errorId = `${id}-errors`;
  return (
    <div className="media-library-field">
      <label className="media-library-label" htmlFor={id}>
        {translations.name}
      </label>
      <input
        id={id}
        type="text"
        className="media-library-input"
        aria-describedby={errors.length > 0 ? errorId : undefined}
        {...inputProps}
      />
      {errors.length > 0 && (
        <p id={errorId} className="media-library-field-error" role="alert">
          {errors.join(' ')}
        </p>
      )}
    </div>
  );
}
