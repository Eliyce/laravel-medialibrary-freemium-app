import type { MediaValue, ValueItem, ValueItemInput } from './types.js';

const UNSAFE_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

/** False for keys that could reach an object prototype (`__proto__`, `constructor`, `prototype`). */
export function isSafeKey(key: string): boolean {
  return !UNSAFE_KEYS.has(key);
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Creates an object without a prototype, for maps keyed by user-supplied strings. */
export function createMap<T>(): Record<string, T> {
  return Object.create(null) as Record<string, T>;
}

/** Copies custom properties into a null-prototype object, dropping unsafe keys. */
export function copyCustomProperties(source: unknown): Record<string, unknown> {
  const result = createMap<unknown>();
  if (source === undefined || source === null) return result;
  if (!isRecord(source)) {
    throw new TypeError('custom_properties must be an object');
  }
  for (const key of Object.keys(source)) {
    if (isSafeKey(key)) result[key] = source[key];
  }
  return result;
}

const OPTIONAL_STRING_FIELDS = ['file_name', 'mime_type', 'extension'] as const;
const OPTIONAL_URL_FIELDS = ['preview_url', 'original_url'] as const;

function normalizeItem(input: unknown, position: number): { item: ValueItem; sortKey: number } {
  if (!isRecord(input)) {
    throw new TypeError(`initialValue item ${position} must be an object`);
  }
  const { uuid } = input;
  if (typeof uuid !== 'string' || uuid === '') {
    throw new TypeError(`initialValue item ${position} needs a non-empty string uuid`);
  }
  const name = input.name ?? input.file_name ?? '';
  if (typeof name !== 'string') {
    throw new TypeError(`initialValue item ${position} has a non-string name`);
  }
  const item: ValueItem = {
    uuid,
    name,
    order: 0,
    custom_properties: copyCustomProperties(input.custom_properties),
  };
  for (const field of OPTIONAL_STRING_FIELDS) {
    const value = input[field];
    if (typeof value === 'string') item[field] = value;
  }
  for (const field of OPTIONAL_URL_FIELDS) {
    const value = input[field];
    if (typeof value === 'string' || value === null) item[field] = value;
  }
  if (typeof input.size === 'number' && Number.isFinite(input.size)) item.size = input.size;
  const sortKey =
    typeof input.order === 'number' && Number.isFinite(input.order) ? input.order : position;
  return { item, sortKey };
}

/**
 * Normalizes an `initialValue` given as a uuid-keyed MediaValue or a list of items into an
 * ordered MediaValue: sorted by `order` (ties keep input order), `order` rewritten zero-based,
 * `custom_properties` defaulting to an empty object. Unsafe custom-property keys are dropped and
 * every user-keyed map is a null-prototype object.
 */
export function normalizeValue(
  value: MediaValue | ValueItemInput[] | null | undefined,
): MediaValue {
  const result = createMap<ValueItem>();
  if (value === undefined || value === null) return result;

  let inputs: unknown[];
  if (Array.isArray(value)) {
    inputs = value;
  } else if (isRecord(value)) {
    inputs = Object.keys(value).map((key) => value[key]);
  } else {
    throw new TypeError('initialValue must be a uuid-keyed object or an array of items');
  }

  const entries = inputs
    .map((input, position) => normalizeItem(input, position))
    .filter(({ item }) => isSafeKey(item.uuid))
    .sort((a, b) => a.sortKey - b.sortKey);

  entries.forEach(({ item }, index) => {
    result[item.uuid] = { ...item, order: index };
  });
  return result;
}
