# Stack Overview

`media-pro` is a **publishable Node.js library** (paqad archetype `node-library`), written in TypeScript and shipped to npm as a dual ESM/CJS package with bundled type declarations.

| Aspect          | Value                                                                    |
| --------------- | ------------------------------------------------------------------------ |
| Archetype       | `node-library` (detected from `package.json` `main`/`exports`, no `bin`) |
| Language        | TypeScript 6 (`strict`), compiled to ES2022                              |
| Runtime target  | Node.js `>=18` (`engines.node`)                                          |
| Module format   | ESM source (`"type": "module"`); ESM + CJS output                        |
| Package manager | npm (`package-lock.json`)                                                |
| Build           | tsup 8 (esbuild + rollup-plugin-dts)                                     |
| Tests           | Vitest 5, coverage via `@vitest/coverage-v8`                             |
| Lint / format   | ESLint 10 flat config + typescript-eslint, Prettier 3                    |
| Release         | Changesets (`@changesets/cli`)                                           |
| Runtime deps    | None                                                                     |

Detected traits: `typescript`, `vitest`, `eslint`, `publishable` (see `.paqad/detection-report.json`).

Related: [frameworks.md](frameworks.md) · [dependencies.md](dependencies.md) · [tooling.md](tooling.md) · [version-rules.md](version-rules.md)
