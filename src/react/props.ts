import type { MediaLibrary, MediaLibraryConfig, ValidationErrorBag } from '../core/index.js';

/** Props shared by `MediaLibraryAttachment` and `MediaLibraryCollection`. */
export interface MediaLibraryComponentProps {
  name: string;
  initialValue?: MediaLibraryConfig['initialValue'];
  routePrefix?: string | undefined;
  uploadDomain?: string | undefined;
  validationRules?: MediaLibraryConfig['validationRules'];
  /** The Laravel validation error bag. Wins over `errors` when both are set. */
  validationErrors?: ValidationErrorBag | null | undefined;
  /** Inertia alias of `validationErrors` (`props.errors`). */
  errors?: ValidationErrorBag | null | undefined;
  maxItems?: number | undefined;
  vapor?: boolean | undefined;
  vaporSignedStorageUrl?: string | undefined;
  maxSizeForPreviewInBytes?: number | undefined;
  translations?: MediaLibraryConfig['translations'];
  /** Overrides the help text generated from `validationRules.accept`. */
  fileTypeHelpText?: string | undefined;
  /** Receives the MediaLibrary instance, to drive it from outside the component. */
  setMediaLibrary?: ((mediaLibrary: MediaLibrary) => void) | undefined;
  beforeUpload?: MediaLibraryConfig['beforeUpload'];
  afterUpload?: MediaLibraryConfig['afterUpload'];
  onChange?: MediaLibraryConfig['onChange'];
  onIsReadyToSubmitChange?: MediaLibraryConfig['onIsReadyToSubmitChange'];
  /** Shows an editable name input for each item. */
  editableName?: boolean | undefined;
  /** Custom upload transport (tests, custom HTTP clients); defaults to XMLHttpRequest. */
  fetch?: MediaLibraryConfig['fetch'];
}
