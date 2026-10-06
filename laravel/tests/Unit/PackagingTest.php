<?php

namespace Eliyce\MediaPro\Tests\Unit;

use Eliyce\MediaPro\MediaProServiceProvider;
use PHPUnit\Framework\TestCase;

/** AC-67 */
class PackagingTest extends TestCase
{
    private const ROOT = __DIR__.'/../../..';

    public function test_composer_json_declares_the_package_contract(): void
    {
        $composer = json_decode((string) file_get_contents(self::ROOT.'/composer.json'), true, flags: JSON_THROW_ON_ERROR);

        $this->assertSame('eliyce/laravel-medialibrary-freemium-app', $composer['name']);
        $this->assertSame('MIT', $composer['license']);
        $this->assertSame('^8.2', $composer['require']['php']);
        $this->assertSame('^11.0', $composer['require']['spatie/laravel-medialibrary']);
        // Every Laravel component the package uses is declared, Laravel 10.2 to 13.
        foreach ([
            'illuminate/cache', 'illuminate/config', 'illuminate/console', 'illuminate/database',
            'illuminate/filesystem', 'illuminate/http', 'illuminate/log', 'illuminate/routing',
            'illuminate/session', 'illuminate/support', 'illuminate/validation',
            // FormRequest and the session()/now() helpers live in Foundation, which ships only here.
            'laravel/framework',
        ] as $package) {
            $this->assertSame('^10.2|^11.0|^12.0|^13.0', $composer['require'][$package] ?? null, "{$package} constraint");
        }

        $this->assertStringContainsString('^11.0', $composer['require-dev']['orchestra/testbench']);
        $this->assertSame(['Eliyce\\MediaPro\\' => 'laravel/src/'], $composer['autoload']['psr-4']);
        $this->assertSame([MediaProServiceProvider::class], $composer['extra']['laravel']['providers']);
        $this->assertArrayHasKey('test', $composer['scripts']);
    }

    public function test_provider_autoloads_from_laravel_src(): void
    {
        $file = (new \ReflectionClass(MediaProServiceProvider::class))->getFileName();

        $this->assertSame(realpath(self::ROOT.'/laravel/src/MediaProServiceProvider.php'), realpath((string) $file));
    }

    public function test_gitattributes_keeps_js_sources_tests_and_tooling_out_of_the_composer_archive(): void
    {
        $lines = file(self::ROOT.'/.gitattributes', FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) ?: [];
        $ignored = [];

        foreach ($lines as $line) {
            if (preg_match('/^(\S+)\s+export-ignore$/', trim($line), $match)) {
                $ignored[] = $match[1];
            }
        }

        foreach ([
            '/src', '/tests', '/styles', '/node_modules', '/dist', '/docs', '/.paqad', '/.claude', '/.changeset',
            '/laravel/tests', '/package.json', '/package-lock.json', '/tsconfig.json', '/tsup.config.ts',
            '/vitest.config.ts', '/eslint.config.js', '/.prettierrc.json', '/phpunit.xml.dist',
        ] as $path) {
            $this->assertContains($path, $ignored, "{$path} must be export-ignored.");
        }

        foreach (['/composer.json', '/laravel/src', '/laravel/config', '/laravel/database', '/README.md', '/LICENSE'] as $shipped) {
            $this->assertNotContains($shipped, $ignored, "{$shipped} must ship in the composer archive.");
        }
    }
}
