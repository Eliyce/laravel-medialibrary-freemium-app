# Media Library Store Technical

## Module Boundaries

| File                        | Owns                                                                                     |
| --------------------------- | ---------------------------------------------------------------------------------------- |
| `src/core/media-library.ts` | `MediaLibrary` class, config resolution (`ResolvedMediaLibraryConfig`), upload lifecycle |
| `src/core/value.ts`         | `normalizeValue`, `isSafeKey`, `createMap` (null-prototype maps), `copyCustomProperties` |
| `src/core/types.ts`         | Public types: config, state, media object, value item, transport, translations           |

## Public API

`new MediaLibrary(config: MediaLibraryConfig)`

| Config                                                                        | Default                               | Notes                                                            |
| ----------------------------------------------------------------------------- | ------------------------------------- | ---------------------------------------------------------------- |
| `name`                                                                        | required                              | Non-empty string; also the error-bag key                         |
| `initialValue`                                                                | none                                  | `MediaValue` or `ValueItemInput[]`, run through `normalizeValue` |
| `routePrefix`                                                                 | `'media-library-pro'`                 | Must not be empty                                                |
| `uploadDomain`                                                                | none                                  | Sets `credentials: 'include'`                                    |
| `validationRules`                                                             | `{}`                                  | `accept`, `minSizeInKB`, `maxSizeInKB`                           |
| `validationErrors`                                                            | none                                  | Laravel error bag                                                |
| `multiple`                                                                    | `true`                                | `false` forces `maxItems = 1` and replace-on-add                 |
| `maxItems`                                                                    | unlimited                             | Integer ≥ 1 (`RangeError` otherwise)                             |
| `vapor`, `vaporSignedStorageUrl`                                              | `false`, `'vapor/signed-storage-url'` | See [Upload Transport](../upload-transport/technical.md)         |
| `maxSizeForPreviewInBytes`                                                    | `5242880`                             | Object-URL previews only for `image/*` up to this size           |
| `translations`                                                                | defaults                              | Partial, merged over globals                                     |
| `beforeUpload`, `afterUpload`, `onChange`, `onIsReadyToSubmitChange`, `fetch` | none                                  | Must be functions (`TypeError`)                                  |

Methods: `getState()`, `subscribe(listener) → unsubscribe`, `addFile(file)`, `addFiles(files)`,
`removeMedia(object)`, `replaceMedia(object, file)`, `setOrder(uuids)`,
`setProperty(object, path, value)`, `setCustomProperty(object, key, value)`, `setName(object, name)`,
`getErrors(object)`, `clearObjectErrors(object)`, `clearInvalidMedia()`,
`setValidationErrors(bag)`, `isReadyToSubmit()`, `hasUploadsInProgress()`, `getValue()`,
`destroy()`. Getters: `config`, `translations`, `isDestroyed`.

`setProperty` accepts only `client_preview`, `attributes.<name|file_name|preview_url|original_url|size|mime_type|extension>`
and `attributes.custom_properties.<key>`; anything else throws `TypeError`.

## Data Flow

```text
addFile(file) ─▶ validateFile + maxItems ─fail─▶ state.invalidMedia (no upload)
      │ ok
      ▼
MediaObject { attributes{uuid=generateUuid()}, upload{isUploading}, client_id }
      │  beforeUpload(file)? ─throw─▶ failed item + afterUpload({success:false})
      ▼
uploadFile() ─progress─▶ upload.uploadProgress
      │ ok: response fields merged (client uuid kept; server name dropped if renamed)
      ▼
settled item ─▶ getValue() { [uuid]: { ...attributes, order } } ─▶ onChange(value)
```

- State is immutable: every change replaces the state object, then calls listeners, then
  `onIsReadyToSubmitChange` (on change) and `onChange` (when the serialized value changes).
- `getValue()` is cached per state object and holds only settled items (not uploading, not
  failed).
- `setValidationErrors` ignores a bag equal to the last one (JSON comparison), so re-renders that
  pass the same bag do not emit.
- Every user-keyed map is `Object.create(null)`, and unsafe keys are dropped or rejected.
- `destroy()` aborts every upload, revokes every object URL and drops listeners. Later calls are
  no-ops.

## Error Handling

- Config and argument errors throw `TypeError` / `RangeError` at the call (see the
  [error code registry](../../../../instructions/registries/error-code-registry.md)).
- Upload failures never throw. They mark the item `hasFailed`, set
  `client_validation_errors`, and call `afterUpload({ success: false, uuid, errors, status?, cause? })`.
- Aborts caused by remove, replace or destroy produce no error state.

## Dependencies

Internal only: `upload.ts`, `validation.ts`, `errors.ts`, `translations.ts`, `uuid.ts`, `value.ts`.

## Testing Entry Points

- `tests/core/media-library.test.ts`: config validation, client validation, single mode,
  `maxItems`, replace, remove, reorder, properties, errors, `beforeUpload`, callbacks, object-URL
  revoke, `destroy()` abort, and rename during upload.
- `tests/core/value.test.ts`: `normalizeValue` ordering, defaults and prototype-pollution keys.
- Shared fakes live in `tests/helpers.ts`.
