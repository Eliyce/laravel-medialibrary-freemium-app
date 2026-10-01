<?php

namespace Eliyce\MediaPro\Rules;

use Closure;
use Eliyce\MediaPro\Support\MediaLookup;
use Illuminate\Contracts\Validation\ValidationRule;

/**
 * Validates the combined size of the media referenced by a value (inclusive KB bounds).
 *
 * Only media the request may claim is counted, with the same scoping as
 * UploadedMedia: temporary uploads of other sessions, and with an owner scope
 * existing media outside that model's collection, add nothing to the total,
 * so the result reveals nothing about their size. Those items already fail
 * on their own `field.*.uuid` key.
 */
class TotalMediaSize implements ValidationRule
{
    public function __construct(
        public readonly ?int $minSizeInKb = null,
        public readonly ?int $maxSizeInKb = null,
        public readonly bool $scopedToOwner = false,
        public readonly ?string $ownerType = null,
        public readonly ?string $ownerKey = null,
        public readonly ?string $ownerCollection = null,
    ) {}

    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        $media = MediaLookup::claimable(
            MediaLookup::findByUuids(MediaLookup::uuidsFromValue($value)),
            $this->scopedToOwner,
            $this->ownerType,
            $this->ownerKey,
            $this->ownerCollection,
        );

        $totalBytes = (int) $media->sum('size');

        if ($this->minSizeInKb !== null && $totalBytes < $this->minSizeInKb * 1024) {
            $fail('The total size of :attribute must be at least :min kilobytes.')->translate(['min' => $this->minSizeInKb]);
        }

        if ($this->maxSizeInKb !== null && $totalBytes > $this->maxSizeInKb * 1024) {
            $fail('The total size of :attribute may not be greater than :max kilobytes.')->translate(['max' => $this->maxSizeInKb]);
        }
    }
}
