# Version Info Business

## What it is

`VERSION` is a constant holding the installed version of `@eliyce/laravel-medialibrary-freemium-app`, for example `'0.0.0'`.

```ts
import { VERSION } from '@eliyce/laravel-medialibrary-freemium-app';
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

Nobody maintains the value by hand. The build reads it from `package.json`, so the version bump
that `npm run version-packages` makes is the only step. The test suite checks the built value, and
publishing runs the test suite.

## Error States

None.

## Related

- [technical.md](technical.md)
- [Version rules](../../../../instructions/stack/version-rules.md)
