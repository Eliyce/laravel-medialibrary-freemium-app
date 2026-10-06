# Media Pro

Upload components for Laravel apps, compatible with the Spatie Media Library Pro v6 API. This
repo holds two packages:

| Package                                                        | Registry          | What it gives you                                                        |
| -------------------------------------------------------------- | ----------------- | ------------------------------------------------------------------------ |
| [`eliyce/laravel-medialibrary-freemium-app`](#php-setup)       | Private Packagist | Temporary uploads, upload routes, request handling and validation rules. |
| [`@eliyce/laravel-medialibrary-freemium-app`](#frontend-setup) | npm               | A framework-agnostic upload core, React components and Tailwind styles.  |

Both packages sit on top of [`spatie/laravel-medialibrary`](https://github.com/spatie/laravel-medialibrary)
v11. They do not need a Spatie Media Library Pro license.

> Media Pro is an independent project. It is not affiliated with, endorsed by or sponsored by
> Spatie. "Spatie" and "Media Library Pro" are used only to describe API compatibility, and no
> Spatie Media Library Pro code is included.

**Requirements:** PHP 8.2+, Laravel 10.2 to 13, spatie/laravel-medialibrary 11, Node 18+, React
18+ (React components only), and Tailwind CSS for the styles.

## PHP setup

```bash
composer require eliyce/laravel-medialibrary-freemium-app
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

> **Laravel 10 and 11:** every 10.x and 11.x release has a published security advisory, so
> Composer 2.9+ may refuse to install it. Upgrade Laravel, or run
> `composer config audit.block-insecure false` if you must stay on 10 or 11.

## Frontend setup

```bash
npm install @eliyce/laravel-medialibrary-freemium-app
```

`react` and `react-dom` (18 or later) are optional peer dependencies. You only need them for
`@eliyce/laravel-medialibrary-freemium-app/react`.

The styles ship as Tailwind `@apply` source, with no prebuilt CSS. Import them after Tailwind,
in the stylesheet Tailwind processes:

```css
@import 'tailwindcss';
@import '@eliyce/laravel-medialibrary-freemium-app/styles.css';
```

| Import                                                 | Contains                                                         |
| ------------------------------------------------------ | ---------------------------------------------------------------- |
| `@eliyce/laravel-medialibrary-freemium-app`            | `VERSION` plus the core API                                      |
| `@eliyce/laravel-medialibrary-freemium-app/core`       | The core: `MediaLibrary` store, upload, validation, translations |
| `@eliyce/laravel-medialibrary-freemium-app/react`      | React components and the `useMediaLibrary` hook                  |
| `@eliyce/laravel-medialibrary-freemium-app/styles.css` | Tailwind source styles (`media-library-*` classes)               |

## React usage

### Attachment: one file

```tsx
import { MediaLibraryAttachment } from '@eliyce/laravel-medialibrary-freemium-app/react';

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
import { MediaLibraryCollection } from '@eliyce/laravel-medialibrary-freemium-app/react';

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
`media-pro.temporary_upload_disk` to your S3 disk. A private bucket works as is: see
[private disks](#security).

### Uploads on another domain or prefix

`uploadDomain="https://api.example.com"` posts uploads to another origin and sends cookies with
them. Set `routePrefix` when the routes use another prefix.

### Custom components

`useMediaLibrary` gives you the state and helpers the built-in components use:

```tsx
import { HiddenFields, useMediaLibrary } from '@eliyce/laravel-medialibrary-freemium-app/react';

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
`@eliyce/laravel-medialibrary-freemium-app/core` and subscribe to its state.

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

- **Private disks.** When a file sits on a disk whose `visibility` is not `public` and that can
  sign URLs, such as a private S3 bucket, `preview_url` and `original_url` are temporary signed
  URLs. They last `media-pro.signed_url_expiration_minutes` (default 60). Set it to `null` to
  always get plain URLs.

- **Preview images** are a 500x500 crop. Change them from a service provider:

  ```php
  TemporaryUpload::previewManipulation(fn (Conversion $conversion) => $conversion->fit(Fit::Contain, 300, 300));
  ```

- **Custom prefix.** Use `Route::mediaLibrary('uploads/media')` and pass
  `routePrefix="uploads/media"` to the components.

Uuids are unique. An upload that reuses one gets a 422, even when two requests race. A temporary
upload can only be claimed from the session that created it.

## Differences from Spatie Media Library Pro

| Spatie Media Library Pro v6                          | Media Pro                                                                     |
| ---------------------------------------------------- | ----------------------------------------------------------------------------- |
| `spatie/laravel-medialibrary-pro` (licensed)         | `eliyce/laravel-medialibrary-freemium-app`                                    |
| `media-library-pro-react-attachment` / `-collection` | `@eliyce/laravel-medialibrary-freemium-app/react`                             |
| `use InteractsWithMedia;` on models                  | `use InteractsWithMediaPro;`                                                  |
| `media-library:delete-old-temporary-uploads`         | `media-pro:delete-old-temporary-uploads`                                      |
| Rate limiter `medialibrary-pro-uploads`              | Rate limiter `media-pro-uploads`                                              |
| `Spatie\MediaLibraryPro\...` classes                 | `Eliyce\MediaPro\...` classes                                                 |
| Prebuilt CSS or Tailwind source                      | Tailwind source only (`@eliyce/laravel-medialibrary-freemium-app/styles.css`) |

The component props, the `useMediaLibrary` helpers, the routes, the form value and the
validation builder follow Spatie's API. React is the only frontend binding so far.

## Development

```bash
npm install && composer install
npm run check   # typecheck, lint, format check, JS tests, build
composer test   # PHPUnit suite for the Laravel package
```

Run both before you push. CI runs them again on every pull request and push to `main` (see
[Releasing](#releasing)). Releases use [Changesets](https://github.com/changesets/changesets): run
`npm run changeset` for every user-facing change.

## Releasing

Releases run in GitHub Actions. Versioning happens on `main`. Merging `main` into the
`production` branch publishes that version.

| Workflow                        | Runs on                                           | What it does                                                                                                                                                   |
| ------------------------------- | ------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `.github/workflows/ci.yml`      | Every pull request and push to `main`             | `npm run check` on Node 20 and 22, `npm audit --audit-level=high`, the JS tests on React 18, and `composer test` on Laravel 10, 11, 12 and 13 (PHP 8.2 to 8.4) |
| `.github/workflows/release.yml` | Every push to `production`, or a manual run there | Reruns CI, then publishes to npm, pushes the `vX.Y.Z` tag and creates the GitHub release                                                                       |

### One-time setup

1. **npm token.** You need an npm account with publish rights to the `@eliyce` scope: an npm
   organization named `eliyce` that you belong to, or the npm user `eliyce` itself. On
   npmjs.com (Access Tokens), create a granular access token with publish rights to the
   `@eliyce` scope (bypass 2FA for publishing). Add it to the GitHub repository as the
   `NPM_TOKEN` secret (Settings > Secrets and variables > Actions). The release fails with an
   error naming the secret if it is missing. It only checks that the secret is set, so an
   expired or revoked token shows up as an authentication error from `npm publish`: replace the
   secret before the token expires.
2. **Private Packagist.** The repository is private, so the composer package is served by
   [Private Packagist](https://packagist.com), not packagist.org. In your Private Packagist
   organization, add the repository through its GitHub integration so it installs the webhook.
   Every `vX.Y.Z` tag the release pushes then shows up as a composer version. Apps install the
   package after adding your organization's Private Packagist repository to their
   `composer.json`.
3. **The `production` branch.** Create it once from `main` and push it:

   ```bash
   git switch main && git pull
   git switch -c production && git push -u origin production
   ```

   Protect it (Settings > Branches or Rules): require pull requests or restrict who can push,
   require the `CI` checks to pass, and block force pushes and deletion.

### Cut a release

1. For each user-facing change, run `npm run changeset` on your branch and commit the generated
   file with the change.
2. On `main`, run `npm run version-packages`. It runs `changeset version`, which bumps
   `package.json#version`, writes the `## X.Y.Z` section of `CHANGELOG.md` and removes the used
   changesets. `VERSION` is read from `package.json` at build time, so no other file needs a
   bump. Commit the result and push it to `main`.
3. Merge `main` into `production` (a pull request from `main` to `production`, or
   `git switch production && git merge --ff-only main && git push`).

The release workflow then:

1. Reruns the full CI workflow and stops if anything is red.
2. Checks before it changes anything. It fails with an error that says what to fix if
   `NPM_TOKEN` is empty, if any changeset is still pending or the version is `0.0.0` (run
   `npm run version-packages` on `main` and merge again), if the version is not semver, or if
   `CHANGELOG.md` has no `## X.Y.Z` section.
3. Publishes `@eliyce/laravel-medialibrary-freemium-app@X.Y.Z` to npm with public access, unless
   that version is already on npm. `prepublishOnly` runs `npm run check` first. A prerelease
   version (`X.Y.Z-beta.1`) is published under the `next` dist-tag.
4. Pushes the annotated tag `vX.Y.Z` on the merged commit, unless the tag already exists. npm and
   composer share this tag and version number. Private Packagist picks the tag up through its
   webhook.
5. Creates the GitHub release `vX.Y.Z` with that version's `CHANGELOG.md` section as the notes,
   unless the release already exists.
6. Writes a summary table to the run page: what was published, tagged and created, and what was
   skipped.

The workflow never commits, never pushes a branch and never moves or deletes a tag.

### Re-running a release

Each step skips what already exists, so re-run the failed workflow from the Actions tab once the
cause is fixed. If npm publishing worked and the tag push failed, the re-run skips npm and only
pushes the tag and creates the release. Pushing to `production` again without a version bump
publishes nothing: the run reports the version as already released. Releases run one at a time
and GitHub keeps only one waiting run, so if several versions reach `production` in quick
succession a newer run can replace a waiting one. The replaced version is then not released;
the newer version contains its changes. Re-running the replaced run after the newer release
would move npm's `latest` dist-tag back to the older version. If a Private Packagist sync was
missed, trigger an update from Private Packagist; no new tag is needed.

### Manual fallback

If GitHub Actions is unavailable, release from a machine that is logged in to npm (`npm login`;
with two-factor authentication on, npm asks for a one-time password):

1. Version on `main` as above (`npm run version-packages`, commit, push).
2. Run `npm run release`. It runs the full `npm run check`, then `changeset publish`, which
   publishes the package with public access and creates the git tag `vX.Y.Z`.
3. Push the tag: `git push origin vX.Y.Z`. Then create the GitHub release by hand, or merge
   `main` into `production` and let the workflow create it (it skips the npm publish and the
   existing tag).

## License

MIT, © Eliyce. See [LICENSE](LICENSE).

Media Pro is not affiliated with or endorsed by Spatie. It builds on the MIT-licensed
[`spatie/laravel-medialibrary`](https://github.com/spatie/laravel-medialibrary) as a regular
dependency and contains no code from the paid Spatie Media Library Pro.
