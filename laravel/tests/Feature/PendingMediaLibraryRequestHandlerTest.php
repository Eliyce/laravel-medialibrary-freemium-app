<?php

namespace Eliyce\MediaPro\Tests\Feature;

use Eliyce\MediaPro\Exceptions\InvalidMediaUuid;
use Eliyce\MediaPro\Exceptions\TemporaryUploadDoesNotBelongToSession;
use Eliyce\MediaPro\MediaLibraryRequestItem;
use Eliyce\MediaPro\Models\TemporaryUpload;
use Eliyce\MediaPro\Tests\Support\TestModel;
use Eliyce\MediaPro\Tests\TestCase;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Storage;
use RuntimeException;
use Spatie\MediaLibrary\MediaCollections\Models\Media;

class PendingMediaLibraryRequestHandlerTest extends TestCase
{
    /** AC-50 */
    public function test_add_moves_a_current_session_upload_into_the_collection(): void
    {
        $model = TestModel::create();
        $existing = $model->addMedia(UploadedFile::fake()->image('x.png', 10, 10))->toMediaCollection('images');
        $upload = $this->createTemporaryUpload(name: 'original');
        $uuid = $this->mediaOf($upload)->uuid;

        $result = $model
            ->addFromMediaLibraryRequest([$uuid => ['uuid' => $uuid, 'name' => 'Pic', 'order' => 0]])
            ->toMediaCollection('images');

        $this->assertCount(1, $result);
        $attached = Media::where('uuid', $uuid)->sole();
        $this->assertTrue($attached->model->is($model));
        $this->assertSame('images', $attached->collection_name);
        $this->assertSame('Pic', $attached->name);
        $this->assertSame(0, $attached->order_column);
        $this->assertTrue(Storage::disk('public')->exists($attached->getPathRelativeToRoot()));
        $this->assertNull(TemporaryUpload::find($upload->id));

        $this->assertEquals($existing->fresh()->toArray(), $existing->toArray());
        $this->assertSame(2, $model->fresh()->getMedia('images')->count());
    }

    /**
     * @return array<string, array{string}>
     */
    public static function modes(): array
    {
        return ['add' => ['addFromMediaLibraryRequest'], 'sync' => ['syncFromMediaLibraryRequest']];
    }

    /** AC-51, INV-1 */
    #[\PHPUnit\Framework\Attributes\DataProvider('modes')]
    public function test_a_temporary_upload_from_another_session_rejects_the_whole_request(string $method): void
    {
        $model = TestModel::create();
        $kept = $model->addMedia(UploadedFile::fake()->image('kept.png', 10, 10))->toMediaCollection('images');
        $valid = $this->mediaOf($this->createTemporaryUpload());
        $foreign = $this->mediaOf($this->createTemporaryUpload(sessionId: 'another-session'));

        try {
            $model->{$method}([
                ['uuid' => $valid->uuid],
                ['uuid' => $foreign->uuid],
            ])->toMediaCollection('images');
            $this->fail('Expected InvalidMediaUuid.');
        } catch (InvalidMediaUuid $exception) {
            $this->assertInstanceOf(TemporaryUploadDoesNotBelongToSession::class, $exception);
        }

        $this->assertInstanceOf(TemporaryUpload::class, $valid->fresh()->model);
        $this->assertInstanceOf(TemporaryUpload::class, $foreign->fresh()->model);
        $this->assertSame('another-session', $foreign->fresh()->model->session_id);
        $this->assertNotNull($kept->fresh());
        $this->assertSame([$kept->id], $model->fresh()->getMedia('images')->pluck('id')->all());
    }

    /** AC-51, INV-1 */
    #[\PHPUnit\Framework\Attributes\DataProvider('modes')]
    public function test_media_of_another_model_is_never_attached(string $method): void
    {
        $model = TestModel::create();
        $kept = $model->addMedia(UploadedFile::fake()->image('kept.png', 10, 10))->toMediaCollection('images');
        $other = TestModel::create();
        $othersMedia = $other->addMedia(UploadedFile::fake()->image('theirs.png', 10, 10))->toMediaCollection('images');
        $valid = $this->mediaOf($this->createTemporaryUpload());

        $this->expectException(InvalidMediaUuid::class);

        try {
            $model->{$method}([
                ['uuid' => $valid->uuid],
                ['uuid' => $othersMedia->uuid],
            ])->toMediaCollection('images');
        } finally {
            $this->assertTrue($othersMedia->fresh()->model->is($other));
            $this->assertInstanceOf(TemporaryUpload::class, $valid->fresh()->model);
            $this->assertNotNull($kept->fresh());
        }
    }

    public function test_an_invalid_uuid_reaching_the_exception_handler_is_a_generic_422(): void
    {
        $model = TestModel::create();
        $kept = $model->addMedia(UploadedFile::fake()->image('kept.png', 10, 10))->toMediaCollection('images');
        $othersMedia = TestModel::create()->addMedia(UploadedFile::fake()->image('theirs.png', 10, 10))->toMediaCollection('images');
        $this->defineSyncRoute();
        Log::spy();

        $response = $this->postJson("/test-models/{$model->id}/images", ['images' => [['uuid' => $othersMedia->uuid]]]);

        $response->assertStatus(422)->assertExactJson([
            'message' => 'The selected media is invalid.',
            'errors' => [InvalidMediaUuid::ERROR_KEY => ['The selected media is invalid.']],
        ]);
        $this->assertSame([$kept->id], $model->fresh()->getMedia('images')->pluck('id')->all());
        Log::shouldHaveReceived('warning')->once()->with('media-pro: media library request rejected', [
            'reason' => 'InvalidMediaUuid',
            'uuid' => $othersMedia->uuid,
        ]);
    }

    public function test_an_invalid_uuid_on_a_form_post_redirects_back_with_the_error(): void
    {
        $model = TestModel::create();
        $foreign = $this->mediaOf($this->createTemporaryUpload(sessionId: 'another-session'));
        $this->defineSyncRoute();

        $this->from('/edit')
            ->post("/test-models/{$model->id}/images", ['images' => [['uuid' => $foreign->uuid]], 'title' => 'kept input'])
            ->assertRedirect('/edit')
            ->assertSessionHasErrors([InvalidMediaUuid::ERROR_KEY => 'The selected media is invalid.'])
            ->assertSessionHasInput('title', 'kept input');
    }

    private function defineSyncRoute(): void
    {
        Route::middleware('web')->post('/test-models/{id}/images', function (Request $request, string $id) {
            TestModel::findOrFail($id)->syncFromMediaLibraryRequest($request->input('images'))->toMediaCollection('images');

            return response()->noContent();
        });
    }

    public function test_media_of_the_same_model_in_another_collection_is_rejected(): void
    {
        $model = TestModel::create();
        $doc = $model->addMedia($this->pdf())->toMediaCollection('docs');

        $this->expectException(InvalidMediaUuid::class);

        $model->syncFromMediaLibraryRequest([['uuid' => $doc->uuid]])->toMediaCollection('images');
    }

    public function test_unknown_and_duplicate_uuids_are_rejected(): void
    {
        $model = TestModel::create();
        $upload = $this->mediaOf($this->createTemporaryUpload());

        try {
            $model->addFromMediaLibraryRequest([['uuid' => '6b1f0d57-0000-4000-8000-000000000000']])->toMediaCollection('images');
            $this->fail('Expected InvalidMediaUuid for an unknown uuid.');
        } catch (InvalidMediaUuid) {
        }

        $this->expectException(InvalidMediaUuid::class);
        $model->addFromMediaLibraryRequest([['uuid' => $upload->uuid], ['uuid' => $upload->uuid]])->toMediaCollection('images');
    }

    /** AC-52 */
    public function test_sync_updates_attaches_and_deletes_only_within_the_collection(): void
    {
        $model = TestModel::create();
        $a = $model->addMedia(UploadedFile::fake()->image('a.png', 10, 10))->toMediaCollection('images');
        $b = $model->addMedia(UploadedFile::fake()->image('b.png', 10, 10))->toMediaCollection('images');
        $c = $model->addMedia($this->pdf('c.pdf'))->toMediaCollection('docs');
        $aPath = $a->getPathRelativeToRoot();
        $t = $this->mediaOf($this->createTemporaryUpload(name: 'T'));

        $result = $model->syncFromMediaLibraryRequest([
            $b->uuid => ['uuid' => $b->uuid, 'name' => 'B2', 'order' => 0],
            $t->uuid => ['uuid' => $t->uuid, 'name' => 'T', 'order' => 1],
        ])->toMediaCollection('images');

        $this->assertSame([$b->uuid, $t->uuid], $result->pluck('uuid')->all());
        $this->assertNull($a->fresh());
        $this->assertFalse(Storage::disk('public')->exists($aPath));

        $b2 = $b->fresh();
        $this->assertSame($b->id, $b2->id);
        $this->assertSame('B2', $b2->name);
        $this->assertSame(0, $b2->order_column);

        $attached = Media::where('uuid', $t->uuid)->sole();
        $this->assertTrue($attached->model->is($model));
        $this->assertSame(1, $attached->order_column);

        $this->assertNotNull($c->fresh());
        $this->assertSame([$b->uuid, $t->uuid], $model->fresh()->getMedia('images')->pluck('uuid')->all());
    }

    /** INV-1: the database changes are atomic and claimed upload files go only after commit. */
    public function test_a_failure_part_way_leaves_the_collection_and_the_uploads_unchanged(): void
    {
        $model = TestModel::create();
        $kept = $model->addMedia(UploadedFile::fake()->image('kept.png', 10, 10))->toMediaCollection('images');
        $first = $this->createTemporaryUpload(name: 'first');
        $second = $this->createTemporaryUpload(name: 'second');
        $firstMedia = $this->mediaOf($first);
        $secondMedia = $this->mediaOf($second);
        $filesBefore = Storage::disk('public')->allFiles();

        try {
            $model->syncFromMediaLibraryRequest([
                ['uuid' => $kept->uuid, 'name' => 'renamed', 'order' => 5],
                ['uuid' => $firstMedia->uuid],
                ['uuid' => $secondMedia->uuid],
            ])
                // The second upload fails after the first was already copied.
                ->usingFileName(fn (MediaLibraryRequestItem $item) => $item->uuid === $secondMedia->uuid
                    ? throw new RuntimeException('disk full')
                    : 'copy.png')
                ->toMediaCollection('images');
            $this->fail('Expected the failure to propagate.');
        } catch (RuntimeException $exception) {
            $this->assertSame('disk full', $exception->getMessage());
        }

        $this->assertSame([$kept->id], $model->fresh()->getMedia('images')->pluck('id')->all());
        $this->assertSame('kept', $kept->fresh()->name);
        $this->assertSame($firstMedia->uuid, $first->fresh()->getFirstMedia()->uuid);
        $this->assertSame($secondMedia->uuid, $second->fresh()->getFirstMedia()->uuid);
        $this->assertEqualsCanonicalizing($filesBefore, Storage::disk('public')->allFiles());
    }

    public function test_claimed_upload_files_are_deleted_once_the_request_is_applied(): void
    {
        $model = TestModel::create();
        $upload = $this->createTemporaryUpload();
        $temporaryPath = $this->mediaOf($upload)->getPathRelativeToRoot();
        $uuid = $this->mediaOf($upload)->uuid;

        $model->addFromMediaLibraryRequest([['uuid' => $uuid]])->toMediaCollection('images');

        $this->assertFalse(Storage::disk('public')->exists($temporaryPath));
        $this->assertSame(1, Media::where('uuid', $uuid)->count());
        $this->assertSame(0, TemporaryUpload::count());
    }

    public function test_sync_with_an_empty_request_clears_the_collection(): void
    {
        $model = TestModel::create();
        $model->addMedia(UploadedFile::fake()->image('a.png', 10, 10))->toMediaCollection('images');

        $model->syncFromMediaLibraryRequest(null)->toMediaCollection('images');

        $this->assertCount(0, $model->fresh()->getMedia('images'));
    }

    public function test_add_keeps_media_missing_from_the_request(): void
    {
        $model = TestModel::create();
        $a = $model->addMedia(UploadedFile::fake()->image('a.png', 10, 10))->toMediaCollection('images');
        $t = $this->mediaOf($this->createTemporaryUpload());

        $model->addFromMediaLibraryRequest([['uuid' => $t->uuid]])->toMediaCollection('images');

        $this->assertNotNull($a->fresh());
        $this->assertCount(2, $model->fresh()->getMedia('images'));
    }

    /** AC-53 */
    public function test_using_name_and_file_name_accept_strings_and_callables(): void
    {
        $model = TestModel::create();
        $first = $this->mediaOf($this->createTemporaryUpload());

        $model->addFromMediaLibraryRequest([['uuid' => $first->uuid, 'name' => 'LOUD NAME']])
            ->usingName(fn (MediaLibraryRequestItem $item) => strtolower($item->name))
            ->usingFileName('my-file.png')
            ->toMediaCollection('images');

        $attached = Media::where('uuid', $first->uuid)->sole();
        $this->assertSame('loud name', $attached->name);
        $this->assertSame('my-file.png', $attached->file_name);

        $second = $this->mediaOf($this->createTemporaryUpload());

        $model->addFromMediaLibraryRequest([['uuid' => $second->uuid, 'name' => 'Ignored']])
            ->usingName('Fixed')
            ->usingFileName(fn (MediaLibraryRequestItem $item) => 'item-'.substr($item->uuid, 0, 8).'.png')
            ->toMediaCollection('images');

        $attached = Media::where('uuid', $second->uuid)->sole();
        $this->assertSame('Fixed', $attached->name);
        $this->assertSame('item-'.substr($second->uuid, 0, 8).'.png', $attached->file_name);
    }

    public function test_the_request_file_name_is_not_trusted_by_default(): void
    {
        $model = TestModel::create();
        $upload = $this->mediaOf($this->createTemporaryUpload());

        $model->addFromMediaLibraryRequest([['uuid' => $upload->uuid, 'file_name' => 'evil.php']])->toMediaCollection('images');

        $this->assertSame('upload.png', Media::where('uuid', $upload->uuid)->sole()->file_name);
    }

    /** AC-54, INV-8 */
    public function test_only_whitelisted_custom_properties_are_stored(): void
    {
        $model = TestModel::create();
        $first = $this->mediaOf($this->createTemporaryUpload());
        $properties = ['alt' => 'A cat', 'caption' => 'Sleeping', 'evil' => 'drop me'];

        $model->addFromMediaLibraryRequest([['uuid' => $first->uuid, 'custom_properties' => $properties]])
            ->withCustomProperties('alt', 'caption')
            ->toMediaCollection('images');

        $this->assertSame(['alt' => 'A cat', 'caption' => 'Sleeping'], Media::where('uuid', $first->uuid)->sole()->custom_properties);

        $second = $this->mediaOf($this->createTemporaryUpload());
        $model->addFromMediaLibraryRequest([['uuid' => $second->uuid, 'custom_properties' => $properties]])
            ->toMediaCollection('images');

        $this->assertSame([], Media::where('uuid', $second->uuid)->sole()->custom_properties);
    }

    public function test_existing_media_custom_properties_merge_whitelisted_keys_only(): void
    {
        $model = TestModel::create();
        $media = $model->addMedia(UploadedFile::fake()->image('a.png', 10, 10))
            ->withCustomProperties(['server' => 'kept', 'alt' => 'old'])
            ->toMediaCollection('images');

        $model->syncFromMediaLibraryRequest([
            ['uuid' => $media->uuid, 'custom_properties' => ['alt' => 'new', 'server' => 'overwritten?', 'evil' => 'x']],
        ])->withCustomProperties('alt')->toMediaCollection('images');

        $this->assertSame(['server' => 'kept', 'alt' => 'new'], $media->fresh()->custom_properties);
    }

    /** AC-55 */
    public function test_uuid_keyed_and_list_shapes_parse_identically(): void
    {
        $items = [
            ['uuid' => 'u-1', 'name' => 'One', 'order' => '0', 'custom_properties' => ['alt' => 'a'], 'file_name' => 'one.png'],
            ['uuid' => 'u-2', 'name' => 'Two', 'order' => 1],
        ];
        $keyed = ['u-1' => $items[0], 'u-2' => $items[1]];

        $this->assertEquals(MediaLibraryRequestItem::collect($items), MediaLibraryRequestItem::collect($keyed));

        $first = MediaLibraryRequestItem::collect($keyed)[0];
        $this->assertSame('u-1', $first->uuid);
        $this->assertSame('One', $first->name);
        $this->assertSame(0, $first->order);
        $this->assertSame(['alt' => 'a'], $first->customProperties);
        $this->assertSame('one.png', $first->fileName);
    }

    /** AC-55 */
    public function test_both_shapes_attach_through_the_handler(): void
    {
        $model = TestModel::create();
        $listed = $this->mediaOf($this->createTemporaryUpload());
        $keyed = $this->mediaOf($this->createTemporaryUpload());

        $model->addFromMediaLibraryRequest([['uuid' => $listed->uuid, 'name' => 'L']])->toMediaCollection('images');
        $model->addFromMediaLibraryRequest([$keyed->uuid => ['uuid' => $keyed->uuid, 'name' => 'K']])->toMediaCollection('images');

        $this->assertEqualsCanonicalizing(['L', 'K'], $model->fresh()->getMedia('images')->pluck('name')->all());
    }

    /** AC-55 */
    public function test_an_item_without_uuid_raises_invalid_media_uuid(): void
    {
        $model = TestModel::create();
        $valid = $this->mediaOf($this->createTemporaryUpload());

        $this->expectException(InvalidMediaUuid::class);

        try {
            $model->addFromMediaLibraryRequest([['uuid' => $valid->uuid], ['name' => 'no uuid']])->toMediaCollection('images');
        } finally {
            $this->assertInstanceOf(TemporaryUpload::class, $valid->fresh()->model);
        }
    }

    public function test_order_defaults_to_the_request_position(): void
    {
        $model = TestModel::create();
        $first = $this->mediaOf($this->createTemporaryUpload());
        $second = $this->mediaOf($this->createTemporaryUpload());

        $model->addFromMediaLibraryRequest([['uuid' => $first->uuid], ['uuid' => $second->uuid]])->toMediaCollection('images');

        $this->assertSame(0, Media::where('uuid', $first->uuid)->sole()->order_column);
        $this->assertSame(1, Media::where('uuid', $second->uuid)->sole()->order_column);
    }
}
