# Test Registry

Two suites. Run both before delivery, because paqad's checks run only the npm commands (TD-9).

| Suite | Command         | Runner                                                                                               | Scope                                                         | Last run                                                |
| ----- | --------------- | ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- | ------------------------------------------------------- |
| JS    | `npm test`      | Vitest 5; include `tests/**/*.test.{ts,tsx}`; v8 coverage over `src/**/*.{ts,tsx}`                   | Core in node; React in jsdom (`// @vitest-environment jsdom`) | 176 tests passing                                       |
| PHP   | `composer test` | PHPUnit 11 with orchestra/testbench; `phpunit.xml.dist` (sqlite `:memory:`, array cache and session) | `laravel/tests/Unit`, `laravel/tests/Feature`                 | 118 tests passing on Laravel 13; verified on 10, 11, 12 |

All tests are deterministic: fake transports, no network, `Storage::fake` disks.

## JS

| Test file                                     | Module | Covers                                                                                                                                  | Type           |
| --------------------------------------------- | ------ | --------------------------------------------------------------------------------------------------------------------------------------- | -------------- |
| `tests/index.test.ts`                         | Core   | `VERSION` sync; `.` and `./core` expose the same core API; no default export                                                            | contract       |
| `tests/package-exports.test.ts`               | Core   | Build output: exports self-import, `"use client"` placement, shared core, no React in core, version inlining, packed files, MIT licence | build/contract |
| `tests/core/media-library.test.ts`            | Core   | `MediaLibrary` config, validation, single mode, uploads, callbacks, previews, replace, order, errors                                    | unit           |
| `tests/core/upload.test.ts`                   | Core   | Direct and Vapor requests, headers, URL joining, status mapping, XHR transport                                                          | unit           |
| `tests/core/validation.test.ts`               | Core   | `validateFile` accept and size, `describeAccept`                                                                                        | unit           |
| `tests/core/errors.test.ts`                   | Core   | `mapValidationErrors` buckets, numeric and bracketed keys, unsafe segments                                                              | unit           |
| `tests/core/value.test.ts`                    | Core   | `normalizeValue` order, defaults, prototype keys                                                                                        | unit           |
| `tests/core/translations.test.ts`             | Core   | Merge order, unknown keys, placeholders                                                                                                 | unit           |
| `tests/core/csrf.test.ts`                     | Core   | Cookie vs meta token, server-rendering safety                                                                                           | unit           |
| `tests/core/uuid.test.ts`                     | Core   | `randomUUID`, `getRandomValues` fallback, no random source                                                                              | unit           |
| `tests/react/use-media-library.test.tsx`      | React  | Hook surface, lifecycle, StrictMode, prop getters, callbacks                                                                            | component      |
| `tests/react/MediaLibraryAttachment.test.tsx` | React  | Props, single replace, max items, Inertia errors, accessibility                                                                         | component      |
| `tests/react/MediaLibraryCollection.test.tsx` | React  | Sorting (keyboard and drag), views, hidden fields, item actions                                                                         | component      |
| `tests/react/components.test.tsx`             | React  | Helper components, icons, unique ids                                                                                                    | component      |
| `tests/react/ssr.test.tsx`                    | React  | `renderToString` without `window` or `document`                                                                                         | SSR            |
| `tests/react/styles.test.tsx`                 | React  | Shipped stylesheet: export target, `media-library` prefix, grid areas, class coverage                                                   | contract       |
| `tests/helpers.ts`                            | shared | Fake files, transports and responses                                                                                                    | helper         |

## PHP

| Test file                                                         | Feature           | Covers                                                                                          |
| ----------------------------------------------------------------- | ----------------- | ----------------------------------------------------------------------------------------------- |
| `laravel/tests/Feature/ServiceProviderTest.php`                   | Package Setup     | Config defaults, publish tags, command, macro routes and limiter, trait override                |
| `laravel/tests/Feature/AppDefinedRateLimiterTest.php`             | Package Setup     | An app limiter wins                                                                             |
| `laravel/tests/Unit/PackagingTest.php`                            | Package Setup     | `composer.json` contract, autoload, `.gitattributes`                                            |
| `laravel/tests/Feature/UploadControllerTest.php`                  | Temporary Uploads | Upload response, previews, invalid uploads, uuid reuse and race, limits, logs                   |
| `laravel/tests/Feature/S3UploadControllerTest.php`                | Temporary Uploads | `tmp/` keys, content sniffing, extensions, size, uuid race                                      |
| `laravel/tests/Feature/TemporaryUploadTest.php`                   | Temporary Uploads | `findByMediaUuid` (any session, unknown uuids, other models), `findByMediaUuidInCurrentSession` |
| `laravel/tests/Unit/UniqueConstraintViolationTest.php`            | Temporary Uploads | Unique violations per driver match; NOT NULL and foreign key do not; the 10.20+ exception class |
| `laravel/tests/Feature/MediaProValueTest.php`                     | Temporary Uploads | `fromMedia` shape, `collection` order and `{}` custom properties                                |
| `laravel/tests/Feature/PendingMediaLibraryRequestHandlerTest.php` | Request Handling  | Add and sync, ownership and session guards, 422 rendering, rollback, whitelist, query count     |
| `laravel/tests/Unit/MediaLibraryRequestItemTest.php`              | Request Handling  | Parsing, defaults, invalid items                                                                |
| `laravel/tests/Feature/MediaRulesTest.php`                        | Media Validation  | Expansion, every rule bound, `forModel`, foreign media, query count                             |
| `laravel/tests/Feature/DeleteOldTemporaryUploadsCommandTest.php`  | Cleanup           | Age threshold, config, empty run                                                                |

Fixtures: `laravel/tests/TestCase.php` and `laravel/tests/Support/` (`TestModel`,
`StoreImagesRequest`, `AppRateLimiterServiceProvider`, `LegacyTemporaryUpload` which raises the
pre-10.20 plain `QueryException` for the uuid race).
