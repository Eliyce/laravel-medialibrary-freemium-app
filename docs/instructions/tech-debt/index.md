# Technical Debt

| ID   | Area     | Item                                                                                                | Action                                                                |
| ---- | -------- | --------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| TD-1 | Package  | `package.json` has empty `description` and `author`, and no `repository`/`homepage`/`bugs`.         | Fill in before the first publish.                                     |
| TD-2 | Package  | README description is a TODO; LICENSE holder is "media-pro contributors".                           | Replace with real copy / owner.                                       |
| TD-3 | Build    | `ignoreDeprecations: '6.0'` workaround in `tsup.config.ts` (tsup injects `baseUrl`).                | Remove when tsup supports TS 6 cleanly; required before TS 7.         |
| TD-4 | Security | `overrides.esbuild` pin for GHSA-g7r4-m6w7-qqqr.                                                    | Drop once tsup/vite resolve a fixed esbuild.                          |
| TD-5 | CI       | No CI pipeline (no checks on PR, no automated release).                                             | Add GitHub Actions: `npm run check`, `npm audit`, changesets release. |
| TD-6 | Size     | No bundle-size budget enforcement.                                                                  | Add `size-limit`.                                                     |
| TD-7 | Tooling  | paqad-ai 1.94.0 schema rejects `detected_stack: node-library`, so `paqad-ai doctor` fails 2 checks. | Upstream bug; re-run `paqad-ai doctor` after upgrading paqad.         |
| TD-8 | Release  | `VERSION` in `src/version.ts` must be bumped manually after `changeset version`.                    | Consider generating it at build time (tsup `define`).                 |
