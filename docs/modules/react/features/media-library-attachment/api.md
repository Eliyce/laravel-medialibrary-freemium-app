# MediaLibraryAttachment API

Source: `src/react/MediaLibraryAttachment.tsx`, `src/react/props.ts`. Exported from
`@eliyce/laravel-medialibrary-freemium-app/react` (a `"use client"` module).

## Usage

```tsx
import { MediaLibraryAttachment } from '@eliyce/laravel-medialibrary-freemium-app/react';

<MediaLibraryAttachment
  name="avatar"
  initialValue={user.avatar}
  validationRules={{ accept: ['image/png', 'image/jpeg'], maxSizeInKB: 2048 }}
  validationErrors={errors}
/>;
```

## Props: `MediaLibraryAttachmentProps`

`MediaLibraryComponentProps` (shared with the collection) plus:

| Prop       | Type      | Default | Notes                                                                 |
| ---------- | --------- | ------- | --------------------------------------------------------------------- |
| `multiple` | `boolean` | `false` | `false`: a new file replaces the current one. `true`: a list of files |

### `MediaLibraryComponentProps`

| Prop                       | Type                                     | Default                      | Notes                                                                  |
| -------------------------- | ---------------------------------------- | ---------------------------- | ---------------------------------------------------------------------- |
| `name`                     | `string`                                 | required                     | Form field name; hidden inputs and error lookup use it                 |
| `initialValue`             | `MediaValue \| ValueItemInput[] \| null` | empty                        | Read on mount                                                          |
| `routePrefix`              | `string`                                 | `'media-library-pro'`        | Match `Route::mediaLibrary($prefix)`                                   |
| `uploadDomain`             | `string`                                 | same origin                  |                                                                        |
| `validationRules`          | `ValidationRules`                        | `{}`                         | `accept`, `minSizeInKB`, `maxSizeInKB`                                 |
| `validationErrors`         | `ValidationErrorBag \| null`             | none                         | Laravel error bag; wins over `errors`                                  |
| `errors`                   | `ValidationErrorBag \| null`             | none                         | Inertia alias (`props.errors`)                                         |
| `maxItems`                 | `number`                                 | unlimited                    | Only with `multiple`                                                   |
| `vapor`                    | `boolean`                                | `false`                      |                                                                        |
| `vaporSignedStorageUrl`    | `string`                                 | `'vapor/signed-storage-url'` |                                                                        |
| `maxSizeForPreviewInBytes` | `number`                                 | 5 MB                         |                                                                        |
| `translations`             | `PartialTranslations`                    | defaults                     |                                                                        |
| `fileTypeHelpText`         | `string`                                 | from `accept`                | Replaces the generated type hint                                       |
| `setMediaLibrary`          | `(mediaLibrary: MediaLibrary) => void`   | none                         | Called with the instance after mount                                   |
| `beforeUpload`             | `(file: File) => unknown`                | none                         | Throw or reject to fail the item                                       |
| `afterUpload`              | `(result: AfterUploadResult) => unknown` | none                         |                                                                        |
| `onChange`                 | `(value: MediaValue) => unknown`         | none                         |                                                                        |
| `onIsReadyToSubmitChange`  | `(ready: boolean) => unknown`            | none                         | Disable submit while `false`                                           |
| `editableName`             | `boolean`                                | `false`                      | Shows a name input per item                                            |
| `fetch`                    | `UploadTransport`                        | XMLHttpRequest               | See [upload transport](../../../core/features/upload-transport/api.md) |

Options other than the callbacks and the error bag are read on mount (see
[useMediaLibrary](../use-media-library/api.md)).

## Rendered output

- Root `<div class="media-library media-library-single|media-library-multiple">`, plus
  `media-library-empty` with no items.
- `ListErrors`, the item list (`Thumb`, name or name input, size · extension, `ItemErrors`,
  remove button), `Uploader`, and `HiddenFields`.
- Form value for a normal submit, per settled item: `{name}[{uuid}][uuid]`, `[name]`, `[order]`,
  `[custom_properties][{key}]`. The server reads it with
  [`addFromMediaLibraryRequest` / `syncFromMediaLibraryRequest`](../../../laravel/features/request-handling/api.md).

## Related

- [Technical](technical.md) · [component registry](../../../../instructions/registries/component-registry.md)
