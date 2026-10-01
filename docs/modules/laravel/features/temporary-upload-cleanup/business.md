# Temporary Upload Cleanup Business

## What it is

Users often upload a file and never submit the form. Those temporary uploads, and their files,
stay on disk until something removes them. The cleanup command deletes every temporary upload
older than a set age (24 hours by default).

```php
// routes/console.php (Laravel 11+)
Schedule::command('media-pro:delete-old-temporary-uploads')->daily();
```

On Laravel 10, schedule it in the console kernel with `$schedule->command(...)->daily()`.

## Rules

- Only uploads older than `media-pro.delete_temporary_uploads_older_than_hours` are deleted.
- Their files and preview images are deleted with them.
- Media already claimed by a model is never touched: once claimed, it no longer belongs to a
  temporary upload.
- The command reports how many uploads it deleted.

## Related

- [technical.md](technical.md)
- [Temporary Uploads](../temporary-uploads/business.md)
