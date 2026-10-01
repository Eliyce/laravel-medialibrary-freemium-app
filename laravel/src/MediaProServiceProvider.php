<?php

namespace Eliyce\MediaPro;

use Eliyce\MediaPro\Commands\DeleteOldTemporaryUploadsCommand;
use Eliyce\MediaPro\Http\Controllers\S3UploadController;
use Eliyce\MediaPro\Http\Controllers\UploadController;
use Eliyce\MediaPro\Support\MediaProConfig;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Routing\Router;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\ServiceProvider;

class MediaProServiceProvider extends ServiceProvider
{
    public const RATE_LIMITER = 'media-pro-uploads';

    public function register(): void
    {
        $this->mergeConfigFrom(__DIR__.'/../config/media-pro.php', 'media-pro');
    }

    public function boot(): void
    {
        if ($this->app->runningInConsole()) {
            $this->publishes([
                __DIR__.'/../config/media-pro.php' => $this->app->configPath('media-pro.php'),
            ], 'media-pro-config');

            $this->publishes([
                __DIR__.'/../database/migrations/create_temporary_uploads_table.php.stub' => $this->app->databasePath(
                    'migrations/'.date('Y_m_d_His').'_create_temporary_uploads_table.php'
                ),
            ], 'media-pro-migrations');

            $this->commands([DeleteOldTemporaryUploadsCommand::class]);
        }

        $this->registerRouteMacro();

        // After every provider booted, so an app-defined limiter always wins.
        $this->app->booted(function (): void {
            $this->registerDefaultRateLimiter();
        });
    }

    protected function registerRouteMacro(): void
    {
        Route::macro('mediaLibrary', function (string $prefix = 'media-library-pro'): void {
            /** @var Router $this */
            $this->group([
                'prefix' => $prefix,
                'middleware' => 'throttle:'.MediaProServiceProvider::RATE_LIMITER,
            ], function (Router $router): void {
                $router->post('uploads', UploadController::class);
                $router->post('s3', S3UploadController::class);
            });
        });
    }

    protected function registerDefaultRateLimiter(): void
    {
        if (RateLimiter::limiter(self::RATE_LIMITER) !== null) {
            return;
        }

        RateLimiter::for(self::RATE_LIMITER, static fn (Request $request) => Limit::perMinute(MediaProConfig::rateLimitPerMinute())
            ->by((string) $request->ip()));
    }
}
