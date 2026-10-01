# Use Media Library Hook Technical

## Module Boundaries

| File                             | Owns                                                                                   |
| -------------------------------- | -------------------------------------------------------------------------------------- |
| `src/react/use-media-library.ts` | `useMediaLibrary`, `UseMediaLibraryParams`, `UseMediaLibraryResult`, prop-getter types |

## Public API

```ts
useMediaLibrary(params: UseMediaLibraryParams): UseMediaLibraryResult
interface UseMediaLibraryParams extends MediaLibraryConfig { initialMedia?: MediaLibraryConfig['initialValue'] }
```

| Result member                             | Returns                                                                             |
| ----------------------------------------- | ----------------------------------------------------------------------------------- |
| `getImgProps(object)`                     | `{ src: client_preview ?? preview_url, alt: name, extension }`                      |
| `getNameInputProps(object)`               | `{ value, onChange → setName, 'aria-invalid' }`                                     |
| `getCustomPropertyInputProps(o, k)`       | `{ value, onChange → setCustomProperty, 'aria-invalid' }`                           |
| `getFileInputProps(object?)`              | `{ type: 'file', multiple, accept, onChange }`; with `object` it replaces that item |
| `getDropZoneProps(object?)`               | `{ onDrop }`; with `object` it replaces that item                                   |
| `isReadyToSubmit`, `hasUploadsInProgress` | Derived from `state`                                                                |

The file input `onChange` resets `event.target.value` so the same file can be picked twice.

## Lifecycle

```text
render 1 ─ useState(() => new MediaLibrary(config with ref-forwarding callbacks))
effect   ─ if instance destroyed (StrictMode remount) → create a fresh one
         ─ cleanup: mediaLibrary.destroy()
effect   ─ mediaLibrary.setValidationErrors(params.validationErrors ?? null)
state    ─ useSyncExternalStore(subscribe, getState, getState)   // same snapshot on the server
```

- Params live in a ref updated after every render. The store's callbacks call
  `latest.current.<callback>`, so callbacks never go stale and never recreate the store.
- `initialValue ?? initialMedia` is read once, at creation.
- No `window` or `document` access during render, so the hook renders on the server.

## Error Handling

Config errors from the core constructor (`TypeError` / `RangeError`) throw during the first render.

## Dependencies

`react` (`useState`, `useEffect`, `useRef`, `useCallback`, `useSyncExternalStore`); core
`MediaLibrary`.

## Testing Entry Points

`tests/react/use-media-library.test.tsx`: single instance per mount, destroy on unmount, StrictMode
remount, `validationErrors` propagation, latest callbacks, prop getters.
