# React Summary

React is the UI half of `@eliyce/laravel-medialibrary-freemium-app`: the `MediaLibraryAttachment` and
`MediaLibraryCollection` components, the `useMediaLibrary` hook they are built on, the helper
components for building your own UI, and the Tailwind source styles. It is a thin binding over the
[Core](../../core/index/summary.md) `MediaLibrary` store and follows the Spatie Media Library Pro v6
React API.

## Features

| Feature                  | What it does                                                                             | Docs                                                                                                                                                                               |
| ------------------------ | ---------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Use Media Library Hook   | `useMediaLibrary`: one store per mount, state, prop getters and actions                  | [business](../features/use-media-library/business.md) · [technical](../features/use-media-library/technical.md) · [api](../features/use-media-library/api.md)                      |
| Media Library Attachment | One file (or several with `multiple`) for a form field                                   | [business](../features/media-library-attachment/business.md) · [technical](../features/media-library-attachment/technical.md) · [api](../features/media-library-attachment/api.md) |
| Media Library Collection | A sortable list with names, custom properties, drag and keyboard reordering              | [business](../features/media-library-collection/business.md) · [technical](../features/media-library-collection/technical.md) · [api](../features/media-library-collection/api.md) |
| Helper Components        | `DropZone`, `HiddenFields`, `ItemErrors`, `ListErrors`, `Thumb`, `Uploader`, `Icon`, ... | [business](../features/helper-components/business.md) · [technical](../features/helper-components/technical.md) · [api](../features/helper-components/api.md)                      |
| Styles                   | `styles/media-pro.css`: Tailwind `@apply` source, `media-library-*` classes, grid areas  | [business](../features/styles/business.md) · [technical](../features/styles/technical.md) · [api](../features/styles/api.md)                                                       |

## Source

- `src/react/index.ts` (barrel), `use-media-library.ts`, `MediaLibraryAttachment.tsx`,
  `MediaLibraryCollection.tsx`, `props.ts`, `utils.ts`
- `src/react/components/`: `DropZone`, `HiddenFields`, `ItemErrors`, `ListErrors`, `Thumb`,
  `Uploader`, `Icons`, `Icon`, `IconButton`, plus internal `NameField` and `ProgressBar`
- `styles/media-pro.css`

## Public Surface

| Specifier                                              | Exposes                                                               |
| ------------------------------------------------------ | --------------------------------------------------------------------- |
| `@eliyce/laravel-medialibrary-freemium-app/react`      | Components, `useMediaLibrary`, helper components and their prop types |
| `@eliyce/laravel-medialibrary-freemium-app/styles.css` | The Tailwind source stylesheet                                        |

The full list is in the [component registry](../../../instructions/registries/component-registry.md)
and the [API registry](../../../instructions/registries/api-registry.md).

## Dependencies

- **Uses:** Core (`MediaLibrary`, `validateFile`, `resolveTranslations`, types) through
  `../core/index.js`. The build points that import at the shared `dist/core.*`, so the app has one
  `MediaLibrary` class.
- **Peers:** `react` and `react-dom` 18 or later, optional in `peerDependenciesMeta` so core-only
  consumers get no warning. Only `react` is imported; `react-dom` is never imported at module
  scope.
- **Styles:** need Tailwind in the consuming app.

## Tests

`tests/react/*.test.tsx` run in jsdom (per-file `// @vitest-environment jsdom`) with Testing Library
and a fake transport: the hook lifecycle, Attachment, Collection, helper components, server
rendering (`renderToString` without `window`) and the shipped stylesheet. They run on React 19
locally; CI also runs them on React 18 (`npm-react18` job).

## Known Gaps

- TD-10: the styles use Tailwind's default palette because the design tokens are placeholders.
- TD-15: the stylesheet is not compiled by Tailwind in the test suite.

## Related Docs

- [Architecture overview](../../../instructions/architecture/overview.md)
- [Component registry](../../../instructions/registries/component-registry.md)
