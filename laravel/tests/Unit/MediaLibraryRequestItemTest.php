<?php

namespace Eliyce\MediaPro\Tests\Unit;

use Eliyce\MediaPro\Exceptions\InvalidMediaUuid;
use Eliyce\MediaPro\MediaLibraryRequestItem;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;

class MediaLibraryRequestItemTest extends TestCase
{
    public function test_from_array_reads_every_field(): void
    {
        $item = MediaLibraryRequestItem::fromArray([
            'uuid' => 'abc',
            'name' => 'Cat',
            'order' => '2',
            'custom_properties' => ['alt' => 'A cat'],
            'file_name' => 'cat.png',
        ]);

        $this->assertSame('abc', $item->uuid);
        $this->assertSame('Cat', $item->name);
        $this->assertSame(2, $item->order);
        $this->assertSame(['alt' => 'A cat'], $item->customProperties);
        $this->assertSame('cat.png', $item->fileName);
    }

    public function test_optional_fields_default_safely(): void
    {
        $item = MediaLibraryRequestItem::fromArray(['uuid' => 'abc', 'custom_properties' => 'not-an-array', 'order' => 'x']);

        $this->assertNull($item->name);
        $this->assertNull($item->order);
        $this->assertSame([], $item->customProperties);
        $this->assertNull($item->fileName);
    }

    /**
     * @return array<string, array{mixed}>
     */
    public static function invalidItems(): array
    {
        return [
            'missing uuid' => [['name' => 'x']],
            'empty uuid' => [['uuid' => '  ']],
            'array uuid' => [['uuid' => ['a']]],
            'not an array' => ['abc'],
        ];
    }

    #[DataProvider('invalidItems')]
    public function test_items_without_a_usable_uuid_are_rejected(mixed $item): void
    {
        $this->expectException(InvalidMediaUuid::class);

        MediaLibraryRequestItem::fromArray($item);
    }

    public function test_collect_accepts_null(): void
    {
        $this->assertSame([], MediaLibraryRequestItem::collect(null));
    }
}
