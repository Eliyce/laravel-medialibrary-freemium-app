<?php

namespace Eliyce\MediaPro\Tests\Feature;

use Eliyce\MediaPro\Commands\DeleteOldTemporaryUploadsCommand;
use Eliyce\MediaPro\Concerns\InteractsWithMediaPro;
use Eliyce\MediaPro\MediaProServiceProvider;
use Eliyce\MediaPro\PendingMediaLibraryRequestHandler;
use Eliyce\MediaPro\Tests\Support\TestModel;
use Eliyce\MediaPro\Tests\TestCase;
use Illuminate\Routing\Route as RoutingRoute;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\ServiceProvider;
use ReflectionMethod;
use Spatie\MediaLibrary\InteractsWithMedia;

class ServiceProviderTest extends TestCase
{
    /** AC-63 */
    public function test_config_is_merged_with_documented_defaults(): void
    {
        $this->assertSame(10, config('media-pro.rate_limit_per_minute'));
        $this->assertSame(24, config('media-pro.delete_temporary_uploads_older_than_hours'));
        $this->assertNull(config('media-pro.max_file_size_in_kb'));
        $this->assertNull(config('media-pro.temporary_upload_disk'));
        $this->assertContains('png', config('media-pro.temporary_uploads_allowed_extensions'));
        $this->assertNotContains('php', config('media-pro.temporary_uploads_allowed_extensions'));
    }

    /** AC-63 */
    public function test_publish_tags_point_at_real_config_and_migration_files(): void
    {
        $config = ServiceProvider::pathsToPublish(MediaProServiceProvider::class, 'media-pro-config');
        $this->assertCount(1, $config);
        $this->assertFileExists(array_key_first($config));
        $this->assertStringEndsWith('config'.DIRECTORY_SEPARATOR.'media-pro.php', str_replace('/', DIRECTORY_SEPARATOR, reset($config)));
        $this->assertIsArray(require array_key_first($config));

        $migrations = ServiceProvider::pathsToPublish(MediaProServiceProvider::class, 'media-pro-migrations');
        $this->assertCount(1, $migrations);
        $this->assertFileExists(array_key_first($migrations));
        $this->assertMatchesRegularExpression('/\d{4}_\d{2}_\d{2}_\d{6}_create_temporary_uploads_table\.php$/', reset($migrations));
        $this->assertTrue(\Illuminate\Support\Facades\Schema::hasColumns('temporary_uploads', ['id', 'session_id', 'created_at', 'updated_at']));
    }

    /** AC-63 */
    public function test_cleanup_command_is_registered(): void
    {
        $this->assertArrayHasKey('media-pro:delete-old-temporary-uploads', Artisan::all());
        $this->assertInstanceOf(DeleteOldTemporaryUploadsCommand::class, Artisan::all()['media-pro:delete-old-temporary-uploads']);
    }

    /** AC-44 */
    public function test_route_macro_registers_upload_routes_behind_the_rate_limiter(): void
    {
        Route::mediaLibrary('custom-prefix');
        Route::getRoutes()->refreshNameLookups();

        foreach (['media-library-pro/uploads', 'media-library-pro/s3', 'custom-prefix/uploads', 'custom-prefix/s3'] as $uri) {
            $route = collect(Route::getRoutes()->getRoutes())->first(fn (RoutingRoute $route) => $route->uri() === $uri);

            $this->assertNotNull($route, "Route {$uri} is not registered.");
            $this->assertSame(['POST'], $route->methods());
            $this->assertContains('throttle:media-pro-uploads', $route->gatherMiddleware());
        }
    }

    /** FR-29: the trait swaps Spatie's pro methods for ours with compatible signatures. */
    public function test_trait_overrides_spatie_request_methods(): void
    {
        $model = TestModel::create();

        $this->assertInstanceOf(PendingMediaLibraryRequestHandler::class, $model->addFromMediaLibraryRequest([]));
        $this->assertInstanceOf(PendingMediaLibraryRequestHandler::class, $model->syncFromMediaLibraryRequest(null));
        $this->assertContains(InteractsWithMedia::class, class_uses(InteractsWithMediaPro::class));

        foreach (['addFromMediaLibraryRequest', 'syncFromMediaLibraryRequest'] as $method) {
            $ours = new ReflectionMethod(TestModel::class, $method);
            $spatie = new ReflectionMethod(InteractsWithMedia::class, $method);

            $this->assertSame(PendingMediaLibraryRequestHandler::class, $ours->getReturnType()?->getName());
            $this->assertSame($spatie->getNumberOfParameters(), $ours->getNumberOfParameters());
            $this->assertSame((string) $spatie->getParameters()[0]->getType(), (string) $ours->getParameters()[0]->getType());
        }
    }
}
