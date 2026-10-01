# Dependencies

## Runtime

None. `media-pro` currently has no `dependencies` or `peerDependencies`. Per the archetype conventions, any framework/runtime package added later should be a `peerDependency` (with `peerDependenciesMeta` when optional).

## Development

| Package               | Range      | Installed | Purpose                             |
| --------------------- | ---------- | --------- | ----------------------------------- |
| `typescript`          | `^6.0.3`   | 6.0.3     | Type checking (`npm run typecheck`) |
| `tsup`                | `^8.5.1`   | 8.5.1     | Bundling ESM + CJS + `.d.ts`        |
| `vitest`              | `^5.0.3`   | 5.0.3     | Test runner                         |
| `@vitest/coverage-v8` | `^5.0.3`   | 5.0.3     | Coverage (`npm run test:coverage`)  |
| `eslint`              | `^10.11.0` | 10.11.0   | Linting                             |
| `@eslint/js`          | `^10.0.1`  | 10.0.1    | ESLint recommended rules            |
| `typescript-eslint`   | `^8.71.0`  | 8.71.0    | TypeScript lint rules               |
| `prettier`            | `^3.9.9`   | 3.9.9     | Formatting                          |
| `@changesets/cli`     | `^3.0.3`   | 3.0.3     | Versioning, changelog, publish      |
| `@types/node`         | `^26.6.3`  | 26.6.3    | Node.js type definitions            |

## Overrides

| Package   | Override  | Reason                                                                                                                       |
| --------- | --------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `esbuild` | `^0.28.2` | tsup/vite resolved esbuild 0.27.x, affected by GHSA-g7r4-m6w7-qqqr (low). Remove once tsup and vite depend on a fixed range. |
