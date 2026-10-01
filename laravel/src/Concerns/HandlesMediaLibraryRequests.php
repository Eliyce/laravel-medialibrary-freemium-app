<?php

namespace Eliyce\MediaPro\Concerns;

use Eliyce\MediaPro\PendingMediaLibraryRequestHandler;

/**
 * The media library request entry points. Use InteractsWithMediaPro on your
 * models; it combines this trait with Spatie's InteractsWithMedia.
 */
trait HandlesMediaLibraryRequests
{
    /**
     * Attach the submitted media to a collection, keeping media not in the request.
     *
     * @param  array<array-key, mixed>|null  $mediaLibraryRequestItems
     */
    public function addFromMediaLibraryRequest(?array $mediaLibraryRequestItems): PendingMediaLibraryRequestHandler
    {
        return new PendingMediaLibraryRequestHandler($mediaLibraryRequestItems ?? [], $this, preserveExisting: true);
    }

    /**
     * Make the collection match the submitted media, deleting media not in the request.
     *
     * @param  array<array-key, mixed>|null  $mediaLibraryRequestItems
     */
    public function syncFromMediaLibraryRequest(?array $mediaLibraryRequestItems): PendingMediaLibraryRequestHandler
    {
        return new PendingMediaLibraryRequestHandler($mediaLibraryRequestItems ?? [], $this, preserveExisting: false);
    }
}
