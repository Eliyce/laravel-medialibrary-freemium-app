# Architecture Decisions

Short records of the decisions behind the current setup. Add a new entry when one changes.

## AD-1: Dual ESM + CJS output via tsup

- **Decision:** Author in ESM TypeScript; ship both ESM (`.js`) and CJS (`.cjs`) with separate `.d.ts`/`.d.cts` types through a conditional `exports` map.
- **Why:** Supports both `import` and `require` consumers on Node `>=18` without dual-package hazards in types.
- **Verified:** Self-import via `import` and `require` both resolve.

## AD-2: Zero runtime dependencies

- **Decision:** No `dependencies` by default. Framework/runtime packages go in `peerDependencies`.
- **Why:** Smaller install, no duplicate copies in consumer apps, smaller supply-chain surface.

## AD-3: Strict TypeScript

- **Decision:** `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `verbatimModuleSyntax`, `isolatedModules`.
- **Why:** Catches API-boundary bugs early. `isolatedModules`/`verbatimModuleSyntax` keep per-file transpilation (esbuild) safe.

## AD-4: Changesets for releases

- **Decision:** Every user-facing change carries a changeset. `npm run release` runs the full check, then `changeset publish`.
- **Why:** Enforces semver discipline and a Keep a Changelog-style history.

## AD-5: `npm run check` as the single quality gate

- **Decision:** typecheck → lint → format check → test → build, also wired to `prepublishOnly`.
- **Why:** Prevents publishing an unverified build.

## AD-6: TypeScript 6 workaround in tsup dts build

- **Decision:** `dts.compilerOptions.ignoreDeprecations: '6.0'` in `tsup.config.ts`.
- **Why:** tsup's declaration step injects `baseUrl`, which TS 6 deprecates (TS5101). Remove when tsup stops injecting it. Tracked in [tech debt](../tech-debt/index.md).
