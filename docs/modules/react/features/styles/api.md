# Styles API

## Entry

| Specifier                      | File                   | Kind                |
| ------------------------------ | ---------------------- | ------------------- |
| `@eliyce/media-pro/styles.css` | `styles/media-pro.css` | Tailwind CSS source |

Import it after Tailwind in the stylesheet Tailwind processes. The file has no
`@import 'tailwindcss'` of its own.

```css
@import 'tailwindcss';
@import '@eliyce/media-pro/styles.css';
```

## Contract

- Every class starts with `media-library` (for example `.media-library`, `.media-library-item`,
  `.media-library-dropzone`, `.media-library-thumb`, `.media-library-uploader`). These class
  names are the public styling surface; the components render exactly these.
- Layout: `.media-library` is a grid with the named areas `errors`, `items` and `uploader`.
  Reorder them with your own rule:

  ```css
  .media-library {
    grid-template-areas: 'uploader' 'items' 'errors';
  }
  ```

- Rules use `@apply` with core Tailwind utilities only, so your theme applies. No prebuilt CSS,
  no `!important`, no plugins.
- State classes: `media-library-empty`, `media-library-single`, `media-library-multiple`,
  `media-library-collection`, `media-library-dropzone-drag`, `media-library-dropzone-invalid`,
  `media-library-item-drop-target`.

No JavaScript API, config keys or events.

## Related

- [Technical](technical.md)
