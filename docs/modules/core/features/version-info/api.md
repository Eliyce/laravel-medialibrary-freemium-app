# Version Info API

## Exports

| Export    | Entry                                             | Kind     | Type     | Since |
| --------- | ------------------------------------------------- | -------- | -------- | ----- |
| `VERSION` | `@eliyce/laravel-medialibrary-freemium-app` (`.`) | constant | `string` | 0.0.0 |

```ts
import { VERSION } from '@eliyce/laravel-medialibrary-freemium-app';

console.log(VERSION); // "0.0.0", always equal to package.json#version
```

- Only the root entry exports it. `@eliyce/laravel-medialibrary-freemium-app/core` and `@eliyce/laravel-medialibrary-freemium-app/react` do not.
- The `.d.ts` declares `declare const VERSION: string;`. The value comes from
  `package.json#version` at build time.
- No functions, events, config keys or HTTP surface.

## Related

- [API registry](../../../../instructions/registries/api-registry.md#core-exports--and-core)
- [Technical](technical.md)
