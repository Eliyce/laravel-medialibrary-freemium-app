# Sources

Stack facts in these docs were derived from:

- `package.json` (manifest): name, `exports`/`main`/`types`, `files`, `sideEffects`, scripts,
  `engines`, peer and dev dependencies, overrides
- `package-lock.json` and `node_modules/*/package.json`: resolved npm versions and engine ranges
- `composer.json` (manifest): name, `require`, `require-dev`, autoload, provider discovery, scripts
- `composer.lock`: resolved PHP versions (`laravel/framework` v13.34.0, `spatie/laravel-medialibrary`
  11.23.8, `orchestra/testbench` v11.3.0, `phpunit/phpunit` 11.5.56)
- `tsconfig.json`, `tsup.config.ts`, `vitest.config.ts`, `eslint.config.js`, `.prettierignore`,
  `phpunit.xml.dist`, `.gitattributes`: tooling configuration
- `.npmrc`: publishable trait
- `.paqad/detection-report.json`: paqad static detection (archetype `node-library`, confidence
  high; npm half only)
