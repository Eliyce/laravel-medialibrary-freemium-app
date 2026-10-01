<?php

namespace Eliyce\MediaPro\Tests\Feature;

use Eliyce\MediaPro\Models\TemporaryUpload;
use Eliyce\MediaPro\Tests\Support\LegacyTemporaryUpload;
use Eliyce\MediaPro\Tests\TestCase;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use PHPUnit\Framework\Attributes\DataProvider;
use Spatie\Image\Enums\Fit;
use Spatie\MediaLibrary\Conversions\Conversion;
use Spatie\MediaLibrary\MediaCollections\Models\Media;

class UploadControllerTest extends TestCase
{
    private string $sessionId;

    protected function setUp(): void
    {
        parent::setUp();

        $this->sessionId = Str::random(40);
        $this->withCookie(config('session.cookie'), $this->sessionId);
    }

    public function test_a_uuid_taken_by_a_concurrent_request_is_a_422_and_leaves_no_files(): void
    {
        $uuid = (string) Str::uuid();
        $this->takeUuidWhenTheNextMediaIsCreated($uuid);

        $this->post('/media-library-pro/uploads', [
            'file' => UploadedFile::fake()->image('cat.png', 80, 60),
            'uuid' => $uuid,
        ], ['Accept' => 'application/json'])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['uuid' => 'The uuid has already been taken.']);

        $this->assertSame(0, TemporaryUpload::count());
        $this->assertSame(0, Media::count());
        $this->assertSame([], Storage::disk('public')->allFiles());
    }

    public function test_a_uuid_race_reported_as_a_plain_query_exception_is_a_422_and_leaves_no_files(): void
    {
        config()->set('media-pro.temporary_upload_model', LegacyTemporaryUpload::class);
        $uuid = (string) Str::uuid();
        $this->takeUuidWhenTheNextMediaIsCreated($uuid);

        $this->post('/media-library-pro/uploads', [
            'file' => UploadedFile::fake()->image('cat.png', 80, 60),
            'uuid' => $uuid,
        ], ['Accept' => 'application/json'])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['uuid' => 'The uuid has already been taken.']);

        $this->assertSame(0, LegacyTemporaryUpload::count());
        $this->assertSame(0, Media::count());
        $this->assertSame([], Storage::disk('public')->allFiles());
    }

    public function test_other_query_failures_are_not_reported_as_a_taken_uuid(): void
    {
        $this->failTheNextMediaInsertWithANotNullViolation();

        $this->post('/media-library-pro/uploads', [
            'file' => UploadedFile::fake()->image('cat.png', 80, 60),
            'uuid' => (string) Str::uuid(),
        ], ['Accept' => 'application/json'])
            ->assertStatus(500)
            ->assertJsonMissingValidationErrors(['uuid']);

        $this->assertSame(0, TemporaryUpload::count());
        $this->assertSame(0, Media::count());
    }

    /** AC-45 */
    public function test_upload_stores_a_temporary_upload_for_the_session_and_returns_the_upload_response(): void
    {
        $uuid = (string) Str::uuid();

        $response = $this->post('/media-library-pro/uploads', [
            'file' => UploadedFile::fake()->image('cat.png', 800, 600),
            'uuid' => $uuid,
            'name' => 'My cat',
        ], ['Accept' => 'application/json']);

        $response->assertOk();
        $this->assertSame(
            ['uuid', 'name', 'file_name', 'preview_url', 'original_url', 'size', 'mime_type', 'extension'],
            array_keys($response->json())
        );
        $response->assertJson([
            'uuid' => $uuid,
            'name' => 'My cat',
            'file_name' => 'cat.png',
            'mime_type' => 'image/png',
            'extension' => 'png',
        ]);
        $this->assertGreaterThan(0, $response->json('size'));
        $this->assertStringContainsString('cat.png', $response->json('original_url'));
        $this->assertStringContainsString('cat-preview.png', $response->json('preview_url'));

        $temporaryUpload = TemporaryUpload::sole();
        $this->assertSame($this->sessionId, $temporaryUpload->session_id);
        $this->assertSame($uuid, $temporaryUpload->getFirstMedia()->uuid);
    }

    /** AC-49 */
    public function test_preview_conversion_is_500_square_and_customizable(): void
    {
        $this->post('/media-library-pro/uploads', [
            'file' => UploadedFile::fake()->image('wide.png', 900, 600),
            'uuid' => (string) Str::uuid(),
        ], ['Accept' => 'application/json'])->assertOk();

        $media = Media::sole();
        $this->assertTrue($media->hasGeneratedConversion('preview'));
        $this->assertSame([500, 500], array_slice(getimagesize($media->getPath('preview')), 0, 2));

        TemporaryUpload::previewManipulation(fn (Conversion $conversion) => $conversion->fit(Fit::Crop, 300, 300));

        $response = $this->post('/media-library-pro/uploads', [
            'file' => UploadedFile::fake()->image('second.png', 900, 600),
            'uuid' => (string) Str::uuid(),
        ], ['Accept' => 'application/json'])->assertOk();

        $second = Media::where('uuid', $response->json('uuid'))->sole();
        $this->assertSame([300, 300], array_slice(getimagesize($second->getPath('preview')), 0, 2));
        $this->assertSame($second->getUrl('preview'), $response->json('preview_url'));
    }

    public function test_non_image_upload_has_no_preview_url(): void
    {
        $response = $this->post('/media-library-pro/uploads', [
            'file' => $this->pdf(),
            'uuid' => (string) Str::uuid(),
        ], ['Accept' => 'application/json']);

        $response->assertOk()->assertJson(['preview_url' => null, 'extension' => 'pdf', 'mime_type' => 'application/pdf']);
    }

    /**
     * @return array<string, array{0: \Closure(): array<string, mixed>, 1: string}>
     */
    public static function invalidUploads(): array
    {
        return [
            'php file' => [fn () => ['file' => UploadedFile::fake()->createWithContent('evil.php', '<?php echo 1;')], 'file'],
            'exe file' => [fn () => ['file' => UploadedFile::fake()->createWithContent('evil.exe', "MZ\x90\x00".str_repeat("\x00", 64))], 'file'],
            'png content with html name' => [fn () => ['file' => UploadedFile::fake()->image('page.html', 10, 10)], 'file'],
            'oversize' => [fn () => ['file' => UploadedFile::fake()->image('big.png', 10, 10)->size(101)], 'file'],
            'missing file' => [fn () => ['file' => null], 'file'],
            'missing uuid' => [fn () => ['uuid' => null], 'uuid'],
            'non-uuid' => [fn () => ['uuid' => 'not-a-uuid'], 'uuid'],
            'name too long' => [fn () => ['name' => str_repeat('a', 256)], 'name'],
        ];
    }

    /** AC-46 */
    #[DataProvider('invalidUploads')]
    public function test_invalid_uploads_are_rejected_with_422_and_nothing_is_stored(\Closure $overrides, string $errorKey): void
    {
        config()->set('media-pro.max_file_size_in_kb', 100);

        $payload = array_filter(array_merge([
            'file' => UploadedFile::fake()->image('ok.png', 10, 10),
            'uuid' => (string) Str::uuid(),
            'name' => 'ok',
        ], $overrides()), fn ($value) => $value !== null);

        $this->post('/media-library-pro/uploads', $payload, ['Accept' => 'application/json'])
            ->assertStatus(422)
            ->assertJsonValidationErrors([$errorKey]);

        $this->assertSame(0, TemporaryUpload::count());
        $this->assertSame(0, Media::count());
    }

    /** AC-46, INV-7 */
    public function test_reusing_an_existing_media_uuid_is_rejected(): void
    {
        $existing = $this->mediaOf($this->createTemporaryUpload());

        $this->post('/media-library-pro/uploads', [
            'file' => UploadedFile::fake()->image('dup.png', 10, 10),
            'uuid' => $existing->uuid,
        ], ['Accept' => 'application/json'])->assertStatus(422)->assertJsonValidationErrors(['uuid']);

        $this->assertSame(1, TemporaryUpload::count());
        $this->assertSame(1, Media::count());
    }

    public function test_default_limit_falls_back_to_the_medialibrary_max_file_size(): void
    {
        config()->set('media-library.max_file_size', 50 * 1024);

        $this->post('/media-library-pro/uploads', [
            'file' => UploadedFile::fake()->image('big.png', 10, 10)->size(51),
            'uuid' => (string) Str::uuid(),
        ], ['Accept' => 'application/json'])->assertStatus(422)->assertJsonValidationErrors(['file']);
    }

    public function test_extension_allow_list_is_configurable(): void
    {
        config()->set('media-pro.temporary_uploads_allowed_extensions', ['pdf']);

        $this->post('/media-library-pro/uploads', [
            'file' => UploadedFile::fake()->image('cat.png', 10, 10),
            'uuid' => (string) Str::uuid(),
        ], ['Accept' => 'application/json'])->assertStatus(422)->assertJsonValidationErrors(['file']);

        $this->post('/media-library-pro/uploads', [
            'file' => $this->pdf(),
            'uuid' => (string) Str::uuid(),
        ], ['Accept' => 'application/json'])->assertOk();
    }

    /** AC-47, INV-11 */
    public function test_default_rate_limit_allows_ten_uploads_per_minute(): void
    {
        for ($attempt = 1; $attempt <= 10; $attempt++) {
            $this->upload()->assertOk();
        }

        $this->upload()->assertStatus(429);
        $this->assertSame(10, TemporaryUpload::count());
    }

    /** AC-47 */
    public function test_rate_limit_per_minute_config_is_respected(): void
    {
        config()->set('media-pro.rate_limit_per_minute', 2);

        $this->upload()->assertOk();
        $this->upload()->assertOk();
        $this->upload()->assertStatus(429);
    }

    /** AC-47 */
    public function test_an_app_defined_limiter_replaces_the_default(): void
    {
        RateLimiter::for('media-pro-uploads', fn (Request $request) => Limit::perMinute(15)->by($request->ip()));

        for ($attempt = 1; $attempt <= 15; $attempt++) {
            $this->upload()->assertOk();
        }

        $this->upload()->assertStatus(429);
    }

    /** AC-64, FR-35, INV-12 */
    public function test_rejected_uploads_are_logged_without_contents_tokens_or_session_id(): void
    {
        Log::spy();
        $uuid = (string) Str::uuid();
        $secretContent = '<?php echo "secret-file-body";';

        $this->post('/media-library-pro/uploads', [
            'file' => UploadedFile::fake()->createWithContent('evil.php', $secretContent),
            'uuid' => $uuid,
            '_token' => 'csrf-token-value',
        ], ['Accept' => 'application/json', 'X-CSRF-TOKEN' => 'csrf-token-value'])->assertStatus(422);

        Log::shouldHaveReceived('warning')->once()->withArgs(function (string $message, array $context) use ($uuid, $secretContent) {
            $encoded = json_encode($context);

            return $message === 'media-pro: upload rejected'
                && $context['route'] === 'media-library-pro/uploads'
                && $context['uuid'] === $uuid
                && isset($context['reason']['file'])
                && ! str_contains($encoded, 'secret-file-body')
                && ! str_contains($encoded, $secretContent)
                && ! str_contains($encoded, 'csrf-token-value')
                && ! str_contains($encoded, $this->sessionId)
                && ! str_contains($encoded, 'evil.php');
        });
    }

    public function test_malformed_uuids_are_not_logged(): void
    {
        Log::spy();

        $this->post('/media-library-pro/uploads', ['uuid' => "x\ninjected"], ['Accept' => 'application/json'])->assertStatus(422);

        Log::shouldHaveReceived('warning')->once()->withArgs(fn (string $message, array $context) => $context['uuid'] === null);
    }

    private function upload(): \Illuminate\Testing\TestResponse
    {
        return $this->post('/media-library-pro/uploads', [
            'file' => UploadedFile::fake()->image('img.png', 10, 10),
            'uuid' => (string) Str::uuid(),
        ], ['Accept' => 'application/json']);
    }
}
