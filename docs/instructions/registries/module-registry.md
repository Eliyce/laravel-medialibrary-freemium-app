# Module Registry

| Module  | Slug      | Source paths                                    | Ships as                                                | Public exports                                                                           | Docs                                              |
| ------- | --------- | ----------------------------------------------- | ------------------------------------------------------- | ---------------------------------------------------------------------------------------- | ------------------------------------------------- |
| Core    | `core`    | `src/index.ts`, `src/version.ts`, `src/core/**` | npm `@eliyce/media-pro` (`.`, `./core`)                 | `VERSION`, `MediaLibrary`, core helpers and types                                        | [summary](../../modules/core/index/summary.md)    |
| React   | `react`   | `src/react/**`, `styles/**`                     | npm `@eliyce/media-pro` (`./react`, `./styles.css`)     | `MediaLibraryAttachment`, `MediaLibraryCollection`, `useMediaLibrary`, helper components | [summary](../../modules/react/index/summary.md)   |
| Laravel | `laravel` | `laravel/**`, `composer.json`                   | composer `eliyce/laravel-media-pro` (`Eliyce\MediaPro`) | Route macro, endpoints, traits, rules, `TemporaryUpload`, command                        | [summary](../../modules/laravel/index/summary.md) |

Dependency direction: React imports Core. Laravel and Core meet only over HTTP and the shared
value and error contracts; neither package depends on the other.

The source of truth is [`../rules/module-map.yml`](../rules/module-map.yml). Update this table
whenever the map changes.
