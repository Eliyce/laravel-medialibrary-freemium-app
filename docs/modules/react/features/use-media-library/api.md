# useMediaLibrary API

Source: `src/react/use-media-library.ts`. Exported from `@eliyce/laravel-medialibrary-freemium-app/react`.

## Signature

```ts
function useMediaLibrary(params: UseMediaLibraryParams): UseMediaLibraryResult;

interface UseMediaLibraryParams extends MediaLibraryConfig {
  initialMedia?: MediaLibraryConfig['initialValue']; // alias; initialValue wins when both are set
}
```

`params` takes every [`MediaLibraryConfig`](../../../core/features/media-library-store/api.md#medialibraryconfig)
option. One `MediaLibrary` is created per mount from the first render's params and destroyed on
unmount. Later renders only feed in the latest callbacks (`beforeUpload`, `afterUpload`,
`onChange`, `onIsReadyToSubmitChange`) and changes of `validationErrors`; other options are read
once. Under StrictMode the remount gets a fresh instance.

```tsx
const { state, getFileInputProps, getImgProps, getNameInputProps, removeMedia } = useMediaLibrary({
  name: 'images',
  initialValue: props.images,
  validationErrors: props.errors,
});

return (
  <>
    <input {...getFileInputProps()} />
    {state.media.map((object) => (
      <div key={object.client_id}>
        <img {...getImgProps(object)} />
        <input {...getNameInputProps(object)} />
        <button onClick={() => removeMedia(object)}>Remove</button>
      </div>
    ))}
  </>
);
```

## Result

| Field                                                                                                                                           | Type                  | Notes                                                              |
| ----------------------------------------------------------------------------------------------------------------------------------------------- | --------------------- | ------------------------------------------------------------------ |
| `mediaLibrary`                                                                                                                                  | `MediaLibrary`        | The bound instance                                                 |
| `state`                                                                                                                                         | `MediaLibraryState`   | Through `useSyncExternalStore` (server snapshot = client snapshot) |
| `isReadyToSubmit`                                                                                                                               | `boolean`             | No invalid media, nothing uploading or failed                      |
| `hasUploadsInProgress`                                                                                                                          | `boolean`             |                                                                    |
| `getImgProps(object)`                                                                                                                           | `MediaImgProps`       | `src` = `client_preview` ?? `preview_url` ?? `undefined`           |
| `getNameInputProps(object)`                                                                                                                     | `MediaTextInputProps` | Bound to `setName`                                                 |
| `getNameInputErrors(object)`                                                                                                                    | `string[]`            | Backend `name` errors                                              |
| `getCustomPropertyInputProps(object, key)`                                                                                                      | `MediaTextInputProps` | Bound to `setCustomProperty`                                       |
| `getCustomPropertyInputErrors(object, key)`                                                                                                     | `string[]`            | Backend `custom_properties.<key>` errors                           |
| `getFileInputProps(object?)`                                                                                                                    | `MediaFileInputProps` | Without `object` adds files; with it replaces that item's file     |
| `getDropZoneProps(object?)`                                                                                                                     | `MediaDropZoneProps`  | Same add/replace split for dropped files                           |
| `addFile`, `removeMedia`, `setOrder`, `setProperty`, `setCustomProperty`, `replaceMedia`, `getErrors`, `clearObjectErrors`, `clearInvalidMedia` | functions             | Forward to the `MediaLibrary` method of the same name              |

## Prop shapes

```ts
interface MediaImgProps {
  src: string | undefined;
  alt: string;
  extension: string | undefined;
}
interface MediaTextInputProps {
  value: string; // '' for null/undefined
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  'aria-invalid': boolean; // true when the field has backend errors
}
interface MediaFileInputProps {
  type: 'file';
  multiple: boolean; // config.multiple, false when replacing
  accept: string | undefined; // validationRules.accept joined with ','
  onChange: (event: ChangeEvent<HTMLInputElement>) => void; // resets the input afterwards
}
interface MediaDropZoneProps {
  onDrop: (event: DragEvent<HTMLElement>) => void;
}
```

`MediaImgProps` also carries `extension` (to show when there is no `src`); spreading it onto an
`<img>` renders it as an `extension` attribute, so pick `src` and `alt` when that matters.

## Related

- [Technical](technical.md) · [component registry](../../../../instructions/registries/component-registry.md)
