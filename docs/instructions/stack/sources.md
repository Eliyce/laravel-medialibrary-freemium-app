# Sources

Stack facts in these docs were derived from:

- `package.json` (manifest): name, `exports`/`main`/`types`, scripts, `engines`, dev dependencies, overrides
- `package-lock.json` (lockfile): resolved versions
- `tsconfig.json`, `tsup.config.ts`, `vitest.config.ts`, `eslint.config.js`: tooling configuration
- `.npmrc`: publishable trait
- `.paqad/detection-report.json`: paqad static detection (archetype `node-library`, confidence high)
