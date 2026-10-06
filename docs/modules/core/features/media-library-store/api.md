# Media Library Store API

Source: `src/core/media-library.ts`, `src/core/value.ts`, `src/core/types.ts`. Exported from
`@eliyce/laravel-medialibrary-freemium-app` and `@eliyce/laravel-medialibrary-freemium-app/core`.

## `MediaLibrary`

```ts
import { MediaLibrary } from '@eliyce/laravel-medialibrary-freemium-app/core';

const library = new MediaLibrary({
  name: 'images',
  initialValue: serverValue, // MediaValue | ValueItemInput[] | null
  validationRules: { accept: ['image/*'], maxSizeInKB: 2048 },
  onChange: (value) => console.log(value),
});
const unsubscribe = library.subscribe(() => render(library.getState()));
input.addEventListener('change', () => library.addFiles(input.files ?? []));
```

### `MediaLibraryConfig`

| Option                     | Type                                     | Default                      | Notes                                                           |
| -------------------------- | ---------------------------------------- | ---------------------------- | --------------------------------------------------------------- |
| `name`                     | `string`                                 | required                     | Form field name; non-empty. Server errors are read under it     |
| `initialValue`             | `MediaValue \| ValueItemInput[] \| null` | empty                        | Normalized with `normalizeValue`                                |
| `routePrefix`              | `string`                                 | `'media-library-pro'`        | Must not be blank                                               |
| `uploadDomain`             | `string`                                 | same origin                  | When set, requests use `credentials: 'include'`                 |
| `validationRules`          | `ValidationRules`                        | `{}`                         | `accept`, `minSizeInKB`, `maxSizeInKB`                          |
| `validationErrors`         | `ValidationErrorBag \| null`             | none                         | Laravel error bag applied at construction                       |
| `multiple`                 | `boolean`                                | `true`                       | `false` forces `maxItems` to 1 and replaces on add              |
| `maxItems`                 | `number`                                 | unlimited                    | Integer ≥ 1                                                     |
| `vapor`                    | `boolean`                                | `false`                      | Upload through S3 signed URLs                                   |
| `vaporSignedStorageUrl`    | `string`                                 | `'vapor/signed-storage-url'` |                                                                 |
| `maxSizeForPreviewInBytes` | `number`                                 | `5242880` (5 MB)             | Larger images get no local object-URL preview                   |
| `translations`             | `PartialTranslations`                    | defaults                     | Merged over globals, see [translations](../translations/api.md) |
| `beforeUpload`             | `(file: File) => unknown`                | none                         | May be async; a throw or rejection fails the item               |
| `afterUpload`              | `(result: AfterUploadResult) => unknown` | none                         | Called once per finished upload                                 |
| `onChange`                 | `(value: MediaValue) => unknown`         | none                         | Called when the serialized value changes                        |
| `onIsReadyToSubmitChange`  | `(ready: boolean) => unknown`            | none                         | Called when `isReadyToSubmit()` flips                           |
| `fetch`                    | `UploadTransport`                        | XMLHttpRequest transport     | See [upload-transport](../upload-transport/api.md)              |

Bad options throw at construction: `TypeError` for a wrong type or a non-function callback,
`RangeError` for a `maxItems` below 1 or not an integer, a negative or non-finite
`maxSizeForPreviewInBytes`, or out-of-range `validationRules` bounds.

### Members

| Member                                  | Returns                                | Behavior                                                                               |
| --------------------------------------- | -------------------------------------- | -------------------------------------------------------------------------------------- |
| `config`                                | `Readonly<ResolvedMediaLibraryConfig>` | Frozen config after defaults                                                           |
| `translations`                          | `Translations`                         | Effective messages                                                                     |
| `isDestroyed`                           | `boolean`                              | True after `destroy()`                                                                 |
| `getState()`                            | `MediaLibraryState`                    | Replaced (never mutated) on each change                                                |
| `subscribe(listener)`                   | `() => void`                           | Listener runs after every change; returns unsubscribe                                  |
| `addFile(file)`                         | `void`                                 | Validates, then uploads; an invalid file or one over `maxItems` goes to `invalidMedia` |
| `addFiles(files)`                       | `void`                                 | `FileList` or array; single mode uses only the first                                   |
| `removeMedia(object)`                   | `void`                                 | Aborts its upload, revokes its preview                                                 |
| `replaceMedia(object, file)`            | `void`                                 | Same position and custom properties, new uuid; an invalid file goes to `invalidMedia`  |
| `setOrder(uuids)`                       | `void`                                 | Listed uuids first, the rest keep their relative order                                 |
| `setProperty(object, path, value)`      | `void`                                 | See the allowed paths below; any other path throws `TypeError`                         |
| `setCustomProperty(object, key, value)` | `void`                                 | `''`, `__proto__`, `constructor` and `prototype` throw `TypeError`                     |
| `setName(object, name)`                 | `void`                                 | Renames; a rename made during the upload survives the server echo                      |
| `getErrors(object)`                     | `string[]`                             | Client errors plus backend object errors                                               |
| `clearObjectErrors(object)`             | `void`                                 | Clears both for one item                                                               |
| `clearInvalidMedia()`                   | `void`                                 | Empties `state.invalidMedia`                                                           |
| `setValidationErrors(bag)`              | `void`                                 | Maps a Laravel error bag (`null` clears); an unchanged bag is a no-op                  |
| `isReadyToSubmit()`                     | `boolean`                              | No upload running or failed, no invalid media                                          |
| `hasUploadsInProgress()`                | `boolean`                              |                                                                                        |
| `getValue()`                            | `MediaValue`                           | Settled items keyed by uuid, zero-based `order`                                        |
| `destroy()`                             | `void`                                 | Aborts uploads, revokes previews, drops listeners; idempotent                          |

`setProperty` paths: `client_preview` (string or `undefined`),
`attributes.{name,file_name,preview_url,original_url,size,mime_type,extension}` (type-checked),
and `attributes.custom_properties.<key>`.

Methods taking an `object` throw `TypeError` unless it looks like a media object from the state
(string `client_id`, object `attributes`). After `destroy()` every mutator is a no-op.

### Callbacks (events)

| Callback                  | Payload                                                       | When                                  |
| ------------------------- | ------------------------------------------------------------- | ------------------------------------- |
| `afterUpload`             | `{ success: true, uuid }`                                     | Upload stored                         |
| `afterUpload`             | `{ success: false, uuid, errors: string[], status?, cause? }` | Upload failed or `beforeUpload` threw |
| `onChange`                | `MediaValue`                                                  | `getValue()` serializes differently   |
| `onIsReadyToSubmitChange` | `boolean`                                                     | Readiness flipped                     |

Aborts caused by `removeMedia`, `replaceMedia` or `destroy` fire nothing.

## `normalizeValue`

```ts
normalizeValue(value: MediaValue | ValueItemInput[] | null | undefined): MediaValue
```

Accepts a uuid-keyed object or a list. It sorts by `order` (ties keep input order), rewrites
`order` zero-based, defaults `custom_properties` to `{}`, drops unsafe custom-property keys and
items with an unsafe uuid. Every user-keyed map has a null prototype. Throws `TypeError` for a
non-object item, a missing or empty `uuid`, or a non-string `name`.

## Types

```ts
interface ValueItem {
  uuid: string;
  name: string;
  file_name?: string;
  preview_url?: string | null;
  original_url?: string | null;
  size?: number;
  mime_type?: string;
  extension?: string;
  order: number; // zero-based
  custom_properties: Record<string, unknown>;
}
type MediaValue = Record<string, ValueItem>;

interface MediaObject {
  attributes: ValueItem;
  client_preview?: string; // object URL, revoked when the item goes away
  upload: { hasFailed: boolean; uploadProgress: number; isUploading: boolean }; // UploadInfo
  client_validation_errors: string[];
  client_id: string; // stable across replaceMedia
}

interface MediaLibraryState {
  media: MediaObject[];
  invalidMedia: { file?: { name: string }; errors: string[] }[]; // InvalidMedia
  validationErrors: MappedValidationErrors;
  topLevelErrors: string[];
}
```

`ValueItemInput` is `ValueItem` with optional `order` and nullable `custom_properties`.
`ResolvedMediaLibraryConfig` is the config with every default applied (no callbacks).

## Related

- [Technical](technical.md) · [model registry](../../../../instructions/registries/model-registry.md)
