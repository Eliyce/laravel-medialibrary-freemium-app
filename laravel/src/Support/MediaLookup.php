<?php

namespace Eliyce\MediaPro\Support;

use Illuminate\Support\Collection;
use Spatie\MediaLibrary\MediaCollections\Models\Media;

/**
 * Batched media lookups shared by the request handler and validation rules,
 * so a request with many items costs a fixed number of queries.
 */
class MediaLookup
{
    /**
     * @param  iterable<mixed>  $uuids  non-string values are ignored
     * @return Collection<string, Media> keyed by uuid
     */
    public static function findByUuids(iterable $uuids): Collection
    {
        $strings = [];

        foreach ($uuids as $uuid) {
            if (is_string($uuid) && $uuid !== '') {
                $strings[$uuid] = true;
            }
        }

        if ($strings === []) {
            return new Collection;
        }

        $mediaModel = MediaProConfig::mediaModel();

        return $mediaModel::query()->whereIn('uuid', array_keys($strings))->get()->keyBy('uuid');
    }

    /**
     * Keep only the media a request may claim: temporary uploads of the
     * current session, and existing media; with an owner scope
     * (MediaRules::forModel()) existing media only from that model's
     * collection. Costs one query when temporary uploads are present.
     *
     * @template TKey of array-key
     *
     * @param  Collection<TKey, Media>  $media
     * @return Collection<TKey, Media>
     */
    public static function claimable(
        Collection $media,
        bool $scopedToOwner = false,
        ?string $ownerType = null,
        ?string $ownerKey = null,
        ?string $ownerCollection = null,
    ): Collection {
        $temporaryUploadModel = MediaProConfig::temporaryUploadModel();
        $morphClass = (new $temporaryUploadModel)->getMorphClass();
        $ids = $media->where('model_type', $morphClass)->pluck('model_id')->unique()->values()->all();

        $sessions = [];
        $sessionId = '';

        if ($ids !== []) {
            $sessions = $temporaryUploadModel::query()->whereIn('id', $ids)->pluck('session_id', 'id')->all();
            $sessionId = $temporaryUploadModel::currentSessionId();
        }

        return $media->filter(static function (Media $item) use (
            $morphClass, $sessions, $sessionId, $scopedToOwner, $ownerType, $ownerKey, $ownerCollection
        ): bool {
            if ($item->model_type === $morphClass) {
                $uploadSessionId = $sessions[$item->model_id] ?? null;

                return is_string($uploadSessionId) && hash_equals($uploadSessionId, $sessionId);
            }

            if (! $scopedToOwner) {
                return true;
            }

            return $ownerKey !== null
                && $item->model_type === $ownerType
                && (string) $item->model_id === $ownerKey
                && $item->collection_name === $ownerCollection;
        });
    }

    /**
     * The uuids of a submitted media value, keyed by uuid or as a list.
     *
     * @return list<string>
     */
    public static function uuidsFromValue(mixed $value): array
    {
        if (! is_array($value)) {
            return [];
        }

        $uuids = [];

        foreach ($value as $item) {
            if (is_array($item) && isset($item['uuid']) && is_string($item['uuid'])) {
                $uuids[] = $item['uuid'];
            }
        }

        return $uuids;
    }
}
