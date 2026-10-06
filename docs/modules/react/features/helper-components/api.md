# Helper Components API

Source: `src/react/components/*.tsx`. Exported from `@eliyce/laravel-medialibrary-freemium-app/react` as building blocks
for custom layouts. `NameField` and `ProgressBar` are internal.

## `DropZone`

```ts
type DropZoneProps = {
  validationAccept?: string[];
  children: (props: DropZoneRenderProps) => ReactNode;
  onDrop: (event: DragEvent<HTMLDivElement>) => void;
  onActivate?: () => void; // click, Enter or Space
} & Omit<HTMLAttributes<HTMLDivElement>, 'children' | 'onDrop'>;

interface DropZoneRenderProps {
  hasDragObject: boolean; // something is dragged over the zone
  isDropTarget: boolean;
  isValid: boolean; // every dragged file matches validationAccept; unknown types count as valid
}
```

Renders `<div role="button" tabIndex={0} class="media-library-dropzone ...">`. Your
`onDragEnter`, `onDragOver`, `onDragLeave`, `onClick` and `onKeyDown` still run.

```tsx
<DropZone validationAccept={['image/*']} onDrop={getDropZoneProps().onDrop} onActivate={openPicker}>
  {({ hasDragObject, isValid }) =>
    hasDragObject ? (isValid ? 'Drop it' : 'Not allowed') : 'Drop files'
  }
</DropZone>
```

## `HiddenFields`

| Prop         | Type                         |
| ------------ | ---------------------------- |
| `name`       | `string`                     |
| `mediaState` | `MediaLibraryState['media']` |

For each settled item (not uploading, not failed), in order: `{name}[{uuid}][uuid]`,
`{name}[{uuid}][name]`, `{name}[{uuid}][order]` and `{name}[{uuid}][custom_properties][{key}]`.
Array properties become `[key][]` fields; `null`/`undefined` become `''`; object values are
skipped.

## `ItemErrors`

| Prop           | Type                                             |
| -------------- | ------------------------------------------------ |
| `objectErrors` | `string[]`                                       |
| `onBack`       | `(event: MouseEvent<HTMLButtonElement>) => void` |
| `translations` | `Translations` (default `resolveTranslations()`) |

`role="alert"` list; a "Go back" button when `onBack` is set; renders nothing without errors.

## `ListErrors`

| Prop             | Type                                |
| ---------------- | ----------------------------------- |
| `invalidMedia`   | `MediaLibraryState['invalidMedia']` |
| `topLevelErrors` | `string[]` (default `[]`)           |
| `onClear`        | `() => void`                        |
| `translations`   | `Translations`                      |

`role="alert"`; a clear button appears only when there is invalid media.

## `Thumb`

| Prop              | Type                                                                        |
| ----------------- | --------------------------------------------------------------------------- |
| `uploadInfo`      | `MediaObject['upload']`                                                     |
| `validationRules` | `Partial<ValidationRules>`                                                  |
| `imgProps`        | `{ src: string \| undefined; alt: string; extension: string \| undefined }` |
| `onReplace`       | `(file: File) => void`                                                      |
| `translations`    | `Translations`                                                              |

Shows the image (or the extension), a progress bar while uploading, and a labelled replace input.

## `Uploader`

| Prop               | Type                                             | Default       |
| ------------------ | ------------------------------------------------ | ------------- |
| `add`              | `boolean`                                        | `true`        |
| `uploadInfo`       | `MediaObject['upload']`                          |               |
| `multiple`         | `boolean`                                        | required      |
| `validationRules`  | `Partial<ValidationRules>`                       |               |
| `maxItems`         | `number`                                         |               |
| `fileTypeHelpText` | `string`                                         | from `accept` |
| `onDrop`           | `(event: DragEvent<HTMLDivElement>) => void`     | required      |
| `onChange`         | `(event: ChangeEvent<HTMLInputElement>) => void` | required      |
| `translations`     | `Translations`                                   |               |

A hidden labelled file input plus a `DropZone` that opens it. The label is `selectOrDrag`, or
`selectOrDragMax` when `multiple` and `maxItems` are set.

## `Icon`, `IconButton`, `Icons`

```ts
interface IconProps {
  icon: string;
  className?: string;
}
type IconButtonProps = {
  icon: string;
  className?: string;
  handleClass?: string;
  label?: string; // accessible name (falls back to aria-label), also the title
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className' | 'type'>;
```

- `Icon` draws an inline 24x24 SVG, `aria-hidden`. Names: `add`, `remove`, `replace`,
  `download`, `up`, `down`, `drag`, `error`, `success`; any other name renders an empty SVG.
- `IconButton` is a `type="button"` with the icon and `aria-label`.
- `Icons` renders `null`; kept so Spatie markup that mounts it still compiles.

## Related

- [Technical](technical.md) · [component registry](../../../../instructions/registries/component-registry.md)
