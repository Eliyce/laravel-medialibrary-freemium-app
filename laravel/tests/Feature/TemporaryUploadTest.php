<?php

namespace Eliyce\MediaPro\Tests\Feature;

use Eliyce\MediaPro\Models\TemporaryUpload;
use Eliyce\MediaPro\Tests\Support\TestModel;
use Eliyce\MediaPro\Tests\TestCase;
use Illuminate\Http\UploadedFile;

/** FR-28 */
class TemporaryUploadTest extends TestCase
{
    public function test_find_by_media_uuid_returns_the_upload_holding_that_media(): void
    {
        $temporaryUpload = $this->createTemporaryUpload();
        $media = $this->mediaOf($temporaryUpload);

        $found = TemporaryUpload::findByMediaUuid($media->uuid);

        $this->assertInstanceOf(TemporaryUpload::class, $found);
        $this->assertSame($temporaryUpload->getKey(), $found->getKey());
        $this->assertSame($media->uuid, $found->getFirstMedia()?->uuid);
    }

    public function test_find_by_media_uuid_finds_uploads_of_any_session(): void
    {
        $other = $this->createTemporaryUpload(sessionId: 'another-session');

        $this->assertSame($other->getKey(), TemporaryUpload::findByMediaUuid($this->mediaOf($other)->uuid)?->getKey());
    }

    public function test_find_by_media_uuid_returns_null_for_unknown_uuids_and_media_of_other_models(): void
    {
        $this->createTemporaryUpload();
        $attached = TestModel::create()->addMedia(UploadedFile::fake()->image('a.png', 10, 10))->toMediaCollection('images');

        $this->assertNull(TemporaryUpload::findByMediaUuid('0b8f6c1e-1111-4111-8111-111111111111'));
        $this->assertNull(TemporaryUpload::findByMediaUuid(''));
        $this->assertNull(TemporaryUpload::findByMediaUuid($attached->uuid));
    }

    public function test_find_by_media_uuid_in_current_session_returns_an_upload_of_this_session(): void
    {
        $temporaryUpload = $this->createTemporaryUpload();

        $found = TemporaryUpload::findByMediaUuidInCurrentSession($this->mediaOf($temporaryUpload)->uuid);

        $this->assertSame($temporaryUpload->getKey(), $found?->getKey());
        $this->assertSame(TemporaryUpload::currentSessionId(), $found->session_id);
    }

    public function test_find_by_media_uuid_in_current_session_ignores_uploads_of_other_sessions(): void
    {
        $other = $this->createTemporaryUpload(sessionId: 'another-session');

        $this->assertNull(TemporaryUpload::findByMediaUuidInCurrentSession($this->mediaOf($other)->uuid));
    }

    public function test_find_by_media_uuid_in_current_session_returns_null_when_not_found(): void
    {
        $attached = TestModel::create()->addMedia(UploadedFile::fake()->image('a.png', 10, 10))->toMediaCollection('images');

        $this->assertNull(TemporaryUpload::findByMediaUuidInCurrentSession('0b8f6c1e-1111-4111-8111-111111111111'));
        $this->assertNull(TemporaryUpload::findByMediaUuidInCurrentSession($attached->uuid));
    }
}
