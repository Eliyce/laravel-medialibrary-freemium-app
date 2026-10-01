# Validation and Errors API

Source: `src/core/validation.ts`, `src/core/errors.ts`, `src/core/types.ts`. Exported from
`@eliyce/media-pro` and `@eliyce/media-pro/core`.

## Exports

| Export                | Signature                                                                                                                   |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `validateFile`        | `(file: FileLike, rules?: ValidationRules, translations?: Translations) => string[]`                                        |
| `describeAccept`      | `(accept: readonly string[], translations: Translations) => string`                                                         |
| `mapValidationErrors` | `(errors: Record<string, string \| string[]> \| null \| undefined, name: string, uuids: readonly string[]) => MappedErrors` |

## `validateFile`

```ts
validateFile({ name: 'a.pdf', size: 3_000_000, type: 'application/pdf' }, { maxSizeInKB: 2048 });
// ["File too large, max 2048 KB"]
```

Returns translated messages, empty when the file passes. Checks, in order:

| Rule          | Passes when                                                                           | Message                                         |
| ------------- | ------------------------------------------------------------------------------------- | ----------------------------------------------- |
| `accept`      | Any entry matches: `*`/`*/*`, exact mime, `type/*` wildcard, or `.ext` (by file name) | `{fileTypeNotAllowed} {describeAccept(accept)}` |
| `minSizeInKB` | `size >= minSizeInKB * 1024`                                                          | `{tooSmall} {minSizeInKB} KB`                   |
| `maxSizeInKB` | `size <= maxSizeInKB * 1024`                                                          | `{tooLarge} {maxSizeInKB} KB`                   |

An empty browser type is inferred from the file extension. `translations` defaults to
`resolveTranslations()`. Throws `TypeError` when `file` lacks `name`/`size`/`type` or `rules` is
not an object.

`MediaLibrary` additionally checks `validationRules` at construction: `TypeError` for a
non-array `accept` or non-number bounds, `RangeError` for negative or non-finite bounds or
`minSizeInKB > maxSizeInKB`.

## `describeAccept`

Joins the entries with `, `, replacing `image/*` with `anyImage` and `video/*` with `anyVideo`:
`describeAccept(['image/*', 'application/pdf'], t)` → `"any image, application/pdf"`.

## `mapValidationErrors`

Maps a Laravel error bag onto the items of the component named `name`, given the item uuids in
display order.

| Error key                             | Goes to                                        |
| ------------------------------------- | ---------------------------------------------- |
| `name`                                | `topLevelErrors`                               |
| `name.<uuid>`, `name.<uuid>.uuid`     | `validationErrors[uuid].object`                |
| `name.<uuid>.name`                    | `validationErrors[uuid].name`                  |
| `name.<uuid>.custom_properties.<key>` | `validationErrors[uuid].customProperties[key]` |
| `name.<index>...`                     | Same as above for the item at that position    |
| `name.<unknown>...`                   | `topLevelErrors`                               |
| Any other field, unsafe segments      | Ignored                                        |

A bracketed name such as `post[images]` matches the dot keys `post.images...`. Throws `TypeError`
for an empty `name`, a non-array `uuids` or a non-object `errors`.

```ts
mapValidationErrors({ 'images.0.name': ['Required'] }, 'images', ['9b1d...']);
// { topLevelErrors: [], validationErrors: { '9b1d...': { object: [], name: ['Required'], customProperties: {} } } }
```

## Types

```ts
interface ValidationRules {
  accept?: string[];
  minSizeInKB?: number; // inclusive, 1 KB = 1024 bytes
  maxSizeInKB?: number; // inclusive
}
interface FileLike {
  name: string;
  size: number;
  type: string;
}
type ValidationErrorBag = Record<string, string | string[]>; // Inertia sends plain strings
interface MediaObjectErrors {
  object: string[];
  name: string[];
  customProperties: Record<string, string[]>;
}
type MappedValidationErrors = Record<string, MediaObjectErrors>;
interface MappedErrors {
  topLevelErrors: string[];
  validationErrors: MappedValidationErrors;
}
```

## Related

- [Technical](technical.md) ·
  [error code registry](../../../../instructions/registries/error-code-registry.md)
