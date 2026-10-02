---
'@eliyce/media-pro': minor
---

First release of the media upload components, compatible with the Spatie Media Library Pro v6
React API.

- **`@eliyce/media-pro/core`** (also re-exported from `@eliyce/media-pro`): the
  framework-agnostic `MediaLibrary` store. It validates files before upload (`accept` with mime
  types, `image/*` wildcards and `.ext` entries, plus min and max size), uploads with progress
  and abort (directly or through Laravel Vapor), sends Laravel CSRF headers, maps Laravel
  validation errors onto items, and produces the uuid-keyed form value. Also exports
  `normalizeValue`, `validateFile`, `describeAccept`, `mapValidationErrors`,
  `defaultTranslations`, `resolveTranslations`, `translate`, `getCsrfHeaders`, `generateUuid`
  and the public types.
- **`@eliyce/media-pro/react`**: `MediaLibraryAttachment`, `MediaLibraryCollection` (sortable by
  drag handle and keyboard buttons, with `fieldsView` and `propertiesView`), the
  `useMediaLibrary` hook, and the helper components `DropZone`, `HiddenFields`, `ItemErrors`,
  `ListErrors`, `Thumb`, `Uploader`, `Icon`, `IconButton` and `Icons`. The entry is marked
  `"use client"` and renders on the server.
- **`@eliyce/media-pro/styles.css`**: Tailwind `@apply` source styles with `media-library-*`
  classes and overridable grid areas.
- `react` and `react-dom` (`>=18`) are optional peer dependencies. There are still no runtime
  dependencies.

The server side ships separately as the composer package `eliyce/laravel-media-pro`; see the
README.
