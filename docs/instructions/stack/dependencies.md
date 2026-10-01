# Dependencies

## npm runtime

None. `@eliyce/media-pro` has no `dependencies`.

| Peer        | Range  | Optional | Needed for                                                          |
| ----------- | ------ | -------- | ------------------------------------------------------------------- |
| `react`     | `>=18` | yes      | `@eliyce/media-pro/react`                                           |
| `react-dom` | `>=18` | yes      | Apps rendering the React components (never imported by the package) |

Both peers are optional in `peerDependenciesMeta`, so consumers of `.` or `./core` alone get no
peer warning. Tailwind CSS is not declared: it is needed only to compile `./styles.css`, in the
consumer's own build.

## npm development

| Package                            | Range      | Installed | Purpose                                        |
| ---------------------------------- | ---------- | --------- | ---------------------------------------------- |
| `typescript`                       | `^6.0.3`   | 6.0.3     | Type checking (`npm run typecheck`)            |
| `tsup`                             | `^8.5.1`   | 8.5.1     | Bundling ESM + CJS + `.d.ts` for three entries |
| `vitest`                           | `^5.0.3`   | 5.0.3     | Test runner                                    |
| `@vitest/coverage-v8`              | `^5.0.3`   | 5.0.3     | Coverage (`npm run test:coverage`)             |
| `jsdom`                            | `^29.1.1`  | 29.1.1    | DOM for React tests (see the pin below)        |
| `react`, `react-dom`               | `^19.3.0`  | 19.3.0    | Rendering in tests; peer range is `>=18`       |
| `@types/react`, `@types/react-dom` | `^19.3.0`  | 19.3.0    | React types                                    |
| `@testing-library/react`           | `^16.3.3`  | 16.3.3    | Component tests                                |
| `@testing-library/dom`             | `^10.4.2`  | 10.4.2    | Peer of `@testing-library/react`               |
| `@testing-library/user-event`      | `^14.6.7`  | 14.6.7    | Keyboard, click and file-input interaction     |
| `eslint`                           | `^10.11.0` | 10.11.0   | Linting                                        |
| `@eslint/js`                       | `^10.0.1`  | 10.0.1    | ESLint recommended rules                       |
| `typescript-eslint`                | `^8.71.0`  | 8.71.0    | TypeScript lint rules                          |
| `prettier`                         | `^3.9.9`   | 3.9.9     | Formatting                                     |
| `@changesets/cli`                  | `^3.0.3`   | 3.0.3     | Versioning, changelog, publish                 |
| `@types/node`                      | `^26.6.3`  | 26.6.3    | Node.js type definitions                       |

**jsdom pin (`^29`):** jsdom 30 requires Node `^22.22.2 || ^24.15.0 || >=26`, which excludes the
Node 24.11 used for development here. jsdom 29 supports `^20.19.0 || ^22.13.0 || >=24.0.0`.
Move to jsdom 30 once every development and CI Node version meets its range.

## npm overrides

| Package   | Override  | Reason                                                                                                                       |
| --------- | --------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `esbuild` | `^0.28.2` | tsup/vite resolved esbuild 0.27.x, affected by GHSA-g7r4-m6w7-qqqr (low). Remove once tsup and vite depend on a fixed range. |

## Composer runtime (`require`)

| Package                                                                                                                         | Range                        | Why                                                     |
| ------------------------------------------------------------------------------------------------------------------------------- | ---------------------------- | ------------------------------------------------------- |
| `php`                                                                                                                           | `^8.2`                       | Same floor as `spatie/laravel-medialibrary` 11          |
| `laravel/framework`                                                                                                             | `^10.2\|^11.0\|^12.0\|^13.0` | `FormRequest`, `session()` and other Foundation classes |
| `illuminate/cache`, `config`, `console`, `database`, `filesystem`, `http`, `log`, `routing`, `session`, `support`, `validation` | same                         | Components the package uses directly                    |
| `spatie/laravel-medialibrary`                                                                                                   | `^11.0`                      | Media storage, conversions, `InteractsWithMedia`        |

## Composer development (`require-dev`)

| Package               | Range                       | Locked  | Purpose                                                        |
| --------------------- | --------------------------- | ------- | -------------------------------------------------------------- |
| `orchestra/testbench` | `^8.22\|^9.0\|^10.0\|^11.0` | v11.3.0 | Laravel app for package tests (one major per Laravel 10 to 13) |
| `phpunit/phpunit`     | `^10.5\|^11.0`              | 11.5.56 | Test runner                                                    |

`composer.lock` currently resolves `laravel/framework` v13.34.0 and
`spatie/laravel-medialibrary` 11.23.8. Laravel 13 and testbench 11 need PHP 8.3+, so on PHP 8.2
run `composer update` to resolve an older Laravel.
