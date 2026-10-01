<?php

namespace Eliyce\MediaPro\Support;

use Illuminate\Support\Facades\Log;
use Spatie\MediaLibrary\MediaCollections\Filesystem;
use Spatie\MediaLibrary\MediaCollections\Models\Media;
use Throwable;

/**
 * Best-effort removal of files that belong to media rows a failed write rolled
 * back. A file that cannot be removed is logged, never rethrown, so the
 * original failure is what the caller sees.
 */
class StoredMediaFiles
{
    public static function remove(Media $media, string $reason): void
    {
        try {
            app(Filesystem::class)->removeAllFiles($media);
        } catch (Throwable $exception) {
            Log::error('media-pro: could not remove stored media files', [
                'reason' => $reason,
                'media_id' => $media->getKey(),
                'disk' => $media->disk,
                'exception' => $exception::class,
            ]);
        }
    }
}
