# Translations Business

## What it is

Every text the components show comes from one set of messages, in English by default. Apps can
change any message, for one component or for the whole page.

```ts
// Whole page, before the components render
window.mediaLibraryTranslations = { remove: 'Supprimer', selectOrDrag: 'Choisir des fichiers' };
```

```tsx
// One component (wins over the page-wide messages)
<MediaLibraryAttachment name="avatar" translations={{ selectOrDrag: 'Choose a photo' }} />
```

## Keys

The keys match Spatie Media Library Pro v6, so existing translation files work:
`fileTypeNotAllowed`, `tooLarge`, `tooSmall`, `tryAgain`, `somethingWentWrong`, `selectOrDrag`,
`selectOrDragMax`, `file.singular`, `file.plural`, `anyImage`, `anyVideo`, `goBack`, `dropFile`,
`dragHere`, `remove`, `download`.

Media Pro adds `replace`, `name`, `uploading`, `moveUp` and `moveDown` for its buttons and labels.

`selectOrDragMax` can use `{maxItems}` and `{file}`: "Select or drag max {maxItems} {file}".

## Rules

- Messages are merged key by key: the defaults, then `window.mediaLibraryTranslations`, then the
  component's `translations`.
- Unknown keys and non-string values are ignored.
- A broken page-wide object is ignored rather than breaking every component.

## Related

- [technical.md](technical.md)
