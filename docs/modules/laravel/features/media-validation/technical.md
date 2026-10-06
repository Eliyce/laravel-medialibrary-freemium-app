# Media Validation Technical

## Module Boundaries

| File                                            | Owns                                                               |
| ----------------------------------------------- | ------------------------------------------------------------------ |
| `laravel/src/Rules/Concerns/ValidatesMedia.php` | FormRequest trait: builders and rule expansion                     |
| `laravel/src/Rules/MediaRules.php`              | Fluent builder, `single()`, `multiple()`, `expand()`, `toRules()`  |
| `laravel/src/Rules/UploadedMedia.php`           | Per-uuid rule: ownership, size, type, dimensions (`DataAwareRule`) |
| `laravel/src/Rules/TotalMediaSize.php`          | Field-level combined size rule                                     |

## Expansion

`MediaRules::toRules('images')` returns:

| Key                                | Rules                                                                                     |
| ---------------------------------- | ----------------------------------------------------------------------------------------- |
| `images`                           | `required` when `minItems > 0` else `nullable`, `array`, `min:`, `max:`, `TotalMediaSize` |
| `images.*`                         | `array`                                                                                   |
| `images.*.uuid`                    | `required`, `string`, `UploadedMedia(...)`                                                |
| `images.*.name`                    | `itemName()` rules, when set                                                              |
| `images.*.custom_properties.<key>` | `customProperty()` rules                                                                  |

`MediaRules::expand(array $rules)` replaces every builder in a rules array with its flat rules and
passes other entries through; use it with `Validator::make()`.

`ValidatesMedia` hooks the expansion into FormRequest:

- Laravel 10.43+: overrides `validationRules()` to return `MediaRules::expand(parent::validationRules())`.
- Laravel 10.2 to 10.42 (no `validationRules()` hook): `getValidatorInstance()` binds a container
  method for `rules` that expands the result, then defers to the parent.

The Laravel 10 CI leg installs only the latest 10.x release, which has `validationRules()`, so the
10.2 to 10.42 fallback is verified only by local runs (TD-19).

## Builder guards

- `single()` with `maxItems(> 1)` throws `InvalidArgumentException`; `min/maxTotalSizeInKb` on
  `single()` throw `BadMethodCallException`.
- Negative bounds throw `InvalidArgumentException`; `widthBetween` / `heightBetween` check order.
- `attribute('name', $rules)` is `itemName()`; any other attribute is `customProperty()`.
- `forModel(?Model, $collection = 'default')` sets the owner scope; an unsaved or null model means
  no existing media is accepted.

## `UploadedMedia`

1. On first use, loads every sibling uuid of the field in one query (`MediaLookup::findByUuids`)
   and filters them with `MediaLookup::claimable()` (one more query for the session ids of their
   temporary uploads).
2. Unknown uuid or not claimable → "The :attribute must refer to an uploaded file." and stop.
   Claimable: a temporary upload whose session id `hash_equals` the current one; or, without an
   owner scope, any non-temporary media; with a scope, media of that model type, key and
   collection.
3. Size bounds, extension and mime (wildcards) checks, then dimensions read from the stored file
   (non-images fail with "must be an image").

Messages go through `->translate()` with `:min`, `:max`, `:values` placeholders, so apps can
translate them.

## `TotalMediaSize`

Loads the value's uuids with `MediaLookup::findByUuids`, keeps only claimable media with
`MediaLookup::claimable()` and the same owner scope as `UploadedMedia` (`MediaRules::toRules()`
passes `scopedToOwner`, `ownerType`, `ownerKey` and `ownerCollection` to both), then sums `size`
and checks the inclusive KB bounds. Temporary uploads of other sessions and, with `forModel()`,
media outside that model's collection add nothing, so the total reveals nothing about them; they
already fail on their own `field.*.uuid` key. Two queries at most, whatever the item count.

## `MediaLookup::claimable()`

```php
MediaLookup::claimable(Collection $media, bool $scopedToOwner = false, ?string $ownerType = null,
    ?string $ownerKey = null, ?string $ownerCollection = null): Collection
```

The one ownership filter both rules use (RULE-11). It loads the `session_id` of every temporary
upload in `$media` in one query (none when there are none) and keeps temporary uploads of the
current session plus existing media allowed by the owner scope. Keys are preserved.

## Testing Entry Points

`laravel/tests/Feature/MediaRulesTest.php`: FormRequest expansion and failure keys, `expand()`
parity, each rule at and beyond its bound (data provider), single-media limits, total size
multiple-only, invalid bounds, unknown and foreign-session uuids, placeholders, attached media,
`forModel` scoping (including unsaved models), foreign media failing before other checks, total
size counting only the current session's uploads and the owner scope's media and revealing
nothing about foreign media, fixed query count. Fixture request: `laravel/tests/Support/StoreImagesRequest.php`.
