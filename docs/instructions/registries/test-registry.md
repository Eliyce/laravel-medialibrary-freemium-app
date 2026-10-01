# Test Registry

Runner: Vitest 5 (`npm test`). Include glob: `tests/**/*.test.ts`. Coverage: v8 over `src/**/*.ts`.

| Test file             | Module | Covers                                   | Type          |
| --------------------- | ------ | ---------------------------------------- | ------------- |
| `tests/index.test.ts` | Core   | `VERSION` matches `package.json#version` | contract/unit |
