# Version Info Technical

## Module Boundaries

| File                  | Owns                                           |
| --------------------- | ---------------------------------------------- |
| `src/version.ts`      | `export const VERSION = '0.0.0';`              |
| `src/index.ts`        | Re-exports `VERSION` as part of the public API |
| `tests/index.test.ts` | Guards `VERSION === package.json#version`      |

## Public API

| Export    | Kind     | Declared type                                          | Since |
| --------- | -------- | ------------------------------------------------------ | ----- |
| `VERSION` | constant | `string` (emitted as the literal `"0.0.0"` in `.d.ts`) | 0.0.0 |

Because it is a `const` with a string initializer, the generated declaration is
`declare const VERSION = "0.0.0";`. Its literal type changes with every release. Consumers should
treat it as `string` and not narrow on the literal.

## Data Flow

```text
package.json#version ──(manual edit)──▶ src/version.ts ──tsup──▶ dist/index.{js,cjs,d.ts,d.cts}
          ▲                                     │
          └──────── tests/index.test.ts compares ┘
```

The value is inlined into both bundles; nothing reads `package.json` at runtime.

## Release Steps

1. `npx changeset version` bumps `package.json#version` and writes `CHANGELOG.md`.
2. Set `VERSION` in `src/version.ts` to the same value.
3. `npm run release` runs `npm run check` (which includes the test) and then `changeset publish`.
   `prepublishOnly` also runs `npm run check`.

TD-8 tracks generating the value at build time (tsup `define`) to remove step 2.

## Error Handling

None. The constant cannot throw.

## Dependencies

None.

## Testing Entry Points

- `tests/index.test.ts` › `exports a VERSION matching package.json`. It imports `package.json`
  with an import attribute (`with { type: 'json' }`).
