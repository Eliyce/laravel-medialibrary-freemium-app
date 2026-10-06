# Stack Drift Report

- Status: `drift-recorded` (change `react-media-library-pro`, 2026-10-01)
- Baseline: framework `node-library`; traits `typescript`, `vitest`, `eslint`, `publishable`;
  toolchain npm

## Drift since the baseline

| Area              | Before                       | Now                                                                                             | Docs updated                          |
| ----------------- | ---------------------------- | ----------------------------------------------------------------------------------------------- | ------------------------------------- |
| Package name      | `media-pro`                  | `@eliyce/laravel-medialibrary-freemium-app` (scoped, D-01M3VMEYT0YET62N8Z9YQ278D8)              | all                                   |
| Entry points      | `.` only                     | `.`, `./core`, `./react`, `./styles.css` (AD-7)                                                 | architecture, api-registry            |
| Peer dependencies | none                         | `react`, `react-dom` `>=18`, optional                                                           | dependencies, version-rules           |
| Dev dependencies  | 10 packages                  | + React 19, React types, jsdom 29, Testing Library (react, dom, user-event)                     | dependencies                          |
| Build             | one entry, `treeshake: true` | three entries, two custom plugins, rollup `treeshake` off (TD-11)                               | tooling, public-entry technical       |
| TypeScript config | ES2022 lib                   | + DOM, DOM.Iterable, `jsx: react-jsx`                                                           | tooling                               |
| Tests             | `tests/**/*.test.ts`, node   | `tests/**/*.test.{ts,tsx}`, node + jsdom per file                                               | tooling, test-registry                |
| `sideEffects`     | `false`                      | `["**/*.css"]`                                                                                  | frameworks                            |
| New ecosystem     | none                         | PHP `^8.2` + Composer, Laravel 10.2 to 13, `spatie/laravel-medialibrary` 11, PHPUnit, testbench | overview, dependencies, version-rules |

paqad's stack detection (`.paqad/stack-snapshot.json`) still models only the npm half; the PHP
half is documented by hand in these files.

## Review Targets

Re-review these docs when the stack changes, for example a new runtime dependency, peer range,
Node or PHP floor, Laravel major, or build tool:

- `docs/instructions/stack/**`
- `docs/instructions/architecture/**`
- `README.md` (requirements and install)
