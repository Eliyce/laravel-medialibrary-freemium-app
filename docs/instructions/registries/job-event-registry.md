# Job and Event Registry

## Scheduled commands (Laravel)

| Command                                  | Module  | Schedule (set by the app) | Description                                                                                        |
| ---------------------------------------- | ------- | ------------------------- | -------------------------------------------------------------------------------------------------- |
| `media-pro:delete-old-temporary-uploads` | Laravel | Daily (recommended)       | Deletes temporary uploads older than `delete_temporary_uploads_older_than_hours`, with their files |

The package registers no queued jobs and no Laravel events. The `preview` conversion runs
`nonQueued()` during the upload request.

## Callbacks (JS)

`MediaLibrary` calls these callbacks; the React components take them as props.

| Callback                  | Module | Payload type        | When                                                                          |
| ------------------------- | ------ | ------------------- | ----------------------------------------------------------------------------- |
| `subscribe(listener)`     | Core   | none                | After every state change                                                      |
| `onChange`                | Core   | `MediaValue`        | When the serialized form value changes                                        |
| `onIsReadyToSubmitChange` | Core   | `boolean`           | When readiness flips                                                          |
| `beforeUpload`            | Core   | `File`              | Before each upload; throw or reject to veto                                   |
| `afterUpload`             | Core   | `AfterUploadResult` | After each upload settles (`success`, `uuid`, `errors?`, `status?`, `cause?`) |
| `setMediaLibrary`         | React  | `MediaLibrary`      | After mount, and again if the instance is recreated                           |

## Logs (Laravel)

| Message                                                  | Level   | Context keys                                 |
| -------------------------------------------------------- | ------- | -------------------------------------------- |
| `media-pro: upload rejected`                             | warning | `route`, `uuid` (well-formed only), `reason` |
| `media-pro: media library request rejected`              | warning | `reason`, `uuid` (well-formed only)          |
| `media-pro: could not delete a claimed temporary upload` | error   | `temporary_upload_id`, `exception`           |
| `media-pro: could not remove stored media files`         | error   | `reason`, `media_id`, `disk`, `exception`    |

No log carries file contents, file names, tokens or session ids.
