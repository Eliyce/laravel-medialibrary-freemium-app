import type { MappedValidationErrors, MediaObjectErrors } from './types.js';
import { createMap, isRecord, isSafeKey } from './value.js';

/** Result of mapping a Laravel error bag onto the items of one component. */
export interface MappedErrors {
  topLevelErrors: string[];
  validationErrors: MappedValidationErrors;
}

function toMessages(value: unknown): string[] {
  if (typeof value === 'string') return [value];
  if (Array.isArray(value))
    return value.filter((entry): entry is string => typeof entry === 'string');
  return [];
}

function errorsFor(map: MappedValidationErrors, uuid: string): MediaObjectErrors {
  let entry = map[uuid];
  if (!entry) {
    entry = { object: [], name: [], customProperties: createMap<string[]>() };
    map[uuid] = entry;
  }
  return entry;
}

/** Laravel reports errors with dot keys, so `post[images]` is matched as `post.images`. */
function toDotNotation(name: string): string {
  return name.replace(/\[([^\]]*)\]/g, '.$1');
}

/**
 * Maps a Laravel error bag (values are a string or string[]) onto the items of the component
 * named `name`, given the item uuids in display order:
 *
 * - `name`, and `name.*` keys that match no item, go to `topLevelErrors`;
 * - `name.<uuid>` and `name.<uuid>.uuid` go to that item's object errors;
 * - `name.<uuid>.name` goes to its name errors;
 * - `name.<uuid>.custom_properties.<key>` goes to its custom-property errors;
 * - a numeric segment `name.<index>` addresses the item at that zero-based position.
 *
 * A bracketed component name such as `post[images]` is matched in dot notation (`post.images`).
 * Keys for other fields are ignored, and segments such as `__proto__` are dropped.
 */
export function mapValidationErrors(
  errors: Record<string, string | string[]> | null | undefined,
  name: string,
  uuids: readonly string[],
): MappedErrors {
  if (typeof name !== 'string' || name === '') {
    throw new TypeError('mapValidationErrors() needs the component name');
  }
  if (!Array.isArray(uuids)) {
    throw new TypeError('mapValidationErrors() needs the item uuids as an array');
  }
  const result: MappedErrors = { topLevelErrors: [], validationErrors: createMap() };
  if (errors === undefined || errors === null) return result;
  if (!isRecord(errors)) throw new TypeError('validationErrors must be an object');

  const known = new Set(uuids);
  const dotName = toDotNotation(name);
  const prefix = `${dotName}.`;

  for (const key of Object.keys(errors)) {
    const messages = toMessages(errors[key]);
    if (messages.length === 0) continue;

    if (key === dotName) {
      result.topLevelErrors.push(...messages);
      continue;
    }
    if (!key.startsWith(prefix)) continue;

    const segments = key.slice(prefix.length).split('.');
    if (!segments.every(isSafeKey)) continue;

    const [target = '', field, property, ...rest] = segments;
    let uuid: string | undefined;
    if (known.has(target)) uuid = target;
    else if (/^\d+$/.test(target)) uuid = uuids[Number(target)];

    if (uuid === undefined) {
      result.topLevelErrors.push(...messages);
      continue;
    }

    const entry = errorsFor(result.validationErrors, uuid);
    if (field === 'name' && property === undefined) {
      entry.name.push(...messages);
    } else if (field === 'custom_properties' && property !== undefined && rest.length === 0) {
      const list = entry.customProperties[property] ?? [];
      list.push(...messages);
      entry.customProperties[property] = list;
    } else {
      entry.object.push(...messages);
    }
  }
  return result;
}
