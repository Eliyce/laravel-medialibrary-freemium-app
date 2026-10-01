# Media Library Store Business

## What it is

`MediaLibrary` is the engine behind every media component. It keeps the list of files a user has
picked for one form field, uploads each one, tracks progress and errors, and produces the value
the form submits. The React components are a view over it, and other frameworks can use it
directly.

```ts
import { MediaLibrary } from '@eliyce/media-pro/core';

const library = new MediaLibrary({ name: 'images', maxItems: 5, onChange: save });
const unsubscribe = library.subscribe(() => render(library.getState()));
library.addFiles(input.files);
```

## What users can do

- Add files. Each file is checked first (type, size, item limit). A file that fails is listed
  as invalid with a message and is never uploaded.
- Watch each file upload with a progress percentage and a local preview for small images.
- Replace a file. The item keeps its place and custom properties and the new file uploads.
- Remove a file. A running upload is cancelled.
- Rename items, set custom properties (for example `alt`), and reorder items.
- See server validation errors next to the item they belong to.

## Rules

- **Single mode** (`multiple: false`): at most one item. A new file replaces the current one.
- **Item limit** (`maxItems`): a file beyond the limit is rejected with "Select or drag max
  {maxItems} {file}".
- The form value contains only items whose upload finished. Items are keyed by media uuid, in
  display order, with a zero-based `order`.
- The form is **ready to submit** only when no upload is running, none failed, and no file was
  rejected. `onIsReadyToSubmitChange` fires each time this flips.
- `beforeUpload(file)` can veto a file by throwing (sync or async); its message is shown on the
  item.
- A name typed while the file uploads is kept when the upload finishes.
- Custom-property keys `__proto__`, `constructor` and `prototype` are refused.
- `initialValue` shows media that already exists. It accepts the uuid-keyed object Laravel's
  `MediaProValue::collection()` builds, or a list of items.

## Error States

| Situation                        | What the user sees                                  |
| -------------------------------- | --------------------------------------------------- |
| Wrong type, too small, too large | Invalid-file message; file not uploaded             |
| Over `maxItems`                  | "Select or drag max 5 files"                        |
| Server rejects the file (422)    | The server messages on the item; item marked failed |
| Rate limited (429)               | "please try uploading this file again"              |
| Network or other server error    | "Something went wrong while uploading this file"    |
| `beforeUpload` throws            | The thrown message on the item                      |
| Server validation after submit   | Messages next to the item, its name or its property |

## Related

- [technical.md](technical.md)
- [Upload Transport](../upload-transport/business.md)
- [Validation and Errors](../validation-and-errors/business.md)
