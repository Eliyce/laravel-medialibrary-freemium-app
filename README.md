# Media Pro

Upload components for Laravel apps, compatible with the Spatie Media Library Pro v6 API. This
repo holds two packages:

| Package                                  | Registry  | What it gives you                                                        |
| ---------------------------------------- | --------- | ------------------------------------------------------------------------ |
| [`eliyce/laravel-media-pro`](#php-setup) | Packagist | Temporary uploads, upload routes, request handling and validation rules. |
| [`@eliyce/media-pro`](#frontend-setup)   | npm       | A framework-agnostic upload core, React components and Tailwind styles.  |

Both packages sit on top of [`spatie/laravel-medialibrary`](https://github.com/spatie/laravel-medialibrary)
v11. They do not need a Spatie Media Library Pro license.

> Media Pro is an independent project. It is not affiliated with, endorsed by or sponsored by
> Spatie. "Spatie" and "Media Library Pro" are used only to describe API compatibility, and no
> Spatie Media Library Pro code is included.

**Requirements:** PHP 8.2+, Laravel 10.2 to 13, spatie/laravel-medialibrary 11, Node 18+, React
18+ (React components only), and Tailwind CSS for the styles.

## PHP setup

```bash
composer require eliyce/laravel-media-pro
php artisan vendor:publish --tag=media-pro-migrations
php artisan migrate
php artisan vendor:publish --tag=media-pro-config   # optional
```

The service provider is auto-discovered. Register the upload routes. They need the session, so
keep them in the `web` group. The default prefix is `/media-library-pro`.

```php
// routes/web.php
Route::mediaLibrary();
```

Delete abandoned temporary uploads once a day:

```php
// routes/console.php (Laravel 11+); on Laravel 10 use $schedule->command(...) in the console kernel
Schedule::command('media-pro:delete-old-temporary-uploads')->daily();
```

On every model that receives uploads, swap Spatie's trait for the Media Pro one:

```php
use Eliyce\MediaPro\Concerns\InteractsWithMediaPro;
use Spatie\MediaLibrary\HasMedia;

class Post extends Model implements HasMedia
{
    use InteractsWithMediaPro; // instead of: use InteractsWithMedia;
}
```

`InteractsWithMediaPro` includes `InteractsWithMedia`, so the rest of the model keeps working.

> **Laravel 11:** every 11.x release has a published security advisory, so Composer 2.9+ may
> refuse to install it. Upgrade Laravel, or run `composer config audit.block-insecure false` if
> you must stay on 11.

## Frontend setup

```bash
npm install @eliyce/media-pro
```

`react` and `react-dom` (18 or later) are optional peer dependencies. You only need them for
`@eliyce/media-pro/react`.

The styles ship as Tailwind `@apply` source, with no prebuilt CSS. Import them after Tailwind,
in the stylesheet Tailwind processes:

```css
@import 'tailwindcss';
@import '@eliyce/media-pro/styles.css';
```

| Import                         | Contains                                                         |
| ------------------------------ | ---------------------------------------------------------------- |
| `@eliyce/media-pro`            | `VERSION` plus the core API                                      |
| `@eliyce/media-pro/core`       | The core: `MediaLibrary` store, upload, validation, translations |
| `@eliyce/media-pro/react`      | React components and the `useMediaLibrary` hook                  |
| `@eliyce/media-pro/styles.css` | Tailwind source styles (`media-library-*` classes)               |

## React usage

### Attachment: one file

```tsx
import { MediaLibraryAttachment } from '@eliyce/media-pro/react';

<form method="post" action="/profile">
  <MediaLibraryAttachment
    name="avatar"
    validationRules={{ accept: ['image/*'], maxSizeInKB: 2048 }}
  />
  <button type="submit">Save</button>
</form>;
```

A new file replaces the current one. Pass `multiple` (and optionally `maxItems`) to accept several
files. Pass `editableName` to show a name input.

### Collection: a sortable list

```tsx
import { MediaLibraryCollection } from '@eliyce/media-pro/react';

<MediaLibraryCollection
  name="images"
  initialValue={images}
  maxItems={5}
  validationRules={{ accept: ['image/png', 'image/jpeg', '.pdf'] }}
  fieldsView={({ media, getCustomPropertyInputProps, getCustomPropertyInputErrors }) => (
    <label>
      Alt text
      <input {...getCustomPropertyInputProps(media, 'alt')} />
      {getCustomPropertyInputErrors(media, 'alt').join(' ')}
    </label>
  )}
/>;
```

Users can rename items, edit custom properties, replace files, and reorder items with the drag
handle or the move up and move down buttons. Set `sortable={false}` to turn reordering off.

### Show existing media

Build `initialValue` on the server with `MediaProValue::collection()`:

```php
use Eliyce\MediaPro\Support\MediaProValue;

return view('posts.edit', [
    'images' => MediaProValue::collection($post->getMedia('images')),
]);
```

`initialValue` also accepts a plain array of items.

### Validation

- **Client rules** run before upload, and a file that fails them never reaches the server.
  `validationRules` supports `accept`, `minSizeInKB` and `maxSizeInKB`. `accept` takes mime
  types, wildcards like `image/*`, and extensions like `.pdf`.
- **Server errors** go in `validationErrors`, which takes the Laravel error bag (a string or a
  string array per key). Errors under `images`, `images.<uuid>`, `images.<uuid>.name` and
  `images.<uuid>.custom_properties.<key>` show next to the right item. A bracketed name such as
  `post[images]` matches the dot keys Laravel reports (`post.images.*`).

### Block submit while uploading

```tsx
const [ready, setReady] = useState(true);

<MediaLibraryCollection name="images" onIsReadyToSubmitChange={setReady} />
<button type="submit" disabled={!ready}>Save</button>
```

When you submit with JavaScript, `onChange(value)` gives you the uuid-keyed value to send.

### Inertia and other async forms

Inertia passes errors as `props.errors`, so `errors` works as an alias of `validationErrors`:

```tsx
const { data, setData, post, errors } = useForm({ images: {} });

<MediaLibraryCollection
  name="images"
  errors={errors}
  onChange={(value) => setData('images', value)}
/>;
```

### Next.js and server components

The React entry starts with `"use client"` and is safe to render on the server. It touches
`window` and `document` only inside effects and event handlers. Import it directly, with no
`dynamic(..., { ssr: false })` wrapper.

### Translations

Override messages for one component, or for the whole page:

```tsx
<MediaLibraryAttachment name="avatar" translations={{ selectOrDrag: 'Choose a photo' }} />
```

```ts
window.mediaLibraryTranslations = {
  remove: 'Supprimer',
  file: { singular: 'fichier', plural: 'fichiers' },
};
```

The keys are Spatie's (`fileTypeNotAllowed`, `tooLarge`, `selectOrDragMax`, ...) plus `replace`,
`name`, `uploading`, `moveUp` and `moveDown`. The `translations` prop wins over the global object.

### Laravel Vapor

```tsx
<MediaLibraryAttachment name="avatar" vapor />
```

The browser sends the file straight to S3 through Vapor's signed storage URL
(`vaporSignedStorageUrl`, default `vapor/signed-storage-url`, served by `laravel/vapor-core`).
The component then registers the stored `tmp/` key with `POST /media-library-pro/s3`. Set
`media-pro.temporary_upload_disk` to your S3 disk.

### Uploads on another domain or prefix

`uploadDomain="https://api.example.com"` posts uploads to another origin and sends cookies with
them. Set `routePrefix` when the routes use another prefix.

### Custom components

`useMediaLibrary` gives you the state and helpers the built-in components use:

```tsx
import { HiddenFields, useMediaLibrary } from '@eliyce/media-pro/react';

function AvatarPicker() {
  const { state, getFileInputProps, getImgProps, removeMedia } = useMediaLibrary({
    name: 'avatar',
    multiple: false,
  });
  return (
    <>
      <input {...getFileInputProps()} />
      {state.media.map((media) => (
        <button key={media.client_id} type="button" onClick={() => removeMedia(media)}>
          <img src={getImgProps(media).src} alt={media.attributes.name} />
        </button>
      ))}
      <HiddenFields name="avatar" mediaState={state.media} />
    </>
  );
}
```

`DropZone`, `Uploader`, `Thumb`, `ItemErrors`, `ListErrors`, `Icon`, `IconButton` and `Icons`
are exported as building blocks. For a framework other than React, use `MediaLibrary` from
`@eliyce/media-pro/core` and subscribe to its state.

## Server usage

### Validate the request

```php
use Eliyce\MediaPro\Rules\Concerns\ValidatesMedia;

class UpdatePostRequest extends FormRequest
{
    use ValidatesMedia;

    public function rules(): array
    {
        return [
            'cover' => $this->validateSingleMedia()->extension(['jpg', 'png'])->maxSizeInKb(2048),
            'images' => $this->validateMultipleMedia()
                ->forModel($this->route('post'), 'images')
                ->minItems(1)
                ->maxItems(5)
                ->mime('image/*')
                ->maxTotalSizeInKb(10240)
                ->itemName('required|max:255')
                ->customProperty('alt', 'required|max:255'),
        ];
    }
}
```

- Each builder expands to flat rules for `images`, `images.*.uuid`, `images.*.name` and
  `images.*.custom_properties.<key>`.
- More rules: `minSizeInKb`, `dimensions`, `width`, `height`, `widthBetween`, `heightBetween`,
  `minTotalSizeInKb`, and `attribute()`, an alias of `itemName()` and `customProperty()`.
- With `Validator::make()`, pass the rules through `MediaRules::expand($rules)` first.
- `forModel($model, $collection)` accepts existing media only from that model's collection.
  Temporary uploads from the current session always pass. Pass `null` when you create a record.

### Save the media

```php
$post->addFromMediaLibraryRequest($request->validated('images'))
    ->withCustomProperties('alt')
    ->toMediaCollection('images');

// Make the collection match the request, deleting media the user removed:
$post->syncFromMediaLibraryRequest($request->validated('images'))
    ->withCustomProperties('alt')
    ->usingName(fn ($item) => $item->name ?? 'Untitled')
    ->toMediaCollection('images');
```

- Temporary uploads from the current session move into the collection. Media already in the
  collection gets the new name, order and custom properties.
- Only the custom properties you list in `withCustomProperties()` are saved.
- `usingName()` and `usingFileName()` take a string or a callback that receives each item.
- Unknown uuids, another model's media and another session's uploads throw `InvalidMediaUuid`.
  It renders as a validation error under the `media` key (422 for JSON, a redirect back
  otherwise), and nothing is changed.
- All database changes run in one transaction.

## Security

- **Require login** when only signed-in users should upload. We strongly recommend it:

  ```php
  Route::middleware('auth')->group(fn () => Route::mediaLibrary());
  ```

- **Allowed extensions.** The file content must match an extension on
  `media-pro.temporary_uploads_allowed_extensions`, and the stored file always gets an allowed
  extension (a direct upload with a disallowed client extension is rejected). The default list covers common images,
  documents, archives, audio and video, and leaves out SVG, HTML, XML and PHP on purpose.

  ```php
  'temporary_uploads_allowed_extensions' => [...DefaultAllowedExtensions::all(), 'heic'],
  ```

- **Size.** `media-pro.max_file_size_in_kb` falls back to `media-library.max_file_size`.
- **Rate limit.** 10 uploads per minute per IP by default (`media-pro.rate_limit_per_minute`).
  Define your own `media-pro-uploads` limiter to replace it:

  ```php
  RateLimiter::for('media-pro-uploads', fn (Request $request) => Limit::perMinute(30)->by($request->user()?->id ?: $request->ip()));
  ```

- **Preview images** are a 500x500 crop. Change them from a service provider:

  ```php
  TemporaryUpload::previewManipulation(fn (Conversion $conversion) => $conversion->fit(Fit::Contain, 300, 300));
  ```

- **Custom prefix.** Use `Route::mediaLibrary('uploads/media')` and pass
  `routePrefix="uploads/media"` to the components.

Uuids are unique. An upload that reuses one gets a 422, even when two requests race. A temporary
upload can only be claimed from the session that created it.

## Differences from Spatie Media Library Pro

| Spatie Media Library Pro v6                          | Media Pro                                             |
| ---------------------------------------------------- | ----------------------------------------------------- |
| `spatie/laravel-medialibrary-pro` (licensed)         | `eliyce/laravel-media-pro`                            |
| `media-library-pro-react-attachment` / `-collection` | `@eliyce/media-pro/react`                             |
| `use InteractsWithMedia;` on models                  | `use InteractsWithMediaPro;`                          |
| `media-library:delete-old-temporary-uploads`         | `media-pro:delete-old-temporary-uploads`              |
| Rate limiter `medialibrary-pro-uploads`              | Rate limiter `media-pro-uploads`                      |
| `Spatie\MediaLibraryPro\...` classes                 | `Eliyce\MediaPro\...` classes                         |
| Prebuilt CSS or Tailwind source                      | Tailwind source only (`@eliyce/media-pro/styles.css`) |

The component props, the `useMediaLibrary` helpers, the routes, the form value and the
validation builder follow Spatie's API. React is the only frontend binding so far.

## Development

```bash
npm install && composer install
npm run check   # typecheck, lint, format check, JS tests, build
composer test   # PHPUnit suite for the Laravel package
```

Run both before you push. Releases use [Changesets](https://github.com/changesets/changesets):
run `npm run changeset` for every user-facing change.

## Releasing

### Prerequisites

- An npm account with publish rights to the `@eliyce` scope: either an npm organization named
  `eliyce` that you belong to, or the npm user `eliyce` itself.
- Run `npm login` once on the release machine. If the account has two-factor authentication on,
  npm asks for a one-time password when you publish.

### Publish the npm package

1. For each user-facing change, run `npm run changeset` and commit the generated file.
2. Run `npm run version-packages`. It runs `changeset version`, which bumps
   `package.json#version`, writes `CHANGELOG.md` and removes the used changesets. `VERSION` is
   read from `package.json` at build time, so no other file needs a bump.
3. Commit the version bump.
4. Run `npm run release`. It runs the full `npm run check`, then `changeset publish`, which
   publishes `@eliyce/media-pro` with public access (from `publishConfig`) and creates the git
   tag `vX.Y.Z`.
5. Push the commit and the tag: `git push --follow-tags`.

### Publish the composer package

Packagist reads releases from git tags. Submit the repository URL once on
[packagist.org](https://packagist.org/packages/submit) as `eliyce/laravel-media-pro`; after that,
every pushed `vX.Y.Z` tag becomes a release. The tag from step 4 is the npm version, so both
packages share version numbers.

## License

MIT, © Eliyce. See [LICENSE](LICENSE).

Media Pro is not affiliated with or endorsed by Spatie. It builds on the MIT-licensed
[`spatie/laravel-medialibrary`](https://github.com/spatie/laravel-medialibrary) as a regular
dependency and contains no code from the paid Spatie Media Library Pro.
