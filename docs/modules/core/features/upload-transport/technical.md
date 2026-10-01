# Upload Transport Technical

## Module Boundaries

| File                 | Owns                                                                                           |
| -------------------- | ---------------------------------------------------------------------------------------------- |
| `src/core/upload.ts` | `uploadFile`, `createXhrTransport`, `joinUrl`, `parseUploadResponse`, abort helpers (internal) |
| `src/core/csrf.ts`   | `getCsrfHeaders(doc?)` (public)                                                                |
| `src/core/uuid.ts`   | `generateUuid()` (public)                                                                      |

Only `getCsrfHeaders`, `generateUuid` and the transport types are public. The uploader is driven
by `MediaLibrary`.

## Requests

Base headers: `Accept: application/json`, `X-Requested-With: XMLHttpRequest`, plus the CSRF header.
Credentials: `include` when `uploadDomain` is set, else `same-origin`. URLs come from
`joinUrl(uploadDomain, ...parts)`, which strips trailing and duplicate slashes.

| Mode   | Step | Request                                                                                                          |
| ------ | ---- | ---------------------------------------------------------------------------------------------------------------- |
| direct | 1    | `POST {domain}/{routePrefix}/uploads`, multipart `file`, `uuid`, `name`, with progress                           |
| vapor  | 1    | `POST {domain}/{vaporSignedStorageUrl}` JSON `{ bucket: '', content_type, visibility: null }`                    |
| vapor  | 2    | `PUT {url}` with the returned headers (minus `Host`), body = file, `credentials: 'omit'`, no CSRF, with progress |
| vapor  | 3    | `POST {domain}/{routePrefix}/s3` JSON `{ key, bucket, uuid, name, content_type }`                                |

A failed vapor step 1 returns its status. A missing `url`/`key` in step 1, or a failed step 2,
counts as a 500.

## Response mapping

`parseUploadResponse` copies only fields of the right type: strings `uuid`, `name`, `file_name`,
`mime_type`, `extension`; string-or-null `preview_url`, `original_url`; finite number `size`.

| Status               | Outcome                                                         |
| -------------------- | --------------------------------------------------------------- |
| 2xx with object body | `{ ok: true, response }`                                        |
| 2xx without object   | `somethingWentWrong`                                            |
| 422                  | Every string in `errors.*` (string or string[]), else `message` |
| 429                  | `translations.tryAgain`                                         |
| other                | `translations.somethingWentWrong`                               |
| thrown (network)     | `somethingWentWrong`, with `cause`                              |
| aborted              | rejects with an `AbortError`; the store ignores it              |

## Transport

`createXhrTransport()` uses `XMLHttpRequest` because, unlike `fetch`, it reports upload progress.
It resolves `{ status, body }` for every completed response (body is parsed JSON or `null`), and
rejects on network error or abort. It fails with a clear error where `XMLHttpRequest` does not
exist. Pass `config.fetch` (an `UploadTransport`) to replace it, which the tests do.

## CSRF and uuids

- `getCsrfHeaders()` returns `{ 'X-XSRF-TOKEN': <URL-decoded XSRF-TOKEN cookie> }`, else
  `{ 'X-CSRF-TOKEN': <meta csrf-token> }`, else `{}`. A malformed cookie falls through to the meta
  tag. Without `document` it returns `{}`.
- `generateUuid()` uses `crypto.randomUUID`, else builds a v4 uuid from `crypto.getRandomValues`,
  else throws `Error`.

## Dependencies

`translations.ts` (messages) and `value.ts` (`isRecord`). No runtime packages.

## Testing Entry Points

- `tests/core/upload.test.ts`: direct and vapor request shapes, headers, credentials, URL
  joining, 422/429/500/network mapping, malformed bodies, and the XHR transport (progress, abort,
  network error).
- `tests/core/csrf.test.ts`, `tests/core/uuid.test.ts`.
