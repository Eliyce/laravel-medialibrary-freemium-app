# Media Library Collection Business

## What it is

A form field for managing a list of files, such as a product gallery or a set of documents.
Users upload several files, put them in order, name them, and fill in extra fields per file
(custom properties such as `alt` or `caption`).

```tsx
<MediaLibraryCollection name="images" initialValue={images} maxItems={10} />
```

## Behavior

- Always accepts several files, up to `maxItems`.
- **Reordering** (on by default, `sortable={false}` turns it off): drag an item by its handle, or
  use the move up and move down buttons. The buttons work with the keyboard and screen readers.
- **Fields per item**: by default an editable name input. `fieldsView` replaces it with your own
  inputs, typically custom properties.
- **Details per item**: by default the size and extension. `propertiesView` replaces it.
- Replace, remove, previews, progress and errors work as in the
  [Attachment](../media-library-attachment/business.md).

```tsx
<MediaLibraryCollection
  name="images"
  fieldsView={({ media, getCustomPropertyInputProps, getCustomPropertyInputErrors }) => (
    <input {...getCustomPropertyInputProps(media, 'alt')} placeholder="Alt text" />
  )}
/>
```

## Rules

- The order users see is the `order` the server receives (zero-based).
- Server errors for `images.<uuid>.name` and `images.<uuid>.custom_properties.<key>` appear under
  the matching input.
- The server saves only the custom properties the controller lists in `withCustomProperties()`.

## Related

- [technical.md](technical.md)
- [Use Media Library Hook](../use-media-library/business.md)
