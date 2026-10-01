# Media Library Attachment Business

## What it is

A form field for uploading a file, such as an avatar, a cover image or a PDF. It shows a drop zone,
the uploaded file with a preview, upload progress and any errors. A plain HTML form submits the
value through hidden inputs, with no JavaScript submit needed.

```tsx
<MediaLibraryAttachment
  name="avatar"
  validationRules={{ accept: ['image/*'], maxSizeInKB: 2048 }}
/>
```

## Behavior

- **One file by default.** Dropping or picking a new file replaces the current one.
- **`multiple`** accepts several files, up to `maxItems`.
- Each file shows its preview (or extension), name, size and type, plus a remove button and a
  replace button.
- **`editableName`** shows a name input for each file.
- Invalid files are listed above with their reason and a button to dismiss them.
- A failed upload shows its error with a "Go back" button that removes the file. A server error
  on a valid file is cleared the same way.

## Props

Common props: `name` (required), `initialValue`, `validationRules`, `validationErrors` or its
Inertia alias `errors`, `maxItems`, `multiple`, `editableName`, `translations`,
`fileTypeHelpText`, `routePrefix`, `uploadDomain`, `vapor`, `vaporSignedStorageUrl`,
`maxSizeForPreviewInBytes`, `beforeUpload`, `afterUpload`, `onChange`, `onIsReadyToSubmitChange`,
`setMediaLibrary`. The full table is in the
[component registry](../../../../instructions/registries/component-registry.md).

## Error States

See [Media Library Store](../../../core/features/media-library-store/business.md#error-states).
Server errors for this field (`avatar`, `avatar.<uuid>...`) appear above the item or on it.

## Related

- [technical.md](technical.md)
- [Media Library Collection](../media-library-collection/business.md)
