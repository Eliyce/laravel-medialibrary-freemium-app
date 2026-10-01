# Package Setup Business

## What it is

Everything an app does once to use Media Pro on the server: install the package, create the
`temporary_uploads` table, register the upload routes and, optionally, tune the config.

```bash
composer require eliyce/laravel-media-pro
php artisan vendor:publish --tag=media-pro-migrations && php artisan migrate
php artisan vendor:publish --tag=media-pro-config   # optional
```

```php
// routes/web.php
Route::mediaLibrary();                       // POST /media-library-pro/uploads and /s3
Route::middleware('auth')->group(fn () => Route::mediaLibrary()); // recommended: signed-in users only
```

## Settings (`config/media-pro.php`)

| Key                                         | Default                                  | Meaning                                              |
| ------------------------------------------- | ---------------------------------------- | ---------------------------------------------------- |
| `temporary_upload_model`                    | `Eliyce\MediaPro\Models\TemporaryUpload` | Your own subclass, if you need one                   |
| `temporary_uploads_allowed_extensions`      | `DefaultAllowedExtensions::all()`        | File types the upload endpoints accept               |
| `max_file_size_in_kb`                       | `null` → `media-library.max_file_size`   | Largest upload                                       |
| `delete_temporary_uploads_older_than_hours` | `24`                                     | Age at which the cleanup command deletes uploads     |
| `temporary_upload_disk`                     | `null` → `media-library.disk_name`       | Disk for temporary uploads (your S3 disk with Vapor) |
| `rate_limit_per_minute`                     | `10`                                     | Uploads per minute per IP for the default limiter    |

The default extensions cover common images, documents, archives, audio and video. SVG, HTML, XML
and PHP are left out on purpose, because a browser can run script inside them.

## Rules

- The routes must run with a session (the `web` group), because temporary uploads belong to the
  session that created them.
- Both upload routes are rate limited by the `media-pro-uploads` limiter. An app that defines its
  own limiter with that name replaces the default entirely.
- The package supports PHP 8.2+ and Laravel 10.2 through 13.

## Related

- [technical.md](technical.md)
- [Temporary Uploads](../temporary-uploads/business.md)
