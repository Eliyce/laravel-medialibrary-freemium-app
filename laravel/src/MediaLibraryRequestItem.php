<?php

namespace Eliyce\MediaPro;

use Eliyce\MediaPro\Exceptions\InvalidMediaUuid;

/**
 * One item of the value a media component submits:
 * `{ uuid, name?, order?, custom_properties?, file_name? }`.
 */
class MediaLibraryRequestItem
{
    /**
     * @param  array<string, mixed>  $customProperties
     */
    public function __construct(
        public readonly string $uuid,
        public readonly ?string $name = null,
        public readonly ?int $order = null,
        public readonly array $customProperties = [],
        public readonly ?string $fileName = null,
    ) {}

    /**
     * @throws InvalidMediaUuid when the item has no usable uuid
     */
    public static function fromArray(mixed $properties): self
    {
        if (! is_array($properties)) {
            throw InvalidMediaUuid::missing();
        }

        $uuid = $properties['uuid'] ?? null;

        if (! is_string($uuid) || trim($uuid) === '') {
            throw InvalidMediaUuid::missing();
        }

        $customProperties = $properties['custom_properties'] ?? [];

        return new self(
            uuid: $uuid,
            name: static::nullableString($properties['name'] ?? null),
            order: is_numeric($properties['order'] ?? null) ? (int) $properties['order'] : null,
            customProperties: is_array($customProperties) ? $customProperties : [],
            fileName: static::nullableString($properties['file_name'] ?? null),
        );
    }

    /**
     * Accepts the value keyed by uuid (form submits) or a plain list (JSON).
     *
     * @param  array<array-key, mixed>|null  $items
     * @return list<self>
     *
     * @throws InvalidMediaUuid
     */
    public static function collect(?array $items): array
    {
        return array_map(static fn (mixed $item): self => static::fromArray($item), array_values($items ?? []));
    }

    private static function nullableString(mixed $value): ?string
    {
        return is_scalar($value) ? (string) $value : null;
    }
}
