# Integration Registry

External systems the packages integrate with.

| System                                              | Side    | Purpose                                                                             | Configuration                                                                             |
| --------------------------------------------------- | ------- | ----------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `spatie/laravel-medialibrary` ^11                   | Laravel | Media rows, file storage, `preview` conversion, `Media::copy`, `InteractsWithMedia` | `media-library.media_model`, `disk_name`, `max_file_size` (read through `MediaProConfig`) |
| Laravel filesystem disks (local, S3)                | Laravel | Temporary upload storage; S3 `tmp/` objects on the Vapor path                       | `media-pro.temporary_upload_disk`, falling back to `media-library.disk_name`              |
| Laravel session                                     | Laravel | Scopes temporary uploads to the session that created them                           | App session config; the routes must use the `web` group                                   |
| Laravel rate limiter (cache)                        | Laravel | `media-pro-uploads` limiter on both endpoints                                       | `media-pro.rate_limit_per_minute`, or an app-defined limiter                              |
| Laravel CSRF protection                             | Both    | The client sends `X-XSRF-TOKEN` (cookie) or `X-CSRF-TOKEN` (meta tag)               | App middleware                                                                            |
| Laravel Vapor signed storage (`laravel/vapor-core`) | Both    | Signed S3 PUT URL for `vapor: true` uploads                                         | Client `vaporSignedStorageUrl` (default `vapor/signed-storage-url`); not provided here    |
| Amazon S3 (direct PUT)                              | JS      | The browser uploads to the signed URL, without cookies or CSRF token                | Returned by Vapor                                                                         |
| PHP `fileinfo` and Symfony Mime                     | Laravel | Sniff S3 object content and map mime types to extensions                            | PHP `fileinfo` extension                                                                  |
| Inertia.js (optional)                               | JS      | `props.errors` passed as `errors`                                                   | None                                                                                      |
| Tailwind CSS                                        | JS      | Compiles `styles/media-pro.css`                                                     | The consumer's Tailwind build                                                             |

## Distribution integration

| System       | Package                    | Configuration                                                                                                                                       |
| ------------ | -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| npm registry | `@eliyce/media-pro`        | `package.json#publishConfig.access: public`, `files: [dist, styles]`, changesets                                                                    |
| Packagist    | `eliyce/laravel-media-pro` | Root `composer.json`; `.gitattributes` export-ignore keeps JS and dev files out of the archive; releases come from the shared `vX.Y.Z` tags (TD-17) |
