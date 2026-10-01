# Request Handling API

## Model trait

```php
use Eliyce\MediaPro\Concerns\InteractsWithMediaPro;
use Spatie\MediaLibrary\HasMedia;

class Post extends Model implements HasMedia
{
    use InteractsWithMediaPro; // instead of Spatie's InteractsWithMedia
}
```

`Concerns\InteractsWithMediaPro` uses Spatie's `InteractsWithMedia` and
`Concerns\HandlesMediaLibraryRequests`, taking `addFromMediaLibraryRequest` and
`syncFromMediaLibraryRequest` from the latter.

| Method                                       | Returns                             | Effect on media not in the request |
| -------------------------------------------- | ----------------------------------- | ---------------------------------- |
| `addFromMediaLibraryRequest(?array $items)`  | `PendingMediaLibraryRequestHandler` | Kept                               |
| `syncFromMediaLibraryRequest(?array $items)` | `PendingMediaLibraryRequestHandler` | Deleted from the collection        |

`$items` is the submitted value, keyed by uuid (form submit) or a list (JSON); `null` is an empty
request.

## `PendingMediaLibraryRequestHandler`

```php
public function withCustomProperties(string ...$customPropertyKeys): static;
public function usingName(string|callable $name): static;         // callable(MediaLibraryRequestItem): string
public function usingFileName(string|callable $fileName): static; // callable(MediaLibraryRequestItem): string
public function toMediaCollection(string $collectionName = 'default', string $diskName = ''): Collection; // Collection<int, Media>
```

```php
$post->syncFromMediaLibraryRequest($request->validated('images'))
    ->withCustomProperties('alt')
    ->usingName(fn (MediaLibraryRequestItem $item) => $item->name ?? 'Untitled')
    ->toMediaCollection('images');
```

`toMediaCollection()` returns the collection's media in request order and reloads the model's
`media` relation.

| Item refers to                                  | Result                                                                             |
| ----------------------------------------------- | ---------------------------------------------------------------------------------- |
| Media already in this model's `$collectionName` | Updated: `name` (when sent), `order_column`, listed custom properties merged       |
| A temporary upload of the current session       | Copied into the collection under the same uuid; the upload is deleted after commit |
| A temporary upload of another session           | `TemporaryUploadDoesNotBelongToSession`                                            |
| Unknown uuid, another model or collection       | `InvalidMediaUuid::create()`                                                       |
| The same uuid twice                             | `InvalidMediaUuid::duplicate()`                                                    |
| No string `uuid`                                | `InvalidMediaUuid::missing()`                                                      |

Every item is checked before anything is written. Writes run in one transaction; on failure
copied files are removed and the exception is rethrown.

Defaults: `order` is the item's position; `name` is the request name, else the temporary
upload's name; the request `file_name` is ignored unless `usingFileName()` is set; only custom
property keys listed in `withCustomProperties()` are stored. The constructor throws
`InvalidArgumentException` when the model is not an Eloquent model.

## `MediaLibraryRequestItem`

```php
// public readonly: string $uuid, ?string $name, ?int $order, array $customProperties, ?string $fileName

MediaLibraryRequestItem::fromArray(mixed $properties): self   // throws InvalidMediaUuid::missing()
MediaLibraryRequestItem::collect(?array $items): list<self>    // uuid-keyed or list
```

Request item shape: `{ uuid, name?, order?, custom_properties?, file_name? }`.

## Exceptions

| Class                                              | Factory                                          | Public                                 |
| -------------------------------------------------- | ------------------------------------------------ | -------------------------------------- |
| `Exceptions\InvalidMediaUuid`                      | `missing()`, `create($uuid)`, `duplicate($uuid)` | `?string $uuid`, `ERROR_KEY = 'media'` |
| `Exceptions\TemporaryUploadDoesNotBelongToSession` | `create($uuid)`; extends `InvalidMediaUuid`      |                                        |

Uncaught, they render like a failed validation under the `media` key. JSON requests get a 422:

```json
{
  "message": "The selected media is invalid.",
  "errors": { "media": ["The selected media is invalid."] }
}
```

Non-JSON requests are redirected back with that error and the old input. The message is
translatable (`__('The selected media is invalid.')`) and says nothing about the media. They are
logged as `media-pro: media library request rejected` (warning) with `reason` and the uuid when
well-formed, not reported as server errors.

## Related

- [Technical](technical.md) · Validate first with the
  [media validation API](../media-validation/api.md)
