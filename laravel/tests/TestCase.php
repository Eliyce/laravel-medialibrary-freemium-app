<?php

namespace Eliyce\MediaPro\Tests;

use Eliyce\MediaPro\MediaProServiceProvider;
use Eliyce\MediaPro\Models\TemporaryUpload;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\QueryException;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Orchestra\Testbench\TestCase as Orchestra;
use PDOException;
use Spatie\MediaLibrary\MediaCollections\Models\Media;
use Spatie\MediaLibrary\MediaLibraryServiceProvider;

abstract class TestCase extends Orchestra
{
    protected function setUp(): void
    {
        parent::setUp();

        Storage::fake('public');
    }

    protected function tearDown(): void
    {
        TemporaryUpload::previewManipulation(null);

        parent::tearDown();
    }

    protected function getPackageProviders($app): array
    {
        return [
            MediaLibraryServiceProvider::class,
            MediaProServiceProvider::class,
        ];
    }

    protected function defineEnvironment($app): void
    {
        $app['config']->set('app.key', 'base64:'.base64_encode(str_repeat('k', 32)));
        $app['config']->set('database.default', 'testing');
        $app['config']->set('cache.default', 'array');
        $app['config']->set('session.driver', 'array');
        $app['config']->set('media-library.disk_name', 'public');
        $app['config']->set('media-library.queue_conversions_by_default', false);
        $app['config']->set('filesystems.disks.s3', ['driver' => 'local', 'root' => sys_get_temp_dir().'/media-pro-s3']);
    }

    protected function defineDatabaseMigrations(): void
    {
        $mediaMigration = require __DIR__.'/../../vendor/spatie/laravel-medialibrary/database/migrations/create_media_table.php.stub';
        $mediaMigration->up();

        $temporaryUploadsMigration = require __DIR__.'/../database/migrations/create_temporary_uploads_table.php.stub';
        $temporaryUploadsMigration->up();

        Schema::create('test_models', function (Blueprint $table) {
            $table->id();
            $table->string('name')->nullable();
            $table->timestamps();
        });
    }

    protected function defineRoutes($router): void
    {
        $router->middleware('web')->group(function () {
            Route::mediaLibrary();
        });
    }

    protected function createTemporaryUpload(
        ?string $sessionId = null,
        ?string $uuid = null,
        string $name = 'upload',
        ?UploadedFile $file = null,
    ): TemporaryUpload {
        return TemporaryUpload::createForFile(
            $file ?? UploadedFile::fake()->image('upload.png', 40, 30),
            $sessionId ?? TemporaryUpload::currentSessionId(),
            $uuid ?? (string) Str::uuid(),
            $name,
        );
    }

    protected function mediaOf(TemporaryUpload $temporaryUpload): Media
    {
        return $temporaryUpload->getFirstMedia();
    }

    /**
     * Simulate a concurrent request: right after the next media row is
     * created, another row takes `$uuid`, so assigning it hits the unique index.
     */
    protected function takeUuidWhenTheNextMediaIsCreated(string $uuid): void
    {
        $taken = false;

        Media::created(function (Media $media) use ($uuid, &$taken): void {
            if ($taken) {
                return;
            }

            $taken = true;
            DB::table($media->getTable())->insert(
                ['uuid' => $uuid] + Arr::except($media->getAttributes(), [$media->getKeyName(), 'uuid'])
            );
        });
    }

    /**
     * Make the next media insert fail with a non-unique integrity error, as a
     * plain QueryException.
     */
    protected function failTheNextMediaInsertWithANotNullViolation(): void
    {
        Media::creating(function (Media $media): void {
            $previous = new PDOException('SQLSTATE[23000]: Integrity constraint violation: 19 NOT NULL constraint failed: media.name');
            $previous->errorInfo = ['23000', 19, 'NOT NULL constraint failed: media.name'];

            throw new QueryException($media->getConnectionName() ?? 'testing', 'insert into "media"', [], $previous);
        });
    }

    protected function pdf(string $name = 'document.pdf'): UploadedFile
    {
        return UploadedFile::fake()->createWithContent($name, "%PDF-1.4\n1 0 obj << /Type /Catalog >> endobj\ntrailer << /Root 1 0 R >>\n%%EOF\n");
    }
}
