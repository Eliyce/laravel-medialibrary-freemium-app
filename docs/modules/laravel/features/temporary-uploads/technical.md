# Temporary Uploads Technical

## Module Boundaries

| File                                                         | Owns                                                          |
| ------------------------------------------------------------ | ------------------------------------------------------------- |
| `laravel/src/Http/Controllers/UploadController.php`          | `POST {prefix}/uploads`                                       |
| `laravel/src/Http/Controllers/S3UploadController.php`        | `POST {prefix}/s3`, content sniffing, stored extension choice |
| `laravel/src/Http/Requests/UploadRequest.php`                | Upload validation rules                                       |
| `laravel/src/Http/Requests/S3UploadRequest.php`              | S3 validation rules                                           |
| `laravel/src/Http/Requests/Concerns/LogsRejectedUploads.php` | Structured warning log + `rejectUpload()` (422)               |
| `laravel/src/Models/TemporaryUpload.php`                     | Model, `preview` conversion, `scopeOld`, atomic create        |
| `laravel/src/Support/MediaProValue.php`                      | `fromMedia`, `collection`, `previewUrl`                       |
| `laravel/src/Support/StoredMediaFiles.php`                   | Best-effort removal of files left by a rolled-back write      |
| `laravel/src/Support/UniqueConstraintViolation.php`          | `matches(QueryException)`: is this a unique index violation?  |

## HTTP contract

| Endpoint                | Request                                                                                                                                                                       | 200 response     |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- |
| `POST {prefix}/uploads` | multipart: `file` required, `file`, `mimes:<allowed>`, `max:<kb>`, client extension allowed; `uuid` required, `uuid`, unique in the media table; `name` nullable string ≤ 255 | `UploadResponse` |
| `POST {prefix}/s3`      | JSON: `key` required string ≤ 1024 matching `\Atmp/[A-Za-z0-9!_.*'()\-/]+\z`, no `.`/`..` segments; `uuid` as above; `name`, `content_type`, `bucket` nullable strings ≤ 255  | `UploadResponse` |

`UploadResponse` (`MediaProValue::fromMedia`): `uuid`, `name`, `file_name`, `preview_url`
(`?string`), `original_url`, `size` (int), `mime_type` (`?string`), `extension` (lowercase).
Errors use Laravel's standard 422 body `{ message, errors: { field: [..] } }`; the throttle
middleware returns 429.

## Flow

```text
UploadRequest ─fail─▶ failedValidation → Log::warning(route, uuid?, reason) → 422
      │ ok
UploadController → TemporaryUpload::createForFile(file, session id, uuid, name)
      │   storeAtomically: DB::transaction { create row; addMedia → 'default' on temp disk; media.uuid = client uuid }
      │   on any Throwable: StoredMediaFiles::remove(media) then rethrow
      ├─ FileCannotBeAdded              → rejectUpload('file', ..) 422
      ├─ QueryException + UniqueConstraintViolation::matches() → rejectUpload('uuid', 'Unique') 422   (uuid race)
      ├─ any other QueryException     → rethrown (500)
      ▼
JsonResponse(MediaProValue::fromMedia(media))
```

`S3UploadController` checks the key exists on the temporary upload disk and its size, sniffs the
first 8 KB with `finfo` (never the client `content_type`), maps the mime type to the first allowed
extension, keeps the client extension from `name` when it is allowed and matches the content
(plain-text formats such as csv, md and json count as matching `text/plain`), then calls
`createForRemoteFile(key, session, uuid, name, disk, '<slug>.<ext>')`.

## uuid race on every supported Laravel version

The `unique` rule on `uuid` passes for two concurrent requests with the same uuid; the media
table's unique index then rejects the second insert inside `storeAtomically()`, which rolls back,
removes the stored file and rethrows. Both controllers catch `QueryException` and ask
`Support\UniqueConstraintViolation::matches()` whether it is a unique violation:

| Laravel    | What arrives                         | How `matches()` decides                                                                                                                                   |
| ---------- | ------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 10.20+     | `UniqueConstraintViolationException` | `instanceof` (guarded with `class_exists`, the class does not exist before 10.20)                                                                         |
| 10.2–10.19 | plain `QueryException`               | SQLSTATE `23505` (Postgres); or SQLSTATE class `23` plus driver code 1062 (MySQL/MariaDB), 2601 or 2627 (SQL Server), or the SQLite/driver unique message |

Other integrity errors share SQLSTATE `23000` (NOT NULL, foreign key) and do not match, so they
are rethrown instead of being reported as a taken uuid. The Laravel 10 CI leg installs only the
latest 10.x release, so nothing exercises the 10.2–10.19 path against a real install; the suite simulates it (`LegacyTemporaryUpload`)
and unit-tests `matches()` per driver (TD-19).

## `TemporaryUpload`

- `PREVIEW_CONVERSION = 'preview'`: `keepOriginalImageFormat()->nonQueued()`, default
  `fit(Fit::Crop, 500, 500)`, replaceable with `previewManipulation(?Closure)` (null restores it).
- `scopeOld()`: `created_at <= now() - deleteOlderThanHours()`.
- `currentSessionId()`: `session()->getId()`.
- `findByMediaUuid(string): ?static`: the upload holding the media with that uuid, in any
  session (one `MediaLookup::findByUuids` query plus one find), with its `media` relation set;
  `null` for an unknown uuid or media of another model.
- `findByMediaUuidInCurrentSession(string): ?static`: the same, `null` unless the upload's
  `session_id` `hash_equals` the current session id.
- `createForFile(UploadedFile, sessionId, uuid, name)`, `createForRemoteFile(key, sessionId, uuid,
name, diskName, ?fileName)`: both go through `storeAtomically()`. An empty name falls back to the
  client file name (without extension) or the key's basename.

## `MediaProValue`

- `collection(iterable<Media>)`: `[uuid => fromMedia() + order (0-based) + custom_properties]`,
  where `custom_properties` is an `ArrayObject` so an empty set encodes as `{}`.
- `previewUrl(Media)`: the generated `preview` conversion URL, else the original URL for
  `image/*`, else `null`.
- Every URL goes through the protected `url(Media, conversion)`: when
  `MediaProConfig::diskNeedsSignedUrls()` holds for the disk that holds the file (the conversions
  disk for the preview), it returns `getTemporaryUrl(now() + signed_url_expiration_minutes)`,
  else `getUrl()`.

## Testing Entry Points

- `laravel/tests/Feature/UploadControllerTest.php`: stored for the session with the response
  shape, preview size and customization, non-images without preview, invalid uploads (data
  provider) with nothing stored, uuid reuse and race, size fallback, configurable allow-list,
  rate limits, log contents.
- `laravel/tests/Feature/S3UploadControllerTest.php`: valid `tmp/` key, invalid keys (data
  provider), disallowed content, oversize, plain-text extensions kept, contradicting extension
  dropped, uuid race (including the pre-10.20 `QueryException` path via
  `laravel/tests/Support/LegacyTemporaryUpload.php`), uuid uniqueness, signed URLs on a private
  disk.
- `laravel/tests/Feature/TemporaryUploadTest.php`: `findByMediaUuid` in any session, unknown
  uuids and other models' media; `findByMediaUuidInCurrentSession` session scoping.
- `laravel/tests/Unit/UniqueConstraintViolationTest.php`: per-driver SQLSTATE, code and message
  cases (unique matches, NOT NULL and foreign key do not) and the 10.20+ exception class.
- `laravel/tests/Feature/MediaProValueTest.php`: value shape and order; signed URLs on a private
  signing disk, plain URLs on a public disk, with signing off, or on a disk that cannot sign;
  invalid expiry.
