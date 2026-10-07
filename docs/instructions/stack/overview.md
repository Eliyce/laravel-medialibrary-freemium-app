# Stack Overview

The repo holds two publishable packages: an npm library written in TypeScript (paqad archetype
`node-library`) and a Laravel package written in PHP. See
[architecture overview](../architecture/overview.md) for how they fit together.

## npm: `@eliyce/laravel-medialibrary-freemium-app`

| Aspect          | Value                                                                                                         |
| --------------- | ------------------------------------------------------------------------------------------------------------- |
| Archetype       | `node-library` (detected from `package.json` `main`/`exports`, no `bin`)                                      |
| Language        | TypeScript 6 (`strict`), compiled to ES2022; TSX for React                                                    |
| Runtime target  | Node.js `>=18` (`engines.node`) and evergreen browsers                                                        |
| Module format   | ESM source (`"type": "module"`); ESM + CJS output per entry                                                   |
| Entry points    | `.`, `./core`, `./react`, `./styles.css`, `./package.json`                                                    |
| UI              | React `>=18` (optional peer), Tailwind CSS source styles                                                      |
| Package manager | npm (`package-lock.json`)                                                                                     |
| Build           | tsup 8 (esbuild + rollup-plugin-dts), three entries, custom plugins                                           |
| Tests           | Vitest 5 (node and jsdom), Testing Library, coverage via `@vitest/coverage-v8`                                |
| Lint / format   | ESLint 10 flat config + typescript-eslint, Prettier 3                                                         |
| Release         | Changesets; `release.yml` on `production` opens the version PR, then publishes through npm Trusted Publishing |
| Runtime deps    | None                                                                                                          |

## Composer: `eliyce/laravel-medialibrary-freemium-app`

| Aspect          | Value                                                                                           |
| --------------- | ----------------------------------------------------------------------------------------------- |
| Language        | PHP `^8.2`                                                                                      |
| Framework       | Laravel `^10.2`, `^11`, `^12`, `^13` (`laravel/framework` + `illuminate/*`)                     |
| Builds on       | `spatie/laravel-medialibrary` `^11.0`                                                           |
| Autoload        | PSR-4 `Eliyce\MediaPro\` → `laravel/src/`                                                       |
| Package manager | Composer 2 (`composer.lock` committed for development)                                          |
| Tests           | PHPUnit 10.5/11 with orchestra/testbench, sqlite `:memory:`                                     |
| Release         | Private Packagist from the repo root; reads the shared `vX.Y.Z` tags that `release.yml` creates |

CI and releases run in GitHub Actions (`.github/workflows/ci.yml` and `release.yml`); see
[tooling.md](tooling.md#github-actions).

Detected traits: `typescript`, `vitest`, `eslint`, `publishable` (see
`.paqad/detection-report.json`). paqad's detection does not model the PHP half; these docs do.

Related: [frameworks.md](frameworks.md) · [dependencies.md](dependencies.md) ·
[tooling.md](tooling.md) · [version-rules.md](version-rules.md) · [drift-report.md](drift-report.md)
