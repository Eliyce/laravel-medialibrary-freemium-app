<?php

namespace Eliyce\MediaPro\Commands;

use Eliyce\MediaPro\Support\MediaProConfig;
use Illuminate\Console\Command;

class DeleteOldTemporaryUploadsCommand extends Command
{
    protected $signature = 'media-pro:delete-old-temporary-uploads';

    protected $description = 'Delete temporary uploads (and their files) older than media-pro.delete_temporary_uploads_older_than_hours';

    public function handle(): int
    {
        $temporaryUploadModel = MediaProConfig::temporaryUploadModel();
        $deleted = 0;

        // Model deletes (not a bulk query) so medialibrary removes the files too.
        $temporaryUploadModel::query()->old()->lazyById(100)->each(function ($temporaryUpload) use (&$deleted): void {
            $temporaryUpload->delete();
            $deleted++;
        });

        $this->info("Deleted {$deleted} temporary upload(s) older than ".MediaProConfig::deleteOlderThanHours().' hour(s).');

        return self::SUCCESS;
    }
}
