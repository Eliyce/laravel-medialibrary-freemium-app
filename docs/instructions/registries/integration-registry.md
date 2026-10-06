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

| System            | Package                                     | Configuration                                                                                                                                                                                                                                                    |
| ----------------- | ------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| npm registry      | `@eliyce/laravel-medialibrary-freemium-app` | `package.json#publishConfig.access: public`, `files: [dist, styles]`, changesets. Published by `release.yml` with the `NPM_TOKEN` repository secret (a granular access token with publish rights to `@eliyce`, passed as `NODE_AUTH_TOKEN`); no provenance       |
| Private Packagist | `eliyce/laravel-medialibrary-freemium-app`  | Root `composer.json`; `.gitattributes` export-ignore keeps JS and dev files out of the archive. Added through the Private Packagist GitHub integration, whose webhook picks up each shared `vX.Y.Z` tag the release pushes (D-01M48MD0P9JJDVV7Q7NRM6Q6WJ, TD-17) |
| GitHub Actions    | Both                                        | `.github/workflows/ci.yml` (pull requests, pushes to `main`) and `.github/workflows/release.yml` (pushes to `production`). The release job uses `GITHUB_TOKEN` with `contents: write` to push the tag and create the GitHub release                              |
| GitHub Releases   | Both                                        | One release per `vX.Y.Z` tag, notes taken from that version's `CHANGELOG.md` section                                                                                                                                                                             |
