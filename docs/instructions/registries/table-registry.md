# Table Registry

Tables the Laravel package creates or writes. The npm package uses no database.

| Table               | Created by                                                                       | Columns                                                          | Notes                                                                                                                         |
| ------------------- | -------------------------------------------------------------------------------- | ---------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `temporary_uploads` | Published stub `create_temporary_uploads_table.php` (tag `media-pro-migrations`) | `id`, `session_id` (string, indexed), `created_at`, `updated_at` | One row per pending upload; deleted on claim or by the cleanup command                                                        |
| `media` (Spatie)    | `spatie/laravel-medialibrary`                                                    | Spatie schema                                                    | Rows owned by `TemporaryUpload`; `uuid` set from the client and unique; copied to the target model when a request claims them |

The unique index on `media.uuid` is what turns a concurrent duplicate uuid into a 422.
