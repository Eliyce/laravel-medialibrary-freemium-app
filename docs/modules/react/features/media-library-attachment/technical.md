# Media Library Attachment Technical

## Module Boundaries

| File                                   | Owns                                                     |
| -------------------------------------- | -------------------------------------------------------- |
| `src/react/MediaLibraryAttachment.tsx` | `MediaLibraryAttachment`, `MediaLibraryAttachmentProps`  |
| `src/react/props.ts`                   | `MediaLibraryComponentProps`, shared with the Collection |

## Public API

`MediaLibraryAttachmentProps = MediaLibraryComponentProps & { multiple?: boolean }`.

| Prop               | Default | Handling                                                               |
| ------------------ | ------- | ---------------------------------------------------------------------- |
| `multiple`         | `false` | Passed to the store; `false` means `maxItems = 1` and replace-on-add   |
| `editableName`     | `false` | Renders the internal `NameField` instead of the name text              |
| `validationErrors` | none    | Wins over `errors`; the pair goes to `useMediaLibrary`                 |
| `fileTypeHelpText` | derived | Overrides `describeAccept(validationRules.accept)` in the `Uploader`   |
| `setMediaLibrary`  | none    | Called in an effect with the store instance (again if it is recreated) |
| `fetch`            | XHR     | Custom transport, mainly for tests                                     |

Every other prop is forwarded to `useMediaLibrary`.

## Render tree

```text
div.media-library(.media-library-single|-multiple)(.media-library-empty)
├─ ListErrors        invalidMedia + topLevelErrors, clear button
├─ ul.media-library-items > li.media-library-item
│   ├─ Thumb         preview/extension, progress, replace input
│   ├─ div.media-library-properties   name (or NameField) + "size · extension"
│   ├─ ItemErrors    getErrors(object); back = remove if failed, else clearObjectErrors
│   └─ IconButton    remove
├─ Uploader          drop zone + hidden file input (maxItems only when multiple)
└─ HiddenFields      name[uuid][uuid|name|order|custom_properties]
```

## Dependencies

`useMediaLibrary`, helper components, `utils.ts` (`cx`, `formatSize`).

## Testing Entry Points

`tests/react/MediaLibraryAttachment.test.tsx`: every documented prop and `setMediaLibrary`,
single-mode replace, `maxItems` help text and overflow, the Inertia `errors` alias, accessibility
(labelled input, keyboard drop zone, progressbar, alerts), editable name, remove and replace.
