import { Fragment } from 'react';
import type { MediaLibraryState } from '../../core/index.js';

export interface HiddenFieldsProps {
  name: string;
  mediaState: MediaLibraryState['media'];
}

function scalar(value: unknown): string | undefined {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  return undefined;
}

function customPropertyFields(prefix: string, properties: Record<string, unknown>) {
  return Object.keys(properties).flatMap((key) => {
    const value = properties[key];
    const field = `${prefix}[custom_properties][${key}]`;
    if (Array.isArray(value)) {
      return value.flatMap((entry, index) => {
        const text = scalar(entry);
        return text === undefined
          ? []
          : [<input key={`${key}-${index}`} type="hidden" name={`${field}[]`} value={text} />];
      });
    }
    // Only scalars and arrays of scalars can be expressed as form fields; objects are skipped.
    const text = scalar(value);
    return text === undefined ? [] : [<input key={key} type="hidden" name={field} value={text} />];
  });
}

/**
 * Hidden inputs carrying the value for a traditional (non-AJAX) form submit:
 * `{name}[{uuid}][uuid]`, `[name]`, `[order]` and `[custom_properties][{key}]` (arrays as
 * `[key][]`). Items still uploading or whose upload failed are left out.
 */
export function HiddenFields({ name, mediaState }: HiddenFieldsProps) {
  const settled = mediaState.filter(
    (object) => !object.upload.isUploading && !object.upload.hasFailed,
  );
  return (
    <>
      {settled.map((object, order) => {
        const { uuid } = object.attributes;
        const prefix = `${name}[${uuid}]`;
        return (
          <Fragment key={object.client_id}>
            <input type="hidden" name={`${prefix}[uuid]`} value={uuid} />
            <input type="hidden" name={`${prefix}[name]`} value={object.attributes.name} />
            <input type="hidden" name={`${prefix}[order]`} value={order} />
            {customPropertyFields(prefix, object.attributes.custom_properties)}
          </Fragment>
        );
      })}
    </>
  );
}
