# Validation and Errors Technical

## Module Boundaries

| File                     | Owns                                                                                           |
| ------------------------ | ---------------------------------------------------------------------------------------------- |
| `src/core/validation.ts` | `validateFile`, `describeAccept` (public); `matchesAccept`, `assertValidationRules` (internal) |
| `src/core/errors.ts`     | `mapValidationErrors` (public), `MappedErrors` type                                            |

## Public API

```ts
validateFile(file: FileLike, rules?: ValidationRules, translations?: Translations): string[]
describeAccept(accept: readonly string[], translations: Translations): string
mapValidationErrors(errors: ValidationErrorBag | null | undefined, name: string, uuids: readonly string[]): MappedErrors
```

### `validateFile`

- Returns translated messages; empty means valid. Throws `TypeError` for a non-file or non-object
  rules.
- `accept` entries are trimmed and lowercased:
  - `*` or `*/*` matches anything;
  - `.ext` matches the file name suffix, or a mime type mapped from that extension;
  - `type/*` matches the mime prefix;
  - anything else is an exact mime match.
- An empty `file.type` is inferred from the file extension through a built-in table of common
  image, video, audio, document and archive types.
- Size bounds are inclusive and use 1 KB = 1024 bytes.
- `describeAccept` turns `image/*` and `video/*` into `anyImage` / `anyVideo` for messages.

`assertValidationRules` (run by the `MediaLibrary` constructor) rejects a non-array `accept`,
non-number sizes (`TypeError`), negative or non-finite sizes, and `min > max` (`RangeError`).

### `mapValidationErrors`

Result: `{ topLevelErrors: string[], validationErrors: Record<uuid, { object, name, customProperties }> }`.

1. `name` is converted to dot notation (`post[images]` becomes `post.images`).
2. Keys equal to the name go to `topLevelErrors`. Keys not starting with `name.` are ignored.
3. The first segment after the name is a known uuid, or a numeric index into `uuids` (display
   order). No match sends the messages to `topLevelErrors`.
4. `.name` goes to `name`; `.custom_properties.<key>` (exactly one key segment) goes to
   `customProperties[key]`; anything else (`.uuid`, bare uuid, deeper paths) goes to `object`.
5. Keys with a `__proto__`, `constructor` or `prototype` segment are dropped. Maps are
   null-prototype objects. Values may be a string or a string array, as Inertia passes strings.

The store maps errors only onto settled items, so errors never attach to a file still uploading.

## Dependencies

`translations.ts`, `value.ts`.

## Testing Entry Points

- `tests/core/validation.test.ts`: accept (exact, wildcard, `.ext`, empty type), size bounds,
  messages, `describeAccept`.
- `tests/core/errors.test.ts`: top-level, uuid, numeric, name and custom-property keys, string vs
  array values, unsafe segments, bracketed names.
