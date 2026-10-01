# Temporary Uploads API

## HTTP endpoints

Registered by `Route::mediaLibrary($prefix)` behind `throttle:media-pro-uploads`. Both answer
JSON and expect the app's session and CSRF middleware around them.

Common request headers (sent by the core uploader): `Accept: application/json`,
`X-Requested-With: XMLHttpRequest`, and `X-XSRF-TOKEN` or `X-CSRF-TOKEN`.

### `POST /{prefix}/uploads`

Multipart body:

| Field  | Rules                                                                                                                       |
| ------ | --------------------------------------------------------------------------------------------------------------------------- |
| `file` | `required`, `file`, `mimes:<allowed extensions>` (content), `max:<max_file_size_in_kb>`, client extension on the allow-list |
| `uuid` | `required`, `string`, `uuid`, unique in the media table (`media-library.media_model`)                                       |
| `name` | `nullable`, `string`, `max:255`; empty falls back to the client file name without extension                                 |

### `POST /{prefix}/s3`

JSON body, for a file the browser already PUT to the Vapor `tmp/` prefix of the temporary upload
disk:

| Field          | Rules                                                                                             |
| -------------- | ------------------------------------------------------------------------------------------------- |
| `key`          | `required`, `string`, `max:1024`, matches `\Atmp/[A-Za-z0-9!_.*'()\-/]+\z`, no `.`/`..` segment   |
| `uuid`         | As above                                                                                          |
| `name`         | `nullable`, `string`, `max:255`; its extension is kept when it is allowed and matches the content |
| `content_type` | `nullable`, `string`, `max:255`; ignored for the type decision (the stored bytes are sniffed)     |
| `bucket`       | `nullable`, `string`, `max:255`                                                                   |

After validation the controller checks, in order: the key exists on the disk, its size is within
`max_file_size_in_kb`, and the first 8 KB sniff to an allowed type. The file is stored as
`<slug(name)>.<extension>` (`file.<extension>` when the name slugs to nothing).

### Responses

| Status | Body                                                                         |
| ------ | ---------------------------------------------------------------------------- |
| 200    | `UploadResponse` (below)                                                     |
| 422    | Laravel error bag `{ "message": string, "errors": { "<field>": string[] } }` |
| 429    | Rate limited by `media-pro-uploads`                                          |
| 419    | CSRF token mismatch (from the app's `web` middleware)                        |

```json
{
  "uuid": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
  "name": "holiday",
  "file_name": "holiday.jpg",
  "preview_url": "https://app.test/storage/1/conversions/holiday-preview.jpg",
  "original_url": "https://app.test/storage/1/holiday.jpg",
  "size": 48213,
  "mime_type": "image/jpeg",
  "extension": "jpg"
}
```

`preview_url` is the `preview` conversion, else the original URL for images, else `null`.
`extension` is lowercase.

422 keys and messages besides the standard rule messages:

| Key            | Message                                           | Cause                                               |
| -------------- | ------------------------------------------------- | --------------------------------------------------- |
| `key`          | `The uploaded file could not be found.`           | s3: no object at `key`                              |
| `key`          | `The file may not be greater than {n} kilobytes.` | s3: object too large                                |
| `key`          | `The file type is not allowed.`                   | s3: content maps to no allowed extension            |
| `file` / `key` | `The file could not be stored.`                   | Spatie `FileCannotBeAdded`                          |
| `uuid`         | `The uuid has already been taken.`                | A concurrent request took the uuid after validation |
| `file`         | `The file extension is not allowed.`              | Client extension not on the allow-list              |

The uuid race is detected on every supported Laravel version: `UniqueConstraintViolationException`
on 10.20+, and on 10.2 to 10.19 a plain `QueryException` whose SQLSTATE or driver code marks a
unique violation (`Support\UniqueConstraintViolation::matches()`). Any other database error is
rethrown (500). Every rejection is logged at warning level as `media-pro: upload rejected` with
`route`, `uuid` (only when well-formed) and `reason` (field → failed rule names); never file
names, contents, tokens or the session id.

## `Models\TemporaryUpload`

Eloquent model on `temporary_uploads`, `HasMedia`; one media row in collection `default` on the
temporary upload disk. Replace it through `media-pro.temporary_upload_model` (must extend it).

```php
public const PREVIEW_CONVERSION = 'preview';

public static function previewManipulation(?Closure $manipulation): void; // null restores fit(Crop, 500, 500)
public static function currentSessionId(): string;                          // session()->getId()
public static function findByMediaUuid(string $uuid): ?static;              // any session
public static function findByMediaUuidInCurrentSession(string $uuid): ?static;
public static function createForFile(UploadedFile $file, string $sessionId, string $uuid, string $name): static;
public static function createForRemoteFile(string $key, string $sessionId, string $uuid, string $name, string $diskName, ?string $fileName = null): static;
public function scopeOld(Builder $query): Builder;                          // created_at <= now - threshold
```

- `findByMediaUuid()` returns `null` when the uuid is unknown or its media belongs to another
  model; the returned upload has its `media` relation set to that media.
  `findByMediaUuidInCurrentSession()` also returns `null` unless the upload's `session_id`
  matches the current session (`hash_equals`).
- `createForFile()` / `createForRemoteFile()` create the row and its media in one transaction and
  give the media the client uuid. On any failure the rows roll back, stored files are removed,
  and the exception (for example the unique-index `QueryException`) is rethrown.

```php
TemporaryUpload::previewManipulation(fn (Conversion $conversion) => $conversion->fit(Fit::Contain, 300, 300));

$upload = TemporaryUpload::findByMediaUuidInCurrentSession($uuid);
```

## `Support\MediaProValue`

```php
MediaProValue::fromMedia(Media $media): array      // the UploadResponse shape
MediaProValue::collection(iterable $media): array  // uuid-keyed initialValue
MediaProValue::previewUrl(Media $media): ?string
```

`collection()` adds `order` (0-based, iteration order) and `custom_properties` (an `ArrayObject`,
so an empty set encodes as `{}`) to each `fromMedia()` entry:

```php
'images' => MediaProValue::collection($post->getMedia('images')), // pass as initialValue
```

## Related

- [Technical](technical.md) · Client side:
  [upload transport API](../../../core/features/upload-transport/api.md)
