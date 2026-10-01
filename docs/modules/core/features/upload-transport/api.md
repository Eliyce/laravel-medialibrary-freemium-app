# Upload Transport API

Source: `src/core/upload.ts`, `src/core/csrf.ts`, `src/core/uuid.ts`, `src/core/types.ts`.
`getCsrfHeaders`, `generateUuid` and the types are exported from `@eliyce/media-pro` and
`@eliyce/media-pro/core`; the upload functions themselves are internal and run through
`MediaLibrary`.

## Exports

| Export           | Signature                                                |
| ---------------- | -------------------------------------------------------- |
| `getCsrfHeaders` | `(doc?: CsrfDocument \| null) => Record<string, string>` |
| `generateUuid`   | `() => string` (RFC 4122 v4)                             |

- `getCsrfHeaders` returns `{ 'X-XSRF-TOKEN': <URL-decoded XSRF-TOKEN cookie> }`, else
  `{ 'X-CSRF-TOKEN': <meta[name="csrf-token"] content> }`, else `{}`. Without `doc` it reads the
  global `document`; where none exists (SSR, workers) it returns `{}`.
- `generateUuid` uses `crypto.randomUUID`, else `crypto.getRandomValues`; it throws `Error` when
  neither exists instead of falling back to a predictable id.

## Injectable transport

Pass `fetch: UploadTransport` to `MediaLibrary` (or the React components) to replace the default
XMLHttpRequest transport.

```ts
type UploadTransport = (request: UploadRequest) => Promise<UploadTransportResponse>;

interface UploadRequest {
  method: 'POST' | 'PUT';
  url: string;
  headers: Record<string, string>;
  body: FormData | Blob | string;
  credentials: 'include' | 'same-origin' | 'omit';
  signal: AbortSignal;
  onProgress?: (percent: number) => void; // 0..100
}

interface UploadTransportResponse {
  status: number;
  body: unknown; // parsed JSON, or null
}
```

```ts
const fetchTransport: UploadTransport = async (request) => {
  const response = await fetch(request.url, {
    method: request.method,
    headers: request.headers,
    body: request.body,
    credentials: request.credentials,
    signal: request.signal,
  });
  return { status: response.status, body: await response.json().catch(() => null) };
};
```

Contract: resolve with the status and parsed body for every completed response (any status);
reject on network errors; reject with an error named `AbortError` when `signal` aborts. The
default transport behaves exactly this way and throws when `XMLHttpRequest` does not exist.

## Requests the uploader sends

Every request to the app carries `Accept: application/json`, `X-Requested-With: XMLHttpRequest`
and the `getCsrfHeaders()` header. URLs are `{uploadDomain}/{routePrefix}/...` with duplicate
slashes collapsed. Credentials are `include` when `uploadDomain` is set, else `same-origin`.

### Direct (default)

`POST /{routePrefix}/uploads`, multipart `FormData`: `file`, `uuid` (client-generated), `name`
(the item's current name). Upload progress is reported.

### Vapor (`vapor: true`)

| Step | Request                                                                                                                    |
| ---- | -------------------------------------------------------------------------------------------------------------------------- |
| 1    | `POST /{vaporSignedStorageUrl}`, JSON `{ bucket: '', content_type, visibility: null }` → `{ url, key, bucket?, headers? }` |
| 2    | `PUT {url}` with the file, the signed headers (minus `Host`), `credentials: 'omit'`, no CSRF header. Progress is reported  |
| 3    | `POST /{routePrefix}/s3`, JSON `{ key, bucket, uuid, name, content_type }`                                                 |

Step 1 is served by `laravel/vapor-core` in the app, steps 2 and 3 by S3 and this package.

## Response handling

| Response                                  | Outcome                                                                                   |
| ----------------------------------------- | ----------------------------------------------------------------------------------------- |
| 2xx with an object body                   | Success; typed `UploadResponse` fields are merged into the item (the client uuid is kept) |
| 2xx without an object body                | Failure: `somethingWentWrong`                                                             |
| 422                                       | Failure: every string in `body.errors`, else `body.message`, else `somethingWentWrong`    |
| 429                                       | Failure: `tryAgain`                                                                       |
| Any other status, network error           | Failure: `somethingWentWrong` (network errors carry `cause`)                              |
| Vapor step 1 not 2xx                      | That response is handled as above                                                         |
| Vapor step 1 body invalid, step 2 not 2xx | Failure: `somethingWentWrong`                                                             |
| Abort                                     | Silent (no error state, no `afterUpload`)                                                 |

```ts
interface UploadResponse {
  uuid: string;
  name: string;
  file_name: string;
  preview_url: string | null;
  original_url: string | null;
  size: number;
  mime_type: string;
  extension: string;
}
```

Fields with the wrong type are ignored rather than trusted. Failures reach `afterUpload` as
`{ success: false, uuid, errors, status?, cause? }`.

## Related

- [Technical](technical.md) · Server side:
  [temporary uploads API](../../../laravel/features/temporary-uploads/api.md)
