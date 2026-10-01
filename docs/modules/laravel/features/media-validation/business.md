# Media Validation Business

## What it is

Form request rules for media fields, written as a fluent builder. Errors land on the keys the
components read, so each message shows next to the right file, name or custom property.

```php
use Eliyce\MediaPro\Rules\Concerns\ValidatesMedia;

class StorePostRequest extends FormRequest
{
    use ValidatesMedia;

    public function rules(): array
    {
        return [
            'cover' => $this->validateSingleMedia()->extension(['jpg', 'png'])->maxSizeInKb(2048),
            'images' => $this->validateMultipleMedia()->minItems(1)->maxItems(10)
                ->mime('image/*')->customProperty('alt', 'required|max:255'),
        ];
    }
}
```

## Rules available

| Rule                                                             | Checks                                             |
| ---------------------------------------------------------------- | -------------------------------------------------- |
| `minItems`, `maxItems`                                           | Number of items (single media allows at most 1)    |
| `minSizeInKb`, `maxSizeInKb` (alias `...ItemSizeInKb`)           | Each file's size                                   |
| `minTotalSizeInKb`, `maxTotalSizeInKb`                           | Combined size (multiple media only)                |
| `extension`, `mime`                                              | File type; `mime` accepts wildcards like `image/*` |
| `dimensions`, `width`, `height`, `widthBetween`, `heightBetween` | Image size in pixels                               |
| `itemName`, `customProperty`, `attribute`                        | Any Laravel rules for names and custom properties  |
| `forModel($model, $collection)`                                  | Only this model's existing media is accepted       |

All bounds are inclusive, and 1 KB = 1024 bytes.

## Rules

- Every uuid must point to a temporary upload from the current session, or to existing media.
  With `forModel()`, existing media must also belong to that model's collection. Use it on update
  requests. Pass `null` on create requests, so only fresh uploads pass.
- Media that fails the ownership check gets the generic message "must refer to an uploaded file"
  before any size, type or dimension check runs, so the response says nothing about that media.
- The builder works on every supported Laravel version (10.2 through 13).

## Error keys

Field-level rules report on `images`; per-file rules on `images.<uuid>.uuid`; names on
`images.<uuid>.name`; custom properties on `images.<uuid>.custom_properties.<key>`. The
[core error mapping](../../../core/features/validation-and-errors/business.md) places each one.

## Related

- [technical.md](technical.md)
- [Request Handling](../request-handling/business.md)
