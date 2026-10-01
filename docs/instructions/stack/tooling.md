# Tooling

## Toolchain

- **npm** for Node.js, lockfile `package-lock.json` (commit it). pnpm is not used.
- Node.js `>=18` for consumers; development currently runs on Node 24.

## npm scripts

| Script                  | Command                                        | Use                                      |
| ----------------------- | ---------------------------------------------- | ---------------------------------------- |
| `npm run build`         | `tsup`                                         | Build `dist/` (ESM, CJS, `.d.ts`, maps)  |
| `npm run dev`           | `tsup --watch`                                 | Rebuild on change                        |
| `npm run typecheck`     | `tsc --noEmit`                                 | Type-check `src`, `tests`, configs       |
| `npm run lint`          | `eslint .`                                     | Lint                                     |
| `npm run format`        | `prettier --write .`                           | Format                                   |
| `npm run format:check`  | `prettier --check .`                           | Verify formatting                        |
| `npm test`              | `vitest run`                                   | Run tests once                           |
| `npm run test:watch`    | `vitest`                                       | Watch mode                               |
| `npm run test:coverage` | `vitest run --coverage`                        | Coverage (text + `coverage/lcov.info`)   |
| `npm run check`         | typecheck → lint → format:check → test → build | Full gate; also runs on `prepublishOnly` |
| `npm run changeset`     | `changeset`                                    | Record a user-facing change              |
| `npm run release`       | `npm run check && changeset publish`           | Publish to npm                           |

## paqad checks

`.paqad/project-profile.yaml` maps paqad's `format`, `test` and `build` commands to the npm scripts above. `npx paqad-ai checks run` runs them and records the result.

## Config files

| File                     | Purpose                                                      |
| ------------------------ | ------------------------------------------------------------ |
| `tsconfig.json`          | Strict TS settings, `noEmit` (tsup emits)                    |
| `tsup.config.ts`         | Build entry, formats, dts, sourcemaps                        |
| `vitest.config.ts`       | Test include glob `tests/**/*.test.ts`, v8 coverage on `src` |
| `eslint.config.js`       | Flat config: `@eslint/js` + typescript-eslint recommended    |
| `.prettierrc.json`       | Single quotes, trailing commas, width 100                    |
| `.changeset/config.json` | Public access, base branch `main`                            |
