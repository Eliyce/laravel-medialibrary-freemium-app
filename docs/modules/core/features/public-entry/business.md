# Public Entry Business

## What it is

The places consumers import `@eliyce/laravel-medialibrary-freemium-app` from:

```ts
import { VERSION, MediaLibrary } from '@eliyce/laravel-medialibrary-freemium-app'; // core API plus VERSION
import { MediaLibrary } from '@eliyce/laravel-medialibrary-freemium-app/core'; // core API only
```

The React components have their own entry (`@eliyce/laravel-medialibrary-freemium-app/react`, see the
[React module](../../../react/index/summary.md)), and the styles are at
`@eliyce/laravel-medialibrary-freemium-app/styles.css`. Every JS entry works with ES modules (`import`) and CommonJS
(`require`), and TypeScript users get types with no extra install.

## Why it exists

Declared entry points are the package's contract with its users. Anything exported from them is a
promise kept across releases; anything else is private and can change freely. Splitting core and
React into subpaths lets a server or a non-React app use the core without pulling in React.

## Rules

- Only names exported from a declared entry point are public. Deep imports such as
  `@eliyce/laravel-medialibrary-freemium-app/dist/core.js` are blocked, not merely discouraged.
- Exports are named. There is no default export.
- `.` and `./core` expose the very same objects, so mixing them in one app is safe.
- Removing or renaming an export, or changing its type, is a breaking change and needs a major
  version (before 1.0, a minor flagged as breaking in the changeset).
- Adding an export is a minor version.
- Importing a JS entry has no side effects, so bundlers drop whatever a consumer does not use.
  Only the CSS entry counts as a side effect.

## What it exposes today

| Entry    | Exports                                                                                   |
| -------- | ----------------------------------------------------------------------------------------- |
| `.`      | `VERSION` and everything in `./core`                                                      |
| `./core` | `MediaLibrary`, `normalizeValue`, `validateFile`, `mapValidationErrors`, `translate`, ... |

The full list is in the [API registry](../../../../instructions/registries/api-registry.md).

## Error States

None. Importing the package cannot fail at runtime other than through a broken install.

## Related

- [technical.md](technical.md)
- [Version Info](../version-info/business.md)
