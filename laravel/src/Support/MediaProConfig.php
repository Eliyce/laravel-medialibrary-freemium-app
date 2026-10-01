<?php

namespace Eliyce\MediaPro\Support;

use Eliyce\MediaPro\Models\TemporaryUpload;
use Illuminate\Support\Facades\Config;
use InvalidArgumentException;
use Spatie\MediaLibrary\MediaCollections\Models\Media;

/**
 * The one place that resolves media-pro configuration, including the
 * fallbacks to the spatie/laravel-medialibrary settings.
 */
class MediaProConfig
{
    /**
     * @return class-string<TemporaryUpload>
     */
    public static function temporaryUploadModel(): string
    {
        $model = Config::get('media-pro.temporary_upload_model', TemporaryUpload::class);

        if (! is_string($model) || ! is_a($model, TemporaryUpload::class, true)) {
            throw new InvalidArgumentException(
                'media-pro.temporary_upload_model must be a class extending '.TemporaryUpload::class.'.'
            );
        }

        return $model;
    }

    /**
     * @return class-string<Media>
     */
    public static function mediaModel(): string
    {
        $model = Config::get('media-library.media_model', Media::class);

        if (! is_string($model) || ! is_a($model, Media::class, true)) {
            throw new InvalidArgumentException('media-library.media_model must be a class extending '.Media::class.'.');
        }

        return $model;
    }

    public static function temporaryUploadDisk(): string
    {
        $disk = Config::get('media-pro.temporary_upload_disk') ?? Config::get('media-library.disk_name', 'public');

        if (! is_string($disk) || $disk === '') {
            throw new InvalidArgumentException('media-pro.temporary_upload_disk must name a filesystem disk.');
        }

        return $disk;
    }

    /**
     * @return list<string>
     */
    public static function allowedExtensions(): array
    {
        $extensions = Config::get('media-pro.temporary_uploads_allowed_extensions') ?? DefaultAllowedExtensions::all();

        if (! is_array($extensions) || $extensions === []) {
            throw new InvalidArgumentException('media-pro.temporary_uploads_allowed_extensions must be a non-empty array.');
        }

        return array_values(array_unique(array_map(
            static fn ($extension): string => strtolower(ltrim((string) $extension, '.')),
            $extensions
        )));
    }

    public static function allowsExtension(string $extension): bool
    {
        return $extension !== '' && in_array(strtolower($extension), static::allowedExtensions(), true);
    }

    public static function maxFileSizeInKb(): int
    {
        $kilobytes = Config::get('media-pro.max_file_size_in_kb');

        if ($kilobytes === null) {
            $bytes = (int) Config::get('media-library.max_file_size', 1024 * 1024 * 10);

            return intdiv($bytes, 1024);
        }

        return (int) $kilobytes;
    }

    public static function deleteOlderThanHours(): int
    {
        return (int) Config::get('media-pro.delete_temporary_uploads_older_than_hours', 24);
    }

    public static function rateLimitPerMinute(): int
    {
        return max(1, (int) Config::get('media-pro.rate_limit_per_minute', 10));
    }
}
