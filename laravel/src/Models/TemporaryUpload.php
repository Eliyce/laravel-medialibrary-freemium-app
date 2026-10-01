<?php

namespace Eliyce\MediaPro\Models;

use Closure;
use Eliyce\MediaPro\Support\MediaLookup;
use Eliyce\MediaPro\Support\MediaProConfig;
use Eliyce\MediaPro\Support\StoredMediaFiles;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Spatie\Image\Enums\Fit;
use Spatie\MediaLibrary\Conversions\Conversion;
use Spatie\MediaLibrary\HasMedia;
use Spatie\MediaLibrary\InteractsWithMedia;
use Spatie\MediaLibrary\MediaCollections\Models\Media;
use Throwable;

/**
 * Holds a file uploaded by the media components until the surrounding form is
 * submitted and the file is claimed by a model in the same session.
 *
 * @property int $id
 * @property string $session_id
 */
class TemporaryUpload extends Model implements HasMedia
{
    use InteractsWithMedia;

    public const PREVIEW_CONVERSION = 'preview';

    protected $table = 'temporary_uploads';

    protected $guarded = [];

    protected static ?Closure $previewManipulation = null;

    /**
     * Customize the `preview` conversion, e.g.
     * TemporaryUpload::previewManipulation(fn (Conversion $c) => $c->fit(Fit::Crop, 300, 300));
     * Pass null to restore the default 500x500 crop.
     */
    public static function previewManipulation(?Closure $manipulation): void
    {
        static::$previewManipulation = $manipulation;
    }

    public function registerMediaConversions(?Media $media = null): void
    {
        $conversion = $this
            ->addMediaConversion(self::PREVIEW_CONVERSION)
            ->keepOriginalImageFormat()
            ->nonQueued();

        $manipulation = static::$previewManipulation
            ?? static fn (Conversion $conversion) => $conversion->fit(Fit::Crop, 500, 500);

        $manipulation($conversion);
    }

    /**
     * @param  Builder<static>  $query
     * @return Builder<static>
     */
    public function scopeOld(Builder $query): Builder
    {
        return $query->where(
            $this->qualifyColumn('created_at'),
            '<=',
            now()->subHours(MediaProConfig::deleteOlderThanHours())
        );
    }

    /**
     * The session id temporary uploads are scoped to.
     */
    public static function currentSessionId(): string
    {
        return session()->getId();
    }

    /**
     * The temporary upload holding the media with this uuid, in any session;
     * null when the uuid is unknown or its media belongs to another model.
     */
    public static function findByMediaUuid(string $uuid): ?static
    {
        $media = MediaLookup::findByUuids([$uuid])->get($uuid);

        if ($media === null || $media->model_type !== (new static)->getMorphClass()) {
            return null;
        }

        $temporaryUpload = static::query()->find($media->model_id);
        $temporaryUpload?->setRelation('media', $media->newCollection([$media]));

        return $temporaryUpload;
    }

    /**
     * Like findByMediaUuid(), but null unless the upload belongs to the
     * current session.
     */
    public static function findByMediaUuidInCurrentSession(string $uuid): ?static
    {
        $temporaryUpload = static::findByMediaUuid($uuid);

        if ($temporaryUpload === null
            || ! hash_equals((string) $temporaryUpload->session_id, static::currentSessionId())) {
            return null;
        }

        return $temporaryUpload;
    }

    public static function createForFile(UploadedFile $file, string $sessionId, string $uuid, string $name): static
    {
        return static::storeAtomically($sessionId, $uuid, static fn (self $temporaryUpload): Media => $temporaryUpload
            ->addMedia($file)
            ->usingName($name !== '' ? $name : pathinfo($file->getClientOriginalName(), PATHINFO_FILENAME))
            ->toMediaCollection('default', MediaProConfig::temporaryUploadDisk()));
    }

    public static function createForRemoteFile(
        string $key,
        string $sessionId,
        string $uuid,
        string $name,
        string $diskName,
        ?string $fileName = null,
    ): static {
        return static::storeAtomically($sessionId, $uuid, static function (self $temporaryUpload) use ($key, $name, $diskName, $fileName): Media {
            $adder = $temporaryUpload
                ->addMediaFromDisk($key, $diskName)
                ->usingName($name !== '' ? $name : basename($key));

            if ($fileName !== null && $fileName !== '') {
                $adder->usingFileName($fileName);
            }

            return $adder->toMediaCollection('default', MediaProConfig::temporaryUploadDisk());
        });
    }

    /**
     * Create the upload and its media in one transaction. When anything fails
     * after the file was stored (for example a concurrent request taking the
     * same uuid, which surfaces as a unique index QueryException; see
     * Support\UniqueConstraintViolation), the rows roll back and the stored
     * files are removed.
     *
     * @param  Closure(self): Media  $addMedia
     */
    protected static function storeAtomically(string $sessionId, string $uuid, Closure $addMedia): static
    {
        $media = null;

        try {
            return DB::transaction(static function () use ($sessionId, $uuid, $addMedia, &$media): static {
                $temporaryUpload = static::query()->create(['session_id' => $sessionId]);
                $media = $addMedia($temporaryUpload);

                return $temporaryUpload->assignUuid($media, $uuid);
            });
        } catch (Throwable $exception) {
            if ($media instanceof Media) {
                StoredMediaFiles::remove($media, 'temporary upload failed');
            }

            throw $exception;
        }
    }

    /**
     * The client generates the uuid so it can address the upload before the
     * server answers; medialibrary assigns its own on create, so we swap it.
     */
    protected function assignUuid(Media $media, string $uuid): static
    {
        $media->uuid = $uuid;
        $media->save();

        $this->unsetRelation('media');

        return $this;
    }
}
