# Request Handling Business

## What it is

When the form is submitted, the controller hands the field's value to the model, and the files
the user uploaded become media in the model's collection. Files that were already there are
renamed, reordered and updated.

```php
use Eliyce\MediaPro\Concerns\InteractsWithMediaPro;

class Post extends Model implements HasMedia
{
    use InteractsWithMediaPro; // replaces Spatie's InteractsWithMedia
}

$post->addFromMediaLibraryRequest($request->validated('images'))
    ->withCustomProperties('alt', 'caption')
    ->toMediaCollection('images');
```

## Add or sync

| Method                        | Media in the collection but not in the request |
| ----------------------------- | ---------------------------------------------- |
| `addFromMediaLibraryRequest`  | Kept                                           |
| `syncFromMediaLibraryRequest` | Deleted                                        |

Options before `toMediaCollection($collection = 'default', $disk = '')`:

- `withCustomProperties('alt', ...)`: the only custom properties saved. Others are dropped.
- `usingName('Cover')` or `usingName(fn ($item) => ...)`: the media name.
- `usingFileName('cover.jpg')` or a callback: the stored file name. The file name in the request
  is ignored unless you set one here.

## Rules (what keeps users' files safe)

- A submitted uuid must be either a temporary upload from **the same session**, or media already
  in **this model's collection**. Anything else (another user's upload, another model's media,
  another collection, an unknown or repeated uuid) rejects the whole request, and nothing changes.
- Every item is checked before anything is written. The database changes run in one transaction,
  so a failure part-way leaves the collection as it was.
- The media keeps the uuid the browser gave it.
- Claimed temporary uploads and their files are deleted after the change is committed.

## Error States

`InvalidMediaUuid` (or its subclass `TemporaryUploadDoesNotBelongToSession`) is returned to the
user as a validation error under the `media` key: "The selected media is invalid." JSON requests
get a 422, form posts are redirected back with the error and their input. The message reveals
nothing about the media. The event is logged as a warning, not as a server error.

## Related

- [technical.md](technical.md)
- [Media Validation](../media-validation/business.md), which reports most problems earlier, per item
