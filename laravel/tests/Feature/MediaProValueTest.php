<?php

namespace Eliyce\MediaPro\Tests\Feature;

use Eliyce\MediaPro\Support\MediaProValue;
use Eliyce\MediaPro\Tests\Support\TestModel;
use Eliyce\MediaPro\Tests\TestCase;
use Illuminate\Http\UploadedFile;

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
}
