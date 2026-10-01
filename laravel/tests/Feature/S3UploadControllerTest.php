<?php

namespace Eliyce\MediaPro\Tests\Feature;

use Eliyce\MediaPro\Models\TemporaryUpload;
use Eliyce\MediaPro\Rules\MediaRules;
use Eliyce\MediaPro\Tests\Support\LegacyTemporaryUpload;
use Eliyce\MediaPro\Tests\TestCase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;
use PHPUnit\Framework\Attributes\DataProvider;
use Spatie\MediaLibrary\MediaCollections\Models\Media;

class S3UploadControllerTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        Storage::fake('s3');
        config()->set('media-pro.temporary_upload_disk', 's3');
        Storage::disk('s3')->put('tmp/abc', UploadedFile::fake()->image('photo.png', 60, 40)->getContent());
    }

    /** AC-48 */
    public function test_a_tmp_key_on_the_configured_disk_becomes_a_temporary_upload(): void
    {
        $uuid = (string) Str::uuid();

        $response = $this->postJson('/media-library-pro/s3', [
            'key' => 'tmp/abc',
            'uuid' => $uuid,
            'name' => 'Holiday photo.png',
            'content_type' => 'image/png',
            'bucket' => '',
        ]);

        $response->assertOk()->assertJson([
            'uuid' => $uuid,
            'name' => 'Holiday photo.png',
            'file_name' => 'holiday-photo.png',
            'mime_type' => 'image/png',
            'extension' => 'png',
        ])->assertJsonStructure(['preview_url', 'original_url', 'size']);

        $media = Media::sole();
        $this->assertSame($uuid, $media->uuid);
        $this->assertSame('s3', $media->disk);
        $this->assertInstanceOf(TemporaryUpload::class, $media->model);
        $this->assertTrue(Storage::disk('s3')->exists($media->getPathRelativeToRoot()));
    }

    /**
     * @return array<string, array{string}>
     */
    public static function invalidKeys(): array
    {
        return [
            'outside tmp' => ['uploads/x'],
            'traversal before tmp' => ['../tmp/abc'],
            'traversal inside tmp' => ['tmp/../secrets/x'],
            'absolute' => ['/tmp/abc'],
            'missing object' => ['tmp/missing'],
        ];
    }

    /** AC-48 */
    #[DataProvider('invalidKeys')]
    public function test_keys_outside_tmp_or_missing_are_rejected(string $key): void
    {
        $this->postJson('/media-library-pro/s3', [
            'key' => $key,
            'uuid' => (string) Str::uuid(),
            'name' => 'x.png',
        ])->assertStatus(422)->assertJsonValidationErrors(['key']);

        $this->assertSame(0, TemporaryUpload::count());
    }

    /** INV-6: content that is not on the allow-list is rejected whatever the name says. */
    public function test_disallowed_content_is_rejected(): void
    {
        Storage::disk('s3')->put('tmp/script', "<?php echo 'hi';");

        $this->postJson('/media-library-pro/s3', [
            'key' => 'tmp/script',
            'uuid' => (string) Str::uuid(),
            'name' => 'innocent.png',
            'content_type' => 'image/png',
        ])->assertStatus(422)->assertJsonValidationErrors(['key']);

        $this->assertSame(0, Media::count());
    }

    /** INV-6 */
    public function test_oversize_objects_are_rejected(): void
    {
        config()->set('media-pro.max_file_size_in_kb', 1);
        // A valid PNG header followed by padding: 1 KB + 1 byte over the limit.
        $png = UploadedFile::fake()->image('big.png', 10, 10)->getContent();
        Storage::disk('s3')->put('tmp/big', $png.str_repeat("\0", 1025 - strlen($png)));

        $this->postJson('/media-library-pro/s3', [
            'key' => 'tmp/big',
            'uuid' => (string) Str::uuid(),
            'name' => 'big.png',
        ])->assertStatus(422)->assertJsonValidationErrors(['key']);
    }

    /**
     * @return array<string, array{string, string, string}>
     */
    public static function plainTextFiles(): array
    {
        return [
            // libmagic reports some csv as text/csv and others (like this one) as text/plain.
            'csv sniffed as text/plain' => ['Report 2026.csv', "name;total\nalpha;1\n", 'report-2026.csv'],
            'csv' => ['data.csv', "id,name\n1,Alice\n2,Bob\n3,Carol\n", 'data.csv'],
            'md' => ['Notes.md', "# Notes\n\nSome *markdown* text.\n", 'notes.md'],
            'txt' => ['readme.txt', "Plain text.\n", 'readme.txt'],
        ];
    }

    /** Parity with the direct upload path: plain-text formats keep the client extension. */
    #[DataProvider('plainTextFiles')]
    public function test_plain_text_formats_keep_the_client_extension(string $name, string $contents, string $fileName): void
    {
        Storage::disk('s3')->put('tmp/text', $contents);
        $extension = pathinfo($fileName, PATHINFO_EXTENSION);
        $uuid = (string) Str::uuid();

        $this->postJson('/media-library-pro/s3', [
            'key' => 'tmp/text',
            'uuid' => $uuid,
            'name' => $name,
            'content_type' => 'text/plain',
        ])->assertOk()->assertJson(['file_name' => $fileName, 'extension' => $extension]);

        $validator = Validator::make(
            ['files' => [$uuid => ['uuid' => $uuid]]],
            MediaRules::expand(['files' => MediaRules::multiple()->extension($extension)])
        );
        $this->assertTrue($validator->passes(), json_encode($validator->errors()->toArray()));
    }

    /** INV-6: a client extension that does not match the content is replaced by the sniffed one. */
    public function test_a_client_extension_that_contradicts_the_content_is_not_kept(): void
    {
        $this->postJson('/media-library-pro/s3', [
            'key' => 'tmp/abc',
            'uuid' => (string) Str::uuid(),
            'name' => 'photo.csv',
        ])->assertOk()->assertJson(['file_name' => 'photo.png', 'extension' => 'png', 'mime_type' => 'image/png']);
    }

    public function test_a_uuid_taken_by_a_concurrent_request_is_a_422_and_leaves_no_files(): void
    {
        $uuid = (string) Str::uuid();
        $this->takeUuidWhenTheNextMediaIsCreated($uuid);

        $this->postJson('/media-library-pro/s3', [
            'key' => 'tmp/abc',
            'uuid' => $uuid,
            'name' => 'photo.png',
        ])->assertStatus(422)->assertJsonValidationErrors(['uuid' => 'The uuid has already been taken.']);

        $this->assertSame(0, TemporaryUpload::count());
        $this->assertSame(0, Media::count());
        $this->assertSame([], array_values(array_filter(
            Storage::disk('s3')->allFiles(),
            static fn (string $path): bool => ! str_starts_with($path, 'tmp/')
        )));
    }

    public function test_a_uuid_race_reported_as_a_plain_query_exception_is_a_422_and_leaves_no_files(): void
    {
        config()->set('media-pro.temporary_upload_model', LegacyTemporaryUpload::class);
        $uuid = (string) Str::uuid();
        $this->takeUuidWhenTheNextMediaIsCreated($uuid);

        $this->postJson('/media-library-pro/s3', [
            'key' => 'tmp/abc',
            'uuid' => $uuid,
            'name' => 'photo.png',
        ])->assertStatus(422)->assertJsonValidationErrors(['uuid' => 'The uuid has already been taken.']);

        $this->assertSame(0, LegacyTemporaryUpload::count());
        $this->assertSame(0, Media::count());
        $this->assertSame([], array_values(array_filter(
            Storage::disk('s3')->allFiles(),
            static fn (string $path): bool => ! str_starts_with($path, 'tmp/')
        )));
    }

    public function test_other_query_failures_are_not_reported_as_a_taken_uuid(): void
    {
        $this->failTheNextMediaInsertWithANotNullViolation();

        $this->postJson('/media-library-pro/s3', [
            'key' => 'tmp/abc',
            'uuid' => (string) Str::uuid(),
            'name' => 'photo.png',
        ])->assertStatus(500)->assertJsonMissingValidationErrors(['uuid']);

        $this->assertSame(0, TemporaryUpload::count());
        $this->assertSame(0, Media::count());
    }

    public function test_uuid_must_be_unique(): void
    {
        $existing = $this->mediaOf($this->createTemporaryUpload());

        $this->postJson('/media-library-pro/s3', [
            'key' => 'tmp/abc',
            'uuid' => $existing->uuid,
        ])->assertStatus(422)->assertJsonValidationErrors(['uuid']);
    }
}
