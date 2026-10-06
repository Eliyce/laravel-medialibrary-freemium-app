# Tooling

## Toolchains

- **npm** for the JS package, lockfile `package-lock.json` (commit it). pnpm is not used.
- **Composer 2** for the PHP package, lockfile `composer.lock` (committed for development; it is
  export-ignored from the dist archive). Development uses Composer 2.9.
- Node.js `>=18` for consumers; development runs on Node 24.11 and CI on Node 20 and 22. PHP 8.3
  locally; CI runs PHP 8.2 to 8.4.

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
| `npm run release`          | `npm run check && changeset publish`           | Manual fallback: publish to npm, tag `vX.Y.Z`      |

Releases normally run in the release workflow (see GitHub Actions below); `npm run release` is
the manual fallback. The steps are in the README "Releasing" section.

`.claude/` holds files that local AI tooling rewrites; Prettier and ESLint skip it so those edits
cannot fail `npm run check`, which `prepublishOnly` runs before every publish.

## Composer scripts

| Script                       | Command   | Use                                              |
| ---------------------------- | --------- | ------------------------------------------------ |
| `composer test`              | `phpunit` | Run the PHP suite (`phpunit.xml.dist`)           |
| `composer validate --strict` | built in  | Validate `composer.json` (every CI composer leg) |

## GitHub Actions

| Workflow                        | Triggers                                                                    | Jobs                                                                                                                                                                                                                                                                 |
| ------------------------------- | --------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `.github/workflows/ci.yml`      | `pull_request`, `push` to `main`, `workflow_call`                           | `npm`: `npm ci`, `npm run check` and `npm audit --audit-level=high` on Node 20 and 22. `npm-react18`: `npm test` with `react@18` and `react-dom@18` installed `--no-save`. `composer`: `composer validate --strict` and `composer test` on Laravel 10, 11, 12 and 13 |
| `.github/workflows/release.yml` | `push` to `production`, `workflow_dispatch` (releases only on `production`) | `ci` (calls `ci.yml`), then `release`: preflight checks, `npm publish` if the version is not on npm, the annotated `vX.Y.Z` tag if absent, the GitHub release from the `CHANGELOG.md` section if absent, and a step summary                                          |

- The composer matrix pins the latest release of each Laravel major: 10 with Testbench 8 on PHP
  8.2, 11 with Testbench 9 on PHP 8.2, 12 with Testbench 10 on PHP 8.3, and 13 with Testbench 11
  on PHP 8.4. Each leg runs `composer require --no-update` for `laravel/framework` and
  `orchestra/testbench` (`--dev`), then `composer update --with-all-dependencies`, restores
  `composer.json` (`PackagingTest` checks the committed constraints) and runs `composer test`.
  `fail-fast` is off, so every leg reports.
- Composer 2.9's default `audit.block-insecure` is the composer advisory gate on the Laravel 12
  and 13 legs. The Laravel 10 and 11 legs turn it off, because every 10.x and 11.x release has a
  published advisory (TD-13, D-01M48PH8J7HM3BCRB3C9MM17EA). This affects only the CI test install;
  apps still decide for themselves.
- CI has `contents: read`. Only the `release` job has `contents: write`, to push the tag and
  create the GitHub release. It never commits or pushes a branch, never moves a tag, and uses no
  npm provenance because the repository is private.
- The `release` job needs the `NPM_TOKEN` repository secret (a granular access token with
  publish rights to the `@eliyce` scope, bypassing 2FA for publishing). The token reaches
  `npm publish` only as `NODE_AUTH_TOKEN`.
- CI cancels superseded runs per workflow and ref, except on `production`. The `release` job has
  its own `release` concurrency group, which never cancels a running release. GitHub keeps one
  waiting run per group, so a newer push to `production` can replace a waiting one (README
  "Re-running a release").
- Actions are pinned to major tags: `actions/checkout@v7`, `actions/setup-node@v7` and
  `shivammathur/setup-php@v2`.

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
