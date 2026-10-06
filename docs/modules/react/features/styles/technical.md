# Styles Technical

## Module Boundaries

| File                   | Owns                                                                                     |
| ---------------------- | ---------------------------------------------------------------------------------------- |
| `styles/media-pro.css` | All component styles, exported as `@eliyce/laravel-medialibrary-freemium-app/styles.css` |

`package.json` exports `./styles.css` → `./styles/media-pro.css`, publishes `styles/` through
`files`, and lists `**/*.css` in `sideEffects` so bundlers keep the CSS import.

## Structure

- Every rule is `@apply` with core Tailwind utilities (gray, blue and red palette, spacing,
  radius, focus-visible rings), except `grid-template-areas` / `grid-area`.
- Sections: layout (`.media-library` grid with `errors`, `items`, `uploader` areas), buttons and
  icons, list errors, items and rows, thumbs and progress, fields and inputs, sort controls,
  uploader and drop zone.
- No hex colors, no `!important`, no plugin utilities.
- The class names are the contract with the components; the test below keeps them in sync.

## Consumption

The file has no `@import 'tailwindcss'` of its own, so the consumer's stylesheet must import
Tailwind first and then this file. Tailwind compiles the `@apply` rules with the consumer's
theme. The header comment documents the Tailwind 4 `@import` form.

## Testing Entry Points

`tests/react/styles.test.tsx` reads the real shipped file and checks that it is non-empty, uses
`@apply`, defines the three grid areas, prefixes every class with `media-library`, and defines
every class the components render. It does not run Tailwind (TD-15).
