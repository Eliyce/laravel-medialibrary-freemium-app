# Public Entry Business

## What it is

The one place consumers import `media-pro` from:

```ts
import { VERSION } from 'media-pro';
```

It works the same whether the consumer uses ES modules (`import`) or CommonJS (`require`), and
TypeScript users get types with no extra install.

## Why it exists

A single, deliberate entry point is the package's contract with its users. Anything exported here
is a promise kept across releases; anything not exported here is private and can change freely.
That lets the library grow without breaking the people who depend on it.

## Rules

- Only names exported from the entry point are public. Deep imports such as
  `media-pro/dist/index.js` are blocked, not merely discouraged.
- Exports are named. There is no default export.
- Removing or renaming an export, or changing its type, is a breaking change and needs a major
  version (before 1.0, a minor flagged as breaking in the changeset).
- Adding an export is a minor version.
- Importing the package has no side effects, so bundlers can drop whatever a consumer does not use.

## What it exposes today

| Export    | Meaning                         |
| --------- | ------------------------------- |
| `VERSION` | The installed package's version |

No media capabilities are exposed yet.

## Error States

None. Importing the package cannot fail at runtime other than through a broken install.

## Related

- [technical.md](technical.md)
- [Version Info](../version-info/business.md)
