# Media Library Collection Technical

## Module Boundaries

| File                                   | Owns                                                                             |
| -------------------------------------- | -------------------------------------------------------------------------------- |
| `src/react/MediaLibraryCollection.tsx` | `MediaLibraryCollection`, `MediaLibraryCollectionProps`, `MediaLibraryViewProps` |

## Public API

`MediaLibraryCollectionProps = MediaLibraryComponentProps & { sortable?, fieldsView?, propertiesView? }`.
There is no `multiple` prop: the store is always created with `multiple: true`.

| Prop             | Default                                           | Type                                          |
| ---------------- | ------------------------------------------------- | --------------------------------------------- |
| `sortable`       | `true`                                            | `boolean`                                     |
| `fieldsView`     | editable name (`NameField`)                       | `(props: MediaLibraryViewProps) => ReactNode` |
| `propertiesView` | name (unless `editableName`) + "size · extension" | same                                          |

`MediaLibraryViewProps` = `{ media, getNameInputProps, getNameInputErrors,
getCustomPropertyInputProps, getCustomPropertyInputErrors }`.

## Sorting

- `move(from, to)` rebuilds the uuid list and calls `setOrder(uuids)`. Out-of-range moves are
  ignored, and the first item's up button and the last item's down button are disabled.
- Drag: the handle (`span.media-library-drag-handle`, `draggable`, `aria-hidden`) records the
  dragged `client_id`. `dragover` on an item marks it `media-library-item-drop-target` and
  `drop` moves the dragged item to that index. Drops that did not start on a handle (for example
  files from the desktop) are ignored here and handled by the `Uploader`.
- Keyboard: the move buttons are `IconButton`s labelled "Move up {name}" / "Move down {name}".

## Render tree

```text
div.media-library.media-library-multiple.media-library-collection
├─ ListErrors
├─ ul.media-library-items > li.media-library-item.media-library-item-row
│   ├─ div.media-library-sort  (drag handle, up, down)   when sortable
│   ├─ Thumb
│   ├─ div.media-library-properties  propertiesView | default
│   ├─ div.media-library-fields      fieldsView | NameField
│   ├─ ItemErrors
│   └─ IconButton remove
├─ Uploader (multiple, maxItems)
└─ HiddenFields
```

## Dependencies

`useMediaLibrary`, helper components, `utils.ts`.

## Testing Entry Points

`tests/react/MediaLibraryCollection.test.tsx`: keyboard and drag reordering, disabled end
buttons, drops without a drag, `sortable={false}`, `fieldsView` and `propertiesView`, the default
name input, hidden fields (including a bracketed name with dot error keys), upload state, replace,
clear errors, remove, and Go back on a failed upload. `onChange` and `onIsReadyToSubmitChange` are
covered in `tests/react/use-media-library.test.tsx` and `tests/core/media-library.test.ts`.
