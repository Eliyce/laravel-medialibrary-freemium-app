<?php

namespace Eliyce\MediaPro\Tests\Feature;

use DateTimeInterface;
use Eliyce\MediaPro\Support\MediaProValue;
use Eliyce\MediaPro\Tests\Support\TestModel;
use Eliyce\MediaPro\Tests\TestCase;
use Illuminate\Filesystem\Filesystem;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use InvalidArgumentException;
use PHPUnit\Framework\Attributes\DataProvider;
use Spatie\MediaLibrary\MediaCollections\Models\Media;

class MediaProValueTest extends TestCase
{
    /** AC-62 */
    public function test_collection_is_keyed_by_uuid_in_order_with_the_right_preview_urls(): void
    {
        $model = TestModel::create();
        $withPreview = $model->addMedia(UploadedFile::fake()->image('with.png', 200, 200))
            ->withCustomProperties(['alt' => 'With'])
            ->toMediaCollection('images');
        $withoutPreview = $model->addMedia(UploadedFile::fake()->image('without.png', 200, 200))->toMediaCollection('images');
        $withoutPreview->generated_conversions = [];
        $withoutPreview->save();
        $pdf = $model->addMedia($this->pdf())->toMediaCollection('images');

        $this->assertTrue($withPreview->hasGeneratedConversion('preview'));

        $value = MediaProValue::collection($model->fresh()->getMedia('images'));

        $this->assertSame([$withPreview->uuid, $withoutPreview->uuid, $pdf->uuid], array_keys($value));

        foreach (array_values($value) as $order => $item) {
            $this->assertSame(
                ['uuid', 'name', 'file_name', 'preview_url', 'original_url', 'size', 'mime_type', 'extension', 'order', 'custom_properties'],
                array_keys($item)
            );
            $this->assertSame($order, $item['order']);
        }

        $this->assertSame($withPreview->getUrl('preview'), $value[$withPreview->uuid]['preview_url']);
        $this->assertSame($withoutPreview->getUrl(), $value[$withoutPreview->uuid]['preview_url']);
        $this->assertNull($value[$pdf->uuid]['preview_url']);
        $this->assertSame('With', $value[$withPreview->uuid]['custom_properties']['alt']);
        $this->assertSame('pdf', $value[$pdf->uuid]['extension']);
        $this->assertSame('application/pdf', $value[$pdf->uuid]['mime_type']);
    }

    /** AC-62: empty custom properties encode as a JSON object, not a list. */
    public function test_collection_json_uses_objects_for_custom_properties(): void
    {
        $model = TestModel::create();
        $media = $model->addMedia(UploadedFile::fake()->image('a.png', 10, 10))->toMediaCollection('images');

        $json = json_decode(json_encode(MediaProValue::collection([$media])), false);

        $this->assertIsObject($json->{$media->uuid}->custom_properties);
    }

    /** AC-62 */
    public function test_from_media_returns_the_upload_response_shape(): void
    {
        $model = TestModel::create();
        $media = $model->addMedia(UploadedFile::fake()->image('Cat.png', 20, 20))->usingName('Cat')->toMediaCollection('images');

        $this->assertSame([
            'uuid' => $media->uuid,
            'name' => 'Cat',
            'file_name' => 'Cat.png',
            'preview_url' => $media->getUrl('preview'),
            'original_url' => $media->getUrl(),
            'size' => $media->size,
            'mime_type' => 'image/png',
            'extension' => 'png',
        ], MediaProValue::fromMedia($media));
    }

    /** AC-73 */
    public function test_media_on_a_private_signing_disk_gets_signed_urls_with_the_configured_expiry(): void
    {
        $this->freezeTime();
        config()->set('media-pro.signed_url_expiration_minutes', 15);
        $this->fakeSigningDisk('private');

        $media = $this->imageOn('private');
        $value = MediaProValue::fromMedia($media);

        $expires = now()->addMinutes(15)->getTimestamp();
        $this->assertSame("https://signed.test/{$media->getPathRelativeToRoot('preview')}?expires={$expires}", $value['preview_url']);
        $this->assertSame("https://signed.test/{$media->getPathRelativeToRoot()}?expires={$expires}", $value['original_url']);
    }

    /** AC-74 */
    public function test_media_on_a_public_disk_keeps_plain_urls(): void
    {
        $this->fakeSigningDisk('private', 'public');

        $media = $this->imageOn('private');
        $value = MediaProValue::fromMedia($media);

        $this->assertSame($media->getUrl('preview'), $value['preview_url']);
        $this->assertSame($media->getUrl(), $value['original_url']);
    }

    /** AC-75 */
    public function test_signing_turned_off_keeps_plain_urls(): void
    {
        config()->set('media-pro.signed_url_expiration_minutes', null);
        $this->fakeSigningDisk('private');

        $media = $this->imageOn('private');
        $value = MediaProValue::fromMedia($media);

        $this->assertSame($media->getUrl('preview'), $value['preview_url']);
        $this->assertSame($media->getUrl(), $value['original_url']);
    }

    /** AC-76 */
    public function test_a_private_disk_that_cannot_sign_keeps_plain_urls(): void
    {
        // A real local disk without `serve` (Storage::fake() always installs a URL signer).
        $root = sys_get_temp_dir().'/media-pro-unsigned-'.getmypid();
        config()->set('filesystems.disks.private', ['driver' => 'local', 'root' => $root]);
        $this->assertFalse(Storage::disk('private')->providesTemporaryUrls());

        try {
            $media = $this->imageOn('private');
            $value = MediaProValue::fromMedia($media);

            $this->assertSame($media->getUrl('preview'), $value['preview_url']);
            $this->assertSame($media->getUrl(), $value['original_url']);
        } finally {
            (new Filesystem)->deleteDirectory($root);
        }
    }

    /**
     * @return array<string, array{int|string}>
     */
    public static function invalidExpirations(): array
    {
        return ['zero' => [0], 'negative' => [-5], 'not a number' => ['soon']];
    }

    /** AC-77 */
    #[DataProvider('invalidExpirations')]
    public function test_an_invalid_expiry_throws_naming_the_config_key(int|string $minutes): void
    {
        $media = $this->imageOn('public');
        config()->set('media-pro.signed_url_expiration_minutes', $minutes);

        $this->expectException(InvalidArgumentException::class);
        $this->expectExceptionMessage('media-pro.signed_url_expiration_minutes');

        MediaProValue::fromMedia($media);
    }

    protected function fakeDisk(string $disk, ?string $visibility = null): void
    {
        config()->set("filesystems.disks.{$disk}", array_filter(['driver' => 'local', 'visibility' => $visibility]));
        Storage::fake($disk);
    }

    protected function fakeSigningDisk(string $disk, ?string $visibility = null): void
    {
        $this->fakeDisk($disk, $visibility);
        Storage::disk($disk)->buildTemporaryUrlsUsing(
            fn (string $path, DateTimeInterface $expiration): string => "https://signed.test/{$path}?expires={$expiration->getTimestamp()}"
        );
    }

    protected function imageOn(string $disk): Media
    {
        return TestModel::create()
            ->addMedia(UploadedFile::fake()->image('photo.png', 20, 20))
            ->toMediaCollection('images', $disk);
    }
}
