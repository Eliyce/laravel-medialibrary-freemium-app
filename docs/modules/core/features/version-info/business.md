# Version Info Business

## What it is

`VERSION` is a constant holding the installed version of `media-pro`, for example `'0.0.0'`.

```ts
import { VERSION } from 'media-pro';
console.log(VERSION); // '0.0.0'
```

## Why it exists

Consumers can log or report which version of the library they are running, for example in bug
reports or diagnostics, without reading `package.json` from disk.

## Rules

- `VERSION` always equals the `version` field in the published `package.json`.
- It is a plain string, available synchronously, in both ESM and CommonJS.
- It changes only when a release is cut.

## Release responsibility

The value is written by hand in the source. Whoever runs `changeset version` must also update
`VERSION` to the new number before publishing. The test suite fails if the two disagree, and
publishing runs the test suite, so a mismatch cannot ship.

## Error States

None.

## Related

- [technical.md](technical.md)
- [Version rules](../../../../instructions/stack/version-rules.md)
