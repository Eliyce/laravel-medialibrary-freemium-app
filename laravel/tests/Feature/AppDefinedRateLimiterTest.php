<?php

namespace Eliyce\MediaPro\Tests\Feature;

use Eliyce\MediaPro\Tests\Support\AppRateLimiterServiceProvider;
use Eliyce\MediaPro\Tests\TestCase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Str;

/** AC-47, FR-24: a limiter the app defines is never replaced by the default. */
class AppDefinedRateLimiterTest extends TestCase
{
    protected function getPackageProviders($app): array
    {
        // The app provider boots after the package provider, as in a real app.
        return [...parent::getPackageProviders($app), AppRateLimiterServiceProvider::class];
    }

    public function test_the_app_limiter_is_kept(): void
    {
        foreach (range(1, 3) as $ignored) {
            $this->upload()->assertOk();
        }

        $this->upload()->assertStatus(429);
    }

    private function upload(): \Illuminate\Testing\TestResponse
    {
        return $this->post('/media-library-pro/uploads', [
            'file' => UploadedFile::fake()->image('img.png', 10, 10),
            'uuid' => (string) Str::uuid(),
        ], ['Accept' => 'application/json']);
    }
}
