# Media Validation API

## FormRequest trait

```php
use Eliyce\MediaPro\Rules\Concerns\ValidatesMedia;

class UpdatePostRequest extends FormRequest
{
    use ValidatesMedia;

    public function rules(): array
    {
        return [
            'cover' => $this->validateSingleMedia()->extension(['jpg', 'png'])->maxSizeInKb(2048),
            'images' => $this->validateMultipleMedia()
                ->forModel($this->route('post'), 'images')
                ->minItems(1)->maxItems(5)
                ->mime('image/*')
                ->maxTotalSizeInKb(10240)
                ->itemName('required|max:255')
                ->customProperty('alt', 'required|max:255'),
        ];
    }
}
```

| Method                    | Returns                                        |
| ------------------------- | ---------------------------------------------- |
| `validateSingleMedia()`   | `MediaRules::single()` (`maxItems` fixed at 1) |
| `validateMultipleMedia()` | `MediaRules::multiple()`                       |

The builders are expanded into flat rules when the validator is built: through
`validationRules()` on Laravel 10.43+, and through a container binding of `rules()` on 10.2 to
10.42. Outside a FormRequest use `MediaRules::expand()`:

```php
Validator::make($data, MediaRules::expand(['images' => MediaRules::multiple()->maxItems(3)]));
```

## `Rules\MediaRules`

All bounds are inclusive; sizes are KB (1024 bytes). Every setter returns `static`.

| Method                                                                  | Applies to                                         |
| ----------------------------------------------------------------------- | -------------------------------------------------- |
| `single()`, `multiple()`                                                | static constructors                                |
| `expand(array $rules): array`                                           | static; replaces builders, passes the rest through |
| `toRules(string $attribute): array`                                     | the flat rules for one field                       |
| `minItems(int)`, `maxItems(int)`                                        | item count (`maxItems > 1` on single throws)       |
| `minSizeInKb(int)`, `maxSizeInKb(int)`                                  | each item                                          |
| `minItemSizeInKb(int)`, `maxItemSizeInKb(int)`                          | aliases of the two above                           |
| `minTotalSizeInKb(int)`, `maxTotalSizeInKb(int)`                        | all items together; multiple only                  |
| `extension(string\|array)`                                              | stored extension or matching mime                  |
| `mime(string\|array)`                                                   | mime type, `type/*` wildcards                      |
| `dimensions(int $w, int $h)`, `width(int)`, `height(int)`               | exact image size                                   |
| `widthBetween(int $min, int $max)`, `heightBetween(int $min, int $max)` | image size range                                   |
| `itemName(array\|string $rules)`                                        | `field.*.name`                                     |
| `customProperty(string $name, array\|string $rules)`                    | `field.*.custom_properties.<name>`                 |
| `attribute(string $name, array\|string $rules)`                         | `'name'` → `itemName`, else `customProperty`       |
| `forModel(?Model $model, string $collectionName = 'default')`           | owner scope (below)                                |

Guards: negative bounds and `max < min` throw `InvalidArgumentException`; total-size methods on
`single()` throw `BadMethodCallException`; empty `extension()`/`mime()` values and custom
property names that are empty or contain `.` or `*` throw `InvalidArgumentException`.

`toRules('images')` produces:

| Key                                | Rules                                                                                     |
| ---------------------------------- | ----------------------------------------------------------------------------------------- |
| `images`                           | `required` (when `minItems > 0`) or `nullable`, `array`, `min:`, `max:`, `TotalMediaSize` |
| `images.*`                         | `array`                                                                                   |
| `images.*.uuid`                    | `required`, `string`, `UploadedMedia`                                                     |
| `images.*.name`                    | the `itemName()` rules, when set                                                          |
| `images.*.custom_properties.<key>` | the `customProperty()` rules                                                              |

### Owner scope: `forModel()`

Without it, any existing (non-temporary) media and the current session's temporary uploads are
accepted. With it, existing media is accepted only from that model's collection; pass `null` or
an unsaved model when creating a record, so only temporary uploads pass. Temporary uploads of
other sessions never pass.

## Rules

| Class                  | Implements                        | Constructor (named, all optional)                                                                                                                                      |
| ---------------------- | --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Rules\UploadedMedia`  | `ValidationRule`, `DataAwareRule` | `minSizeInKb`, `maxSizeInKb`, `extensions`, `mimeTypes`, `minWidth`, `maxWidth`, `minHeight`, `maxHeight`, `scopedToOwner`, `ownerType`, `ownerKey`, `ownerCollection` |
| `Rules\TotalMediaSize` | `ValidationRule`                  | `minSizeInKb`, `maxSizeInKb`, `scopedToOwner`, `ownerType`, `ownerKey`, `ownerCollection`                                                                              |

Both count only media the request may claim, using the same scope. `UploadedMedia` fails an
unclaimable uuid with the generic message before any size, type or dimension check.
`TotalMediaSize` sums the `size` of claimable media only, so other sessions' uploads and (with
an owner scope) media outside the collection add nothing and reveal nothing.

Messages (translatable, `:attribute`, `:min`, `:max`, `:values`):

- `The :attribute must refer to an uploaded file.`
- `The :attribute must be at least :min kilobytes.` / `may not be greater than :max kilobytes.`
- `The :attribute must be a file of type: :values.`
- `The :attribute must be an image.`
- `The :attribute must be :min pixels wide.` / `must be between :min and :max pixels wide.` (and `high`)
- `The total size of :attribute must be at least :min kilobytes.` / `may not be greater than :max kilobytes.`

## Related

- [Technical](technical.md) ·
  [error code registry](../../../../instructions/registries/error-code-registry.md)
