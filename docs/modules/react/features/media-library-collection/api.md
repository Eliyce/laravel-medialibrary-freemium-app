# MediaLibraryCollection API

Source: `src/react/MediaLibraryCollection.tsx`, `src/react/props.ts`. Exported from
`@eliyce/media-pro/react` (a `"use client"` module).

## Usage

```tsx
import { MediaLibraryCollection } from '@eliyce/media-pro/react';

<MediaLibraryCollection
  name="images"
  initialValue={post.images}
  maxItems={5}
  validationRules={{ accept: ['image/*'] }}
  validationErrors={errors}
  fieldsView={({ media, getCustomPropertyInputProps, getCustomPropertyInputErrors }) => (
    <label>
      Alt text
      <input {...getCustomPropertyInputProps(media, 'alt')} />
      {getCustomPropertyInputErrors(media, 'alt').join(' ')}
    </label>
  )}
/>;
```

## Props: `MediaLibraryCollectionProps`

Every [`MediaLibraryComponentProps`](../media-library-attachment/api.md#medialibrarycomponentprops)
prop, plus the ones below. The library always runs with `multiple: true`.

| Prop             | Type                                          | Default                                  | Notes                                          |
| ---------------- | --------------------------------------------- | ---------------------------------------- | ---------------------------------------------- |
| `sortable`       | `boolean`                                     | `true`                                   | Drag handle plus move up and move down buttons |
| `fieldsView`     | `(props: MediaLibraryViewProps) => ReactNode` | an editable name input                   | Editable fields of one item                    |
| `propertiesView` | `(props: MediaLibraryViewProps) => ReactNode` | name (if not editable), size · extension | Read-only details of one item                  |

```ts
interface MediaLibraryViewProps {
  media: MediaObject;
  getNameInputProps: UseMediaLibraryResult['getNameInputProps'];
  getNameInputErrors: UseMediaLibraryResult['getNameInputErrors'];
  getCustomPropertyInputProps: UseMediaLibraryResult['getCustomPropertyInputProps'];
  getCustomPropertyInputErrors: UseMediaLibraryResult['getCustomPropertyInputErrors'];
}
```

## Behavior

- Reordering calls `setOrder` with the new uuid list; the value's `order` follows the display
  order. Move up is disabled on the first item, move down on the last.
- Custom properties edited through `fieldsView` are posted as `{name}[{uuid}][custom_properties][{key}]`;
  the server keeps only keys listed in `withCustomProperties()`.
- Root classes: `media-library media-library-multiple media-library-collection`, plus
  `media-library-empty`; a drop target row gets `media-library-item-drop-target`.

## Related

- [Technical](technical.md) · [useMediaLibrary API](../use-media-library/api.md)
