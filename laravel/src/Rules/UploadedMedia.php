<?php

namespace Eliyce\MediaPro\Rules;

use Closure;
use Eliyce\MediaPro\Support\MediaLookup;
use Illuminate\Contracts\Validation\DataAwareRule;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Spatie\MediaLibrary\MediaCollections\Models\Media;
use Symfony\Component\Mime\MimeTypes;
use Throwable;

/**
 * Validates one `field.*.uuid` value: the uuid must refer to a temporary
 * upload of the current session or to existing (non-temporary) media, and the
 * file must satisfy the configured size, type and image dimension bounds.
 *
 * With an owner scope (MediaRules::forModel()) existing media is accepted only
 * from that model's collection; anything else fails with the generic message
 * before the size, type and dimension checks, so nothing about it is revealed.
 *
 * All uuids of the surrounding field are loaded in one query on first use.
 */
class UploadedMedia implements DataAwareRule, ValidationRule
{
    /** @var array<string, mixed> */
    protected array $data = [];

    /** @var array<string, Media|null> claimable media by uuid; null when unknown or not claimable */
    protected array $media = [];

    /**
     * @param  list<string>  $extensions
     * @param  list<string>  $mimeTypes
     */
    public function __construct(
        public readonly ?int $minSizeInKb = null,
        public readonly ?int $maxSizeInKb = null,
        public readonly array $extensions = [],
        public readonly array $mimeTypes = [],
        public readonly ?int $minWidth = null,
        public readonly ?int $maxWidth = null,
        public readonly ?int $minHeight = null,
        public readonly ?int $maxHeight = null,
        public readonly bool $scopedToOwner = false,
        public readonly ?string $ownerType = null,
        public readonly ?string $ownerKey = null,
        public readonly ?string $ownerCollection = null,
    ) {}

    /**
     * @param  array<string, mixed>  $data
     */
    public function setData(array $data): static
    {
        $this->data = $data;

        return $this;
    }

    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        $media = is_string($value) ? $this->findMedia($attribute, $value) : null;

        if ($media === null) {
            $fail('The :attribute must refer to an uploaded file.')->translate();

            return;
        }

        $this->validateSize($media, $fail);
        $this->validateType($media, $fail);
        $this->validateDimensions($media, $fail);
    }

    protected function validateSize(Media $media, Closure $fail): void
    {
        $size = (int) $media->size;

        if ($this->minSizeInKb !== null && $size < $this->minSizeInKb * 1024) {
            $fail('The :attribute must be at least :min kilobytes.')->translate(['min' => $this->minSizeInKb]);
        }

        if ($this->maxSizeInKb !== null && $size > $this->maxSizeInKb * 1024) {
            $fail('The :attribute may not be greater than :max kilobytes.')->translate(['max' => $this->maxSizeInKb]);
        }
    }

    protected function validateType(Media $media, Closure $fail): void
    {
        $mimeType = strtolower((string) $media->mime_type);

        if ($this->extensions !== [] && ! $this->matchesExtension($media, $mimeType)) {
            $fail('The :attribute must be a file of type: :values.')->translate(['values' => implode(', ', $this->extensions)]);
        }

        if ($this->mimeTypes !== [] && ! $this->matchesMimeType($mimeType)) {
            $fail('The :attribute must be a file of type: :values.')->translate(['values' => implode(', ', $this->mimeTypes)]);
        }
    }

    protected function validateDimensions(Media $media, Closure $fail): void
    {
        if ($this->minWidth === null && $this->minHeight === null) {
            return;
        }

        $size = $this->imageSize($media);

        if ($size === null) {
            $fail('The :attribute must be an image.')->translate();

            return;
        }

        [$width, $height] = $size;

        if ($this->minWidth !== null && ($width < $this->minWidth || $width > $this->maxWidth)) {
            $fail($this->minWidth === $this->maxWidth
                ? 'The :attribute must be :min pixels wide.'
                : 'The :attribute must be between :min and :max pixels wide.'
            )->translate(['min' => $this->minWidth, 'max' => $this->maxWidth]);
        }

        if ($this->minHeight !== null && ($height < $this->minHeight || $height > $this->maxHeight)) {
            $fail($this->minHeight === $this->maxHeight
                ? 'The :attribute must be :min pixels high.'
                : 'The :attribute must be between :min and :max pixels high.'
            )->translate(['min' => $this->minHeight, 'max' => $this->maxHeight]);
        }
    }

    protected function matchesExtension(Media $media, string $mimeType): bool
    {
        if (in_array(strtolower((string) $media->extension), $this->extensions, true)) {
            return true;
        }

        $mimeTypes = MimeTypes::getDefault();

        foreach ($this->extensions as $extension) {
            if (in_array($mimeType, $mimeTypes->getMimeTypes($extension), true)) {
                return true;
            }
        }

        return false;
    }

    protected function matchesMimeType(string $mimeType): bool
    {
        foreach ($this->mimeTypes as $allowed) {
            if ($allowed === $mimeType) {
                return true;
            }

            if (str_ends_with($allowed, '/*') && str_starts_with($mimeType, substr($allowed, 0, -1))) {
                return true;
            }
        }

        return false;
    }

    /**
     * @return array{int, int}|null
     */
    protected function imageSize(Media $media): ?array
    {
        if (! str_starts_with(strtolower((string) $media->mime_type), 'image/')) {
            return null;
        }

        try {
            $contents = Storage::disk($media->disk)->get($media->getPathRelativeToRoot());
        } catch (Throwable) {
            return null;
        }

        $size = is_string($contents) ? @getimagesizefromstring($contents) : false;

        return $size === false ? null : [(int) $size[0], (int) $size[1]];
    }

    protected function findMedia(string $attribute, string $uuid): ?Media
    {
        if (! array_key_exists($uuid, $this->media)) {
            $this->preload(array_unique([$uuid, ...$this->siblingUuids($attribute)]));
        }

        return $this->media[$uuid] ?? null;
    }

    /**
     * The uuids of every item in the field `$attribute` belongs to
     * (`images.<key>.uuid` → all uuids under `images`).
     *
     * @return list<string>
     */
    protected function siblingUuids(string $attribute): array
    {
        if (substr_count($attribute, '.') < 2) {
            return [];
        }

        $field = Str::beforeLast(Str::beforeLast($attribute, '.'), '.');

        return MediaLookup::uuidsFromValue(data_get($this->data, $field));
    }

    /**
     * @param  list<string>  $uuids
     */
    protected function preload(array $uuids): void
    {
        $found = MediaLookup::claimable(
            MediaLookup::findByUuids($uuids),
            $this->scopedToOwner,
            $this->ownerType,
            $this->ownerKey,
            $this->ownerCollection,
        );

        foreach ($uuids as $uuid) {
            $this->media[$uuid] = $found->get($uuid);
        }
    }
}
