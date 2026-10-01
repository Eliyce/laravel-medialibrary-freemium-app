# Helper Components Business

## What they are

The building blocks the Attachment and Collection use, exported so teams can assemble their own
upload UI with `useMediaLibrary` while keeping the same look, accessibility and form submission.
They match the helper components in the Spatie Media Library Pro docs.

| Component      | Use it for                                                                         |
| -------------- | ---------------------------------------------------------------------------------- |
| `Uploader`     | The "Select or drag files" area with a hidden file input and type help text        |
| `DropZone`     | Any element that accepts dropped files and reports whether the drag is valid       |
| `Thumb`        | An item's preview (or extension), upload progress and replace button               |
| `HiddenFields` | Hidden inputs that submit the value in a plain HTML form                           |
| `ItemErrors`   | One item's errors with a "Go back" button                                          |
| `ListErrors`   | Errors for the whole field and the list of rejected files                          |
| `Icon`         | One packaged icon (add, remove, replace, download, up, down, drag, error, success) |
| `IconButton`   | A button showing an icon with an accessible label                                  |
| `Icons`        | Kept for Spatie compatibility; renders nothing                                     |

## Accessibility

- The drop zone is a `role="button"` you can reach with Tab and activate with Enter or Space to
  open the file picker.
- File inputs are labelled, and the accepted types are announced as their description.
- Upload progress is a `role="progressbar"` with the current percentage.
- Errors are announced through `role="alert"`.
- Icons are decorative. Buttons carry text labels such as "Remove photo.jpg".

## Rules

- `HiddenFields` submits only finished uploads, as `name[uuid][uuid]`, `[name]`, `[order]` and
  `[custom_properties][key]` (arrays as `[key][]`). Nested objects cannot be expressed as form
  fields and are skipped.
- Mounting several components on one page creates no duplicate element ids.

## Related

- [technical.md](technical.md)
- [Use Media Library Hook](../use-media-library/business.md)
