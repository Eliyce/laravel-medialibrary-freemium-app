<?php

namespace Eliyce\MediaPro\Support;

use ArrayObject;
use Eliyce\MediaPro\Models\TemporaryUpload;
use Spatie\MediaLibrary\MediaCollections\Models\Media;

/**
 * Builds the JSON shapes the media components read: the UploadResponse the
 * upload endpoints return and the uuid-keyed value used as `initialValue`.
 */
class MediaProValue
{
    /**
     * The UploadResponse shape.
     *
     * @return array{uuid: string, name: string, file_name: string, preview_url: ?string, original_url: string, size: int, mime_type: ?string, extension: string}
     */
    public static function fromMedia(Media $media): array
    {
        return [
            'uuid' => (string) $media->uuid,
            'name' => (string) $media->name,
            'file_name' => (string) $media->file_name,
            'preview_url' => static::previewUrl($media),
            'original_url' => $media->getUrl(),
            'size' => (int) $media->size,
            'mime_type' => $media->mime_type,
            'extension' => strtolower((string) $media->extension),
        ];
    }

    /**
     * A uuid-keyed value in iteration order, ready to pass as `initialValue`.
     * `custom_properties` is an ArrayObject so an empty set encodes as `{}`.
     *
     * @param  iterable<Media>  $media
     * @return array<string, array<string, mixed>>
     */
    public static function collection(iterable $media): array
    {
        $value = [];
        $order = 0;

        foreach ($media as $item) {
            $value[(string) $item->uuid] = static::fromMedia($item) + [
                'order' => $order++,
                'custom_properties' => new ArrayObject((array) $item->custom_properties),
            ];
        }

        return $value;
    }

    /**
     * The generated `preview` conversion when there is one, else the original
     * URL for images, else null.
     */
    public static function previewUrl(Media $media): ?string
    {
        if ($media->hasGeneratedConversion(TemporaryUpload::PREVIEW_CONVERSION)) {
            return $media->getUrl(TemporaryUpload::PREVIEW_CONVERSION);
        }

        if (str_starts_with((string) $media->mime_type, 'image/')) {
            return $media->getUrl();
        }

        return null;
    }
}
