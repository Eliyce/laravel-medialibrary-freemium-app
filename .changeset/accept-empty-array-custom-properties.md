---
'@eliyce/laravel-medialibrary-freemium-app': patch
---

Accept `[]` custom_properties from Spatie backends (empty PHP array). Spatie Media Library serializes an empty `custom_properties` as `[]`, and Inertia props keep it that way, so `initialValue` with existing media threw `TypeError: custom_properties must be an object` and React pages rendering `MediaLibraryAttachment` or `MediaLibraryCollection` went blank. An empty array now counts as no custom properties. A non-empty array still throws, now as `custom_properties must be an object (got a non-empty array)`.
