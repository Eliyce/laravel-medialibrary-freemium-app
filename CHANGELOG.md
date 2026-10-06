# Changelog

## 0.1.0

### Minor Changes

- 6e26d7b: First release of the media upload components, compatible with the Spatie Media Library Pro v6
  React API.

  - **`@eliyce/laravel-medialibrary-freemium-app/core`** (also re-exported from `@eliyce/laravel-medialibrary-freemium-app`): the
    framework-agnostic `MediaLibrary` store. It validates files before upload (`accept` with mime
    types, `image/*` wildcards and `.ext` entries, plus min and max size), uploads with progress
    and abort (directly or through Laravel Vapor), sends Laravel CSRF headers, maps Laravel
    validation errors onto items, and produces the uuid-keyed form value. Also exports
    `normalizeValue`, `validateFile`, `describeAccept`, `mapValidationErrors`,
    `defaultTranslations`, `resolveTranslations`, `translate`, `getCsrfHeaders`, `generateUuid`
    and the public types.
  - **`@eliyce/laravel-medialibrary-freemium-app/react`**: `MediaLibraryAttachment`, `MediaLibraryCollection` (sortable by
    drag handle and keyboard buttons, with `fieldsView` and `propertiesView`), the
    `useMediaLibrary` hook, and the helper components `DropZone`, `HiddenFields`, `ItemErrors`,
    `ListErrors`, `Thumb`, `Uploader`, `Icon`, `IconButton` and `Icons`. The entry is marked
    `"use client"` and renders on the server.
  - **`@eliyce/laravel-medialibrary-freemium-app/styles.css`**: Tailwind `@apply` source styles with `media-library-*`
    classes and overridable grid areas.
  - `react` and `react-dom` (`>=18`) are optional peer dependencies. There are still no runtime
    dependencies.

  The server side ships separately as the composer package `eliyce/laravel-medialibrary-freemium-app`; see the
  README.

### Patch Changes

- 29e26c8: `eliyce/laravel-medialibrary-freemium-app`: files on a private disk now get temporary signed URLs. When the disk
  that holds a file has a `visibility` other than `public` and can sign URLs (for example a
  private S3 bucket on Laravel Vapor), `preview_url` and `original_url` in upload responses and in
  `MediaProValue::collection()` are signed URLs instead of plain ones, which the bucket rejected
  with 403. They last `media-pro.signed_url_expiration_minutes` (default 60); set it to `null` to
  keep plain URLs.

All notable changes to this project will be documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).
