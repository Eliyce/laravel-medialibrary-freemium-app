# Helper Components Technical

## Module Boundaries

| File                                    | Owns                                                  |
| --------------------------------------- | ----------------------------------------------------- |
| `src/react/components/DropZone.tsx`     | `DropZone`, `DropZoneProps`, `DropZoneRenderProps`    |
| `src/react/components/Uploader.tsx`     | `Uploader`, `UploaderProps`                           |
| `src/react/components/Thumb.tsx`        | `Thumb`, `ThumbProps`                                 |
| `src/react/components/HiddenFields.tsx` | `HiddenFields`, `HiddenFieldsProps`                   |
| `src/react/components/ItemErrors.tsx`   | `ItemErrors`, `ItemErrorsProps`                       |
| `src/react/components/ListErrors.tsx`   | `ListErrors`, `ListErrorsProps`                       |
| `src/react/components/Icon.tsx`         | `Icon`, `IconProps`; inline SVG paths on a 24x24 grid |
| `src/react/components/IconButton.tsx`   | `IconButton`, `IconButtonProps`                       |
| `src/react/components/Icons.tsx`        | `Icons` (renders `null`)                              |
| `src/react/components/NameField.tsx`    | Internal: labelled name input with errors             |
| `src/react/components/ProgressBar.tsx`  | Internal: `role="progressbar"`, `aria-valuenow`       |
| `src/react/utils.ts`                    | Internal: `cx`, `formatSize`                          |

Prop tables are in the [component registry](../../../../instructions/registries/component-registry.md).

## Behavior notes

- **DropZone** renders a `div role="button" tabIndex=0`. Children are a render function receiving
  `{ hasDragObject, isDropTarget, isValid }`. `isValid` checks each dragged item's mime type
  against `validationAccept` with `validateFile`; an unknown (empty) type counts as valid, and a
  drag without files is invalid. Enter, Space or a click call `onActivate`.
- **Uploader** keeps the real `<input type="file">` out of the tab order (`tabIndex=-1`) and
  labels it through `aria-labelledby` and `aria-describedby`. The label is `selectOrDragMax`
  when `multiple` and `maxItems` are set, else `selectOrDrag`, and switches to `dropFile` /
  `fileTypeNotAllowed` while dragging.
- **Thumb** shows `imgProps.src` or the extension, a `ProgressBar` while uploading, and a
  labelled replace input ("Replace {name}").
- **HiddenFields** filters out uploading and failed items. Scalars become strings and
  `null`/`undefined` become `''`.
- **Icon** draws its path inline, so no sprite and no ids. An unknown icon renders an empty svg.
  It is `aria-hidden`.
- **Icons** is a no-op kept so Spatie-style code that mounts `<Icons />` still compiles.

## Dependencies

`react`; core `validateFile`, `describeAccept`, `translate`, `resolveTranslations`, types.

## Testing Entry Points

`tests/react/components.test.tsx`: DropZone drag state, validity and keyboard activation;
HiddenFields settled-only output with zero-based order; ItemErrors and ListErrors alerts; Thumb
preview, progress and replace; Uploader labels and `fileTypeHelpText`; inline icons without ids,
unique ids across several components, and IconButton labels.
