# Request Handling Technical

## Module Boundaries

| File                                                               | Owns                                                                                       |
| ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------ |
| `laravel/src/Concerns/InteractsWithMediaPro.php`                   | `use InteractsWithMedia, HandlesMediaLibraryRequests { ... insteadof InteractsWithMedia }` |
| `laravel/src/Concerns/HandlesMediaLibraryRequests.php`             | `addFromMediaLibraryRequest(?array)`, `syncFromMediaLibraryRequest(?array)`                |
| `laravel/src/PendingMediaLibraryRequestHandler.php`                | Builder and `toMediaCollection()`                                                          |
| `laravel/src/MediaLibraryRequestItem.php`                          | Value object: `fromArray`, `collect`                                                       |
| `laravel/src/Exceptions/InvalidMediaUuid.php`                      | Exception with `report()` (warning) and `render()` (validation error)                      |
| `laravel/src/Exceptions/TemporaryUploadDoesNotBelongToSession.php` | Subclass for a foreign-session temporary upload                                            |
| `laravel/src/Support/MediaLookup.php`                              | Batched `findByUuids`, `uuidsFromValue`, `claimable` (used by the validation rules)        |

## Public API

```php
$model->addFromMediaLibraryRequest(?array $items): PendingMediaLibraryRequestHandler   // preserveExisting: true
$model->syncFromMediaLibraryRequest(?array $items): PendingMediaLibraryRequestHandler  // preserveExisting: false

PendingMediaLibraryRequestHandler::withCustomProperties(string ...$keys): static
PendingMediaLibraryRequestHandler::usingName(string|callable(MediaLibraryRequestItem): string): static
PendingMediaLibraryRequestHandler::usingFileName(string|callable(MediaLibraryRequestItem): string): static
PendingMediaLibraryRequestHandler::toMediaCollection(string $collection = 'default', string $disk = ''): Collection<int, Media>

MediaLibraryRequestItem { uuid, ?name, ?order, customProperties, ?fileName }
MediaLibraryRequestItem::fromArray(mixed): self   // InvalidMediaUuid::missing() without a string uuid
MediaLibraryRequestItem::collect(?array): list<self> // uuid-keyed or list input
```

The handler's constructor throws `InvalidArgumentException` when the `HasMedia` is not an Eloquent
model.

## `toMediaCollection()` flow

```text
items = collect(request value)
resolveItems():                                  (no writes yet)
  duplicate uuid            → InvalidMediaUuid::duplicate
  MediaLookup::findByUuids  (1 query) + temporary uploads by id (1 query)
  per item: media in this model + collection → update target
            media of a TemporaryUpload, session hash_equals current → claim target
            foreign session → TemporaryUploadDoesNotBelongToSession
            anything else   → InvalidMediaUuid::create
DB::transaction:
  claim:  Media::copy(model, collection, disk, fileName, name/order/whitelisted props)
  update: name (if given), order_column, custom_properties = existing + whitelisted
  hand over uuid: temporary media gets a fresh uuid, the copy takes the client uuid
  sync:   clearMediaCollectionExcept(collection, kept media)
on Throwable: StoredMediaFiles::remove(each copy), rethrow
DB::afterCommit: force-delete temporary media + delete TemporaryUpload (failures logged)
```

### Same ownership rules as validation

The handler and the validation rules accept the same uuids: a temporary upload whose
`session_id` `hash_equals` the current session id, or media already in the target collection.
The rules check it with `MediaLookup::claimable()` (see
[media validation](../media-validation/technical.md#medialookupclaimable)); the handler resolves
it in `resolveItems()` before writing, so a request that skipped validation still cannot claim
foreign media. For a single uuid outside a request, `TemporaryUpload::findByMediaUuidInCurrentSession()`
applies the same session check (see [temporary uploads](../temporary-uploads/technical.md#temporaryupload)).

`order` defaults to the item's position in the request. `name` defaults to the request name,
else the temporary media's name. The request `file_name` is not used unless `usingFileName()` is
set.

## `InvalidMediaUuid`

- Factories: `missing()`, `create($uuid)`, `duplicate($uuid)`; public readonly `?string $uuid`.
- `report()`: `Log::warning('media-pro: media library request rejected', { reason, uuid })`, uuid
  only when it is a well-formed uuid.
- `render()`: hands `ValidationException::withMessages(['media' => [__('The selected media is invalid.')]])`
  to the app's exception handler, which answers 422 JSON or redirects back.
  `InvalidMediaUuid::ERROR_KEY = 'media'`.

## Testing Entry Points

- `laravel/tests/Feature/PendingMediaLibraryRequestHandlerTest.php`: add and sync semantics,
  foreign session and foreign model rejection, other collection, unknown and duplicate uuids,
  422 JSON and redirect rendering, rollback on failure, temporary file deletion after commit,
  empty sync, name and file-name strings and callables, untrusted request file name, custom
  property whitelist and merge, fixed query count.
- `laravel/tests/Unit/MediaLibraryRequestItemTest.php`.
