# Error Code Registry

Errors the packages throw or return, grouped by where they surface. The JS convention: throw
`TypeError` for wrong argument types and `RangeError` for out-of-range values, with a message
that names the option or function. Upload failures at runtime never throw; they become item
errors.

## JS: thrown at the call site (developer errors)

| Class        | Thrown by                          | Condition                                                                                                                                                                                                                                                   |
| ------------ | ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `TypeError`  | `new MediaLibrary(config)`         | Config not an object; `name` missing or empty; `routePrefix` empty; wrong option types; callbacks or `fetch` not functions; bad `validationRules` or `translations` types; malformed `initialValue`                                                         |
| `RangeError` | `new MediaLibrary(config)`         | `maxItems` not an integer of at least 1; `maxSizeForPreviewInBytes` negative or not finite; negative or non-finite size rules; `minSizeInKB > maxSizeInKB`                                                                                                  |
| `TypeError`  | `MediaLibrary` methods             | Non-file to `addFile`, `addFiles` or `replaceMedia`; not a media object; non-array `setOrder`; unknown `setProperty` path or bad value; empty or unsafe custom-property key (`__proto__`, `constructor`, `prototype`); bad error bag; non-function listener |
| `TypeError`  | `normalizeValue`                   | Not an object or array; item without a string uuid; non-string name                                                                                                                                                                                         |
| `TypeError`  | `validateFile`                     | Not file-like; rules not an object                                                                                                                                                                                                                          |
| `TypeError`  | `mapValidationErrors`              | Empty name; uuids not an array; bag not an object                                                                                                                                                                                                           |
| `TypeError`  | `translate`, `resolveTranslations` | Unknown key; non-object translations or replacements                                                                                                                                                                                                        |
| `Error`      | `generateUuid`                     | Neither `crypto.randomUUID` nor `crypto.getRandomValues` exists                                                                                                                                                                                             |

## JS: item and list errors (user-facing)

| Source                                            | Where                                            | Message key or text                             |
| ------------------------------------------------- | ------------------------------------------------ | ----------------------------------------------- |
| Type not in `accept`                              | `state.invalidMedia`                             | `fileTypeNotAllowed` + the accepted list        |
| Below `minSizeInKB` or above `maxSizeInKB`        | `state.invalidMedia`                             | `tooSmall` / `tooLarge` + KB                    |
| Over `maxItems`                                   | `state.invalidMedia`                             | `selectOrDragMax`                               |
| HTTP 422                                          | item `client_validation_errors`                  | Server messages from `errors.*`, else `message` |
| HTTP 429                                          | item                                             | `tryAgain`                                      |
| Other status, network error, bad body, Vapor step | item                                             | `somethingWentWrong`                            |
| `beforeUpload` throws                             | item                                             | The thrown message                              |
| `XMLHttpRequest` missing                          | item (with `cause`)                              | `somethingWentWrong`                            |
| Server validation bag                             | `state.topLevelErrors`, `state.validationErrors` | As mapped by `mapValidationErrors`              |

## Laravel: HTTP responses

| Status               | Endpoint    | Key           | Cause                                                                              |
| -------------------- | ----------- | ------------- | ---------------------------------------------------------------------------------- |
| 422                  | uploads     | `file`        | Missing, not a file, content or client extension not allowed, too large            |
| 422                  | uploads, s3 | `uuid`        | Missing, malformed, already used, or taken by a concurrent request                 |
| 422                  | uploads, s3 | `name`        | Not a string, or longer than 255                                                   |
| 422                  | s3          | `key`         | Outside `tmp/`, traversal segment, not found, too large, disallowed content        |
| 422                  | uploads, s3 | `file`, `key` | "The file could not be stored." (Spatie `FileCannotBeAdded`)                       |
| 429                  | uploads, s3 |               | `media-pro-uploads` limiter                                                        |
| 422 or redirect back | app routes  | `media`       | `InvalidMediaUuid` reached the exception handler: "The selected media is invalid." |

Rejected uploads are logged at warning level as `media-pro: upload rejected`, with `route`,
`uuid` (only when well-formed) and `reason` (field to failed rule names).

## Laravel: exceptions

| Class                                   | Thrown by                                        | Condition                                                                   |
| --------------------------------------- | ------------------------------------------------ | --------------------------------------------------------------------------- |
| `InvalidMediaUuid::missing()`           | `MediaLibraryRequestItem::fromArray`             | Item not an array, or without a non-empty string `uuid`                     |
| `InvalidMediaUuid::create($uuid)`       | `PendingMediaLibraryRequestHandler`              | Unknown uuid, or media of another model or collection                       |
| `InvalidMediaUuid::duplicate($uuid)`    | `PendingMediaLibraryRequestHandler`              | The same uuid twice in one request                                          |
| `TemporaryUploadDoesNotBelongToSession` | `PendingMediaLibraryRequestHandler`              | Temporary upload from another session (extends `InvalidMediaUuid`)          |
| `InvalidArgumentException`              | `PendingMediaLibraryRequestHandler::__construct` | The `HasMedia` is not an Eloquent model                                     |
| `InvalidArgumentException`              | `MediaRules`                                     | Negative bound, max below min, `maxItems > 1` on single media               |
| `BadMethodCallException`                | `MediaRules`                                     | Total-size rules on single media                                            |
| `InvalidArgumentException`              | `MediaProConfig`                                 | Bad `temporary_upload_model` or `media_model`, empty disk, empty allow-list |

`InvalidMediaUuid` logs `media-pro: media library request rejected` (warning) instead of being
reported as a server error.

## Laravel: validation messages (translatable)

From `UploadedMedia` and `TotalMediaSize`: "The :attribute must refer to an uploaded file.",
"must be at least :min kilobytes", "may not be greater than :max kilobytes", "must be a file of
type: :values", "must be an image", "must be :min pixels wide/high", "must be between :min and
:max pixels wide/high", and "The total size of :attribute must be at least :min kilobytes" /
"may not be greater than :max kilobytes".
