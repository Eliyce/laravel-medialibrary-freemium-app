# Package Setup API

Package `eliyce/laravel-medialibrary-freemium-app`, namespace `Eliyce\MediaPro`. Requires PHP ^8.2, Laravel
`^10.2|^11.0|^12.0|^13.0` and `spatie/laravel-medialibrary ^11.0`.

## Service provider

`Eliyce\MediaPro\MediaProServiceProvider` is auto-discovered (`extra.laravel.providers`).

```php
public const RATE_LIMITER = 'media-pro-uploads';
```

| Hook       | Effect                                                                                                                         |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `register` | Merges `laravel/config/media-pro.php` under `media-pro`                                                                        |
| `boot`     | Console only: publish tags below, registers `media-pro:delete-old-temporary-uploads`                                           |
| `boot`     | Registers the `Route::mediaLibrary()` macro                                                                                    |
| `booted`   | Defines the `media-pro-uploads` limiter (`Limit::perMinute(rate_limit_per_minute)->by(ip)`) unless the app already defined one |

## Route macro

```php
Route::mediaLibrary(string $prefix = 'media-library-pro'): void
```

Registers, in a group with `prefix => $prefix` and `middleware => 'throttle:media-pro-uploads'`:

| Method | URI                 | Action               | Contract                                             |
| ------ | ------------------- | -------------------- | ---------------------------------------------------- |
| POST   | `/{prefix}/uploads` | `UploadController`   | [temporary uploads API](../temporary-uploads/api.md) |
| POST   | `/{prefix}/s3`      | `S3UploadController` | [temporary uploads API](../temporary-uploads/api.md) |

The routes have no name and no session middleware of their own; register them where the
session and CSRF middleware run (normally `routes/web.php`) and add auth yourself:

```php
Route::middleware('auth')->group(fn () => Route::mediaLibrary());
```

Replace the limiter by defining one with the same name anywhere in the app:

```php
RateLimiter::for('media-pro-uploads', fn (Request $request) => Limit::perMinute(30)->by($request->user()?->id ?: $request->ip()));
```

## Config: `config/media-pro.php`

| Key                                         | Default                           | Meaning                                                                          |
| ------------------------------------------- | --------------------------------- | -------------------------------------------------------------------------------- |
| `temporary_upload_model`                    | `Models\TemporaryUpload::class`   | Must extend `TemporaryUpload`                                                    |
| `temporary_uploads_allowed_extensions`      | `DefaultAllowedExtensions::all()` | Non-empty list; content and client extension must match it                       |
| `max_file_size_in_kb`                       | `null`                            | `null` falls back to `media-library.max_file_size` (bytes) / 1024, default 10240 |
| `delete_temporary_uploads_older_than_hours` | `24`                              | Cleanup threshold                                                                |
| `temporary_upload_disk`                     | `null`                            | `null` falls back to `media-library.disk_name`, then `'public'`                  |
| `rate_limit_per_minute`                     | `10`                              | Per IP for the default limiter; at least 1                                       |
| `signed_url_expiration_minutes`             | `60`                              | Signed `preview_url`/`original_url` lifetime on private disks; `null` disables   |

## Publish tags

| Tag                    | Publishes                                                            |
| ---------------------- | -------------------------------------------------------------------- |
| `media-pro-config`     | `config/media-pro.php`                                               |
| `media-pro-migrations` | `database/migrations/{Y_m_d_His}_create_temporary_uploads_table.php` |

```bash
php artisan vendor:publish --tag=media-pro-migrations && php artisan migrate
```

Table `temporary_uploads`: `id`, `session_id` (string, indexed), `created_at`, `updated_at`.

## Helpers

```php
Support\DefaultAllowedExtensions::all(): list<string> // images, documents, archives, audio, video; no svg/html/xml/php

// Support\MediaProConfig: the typed accessor every package class reads config through.
MediaProConfig::temporaryUploadModel(): class-string<TemporaryUpload>
MediaProConfig::mediaModel(): class-string<Media>          // media-library.media_model
MediaProConfig::temporaryUploadDisk(): string
MediaProConfig::allowedExtensions(): list<string>          // lowercased, dot-stripped, unique
MediaProConfig::allowsExtension(string $extension): bool   // '' is never allowed
MediaProConfig::maxFileSizeInKb(): int
MediaProConfig::deleteOlderThanHours(): int
MediaProConfig::rateLimitPerMinute(): int                  // max(1, value)
```

Invalid values throw `InvalidArgumentException` (wrong model class, empty disk, empty or
non-array allow-list).

## Related

- [Technical](technical.md) ·
  [API registry](../../../../instructions/registries/api-registry.md#composer-eliycelaravel-media-pro)
