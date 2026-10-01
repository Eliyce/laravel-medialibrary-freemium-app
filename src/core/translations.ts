import type { PartialTranslations, TranslationKey, Translations } from './types.js';
import { isRecord } from './value.js';

/** Default English messages (Spatie Media Library Pro v6 keys plus a few extras). */
export const defaultTranslations: Readonly<Translations> = Object.freeze({
  fileTypeNotAllowed: 'You must upload a file of type',
  tooLarge: 'File too large, max',
  tooSmall: 'File too small, min',
  tryAgain: 'please try uploading this file again',
  somethingWentWrong: 'Something went wrong while uploading this file',
  selectOrDrag: 'Select or drag files',
  selectOrDragMax: 'Select or drag max {maxItems} {file}',
  file: Object.freeze({ singular: 'file', plural: 'files' }),
  anyImage: 'any image',
  anyVideo: 'any video',
  goBack: 'Go back',
  dropFile: 'Drop file to upload',
  dragHere: 'Drag file here',
  remove: 'Remove',
  download: 'Download',
  replace: 'Replace',
  name: 'Name',
  uploading: 'Uploading',
  moveUp: 'Move up',
  moveDown: 'Move down',
});

const STRING_KEYS = Object.keys(defaultTranslations).filter(
  (key): key is TranslationKey => key !== 'file',
);

function readOwnString(source: Record<string, unknown>, key: string): string | undefined {
  if (!Object.prototype.hasOwnProperty.call(source, key)) return undefined;
  const value = source[key];
  return typeof value === 'string' ? value : undefined;
}

function mergeInto(target: Translations, source: unknown): void {
  if (source === undefined || source === null) return;
  if (!isRecord(source)) {
    throw new TypeError('translations must be an object of translation strings');
  }
  for (const key of STRING_KEYS) {
    const value = readOwnString(source, key);
    if (value !== undefined) target[key] = value;
  }
  const file = Object.prototype.hasOwnProperty.call(source, 'file') ? source.file : undefined;
  if (isRecord(file)) {
    const singular = readOwnString(file, 'singular');
    const plural = readOwnString(file, 'plural');
    target.file = {
      singular: singular ?? target.file.singular,
      plural: plural ?? target.file.plural,
    };
  }
}

/**
 * Resolves the effective translations: the defaults, then
 * `globalThis.mediaLibraryTranslations`, then `overrides`, merged key by key. Only known keys
 * with string values are copied, so unexpected keys can never reach the result.
 */
export function resolveTranslations(overrides?: PartialTranslations | null): Translations {
  const result: Translations = { ...defaultTranslations, file: { ...defaultTranslations.file } };
  const globalTranslations = (globalThis as { mediaLibraryTranslations?: unknown })
    .mediaLibraryTranslations;
  // A malformed global is ignored rather than breaking every component on the page.
  if (isRecord(globalTranslations)) mergeInto(result, globalTranslations);
  mergeInto(result, overrides);
  return result;
}

/**
 * Returns the message for `key` with every `{placeholder}` replaced by the matching value in
 * `replacements`. Placeholders without a replacement are left as they are.
 */
export function translate(
  translations: Translations,
  key: TranslationKey,
  replacements: Record<string, string | number> = {},
): string {
  if (!isRecord(translations)) {
    throw new TypeError('translate() expects a translations object');
  }
  const message = readOwnString(translations, key);
  if (message === undefined) {
    throw new TypeError(`Unknown translation key "${String(key)}"`);
  }
  if (!isRecord(replacements)) {
    throw new TypeError('translate() replacements must be an object');
  }
  return message.replace(/\{(\w+)\}/g, (match, name: string) => {
    if (!Object.prototype.hasOwnProperty.call(replacements, name)) return match;
    return String(replacements[name]);
  });
}
