# Tooling

## Toolchains

- **npm** for the JS package, lockfile `package-lock.json` (commit it). pnpm is not used.
- **Composer 2** for the PHP package, lockfile `composer.lock` (committed for development; it is
  export-ignored from the dist archive). Development uses Composer 2.9.
- Node.js `>=18` for consumers; development runs on Node 24.11. PHP 8.3 locally.

## npm scripts

| Script                     | Command                                        | Use                                                |
| -------------------------- | ---------------------------------------------- | -------------------------------------------------- |
| `npm run build`            | `tsup`                                         | Build `dist/` (3 entries, ESM, CJS, `.d.ts`, maps) |
| `npm run dev`              | `tsup --watch`                                 | Rebuild on change                                  |
| `npm run typecheck`        | `tsc --noEmit`                                 | Type-check `src`, `tests`, configs                 |
| `npm run lint`             | `eslint .`                                     | Lint                                               |
| `npm run format`           | `prettier --write .`                           | Format                                             |
| `npm run format:check`     | `prettier --check .`                           | Verify formatting                                  |
| `npm test`                 | `vitest run`                                   | Run JS tests once                                  |
| `npm run test:watch`       | `vitest`                                       | Watch mode                                         |
| `npm run test:coverage`    | `vitest run --coverage`                        | Coverage (text + `coverage/lcov.info`)             |
| `npm run check`            | typecheck → lint → format:check → test → build | Full JS gate; also runs on `prepublishOnly`        |
| `npm run changeset`        | `changeset`                                    | Record a user-facing change                        |
| `npm run version-packages` | `changeset version`                            | Bump `package.json#version`, write `CHANGELOG.md`  |
| `npm run release`          | `npm run check && changeset publish`           | Publish to npm (public access), tag `vX.Y.Z`       |

The release steps are in the README "Releasing" section.

`.claude/` holds files that local AI tooling rewrites; Prettier and ESLint skip it so those edits
cannot fail `npm run check`, which `prepublishOnly` runs before every publish.

## Composer scripts

| Script                       | Command   | Use                                             |
| ---------------------------- | --------- | ----------------------------------------------- |
| `composer test`              | `phpunit` | Run the PHP suite (`phpunit.xml.dist`)          |
| `composer validate --strict` | built in  | Validate `composer.json` (run before a release) |

## paqad checks

`.paqad/project-profile.yaml` maps paqad's `format`, `test` and `build` commands to the npm
scripts above, and `npx paqad-ai checks run` runs only those. The PHP suite is not part of it, so
run `composer test` alongside every `checks run` (TD-9).

## Config files

| File                     | Purpose                                                                                                               |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------- |
| `tsconfig.json`          | Strict TS; `lib` ES2022 + DOM + DOM.Iterable; `jsx: react-jsx`; `noEmit` (tsup emits)                                 |
| `tsup.config.ts`         | Entries `index`, `core`, `react`; formats; dts; externals; `media-pro-shared-core` and `media-pro-use-client` plugins |
| `vitest.config.ts`       | Include `tests/**/*.test.{ts,tsx}`; v8 coverage on `src/**/*.{ts,tsx}`; jsdom opted into per file                     |
| `eslint.config.js`       | Flat config: `@eslint/js` + typescript-eslint recommended; ignores `dist`, `coverage`, `vendor`, `laravel`, `.claude` |
| `.prettierrc.json`       | Single quotes, trailing commas, width 100                                                                             |
| `.prettierignore`        | Also skips `vendor`, `laravel`, `composer.json`, `composer.lock` (PHP side) and `.claude` (tool-managed)              |
| `.changeset/config.json` | Public access, base branch `main`                                                                                     |
| `composer.json`          | Package metadata, autoload, provider discovery, `scripts.test`                                                        |
| `phpunit.xml.dist`       | Unit and Feature suites, sqlite `:memory:`, array cache/session, fails on warnings and risky tests                    |
| `.gitattributes`         | `export-ignore` list for the composer archive                                                                         |
| `.gitignore`             | Also ignores `vendor/`, `laravel/vendor/`, `.phpunit.cache/`                                                          |

No PHP linter or formatter (Pint, PHPStan) is configured yet (TD-18).
