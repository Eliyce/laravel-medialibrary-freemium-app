# Temporary Upload Cleanup Technical

## Module Boundaries

| File                                                        | Owns                                     |
| ----------------------------------------------------------- | ---------------------------------------- |
| `laravel/src/Commands/DeleteOldTemporaryUploadsCommand.php` | `media-pro:delete-old-temporary-uploads` |
| `laravel/src/Models/TemporaryUpload.php`                    | `scopeOld()`                             |

## Behavior

```php
$model::query()->old()->lazyById(100)->each(fn ($upload) => $upload->delete());
```

- The model class comes from `MediaProConfig::temporaryUploadModel()`.
- `lazyById(100)` streams rows in chunks, so memory stays flat however many uploads exist
  (RULE-6).
- Model deletes (not a bulk query) let `InteractsWithMedia` remove the media rows and files.
- Output: `Deleted {n} temporary upload(s) older than {hours} hour(s).`; exit code `0`.
- Registered only when the app runs in the console. Not scheduled by the package; the app
  schedules it.

## Testing Entry Points

`laravel/tests/Feature/DeleteOldTemporaryUploadsCommandTest.php`: only uploads older than the
threshold are deleted, the threshold is configurable, and an empty run reports zero.
