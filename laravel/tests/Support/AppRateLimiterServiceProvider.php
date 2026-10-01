<?php

namespace Eliyce\MediaPro\Tests\Support;

use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

/**
 * Stands in for an application's own provider defining `media-pro-uploads`.
 */
class AppRateLimiterServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        RateLimiter::for('media-pro-uploads', fn (Request $request) => Limit::perMinute(3)->by($request->ip()));
    }
}
