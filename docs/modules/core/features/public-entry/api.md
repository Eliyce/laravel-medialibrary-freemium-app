# Public Entry API

## Entry points

| Specifier                        | `import` (ESM)         | `require` (CJS)  | Types                                  | Exports                               |
| -------------------------------- | ---------------------- | ---------------- | -------------------------------------- | ------------------------------------- |
| `@eliyce/media-pro`              | `dist/index.js`        | `dist/index.cjs` | `dist/index.d.ts` / `dist/index.d.cts` | `VERSION` + every core export         |
| `@eliyce/media-pro/core`         | `dist/core.js`         | `dist/core.cjs`  | `dist/core.d.ts` / `dist/core.d.cts`   | Core exports (no `VERSION`)           |
| `@eliyce/media-pro/react`        | `dist/react.js`        | `dist/react.cjs` | `dist/react.d.ts` / `dist/react.d.cts` | React exports, starts `"use client";` |
| `@eliyce/media-pro/styles.css`   | `styles/media-pro.css` | same             | n/a                                    | Tailwind source styles                |
| `@eliyce/media-pro/package.json` | `package.json`         | same             | n/a                                    | Manifest                              |

Fallbacks for tools that ignore `exports`: `main` → `./dist/index.cjs`, `module` →
`./dist/index.js`, `types` → `./dist/index.d.ts`. No entry has a default export.

```ts
import { MediaLibrary, VERSION } from '@eliyce/media-pro'; // root: VERSION + core
import { MediaLibrary as Core } from '@eliyce/media-pro/core'; // the same object as above
import { MediaLibraryCollection } from '@eliyce/media-pro/react';
import '@eliyce/media-pro/styles.css'; // or @import it from your Tailwind stylesheet
```

## Core exports (`.` and `./core`)

Values: `MediaLibrary`, `normalizeValue`, `validateFile`, `describeAccept`, `mapValidationErrors`,
`defaultTranslations`, `resolveTranslations`, `translate`, `getCsrfHeaders`, `generateUuid`.

Types: `AfterUploadResult`, `CsrfDocument`, `FileLike`, `InvalidMedia`, `MappedErrors`,
`MappedValidationErrors`, `MediaLibraryConfig`, `MediaLibraryState`, `MediaObject`,
`MediaObjectErrors`, `MediaValue`, `PartialTranslations`, `ResolvedMediaLibraryConfig`,
`TranslationKey`, `Translations`, `UploadInfo`, `UploadRequest`, `UploadResponse`,
`UploadTransport`, `UploadTransportResponse`, `ValidationErrorBag`, `ValidationRules`,
`ValueItem`, `ValueItemInput`.

Each export is documented in the API file of the feature that owns it:
[media-library-store](../media-library-store/api.md),
[validation-and-errors](../validation-and-errors/api.md),
[translations](../translations/api.md), [upload-transport](../upload-transport/api.md),
[version-info](../version-info/api.md).

## Guarantees

- `.` and `./core` share one core build, so a value imported from either is the same object
  (`instanceof MediaLibrary` holds across them).
- Importing any entry has no side effects and touches no DOM API. React is a peer, never bundled.
- Adding, removing or renaming an export is an API change: update the
  [API registry](../../../../instructions/registries/api-registry.md) and add a changeset.
