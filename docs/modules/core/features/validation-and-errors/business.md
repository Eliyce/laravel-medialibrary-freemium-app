# Validation and Errors Business

## What it is

Two checks that keep users informed:

- **Before upload**, each file is checked against the field's rules, so users learn right away
  that a file is the wrong type or size, and the file never reaches the server.
- **After submit**, the Laravel validation errors are placed next to the item, name field or
  custom property they are about.

## Client rules

| Rule          | Example                                   | Meaning                                            |
| ------------- | ----------------------------------------- | -------------------------------------------------- |
| `accept`      | `['image/*', 'application/pdf', '.docx']` | Mime types, `type/*` wildcards, or file extensions |
| `minSizeInKB` | `10`                                      | At least 10 KB (1 KB = 1024 bytes, inclusive)      |
| `maxSizeInKB` | `5120`                                    | At most 5 MB (inclusive)                           |

When the browser reports no type for a file (it happens for some formats, such as HEIC), the type
is worked out from the file extension.

Client rules are a convenience. The server rules in the
[Laravel module](../../../laravel/features/media-validation/business.md) are the ones that protect
the app.

## Where server errors show

For a field named `images`:

| Laravel error key                     | Shown                                   |
| ------------------------------------- | --------------------------------------- |
| `images`                              | Above the list                          |
| `images.<uuid>`, `images.<uuid>.uuid` | On that item                            |
| `images.<uuid>.name`                  | Under that item's name input            |
| `images.<uuid>.custom_properties.alt` | Under that item's `alt` input           |
| `images.0.name` (position)            | On the first item                       |
| `images.<unknown>...`                 | Above the list (never silently dropped) |

A field named with brackets, such as `post[images]`, matches Laravel's dot keys (`post.images...`).

## Error States

Messages come from the [translations](../translations/business.md): "You must upload a file of
type any image, application/pdf", "File too large, max 5120 KB", "File too small, min 10 KB".

## Related

- [technical.md](technical.md)
- [Media Library Store](../media-library-store/business.md)
