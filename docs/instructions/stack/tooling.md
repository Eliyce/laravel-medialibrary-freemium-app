# Tooling

## Toolchains

- **npm** for the JS package, lockfile `package-lock.json` (commit it). pnpm is not used.
- **Composer 2** for the PHP package, lockfile `composer.lock` (committed for development; it is
  export-ignored from the dist archive). Development uses Composer 2.9.
- Node.js `>=18` for consumers; development runs on Node 24.11 and CI on Node 20 and 22. PHP 8.3
  locally; CI runs PHP 8.2 to 8.4.

## npm scripts

| Script                     | Command                                                                 | Use                                                                                        |
| -------------------------- | ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `npm run build`            | `tsup`                                                                  | Build `dist/` (3 entries, ESM, CJS, `.d.ts`, maps)                                         |
| `npm run dev`              | `tsup --watch`                                                          | Rebuild on change                                                                          |
| `npm run typecheck`        | `tsc --noEmit`                                                          | Type-check `src`, `tests`, configs                                                         |
| `npm run lint`             | `eslint .`                                                              | Lint                                                                                       |
| `npm run format`           | `prettier --write .`                                                    | Format                                                                                     |
| `npm run format:check`     | `prettier --check .`                                                    | Verify formatting                                                                          |
| `npm test`                 | `vitest run`                                                            | Run JS tests once                                                                          |
| `npm run test:watch`       | `vitest`                                                                | Watch mode                                                                                 |
| `npm run test:coverage`    | `vitest run --coverage`                                                 | Coverage (text + `coverage/lcov.info`)                                                     |
| `npm run check`            | typecheck → lint → format:check → test → build                          | Full JS gate; also runs on `prepublishOnly`                                                |
| `npm run changeset`        | `changeset`                                                             | Record a user-facing change                                                                |
| `npm run version-packages` | `changeset version && npm install --package-lock-only --ignore-scripts` | Bump `package.json#version` and the `package-lock.json` root version, write `CHANGELOG.md` |
| `npm run release`          | `npm run check && changeset publish`                                    | Publish versions not on npm yet, create the `vX.Y.Z` tag locally                           |

The release workflow runs both scripts through changesets/action on `production` (see GitHub
Actions below): `version-packages` in the version pull request, `release` after it is merged.
Run by hand, `npm run release` is the manual fallback and the one-time first publish of 0.1.0.
`changeset publish` runs `npm publish`, so `prepublishOnly` runs `npm run check` a second time;
that duplication is accepted. The steps are in the README "Releasing" section.

`.claude/` holds files that local AI tooling rewrites; Prettier and ESLint skip it so those edits
cannot fail `npm run check`, which `prepublishOnly` runs before every publish.

## Composer scripts

| Script                       | Command   | Use                                              |
| ---------------------------- | --------- | ------------------------------------------------ |
| `composer test`              | `phpunit` | Run the PHP suite (`phpunit.xml.dist`)           |
| `composer validate --strict` | built in  | Validate `composer.json` (every CI composer leg) |

## GitHub Actions

| Workflow                        | Triggers                                                                    | Jobs                                                                                                                                                                                                                                                                                                                                                       |
| ------------------------------- | --------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `.github/workflows/ci.yml`      | `pull_request`, `push` to `main`, `workflow_call`                           | `npm`: `npm ci`, `npm run check` and `npm audit --audit-level=high` on Node 20 and 22. `npm-react18`: `npm test` with `react@18` and `react-dom@18` installed `--no-save`. `composer`: `composer validate --strict` and `composer test` on Laravel 10, 11, 12 and 13                                                                                       |
| `.github/workflows/release.yml` | `push` to `production`, `workflow_dispatch` (releases only on `production`) | `ci` (calls `ci.yml`), then `release`: `npm ci`, npm `>=11.5.1 <12`, then `changesets/action@v2`. With pending changesets it runs `npm run version-packages` and opens or updates the `chore(release): version packages` PR into `production`; without, it runs `npm run release` and creates the `vX.Y.Z` tag and the GitHub release for each new publish |

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
- Both workflows have top-level `contents: read`. Only the `release` job adds write permissions:
  `contents: write` (version commit and branch, tag, GitHub release), `pull-requests: write` (the
  version PR) and `id-token: write` (npm Trusted Publishing). The `ci` job calls `ci.yml`, which
  keeps its own `contents: read`. The `release` job runs only when
  `github.repository_owner == 'Eliyce'` and the ref is `refs/heads/production`, so a
  `workflow_dispatch` from another branch never versions or publishes.
- npm publishing uses Trusted Publishing (OIDC): the npmjs.com trusted publisher names owner
  `Eliyce`, this repository and the workflow file `release.yml`, with no environment. npm needs
  CLI `>=11.5.1` and Node `>=22.14.0` for it, so the job uses Node 22 and installs
  `npm@">=11.5.1 <12"` (raising the cap is a deliberate change). No npm token exists and no
  provenance is requested: npm generates none for a private repository. The first version, 0.1.0,
  is published by hand, because a trusted publisher can only be added to an existing package.
- changesets/action gets the `GH_RELEASE_TOKEN` repository secret (a fine-grained PAT with
  Contents and Pull requests read/write on this repository) through its `github-token` input. It
  pushes the version commit and tags through the GitHub API as the PAT owner, so CI runs on the
  version PR; a `GITHUB_TOKEN` push would not trigger it. The action also passes the PAT as
  `GITHUB_TOKEN` in the env of `npm run version-packages` and `npm run release`, so the tooling
  those scripts run can read it (TD-22). Checkout sets `persist-credentials: false`, so no token
  is left in `.git/config`.
- The action is pinned to `changesets/action@v2` because `@changesets/cli` is v3: v1 reads the
  CLI 2 publish output and would publish without creating the tag or the GitHub release. v2 takes
  the release notes from the version's `## X.Y.Z` section of `CHANGELOG.md` up to the next
  heading, and uses the whole `CHANGELOG.md` if that section is missing.
- The `release` job uses no dependency cache (`package-manager-cache: false`, no `cache` input),
  as npm advises for release builds.
- CI cancels superseded runs per workflow and ref, except on `production`. Release has the
  top-level concurrency group `release-${{ github.workflow }}-${{ github.ref }}`, which never
  cancels a running release and differs from the group `ci.yml` computes when called from it
  (`Release-<ref>`), so the two never block each other. GitHub keeps one waiting run per group,
  so a newer push to `production` can replace a waiting one (README "Re-running a release").
- Actions are pinned to major tags: `actions/checkout@v7`, `actions/setup-node@v7`,
  `changesets/action@v2` and `shivammathur/setup-php@v2`.

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
| `.changeset/config.json` | Public access, base branch `main`, `commit: false` (changesets/action commits the version PR)                         |
| `composer.json`          | Package metadata, autoload, provider discovery, `scripts.test`                                                        |
| `phpunit.xml.dist`       | Unit and Feature suites, sqlite `:memory:`, array cache/session, fails on warnings and risky tests                    |
| `.gitattributes`         | `export-ignore` list for GitHub's archive (Composer installs and npm git installs)                                    |
| `.gitignore`             | Also ignores `vendor/`, `laravel/vendor/`, `.phpunit.cache/`                                                          |

No PHP linter or formatter (Pint, PHPStan) is configured yet (TD-18).
