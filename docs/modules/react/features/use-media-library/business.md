# Use Media Library Hook Business

## What it is

`useMediaLibrary` lets a team build its own upload UI with the same behavior as the built-in
components: validation, uploads, progress, errors, ordering and the form value. Spatie Media
Library Pro documents the same hook for custom components, so existing custom components port
with an import change.

```tsx
const { state, getFileInputProps, getImgProps, removeMedia, isReadyToSubmit } = useMediaLibrary({
  name: 'avatar',
  multiple: false,
});
```

## What it gives you

- `state`: the items, invalid files, and server errors.
- Prop getters you spread onto your own elements: `getFileInputProps()`, `getDropZoneProps()`,
  `getImgProps(item)`, `getNameInputProps(item)`, `getCustomPropertyInputProps(item, 'alt')`.
- Error getters for those inputs: `getNameInputErrors`, `getCustomPropertyInputErrors`,
  `getErrors(item)`.
- Actions: `addFile`, `removeMedia`, `replaceMedia`, `setOrder`, `setProperty`,
  `setCustomProperty`, `clearObjectErrors`, `clearInvalidMedia`.
- `isReadyToSubmit` and `hasUploadsInProgress`, to block submit while files upload.
- `mediaLibrary`, the underlying store, for anything else.

## Rules

- It takes the same options as the core store, plus `initialMedia` as another name for
  `initialValue`.
- Each mounted component gets its own store. Unmounting cancels its uploads.
- New `validationErrors` (for example after an Inertia submit) are applied without remounting.
- Callbacks always use the latest props, so passing inline functions is fine.
- Options other than callbacks and `validationErrors` are read once, at mount. Change the
  component's `key` to start over with new options.

## Related

- [technical.md](technical.md)
- [Helper Components](../helper-components/business.md)
- [Media Library Store](../../../core/features/media-library-store/business.md)
