# Translations API

Source: `src/core/translations.ts`, `src/core/types.ts`. Exported from `@eliyce/laravel-medialibrary-freemium-app` and
`@eliyce/laravel-medialibrary-freemium-app/core`.

## Exports

| Export                | Signature                                                                                                      |
| --------------------- | -------------------------------------------------------------------------------------------------------------- |
| `defaultTranslations` | `Readonly<Translations>` (frozen, including `file`)                                                            |
| `resolveTranslations` | `(overrides?: PartialTranslations \| null) => Translations`                                                    |
| `translate`           | `(translations: Translations, key: TranslationKey, replacements?: Record<string, string \| number>) => string` |

```ts
import { resolveTranslations, translate } from '@eliyce/laravel-medialibrary-freemium-app/core';

const t = resolveTranslations({ selectOrDrag: 'Choose files', file: { plural: 'images' } });
translate(t, 'selectOrDragMax', { maxItems: 3, file: t.file.plural }); // "Select or drag max 3 images"
```

### `resolveTranslations`

Merge order, key by key: `defaultTranslations` → `globalThis.mediaLibraryTranslations` →
`overrides`. Only known keys with string values are copied; `file` merges `singular` and `plural`
separately. A malformed global is ignored. A non-object `overrides` throws `TypeError`. Returns a
fresh object each call.

### `translate`

Replaces each `{placeholder}` with `replacements[placeholder]`; unknown placeholders stay as they
are. Throws `TypeError` for an unknown key, a non-object `translations` or `replacements`.

## Keys and defaults

| Key                  | Default                                          | Placeholders           |
| -------------------- | ------------------------------------------------ | ---------------------- |
| `fileTypeNotAllowed` | `You must upload a file of type`                 |                        |
| `tooLarge`           | `File too large, max`                            |                        |
| `tooSmall`           | `File too small, min`                            |                        |
| `tryAgain`           | `please try uploading this file again`           |                        |
| `somethingWentWrong` | `Something went wrong while uploading this file` |                        |
| `selectOrDrag`       | `Select or drag files`                           |                        |
| `selectOrDragMax`    | `Select or drag max {maxItems} {file}`           | `{maxItems}`, `{file}` |
| `file`               | `{ singular: 'file', plural: 'files' }`          |                        |
| `anyImage`           | `any image`                                      |                        |
| `anyVideo`           | `any video`                                      |                        |
| `goBack`             | `Go back`                                        |                        |
| `dropFile`           | `Drop file to upload`                            |                        |
| `dragHere`           | `Drag file here`                                 |                        |
| `remove`             | `Remove`                                         |                        |
| `download`           | `Download`                                       |                        |
| `replace`            | `Replace`                                        |                        |
| `name`               | `Name`                                           |                        |
| `uploading`          | `Uploading`                                      |                        |
| `moveUp`             | `Move up`                                        |                        |
| `moveDown`           | `Move down`                                      |                        |

## Types

- `Translations`: every key above (all strings, `file` is `{ singular: string; plural: string }`).
- `TranslationKey`: `Exclude<keyof Translations, 'file'>`.
- `PartialTranslations`: `Partial<Omit<Translations, 'file'>> & { file?: Partial<Translations['file']> }`.

## Browser global

| Name                                  | Type                  | Use                                                 |
| ------------------------------------- | --------------------- | --------------------------------------------------- |
| `globalThis.mediaLibraryTranslations` | `PartialTranslations` | Page-wide overrides; read on resolve, never written |

```html
<script>
  window.mediaLibraryTranslations = { remove: 'Entfernen' };
</script>
```

## Related

- [Technical](technical.md)
