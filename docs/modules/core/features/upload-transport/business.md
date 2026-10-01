# Upload Transport Business

## What it is

The part of the core that sends a file to the Laravel app. It uploads as soon as a file is
picked, so the form submit only has to send small uuids instead of files.

## How an upload works

1. The browser gives the file a new uuid.
2. It posts the file, uuid and name to `/{routePrefix}/uploads` and reports progress as it goes.
3. The server stores it as a temporary upload and answers with the file's details (name, size,
   preview URL, ...).
4. When the form is submitted, the server moves the temporary upload into the model's collection
   using the uuid.

With **Laravel Vapor** (`vapor: true`) the file goes straight to S3 instead: the browser asks Vapor
for a signed URL, uploads to S3, then tells the app which `tmp/` key to register.

## Rules

- Requests carry Laravel's CSRF token (from the `XSRF-TOKEN` cookie or the `csrf-token` meta tag),
  so the routes work inside the `web` middleware group.
- Cookies are sent cross-origin only when `uploadDomain` is set. The S3 upload itself never
  carries cookies or the CSRF token.
- Removing or replacing a file, or unmounting the component, cancels its upload.
- The client uuid stays the item's identity end to end. The server must keep it.
- Uuids come from the browser's cryptographic random source. Without one, uploading fails loudly
  rather than using a guessable id.

## Error States

| Response                                              | Message on the item                                 |
| ----------------------------------------------------- | --------------------------------------------------- |
| 422                                                   | The server's validation messages (or its `message`) |
| 429                                                   | `tryAgain`: "please try uploading this file again"  |
| Other status, network error, bad JSON, failed S3 step | `somethingWentWrong`                                |

## Related

- [technical.md](technical.md)
- [Laravel temporary uploads](../../../laravel/features/temporary-uploads/business.md)
