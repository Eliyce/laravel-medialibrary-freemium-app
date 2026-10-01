# Translations Technical

## Module Boundaries

| File                       | Owns                                                      |
| -------------------------- | --------------------------------------------------------- |
| `src/core/translations.ts` | `defaultTranslations`, `resolveTranslations`, `translate` |
| `src/core/types.ts`        | `Translations`, `TranslationKey`, `PartialTranslations`   |

## Public API

```ts
const defaultTranslations: Readonly<Translations>; // frozen, file is frozen too
resolveTranslations(overrides?: PartialTranslations | null): Translations;
translate(translations: Translations, key: TranslationKey, replacements?: Record<string, string | number>): string;
```

- `resolveTranslations` copies the defaults, merges `globalThis.mediaLibraryTranslations` when it
  is a plain object, then merges `overrides`. Only own properties that are known keys with string
  values are copied; `file` merges `singular` and `plural` separately. A non-object `overrides`
  throws `TypeError`.
- `translate` replaces each `{word}` with the matching replacement and leaves unknown
  placeholders as they are. An unknown key throws `TypeError`.

`MediaLibrary` resolves translations once, in its constructor (`library.translations`). Changing
the global object later does not affect a mounted component.

## Dependencies

`value.ts` (`isRecord`).

## Testing Entry Points

`tests/core/translations.test.ts`: defaults frozen, merge order, ignored unknown and non-string
keys, malformed global, `file` merge, placeholder replacement, unknown key.
