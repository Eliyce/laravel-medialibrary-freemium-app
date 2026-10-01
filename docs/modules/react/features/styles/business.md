# Styles Business

## What it is

The look of the components, shipped as Tailwind CSS source (`@apply` rules). The components
follow the app's own Tailwind theme, and the app's build includes only what it uses. There is no
prebuilt CSS file (owner decision D-01M3VMEXVVHS9M8B2R8QXX84ZM).

```css
@import 'tailwindcss';
@import '@eliyce/media-pro/styles.css';
```

## Customizing

- Every class starts with `media-library-`, so overriding a rule in your own CSS is safe and
  never clashes with app classes.
- The component is a grid with three named areas: `errors`, `items` and `uploader`. Reorder them
  in your CSS:

  ```css
  .media-library {
    grid-template-areas: 'uploader' 'items' 'errors';
  }
  ```

- State classes you can style: `media-library-empty`, `media-library-single`,
  `media-library-multiple`, `media-library-collection`, `media-library-dropzone-drag`,
  `media-library-dropzone-invalid`, `media-library-item-drop-target`.

## Rules

- Only core Tailwind utilities are used, so no Tailwind plugin is required.
- Focus rings are visible on every interactive element.
- The colors are Tailwind defaults until the project defines its design tokens (TD-10).

## Related

- [technical.md](technical.md)
