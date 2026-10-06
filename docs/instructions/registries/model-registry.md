# Model Registry

## Persisted models (Laravel)

| Model                                           | Table               | Owner  | Description                                                                                                                                                  |
| ----------------------------------------------- | ------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `Eliyce\MediaPro\Models\TemporaryUpload`        | `temporary_uploads` | this   | Holds one uploaded file (Spatie media in collection `default`) for a session until a model claims it. Replaceable through `media-pro.temporary_upload_model` |
| Spatie `Media` (or `media-library.media_model`) | `media`             | Spatie | Not defined here. Media Pro sets its `uuid` from the client and copies rows from temporary uploads to the target model                                       |

## Value objects (Laravel)

| Type                                                | Description                                                                                  |
| --------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `Eliyce\MediaPro\MediaLibraryRequestItem`           | One submitted item: `uuid`, `?name`, `?order`, `customProperties`, `?fileName`               |
| `UploadResponse` array (`MediaProValue::fromMedia`) | `uuid`, `name`, `file_name`, `preview_url`, `original_url`, `size`, `mime_type`, `extension` |

## Public data types (JS, `@eliyce/laravel-medialibrary-freemium-app/core`)

| Type                                                          | Description                                                                                                        |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `MediaLibraryConfig`                                          | Constructor options                                                                                                |
| `ResolvedMediaLibraryConfig`                                  | Options after defaults (`library.config`)                                                                          |
| `MediaLibraryState`                                           | `{ media, invalidMedia, validationErrors, topLevelErrors }`                                                        |
| `MediaObject`                                                 | `{ attributes: ValueItem, client_preview?, upload: UploadInfo, client_validation_errors, client_id }`              |
| `UploadInfo`                                                  | `{ hasFailed, uploadProgress (0-100), isUploading }`                                                               |
| `InvalidMedia`                                                | `{ file?: { name }, errors }`                                                                                      |
| `ValueItem`                                                   | `{ uuid, name, order, custom_properties, file_name?, preview_url?, original_url?, size?, mime_type?, extension? }` |
| `ValueItemInput`                                              | `ValueItem` with optional `order` and `custom_properties`                                                          |
| `MediaValue`                                                  | `Record<uuid, ValueItem>` in display order                                                                         |
| `UploadResponse`                                              | The upload endpoints' JSON                                                                                         |
| `ValidationRules`                                             | `{ accept?, minSizeInKB?, maxSizeInKB? }`                                                                          |
| `ValidationErrorBag`                                          | `Record<string, string \| string[]>`                                                                               |
| `MediaObjectErrors`, `MappedValidationErrors`, `MappedErrors` | Mapped server errors                                                                                               |
| `Translations`, `PartialTranslations`, `TranslationKey`       | Messages                                                                                                           |
| `UploadTransport`, `UploadRequest`, `UploadTransportResponse` | Injectable transport                                                                                               |
| `AfterUploadResult`                                           | `afterUpload` payload                                                                                              |
| `FileLike`, `CsrfDocument`                                    | Minimal file and document shapes                                                                                   |

All JS types are exported with `export type`. The JS `ValueItem` and the PHP
`MediaLibraryRequestItem` describe the same item, and `MediaProValue::collection()` produces the
`MediaValue` shape.
