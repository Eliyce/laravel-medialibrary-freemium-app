<?php

namespace Eliyce\MediaPro;

use Eliyce\MediaPro\Exceptions\InvalidMediaUuid;
use Eliyce\MediaPro\Exceptions\TemporaryUploadDoesNotBelongToSession;
use Eliyce\MediaPro\Models\TemporaryUpload;
use Eliyce\MediaPro\Support\MediaLookup;
use Eliyce\MediaPro\Support\MediaProConfig;
use Eliyce\MediaPro\Support\StoredMediaFiles;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use InvalidArgumentException;
use Spatie\MediaLibrary\HasMedia;
use Spatie\MediaLibrary\MediaCollections\FileAdder;
use Spatie\MediaLibrary\MediaCollections\Models\Media;
use Throwable;

/**
 * Applies a submitted media component value to a model collection.
 *
 * Every item is checked before anything changes: it must be a temporary upload
 * of the current session or media already in this model's collection. Any
 * other uuid throws InvalidMediaUuid and leaves the database untouched.
 */
class PendingMediaLibraryRequestHandler
{
    /** @var list<string> */
    protected array $customPropertyKeys = [];

    /** @var string|callable(MediaLibraryRequestItem): string|null */
    protected $name = null;

    /** @var string|callable(MediaLibraryRequestItem): string|null */
    protected $fileName = null;

    /**
     * @param  array<array-key, mixed>  $mediaLibraryRequestItems  keyed by uuid or a list
     */
    public function __construct(
        protected array $mediaLibraryRequestItems,
        protected HasMedia $model,
        protected bool $preserveExisting,
    ) {
        if (! $model instanceof Model) {
            throw new InvalidArgumentException('Media library requests can only be applied to Eloquent models.');
        }
    }

    /**
     * Only these custom property keys are taken from the request; others are dropped.
     */
    public function withCustomProperties(string ...$customPropertyKeys): static
    {
        $this->customPropertyKeys = array_values($customPropertyKeys);

        return $this;
    }

    /**
     * @param  string|callable(MediaLibraryRequestItem): string  $name
     */
    public function usingName(string|callable $name): static
    {
        $this->name = $name;

        return $this;
    }

    /**
     * @param  string|callable(MediaLibraryRequestItem): string  $fileName
     */
    public function usingFileName(string|callable $fileName): static
    {
        $this->fileName = $fileName;

        return $this;
    }

    /**
     * The database changes run in one transaction: a failure part-way leaves
     * the collection and the temporary uploads as they were. Files cannot roll
     * back, so their handling is best-effort: copies made before the failure
     * are removed, pruned media files are deleted when pruned, and temporary
     * upload files are only deleted after the transaction commits.
     *
     * @return Collection<int, Media> the collection's media in request order
     *
     * @throws InvalidMediaUuid
     */
    public function toMediaCollection(string $collectionName = 'default', string $diskName = ''): Collection
    {
        $items = MediaLibraryRequestItem::collect($this->mediaLibraryRequestItems);
        $resolved = $this->resolveItems($items, $collectionName);

        /** @var list<array{TemporaryUpload, Media, string}> $claimed upload, its copy, the client uuid */
        $claimed = [];

        try {
            $media = DB::transaction(function () use ($items, $resolved, $collectionName, $diskName, &$claimed): Collection {
                $media = new Collection;

                foreach ($items as $index => $item) {
                    $order = $item->order ?? $index;
                    $target = $resolved[$item->uuid];

                    if ($target instanceof TemporaryUpload) {
                        $copy = $this->copyTemporaryUpload($target, $item, $order, $collectionName, $diskName);
                        $claimed[] = [$target, $copy, $item->uuid];
                        $media->push($copy);

                        continue;
                    }

                    $media->push($this->updateExistingMedia($target, $item, $order));
                }

                foreach ($claimed as [$temporaryUpload, $copy, $uuid]) {
                    $this->handOverUuid($temporaryUpload, $copy, $uuid);
                }

                if (! $this->preserveExisting) {
                    $this->model->load('media');
                    $this->model->clearMediaCollectionExcept($collectionName, $media);
                }

                return $media;
            });
        } catch (Throwable $exception) {
            foreach ($claimed as [, $copy]) {
                StoredMediaFiles::remove($copy, 'media library request rolled back');
            }

            throw $exception;
        }

        DB::afterCommit(function () use ($claimed): void {
            foreach ($claimed as [$temporaryUpload]) {
                $this->deleteTemporaryUpload($temporaryUpload);
            }
        });

        $this->model->load('media');

        return $media;
    }

    /**
     * Map every uuid to existing media of this collection or to a temporary
     * upload of the current session, throwing before any change is made.
     *
     * @param  list<MediaLibraryRequestItem>  $items
     * @return array<string, Media|TemporaryUpload>
     *
     * @throws InvalidMediaUuid
     */
    protected function resolveItems(array $items, string $collectionName): array
    {
        $uuids = [];

        foreach ($items as $item) {
            if (isset($uuids[$item->uuid])) {
                throw InvalidMediaUuid::duplicate($item->uuid);
            }

            $uuids[$item->uuid] = true;
        }

        if ($uuids === []) {
            return [];
        }

        $temporaryUploadModel = MediaProConfig::temporaryUploadModel();
        $temporaryUploadMorphClass = (new $temporaryUploadModel)->getMorphClass();

        $mediaByUuid = MediaLookup::findByUuids(array_keys($uuids));

        $temporaryUploads = $temporaryUploadModel::query()
            ->whereIn('id', $mediaByUuid->where('model_type', $temporaryUploadMorphClass)->pluck('model_id')->all())
            ->get()
            ->keyBy('id');

        $sessionId = $temporaryUploadModel::currentSessionId();
        $resolved = [];

        foreach ($items as $item) {
            $media = $mediaByUuid->get($item->uuid) ?? throw InvalidMediaUuid::create($item->uuid);

            if ($this->belongsToThisCollection($media, $collectionName)) {
                $resolved[$item->uuid] = $media;

                continue;
            }

            if ($media->model_type !== $temporaryUploadMorphClass) {
                throw InvalidMediaUuid::create($item->uuid);
            }

            $temporaryUpload = $temporaryUploads->get($media->model_id) ?? throw InvalidMediaUuid::create($item->uuid);

            if (! hash_equals((string) $temporaryUpload->session_id, $sessionId)) {
                throw TemporaryUploadDoesNotBelongToSession::create($item->uuid);
            }

            $temporaryUpload->setRelation('media', new Collection([$media]));
            $resolved[$item->uuid] = $temporaryUpload;
        }

        return $resolved;
    }

    protected function belongsToThisCollection(Media $media, string $collectionName): bool
    {
        /** @var Model&HasMedia $model */
        $model = $this->model;

        return $media->model_type === $model->getMorphClass()
            && (string) $media->model_id === (string) $model->getKey()
            && $media->collection_name === $collectionName;
    }

    protected function updateExistingMedia(Media $media, MediaLibraryRequestItem $item, int $order): Media
    {
        if ($item->name !== null) {
            $media->name = $item->name;
        }

        $media->order_column = $order;
        $media->custom_properties = array_replace(
            (array) $media->custom_properties,
            $this->allowedCustomProperties($item)
        );
        $media->save();

        return $media;
    }

    protected function copyTemporaryUpload(
        TemporaryUpload $temporaryUpload,
        MediaLibraryRequestItem $item,
        int $order,
        string $collectionName,
        string $diskName,
    ): Media {
        /** @var Media $temporaryMedia */
        $temporaryMedia = $temporaryUpload->media->first();
        $name = $this->resolveName($item) ?? $temporaryMedia->name;
        $customProperties = $this->allowedCustomProperties($item);

        return $temporaryMedia->copy(
            $this->model,
            $collectionName,
            $diskName,
            $this->resolveFileName($item) ?? '',
            static fn (FileAdder $adder): FileAdder => $adder
                ->usingName($name)
                ->setOrder($order)
                ->withCustomProperties($customProperties),
        );
    }

    /**
     * Keep the uuid the client used for this upload: the temporary media
     * gives it up for a fresh one so the copy can take it inside the
     * transaction, while its files stay until the upload is deleted.
     */
    protected function handOverUuid(TemporaryUpload $temporaryUpload, Media $copy, string $uuid): void
    {
        /** @var Media $temporaryMedia */
        $temporaryMedia = $temporaryUpload->media->first();
        $temporaryMedia->uuid = (string) Str::uuid();
        $temporaryMedia->save();

        $copy->uuid = $uuid;
        $copy->save();
    }

    /**
     * Runs after commit. A failure here leaves a claimed temporary upload
     * behind for media-pro:delete-old-temporary-uploads; it is logged and does
     * not undo the committed request.
     */
    protected function deleteTemporaryUpload(TemporaryUpload $temporaryUpload): void
    {
        try {
            $temporaryUpload->media->each(static fn (Media $media) => $media->forceDelete());
            $temporaryUpload->delete();
        } catch (Throwable $exception) {
            Log::error('media-pro: could not delete a claimed temporary upload', [
                'temporary_upload_id' => $temporaryUpload->getKey(),
                'exception' => $exception::class,
            ]);
        }
    }

    /**
     * @return array<string, mixed>
     */
    protected function allowedCustomProperties(MediaLibraryRequestItem $item): array
    {
        return array_intersect_key($item->customProperties, array_flip($this->customPropertyKeys));
    }

    protected function resolveName(MediaLibraryRequestItem $item): ?string
    {
        if ($this->name === null) {
            return $item->name;
        }

        return is_string($this->name) ? $this->name : (string) ($this->name)($item);
    }

    protected function resolveFileName(MediaLibraryRequestItem $item): ?string
    {
        if ($this->fileName === null) {
            return null;
        }

        return is_string($this->fileName) ? $this->fileName : (string) ($this->fileName)($item);
    }
}
