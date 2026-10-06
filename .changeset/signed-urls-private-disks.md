---
'@eliyce/laravel-medialibrary-freemium-app': patch
---

`eliyce/laravel-medialibrary-freemium-app`: files on a private disk now get temporary signed URLs. When the disk
that holds a file has a `visibility` other than `public` and can sign URLs (for example a
private S3 bucket on Laravel Vapor), `preview_url` and `original_url` in upload responses and in
`MediaProValue::collection()` are signed URLs instead of plain ones, which the bucket rejected
with 403. They last `media-pro.signed_url_expiration_minutes` (default 60); set it to `null` to
keep plain URLs.
