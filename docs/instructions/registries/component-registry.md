# Component Registry

React components exported from `@eliyce/media-pro/react`. Every component renders
`media-library-*` classes styled by `@eliyce/media-pro/styles.css`. The design system holds only
placeholder tokens (TD-10), so the styles use Tailwind's default palette.

| Component                | Module | Props type                    | Description                                                                           |
| ------------------------ | ------ | ----------------------------- | ------------------------------------------------------------------------------------- |
| `MediaLibraryAttachment` | React  | `MediaLibraryAttachmentProps` | One file (or several with `multiple`) for a form field                                |
| `MediaLibraryCollection` | React  | `MediaLibraryCollectionProps` | Sortable list with names, custom properties and reordering                            |
| `Uploader`               | React  | `UploaderProps`               | "Select or drag" area: hidden file input, drop zone, type help, progress              |
| `DropZone`               | React  | `DropZoneProps`               | Keyboard-operable drop target (`role="button"`); render prop with drag state          |
| `Thumb`                  | React  | `ThumbProps`                  | Preview or extension, progress bar, replace input                                     |
| `HiddenFields`           | React  | `HiddenFieldsProps`           | Hidden inputs for a non-AJAX submit                                                   |
| `ItemErrors`             | React  | `ItemErrorsProps`             | One item's errors (`role="alert"`) with "Go back"                                     |
| `ListErrors`             | React  | `ListErrorsProps`             | Field errors and rejected files (`role="alert"`) with a clear button                  |
| `Icon`                   | React  | `IconProps`                   | Inline decorative SVG: add, remove, replace, download, up, down, drag, error, success |
| `IconButton`             | React  | `IconButtonProps`             | `button` with an icon and an accessible label                                         |
| `Icons`                  | React  | none                          | Spatie compatibility no-op; renders nothing                                           |

Internal (not exported): `NameField`, `ProgressBar`.

## Shared props (`MediaLibraryComponentProps`)

Accepted by both `MediaLibraryAttachment` and `MediaLibraryCollection`.

| Prop                       | Type                                      | Default                      |
| -------------------------- | ----------------------------------------- | ---------------------------- |
| `name`                     | `string` (required)                       |                              |
| `initialValue`             | `MediaValue \| ValueItemInput[] \| null`  | empty                        |
| `routePrefix`              | `string`                                  | `'media-library-pro'`        |
| `uploadDomain`             | `string`                                  | same origin                  |
| `validationRules`          | `{ accept?, minSizeInKB?, maxSizeInKB? }` | none                         |
| `validationErrors`         | `ValidationErrorBag \| null`              | none; wins over `errors`     |
| `errors`                   | `ValidationErrorBag \| null`              | Inertia alias                |
| `maxItems`                 | `number`                                  | unlimited (1 in single mode) |
| `vapor`                    | `boolean`                                 | `false`                      |
| `vaporSignedStorageUrl`    | `string`                                  | `'vapor/signed-storage-url'` |
| `maxSizeForPreviewInBytes` | `number`                                  | `5242880`                    |
| `translations`             | `PartialTranslations`                     | defaults + global            |
| `fileTypeHelpText`         | `string`                                  | derived from `accept`        |
| `setMediaLibrary`          | `(library: MediaLibrary) => void`         |                              |
| `beforeUpload`             | `(file: File) => unknown`                 | throw to reject              |
| `afterUpload`              | `(result: AfterUploadResult) => unknown`  |                              |
| `onChange`                 | `(value: MediaValue) => unknown`          |                              |
| `onIsReadyToSubmitChange`  | `(ready: boolean) => unknown`             |                              |
| `editableName`             | `boolean`                                 | `false`                      |
| `fetch`                    | `UploadTransport`                         | XMLHttpRequest               |

Component-specific props:

| Component                | Prop             | Type and default                                                  |
| ------------------------ | ---------------- | ----------------------------------------------------------------- |
| `MediaLibraryAttachment` | `multiple`       | `boolean`, `false`                                                |
| `MediaLibraryCollection` | `sortable`       | `boolean`, `true`                                                 |
| `MediaLibraryCollection` | `fieldsView`     | `(props: MediaLibraryViewProps) => ReactNode`; default name input |
| `MediaLibraryCollection` | `propertiesView` | Same signature; default name, size and extension                  |

## Helper component props

| Component      | Props                                                                                                                                                |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Uploader`     | `multiple`, `onDrop`, `onChange` (required); `add` (default `true`), `uploadInfo`, `validationRules`, `maxItems`, `fileTypeHelpText`, `translations` |
| `DropZone`     | `children: (state) => ReactNode`, `onDrop` (required); `validationAccept`, `onActivate`, plus `div` attributes                                       |
| `Thumb`        | `uploadInfo`, `imgProps: { src, alt, extension }`, `onReplace(file)` (required); `validationRules`, `translations`                                   |
| `HiddenFields` | `name`, `mediaState` (required)                                                                                                                      |
| `ItemErrors`   | `objectErrors` (required); `onBack`, `translations`                                                                                                  |
| `ListErrors`   | `invalidMedia`, `onClear` (required); `topLevelErrors`, `translations`                                                                               |
| `Icon`         | `icon` (required); `className`                                                                                                                       |
| `IconButton`   | `icon` (required); `label`, `className`, `handleClass`, plus `button` attributes                                                                     |

Docs: [React module](../../modules/react/index/summary.md).
