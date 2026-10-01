<?php

namespace Eliyce\MediaPro\Concerns;

use Spatie\MediaLibrary\InteractsWithMedia;

/**
 * Drop-in replacement for Spatie's InteractsWithMedia: swap
 * `use InteractsWithMedia;` for `use InteractsWithMediaPro;` and the
 * addFromMediaLibraryRequest / syncFromMediaLibraryRequest methods are
 * served by this package instead of the commercial media-library-pro.
 */
trait InteractsWithMediaPro
{
    use InteractsWithMedia, HandlesMediaLibraryRequests {
        HandlesMediaLibraryRequests::addFromMediaLibraryRequest insteadof InteractsWithMedia;
        HandlesMediaLibraryRequests::syncFromMediaLibraryRequest insteadof InteractsWithMedia;
    }
}
