---
'@eliyce/laravel-medialibrary-freemium-app': patch
---

Installing the npm package straight from GitHub (`git+https://github.com/Eliyce/laravel-medialibrary-freemium-app.git#vX.Y.Z`) now works. npm downloads a git dependency as GitHub's archive, and `.gitattributes` used to leave `package.json`, `src/`, `styles/` and the build config out of it, so `npm ci` failed with `ENOENT … package.json`. Those files now ship; tests, docs and tooling stay out.
