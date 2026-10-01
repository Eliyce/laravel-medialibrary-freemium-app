# Temporary Uploads Business

## What it is

When a user picks a file, the component uploads it right away. The server keeps it as a
**temporary upload**, tied to the user's session, until the form is submitted. Then the
controller moves it into the model's collection (see [Request Handling](../request-handling/business.md)).
Temporary uploads nobody claims are deleted after 24 hours by the
[cleanup command](../temporary-upload-cleanup/business.md).

## Endpoints

| Endpoint                 | Used for                                                                              |
| ------------------------ | ------------------------------------------------------------------------------------- |
| `POST /{prefix}/uploads` | Normal uploads: the file itself, its uuid and its name                                |
| `POST /{prefix}/s3`      | Vapor uploads: the browser already put the file on S3 under `tmp/`; this registers it |

Both answer with the file's details, which the component shows: uuid, name, file name, preview
URL, original URL, size, mime type and extension.

## Rules

- The uuid comes from the browser and must not exist yet. Reusing one is refused, even when two
  requests race.
- The file's content must match an allowed extension, and the client's extension must be allowed
  too. On the S3 path, the stored file keeps the client extension only when it is allowed and
  matches the content; otherwise it gets the extension the content implies.
- Files larger than `max_file_size_in_kb` are refused.
- S3 keys must be inside `tmp/` and may not contain `.` or `..` path segments.
- Images get a 500x500 cropped `preview`, generated right away. Apps can change it with
  `TemporaryUpload::previewManipulation(...)`.
- Rejected uploads are logged as warnings with the route, the uuid and the failed rules, never
  with file contents, file names, tokens or the session id.

## Showing existing media

`MediaProValue::collection($post->getMedia('images'))` builds the `initialValue` the components
expect: items keyed by uuid, in order, with preview URLs.

## Error States

| Situation                                                     | Response                            |
| ------------------------------------------------------------- | ----------------------------------- |
| Missing or disallowed file, too large                         | 422 under `file`                    |
| Missing, malformed or reused uuid                             | 422 under `uuid`                    |
| S3 key outside `tmp/`, missing, too large, disallowed content | 422 under `key`                     |
| Storage failure (Spatie `FileCannotBeAdded`)                  | 422 "The file could not be stored." |
| Too many uploads                                              | 429                                 |

## Related

- [technical.md](technical.md)
- [Core upload transport](../../../core/features/upload-transport/business.md)
