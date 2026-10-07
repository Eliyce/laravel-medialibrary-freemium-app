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

## Install from GitHub

Both packages can be installed straight from this repository, without npm or Packagist. Pin a
release tag (`vX.Y.Z`); the lock files then record the exact commit.

Composer reads the repository as a `vcs` repository:

```json
{
  "repositories": [
    { "type": "vcs", "url": "https://github.com/Eliyce/laravel-medialibrary-freemium-app" }
  ],
  "require": {
    "eliyce/laravel-medialibrary-freemium-app": "^0.1"
  }
}
```

npm installs it as a git dependency. `dist/` is not committed, so npm runs the package's
`prepare` script, which builds it during the install:

```json
{
  "dependencies": {
    "@eliyce/laravel-medialibrary-freemium-app": "git+https://github.com/Eliyce/laravel-medialibrary-freemium-app.git#v0.1.0"
  }
}
```

The repository is private, so every machine that installs needs read access to it. Locally,
your git credentials cover npm; give Composer a token for the command, for example
`COMPOSER_AUTH="{\"github-oauth\":{\"github.com\":\"$(gh auth token)\"}}" composer update`. In CI,
use a token that can read this repository:

```bash
composer config github-oauth.github.com "$GITHUB_READ_TOKEN"
git config --global url."https://x-access-token:${GITHUB_READ_TOKEN}@github.com/".insteadOf "https://github.com/"
git config --global --add url."https://x-access-token:${GITHUB_READ_TOKEN}@github.com/".insteadOf "ssh://git@github.com/"
```

The second rule is needed because npm records GitHub git dependencies as `git+ssh://` URLs in
`package-lock.json`.

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

Releases run in GitHub Actions on the `production` branch, through
[changesets/action](https://github.com/changesets/action). Merging `main` into `production` opens
a version pull request. Merging that pull request publishes the version.

| Workflow                        | Runs on                                           | What it does                                                                                                                                                             |
| ------------------------------- | ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `.github/workflows/ci.yml`      | Every pull request and push to `main`             | `npm run check` on Node 20 and 22, `npm audit --audit-level=high`, the JS tests on React 18, and `composer test` on Laravel 10, 11, 12 and 13 (PHP 8.2 to 8.4)           |
| `.github/workflows/release.yml` | Every push to `production`, or a manual run there | Reruns CI. With pending changesets, opens or updates the version pull request into `production`. Without, publishes to npm, tags `vX.Y.Z` and creates the GitHub release |

npm publishing uses [Trusted Publishing](https://docs.npmjs.com/trusted-publishers): the
`release` job has `id-token: write`, installs npm `>=11.5.1 <12` and exchanges a GitHub OIDC
token for a short-lived publish credential. No npm token is stored anywhere. The repository is
private, so npm generates no provenance.

### One-time setup

1. **`GH_RELEASE_TOKEN` secret.** Pull requests and pushes made with the default `GITHUB_TOKEN`
   do not trigger workflows, so a version pull request opened with it would never run CI. The
   workflow uses a personal access token instead. Create a fine-grained token (GitHub Settings >
   Developer settings > Personal access tokens > Fine-grained tokens) with:

   | Setting                | Value                                                           |
   | ---------------------- | --------------------------------------------------------------- |
   | Resource owner         | `Eliyce`                                                        |
   | Repository access      | Only select repositories: this repository                       |
   | Repository permissions | **Contents: Read and write**, **Pull requests: Read and write** |

   If the `Eliyce` organization requires approval for fine-grained tokens, an organization owner
   has to approve it before it works. **Workflows** permission is not needed normally: the version
   pull request only changes `package.json`, `package-lock.json`, `CHANGELOG.md` and
   `.changeset/`. Add **Workflows: Read and write** only if the version branch update could carry
   changes under `.github/workflows/`, for example when a workflow change reaches `production`
   while a version pull request is open and the release job then fails to update the branch. Add
   the token as the `GH_RELEASE_TOKEN` repository secret (Settings > Secrets and variables >
   Actions). The version pull request, its commit and the release tags are attributed to the
   token's owner. Fine-grained tokens expire: keep the expiry short, set a reminder, and before
   the expiry date regenerate the token (or create a new one) and replace the secret. Otherwise
   the release job fails to open the pull request or push the tag.

2. **Private Packagist.** The repository is private, so the composer package is served by
   [Private Packagist](https://packagist.com), not packagist.org. In your Private Packagist
   organization, add the repository through its GitHub integration so it installs the webhook.
   Every `vX.Y.Z` tag the release creates then shows up as a composer version. Apps install the
   package after adding your organization's Private Packagist repository to their
   `composer.json`.
3. **The `production` branch.** If it does not exist yet, create it once from `main`:

   ```bash
   git switch main && git pull
   git switch -c production && git push -u origin production
   ```

4. **Publish 0.1.0 by hand.** npm only lets you configure a trusted publisher on a package that
   already exists, so the first version is published from your machine. You need an npm account
   with publish rights to the `@eliyce` scope: an npm organization named `eliyce` that you belong
   to, or the npm user `eliyce` itself.

   Before you start, the Trusted Publishing `release.yml` must already be committed on `main`, so
   the fast-forward below brings it to `production` with 0.1.0. The push at the end starts the
   release workflow from the `production` copy of `release.yml`; an older copy that still expects
   an `NPM_TOKEN` secret would fail. Merge `main` into `production` locally and push the branch
   and the tag together, after the publish:

   ```bash
   git switch production && git pull
   git merge --ff-only main
   npm login          # with two-factor authentication on, npm asks for a one-time password
   npm run release    # npm run check, then changeset publish: publishes 0.1.0, creates tag v0.1.0
   git push --follow-tags
   ```

   `git push --follow-tags` pushes `production` and the annotated `v0.1.0` tag. The release
   workflow that this push starts finds 0.1.0 already on npm and publishes nothing, so it creates
   no tag and no GitHub release. Create the `v0.1.0` GitHub release by hand (Releases > Draft a
   new release, tag `v0.1.0`), with the `## 0.1.0` section of `CHANGELOG.md` as the notes. Leave
   out the Keep a Changelog intro lines at the end of the file.

5. **Trusted publisher on npmjs.com.** npm expires a new trusted publisher configuration that
   has not completed a publish within 2 days, so add it when the next version pull request is
   ready to merge, then merge that pull request within 2 days. If it expires, delete it and add it
   again. On the package page, open Settings > Trusted Publisher, choose GitHub Actions and enter:

   | Field                | Value                                             |
   | -------------------- | ------------------------------------------------- |
   | Organization or user | `Eliyce`                                          |
   | Repository           | `laravel-medialibrary-freemium-app`               |
   | Workflow filename    | `release.yml`                                     |
   | Environment name     | leave empty                                       |
   | Allowed actions      | allow `npm publish` (`changeset publish` runs it) |

   The filename must match exactly, so renaming `release.yml` means changing this setting too.
   Once a release has gone through, you can set Publishing access to "Require two-factor
   authentication and disallow tokens". That blocks token publishing only: the workflow keeps
   publishing through OIDC, and the manual fallback still works because it publishes
   interactively with a one-time password.

6. **`production` is not protected.** The `Eliyce` organization is on GitHub's free plan and this
   repository is private, so branch protection, rulesets and required reviewers on environments
   are not available. Nothing enforces a reviewed merge: anyone with write access who pushes to
   `production` starts a release. With pending changesets that push opens or updates the version
   pull request; without, it publishes the version in `package.json` if npm does not have it yet.
   The `ci` job still has to pass first. Until that changes:
   - give write access to this repository only to the people who release;
   - change `production` only through the steps below (the merge from `main`, the version pull
     request, the manual fallback), and treat every push to it as a release;
   - review the version pull request before merging it, even though GitHub does not require it.

   Protection needs GitHub Team for the organization, or a public repository (TD-23). Once it is
   available, protect `production` (Settings > Branches or Rules): require pull requests, require
   the `CI` checks to pass, and block force pushes and deletion. The version pull request comes
   from the `changeset-release/production` branch, so do not restrict pull requests to particular
   source branches. If you require an approval, someone other than the `GH_RELEASE_TOKEN` owner
   has to approve the version pull request, because GitHub does not let authors approve their
   own.

### Cut a release

1. For each user-facing change, run `npm run changeset` on your branch and commit the generated
   file with the change. Merge the branch into `main` as usual.
2. Merge `main` into `production`: a pull request from `main` to `production` merged with
   **Create a merge commit**, or a local `git merge --ff-only main` on `production` and a push. Do
   not squash or rebase. Both rewrite `main`'s commits on `production`, so the back-merge in step
   5 is no longer clean and the history is duplicated.
3. The release workflow reruns CI, then runs `npm run version-packages` on `production`. It runs
   `changeset version`, which bumps `package.json#version`, writes the `## X.Y.Z` section of
   `CHANGELOG.md` and removes the used changesets, then
   `npm install --package-lock-only --ignore-scripts`, which moves the version in
   `package-lock.json` along. `VERSION` is read from `package.json` at build time, so no other
   file needs a bump. The action commits this to the `changeset-release/production` branch and
   opens or updates the `chore(release): version packages` pull request into `production`. CI
   runs on it.
4. Review and merge the version pull request. The release workflow runs again, finds no pending
   changesets and runs `npm run release`: the full `npm run check`, then `changeset publish`,
   which publishes `@eliyce/laravel-medialibrary-freemium-app@X.Y.Z` with public access through
   Trusted Publishing. The action then creates the `vX.Y.Z` tag on the merged commit (npm and
   composer share this tag and version number; Private Packagist picks it up through its
   webhook) and the GitHub release `vX.Y.Z` with that version's `CHANGELOG.md` section as the
   notes.
5. Merge `production` back into `main`. The version commit exists only on `production`, and
   `main` needs it before the next release:

   ```bash
   git switch main && git pull    # also fetches origin/production
   git merge origin/production    # a fast-forward when main has not moved since
   git push
   ```

More changes merged into `production` before the version pull request is merged are added to
the same pull request. The workflow never pushes to `main` or `production` and never moves or
deletes a tag: it only updates the `changeset-release/production` branch and creates new tags.

### Re-running a release

`changeset publish` skips every version that is already on npm, so re-running the workflow from
the Actions tab is safe: a run on a commit whose version is already published publishes nothing,
creates no tag and no GitHub release, and succeeds. That also means a re-run does not finish a
partial release. If npm publishing worked and the tag or the GitHub release is missing, create
them by hand: `git tag -a vX.Y.Z -m vX.Y.Z <merged commit>`, push that tag, and create the
release from the `CHANGELOG.md` section. Releases run one at a time and GitHub keeps only one
waiting run, so a newer push to `production` can replace a waiting run; the newer run sees the
same pending changesets or unpublished version and does the same work. If a Private Packagist
sync was missed, trigger an update from Private Packagist; no new tag is needed.

### Manual fallback

If GitHub Actions is unavailable, release from `production` on a machine that is logged in to
npm (`npm login`):

1. `git switch production && git pull`. If changesets are pending, run
   `npm run version-packages` and commit the result.
2. Run `npm run release`. It runs the full `npm run check`, then `changeset publish`, which
   publishes the package with public access and creates the annotated tag `vX.Y.Z`.
3. Run `git push --follow-tags` to push `production` and the tag, then create the GitHub release
   by hand from the `CHANGELOG.md` section.
4. Merge `production` back into `main` as in "Cut a release".

## License

MIT, © Eliyce. See [LICENSE](LICENSE).

Media Pro is not affiliated with or endorsed by Spatie. It builds on the MIT-licensed
[`spatie/laravel-medialibrary`](https://github.com/spatie/laravel-medialibrary) as a regular
dependency and contains no code from the paid Spatie Media Library Pro.
