# Query Registry

Database queries the Laravel package runs. The npm package runs none; its only network calls are
the upload requests in the [API registry](api-registry.md#http-endpoints).

| Query                                                  | Where                                                                                | Bound                                                |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------ | ---------------------------------------------------- |
| `media WHERE uuid IN (...)`                            | `MediaLookup::findByUuids` (handler, `UploadedMedia`, `TotalMediaSize`)              | One query per request field, whatever the item count |
| `temporary_uploads WHERE id IN (...)`                  | Handler `resolveItems`, `MediaLookup::claimable` (`UploadedMedia`, `TotalMediaSize`) | One query; session ids compared with `hash_equals`   |
| `media.uuid` uniqueness                                | `UploadRequest`, `S3UploadRequest` (`Rule::unique`)                                  | One per upload                                       |
| `temporary_uploads WHERE created_at <= ?`              | `TemporaryUpload::scopeOld`, used by the cleanup command                             | Streamed with `lazyById(100)`                        |
| Inserts and updates on `temporary_uploads` and `media` | `TemporaryUpload::storeAtomically`, the handler's transaction                        | Inside `DB::transaction`                             |

`TemporaryUpload::findByMediaUuid` runs one `findByUuids` query plus one `temporary_uploads` find.
Tests assert a fixed query count for the handler and for `UploadedMedia`.
