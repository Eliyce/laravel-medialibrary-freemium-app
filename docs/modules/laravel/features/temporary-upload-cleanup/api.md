# Temporary Upload Cleanup API

## Artisan command

```bash
php artisan media-pro:delete-old-temporary-uploads
# Deleted 3 temporary upload(s) older than 24 hour(s).
```

| Item       | Value                                                                                                                              |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Signature  | `media-pro:delete-old-temporary-uploads` (no arguments or options)                                                                 |
| Class      | `Eliyce\MediaPro\Commands\DeleteOldTemporaryUploadsCommand`                                                                        |
| Deletes    | Rows of `media-pro.temporary_upload_model` with `created_at` at or before now minus the threshold, with their media rows and files |
| Threshold  | `media-pro.delete_temporary_uploads_older_than_hours` (default `24`)                                                               |
| Exit code  | `0`                                                                                                                                |
| Registered | Only when the app runs in the console                                                                                              |

The package does not schedule it. Schedule it in the app:

```php
Schedule::command('media-pro:delete-old-temporary-uploads')->daily();
```

## Model scope

```php
TemporaryUpload::query()->old(); // scopeOld(): created_at <= now()->subHours(threshold)
```

## Related

- [Technical](technical.md)
