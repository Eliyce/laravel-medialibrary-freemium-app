import { resolveTranslations } from './translations.js';
import type { FileLike, Translations, ValidationRules } from './types.js';
import { isRecord } from './value.js';

const BYTES_PER_KB = 1024;

function assertFileLike(file: unknown): asserts file is FileLike {
  if (
    !isRecord(file) ||
    typeof file.name !== 'string' ||
    typeof file.size !== 'number' ||
    typeof file.type !== 'string'
  ) {
    throw new TypeError('Expected a File (an object with name, size and type)');
  }
}

/** Mime types of common extensions, used when the browser reports no type or for `.ext` rules. */
const EXTENSION_MIME_TYPES: ReadonlyMap<string, string> = new Map([
  ['jpg', 'image/jpeg'],
  ['jpeg', 'image/jpeg'],
  ['png', 'image/png'],
  ['gif', 'image/gif'],
  ['webp', 'image/webp'],
  ['avif', 'image/avif'],
  ['svg', 'image/svg+xml'],
  ['bmp', 'image/bmp'],
  ['ico', 'image/vnd.microsoft.icon'],
  ['tif', 'image/tiff'],
  ['tiff', 'image/tiff'],
  ['heic', 'image/heic'],
  ['heif', 'image/heif'],
  ['mp4', 'video/mp4'],
  ['m4v', 'video/mp4'],
  ['webm', 'video/webm'],
  ['mov', 'video/quicktime'],
  ['avi', 'video/x-msvideo'],
  ['mkv', 'video/x-matroska'],
  ['mp3', 'audio/mpeg'],
  ['wav', 'audio/wav'],
  ['ogg', 'audio/ogg'],
  ['m4a', 'audio/mp4'],
  ['pdf', 'application/pdf'],
  ['zip', 'application/zip'],
  ['json', 'application/json'],
  ['txt', 'text/plain'],
  ['csv', 'text/csv'],
  ['md', 'text/markdown'],
  ['doc', 'application/msword'],
  ['docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  ['xls', 'application/vnd.ms-excel'],
  ['xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
  ['ppt', 'application/vnd.ms-powerpoint'],
  ['pptx', 'application/vnd.openxmlformats-officedocument.presentationml.presentation'],
]);

/** The extension of a file name without the dot, or '' when it has none. */
function extensionOf(fileName: string): string {
  const dot = fileName.lastIndexOf('.');
  return dot === -1 ? '' : fileName.slice(dot + 1);
}

/**
 * True when a file matches one accept entry. Entries are mime types, `image/*` style wildcards or
 * extensions such as `.pdf` (matched against the file name, case-insensitively). When the browser
 * reports no type, the mime type is inferred from the extension of the file name.
 */
export function matchesAccept(type: string, accept: readonly string[], fileName = ''): boolean {
  const name = fileName.toLowerCase();
  const mime = type.toLowerCase() || (EXTENSION_MIME_TYPES.get(extensionOf(name)) ?? '');
  return accept.some((entry) => {
    const pattern = entry.trim().toLowerCase();
    if (pattern === '*' || pattern === '*/*') return true;
    if (pattern.startsWith('.')) {
      if (pattern.length === 1) return false;
      if (name.endsWith(pattern)) return true;
      return mime !== '' && EXTENSION_MIME_TYPES.get(pattern.slice(1)) === mime;
    }
    if (mime === '') return false;
    if (pattern.endsWith('/*')) return mime.startsWith(pattern.slice(0, -1));
    return mime === pattern;
  });
}

/** A readable list of accepted types, e.g. "any image, application/pdf". */
export function describeAccept(accept: readonly string[], translations: Translations): string {
  return accept
    .map((entry) => {
      const pattern = entry.trim().toLowerCase();
      if (pattern === 'image/*') return translations.anyImage;
      if (pattern === 'video/*') return translations.anyVideo;
      return entry.trim();
    })
    .join(', ');
}

/**
 * Validates one file against the client rules and returns translated error messages (empty when
 * the file is valid). Size bounds are inclusive and measured in KB of 1024 bytes.
 */
export function validateFile(
  file: FileLike,
  rules: ValidationRules = {},
  translations: Translations = resolveTranslations(),
): string[] {
  assertFileLike(file);
  if (typeof rules !== 'object' || rules === null) {
    throw new TypeError('validationRules must be an object');
  }

  const errors: string[] = [];
  const { accept, minSizeInKB, maxSizeInKB } = rules;

  if (accept !== undefined && accept.length > 0 && !matchesAccept(file.type, accept, file.name)) {
    errors.push(`${translations.fileTypeNotAllowed} ${describeAccept(accept, translations)}`);
  }
  if (minSizeInKB !== undefined && file.size < minSizeInKB * BYTES_PER_KB) {
    errors.push(`${translations.tooSmall} ${minSizeInKB} KB`);
  }
  if (maxSizeInKB !== undefined && file.size > maxSizeInKB * BYTES_PER_KB) {
    errors.push(`${translations.tooLarge} ${maxSizeInKB} KB`);
  }
  return errors;
}

/** Validates `validationRules` at the boundary (TypeError for wrong types, RangeError for bounds). */
export function assertValidationRules(
  rules: unknown,
): asserts rules is ValidationRules | undefined {
  if (rules === undefined) return;
  if (!isRecord(rules)) throw new TypeError('validationRules must be an object');
  const { accept, minSizeInKB, maxSizeInKB } = rules;
  if (
    accept !== undefined &&
    (!Array.isArray(accept) || accept.some((entry) => typeof entry !== 'string'))
  ) {
    throw new TypeError('validationRules.accept must be an array of mime type strings');
  }
  for (const [key, value] of [
    ['minSizeInKB', minSizeInKB],
    ['maxSizeInKB', maxSizeInKB],
  ] as const) {
    if (value === undefined) continue;
    if (typeof value !== 'number') throw new TypeError(`validationRules.${key} must be a number`);
    if (!Number.isFinite(value) || value < 0) {
      throw new RangeError(`validationRules.${key} must be a finite number of at least 0`);
    }
  }
  if (
    typeof minSizeInKB === 'number' &&
    typeof maxSizeInKB === 'number' &&
    minSizeInKB > maxSizeInKB
  ) {
    throw new RangeError('validationRules.minSizeInKB must not exceed validationRules.maxSizeInKB');
  }
}
