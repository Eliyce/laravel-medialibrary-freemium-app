<?php

namespace Eliyce\MediaPro\Tests\Feature;

use Eliyce\MediaPro\Models\TemporaryUpload;
use Eliyce\MediaPro\Tests\TestCase;
use Illuminate\Support\Facades\Storage;

class DeleteOldTemporaryUploadsCommandTest extends TestCase
{
    /** AC-61 */
    public function test_only_uploads_older_than_the_configured_hours_are_deleted(): void
    {
        $this->travelTo(now()->subHours(25));
        $old = $this->createTemporaryUpload();
        $this->travelBack();

        $this->travelTo(now()->subHour());
        $recent = $this->createTemporaryUpload();
        $this->travelBack();

        $oldPath = $this->mediaOf($old)->getPathRelativeToRoot();
        $recentPath = $this->mediaOf($recent)->getPathRelativeToRoot();
        $this->assertTrue(Storage::disk('public')->exists($oldPath));

        $this->artisan('media-pro:delete-old-temporary-uploads')
            ->expectsOutputToContain('Deleted 1 temporary upload(s)')
            ->assertExitCode(0);

        $this->assertNull(TemporaryUpload::find($old->id));
        $this->assertFalse(Storage::disk('public')->exists($oldPath));
        $this->assertNotNull(TemporaryUpload::find($recent->id));
        $this->assertTrue(Storage::disk('public')->exists($recentPath));
    }

    public function test_the_age_threshold_is_configurable(): void
    {
        config()->set('media-pro.delete_temporary_uploads_older_than_hours', 1);

        $this->travelTo(now()->subHours(2));
        $this->createTemporaryUpload();
        $this->travelBack();

        $this->artisan('media-pro:delete-old-temporary-uploads')
            ->expectsOutputToContain('Deleted 1 temporary upload(s) older than 1 hour(s).')
            ->assertExitCode(0);

        $this->assertSame(0, TemporaryUpload::count());
    }

    public function test_nothing_to_delete_reports_zero(): void
    {
        $this->createTemporaryUpload();

        $this->artisan('media-pro:delete-old-temporary-uploads')
            ->expectsOutputToContain('Deleted 0 temporary upload(s)')
            ->assertExitCode(0);

        $this->assertSame(1, TemporaryUpload::count());
    }
}
