/** Client-side validation rules applied before a file is uploaded. */
export interface ValidationRules {
  /** Allowed mime types; wildcards such as `image/*` are supported. */
  accept?: string[] | undefined;
  /** Inclusive lower size bound in kilobytes (1 KB = 1024 bytes). */
  minSizeInKB?: number | undefined;
  /** Inclusive upper size bound in kilobytes (1 KB = 1024 bytes). */
  maxSizeInKB?: number | undefined;
}

/** UI and validation messages. Keys match Spatie Media Library Pro v6 plus a few extras. */
export interface Translations {
  fileTypeNotAllowed: string;
  tooLarge: string;
  tooSmall: string;
  tryAgain: string;
  somethingWentWrong: string;
  selectOrDrag: string;
  selectOrDragMax: string;
  file: { singular: string; plural: string };
  anyImage: string;
  anyVideo: string;
  goBack: string;
  dropFile: string;
  dragHere: string;
  remove: string;
  download: string;
  replace: string;
  name: string;
  uploading: string;
  moveUp: string;
  moveDown: string;
}

/** Translation keys whose value is a plain string. */
export type TranslationKey = Exclude<keyof Translations, 'file'>;

/** A partial set of translations, merged key by key over the defaults. */
export type PartialTranslations = Partial<Omit<Translations, 'file'>> & {
  file?: Partial<Translations['file']>;
};

/** One media item in the form value. */
export interface ValueItem {
  uuid: string;
  name: string;
  file_name?: string;
  preview_url?: string | null;
  original_url?: string | null;
  size?: number;
  mime_type?: string;
  extension?: string;
  /** Zero-based display order. */
  order: number;
  custom_properties: Record<string, unknown>;
}

/** The form value: items keyed by uuid, in display order. */
export type MediaValue = Record<string, ValueItem>;

/** Item shape accepted by `initialValue` (order and custom properties may be omitted). */
export type ValueItemInput = Omit<ValueItem, 'order' | 'custom_properties'> & {
  order?: number;
  custom_properties?: Record<string, unknown> | null;
};

/** The JSON body the upload endpoints return on success. */
export interface UploadResponse {
  uuid: string;
  name: string;
  file_name: string;
  preview_url: string | null;
  original_url: string | null;
  size: number;
  mime_type: string;
  extension: string;
}

/** A Laravel validation error bag (Inertia passes plain strings). */
export type ValidationErrorBag = Record<string, string | string[]>;

/** Backend validation errors for one media item. */
export interface MediaObjectErrors {
  object: string[];
  name: string[];
  customProperties: Record<string, string[]>;
}

/** Backend validation errors mapped to media uuids. */
export type MappedValidationErrors = Record<string, MediaObjectErrors>;

export interface UploadInfo {
  hasFailed: boolean;
  /** Upload progress, 0 to 100. */
  uploadProgress: number;
  isUploading: boolean;
}

/** One item in the library state. */
export interface MediaObject {
  attributes: ValueItem;
  /** Local object URL preview for small images; revoked when the item goes away. */
  client_preview?: string;
  upload: UploadInfo;
  /** Client-side errors for this item (failed upload, rejected by beforeUpload). */
  client_validation_errors: string[];
  /** Stable client id that survives a file replacement (the uuid does not). */
  client_id: string;
}

/** A file that failed client validation and was not uploaded. */
export interface InvalidMedia {
  file?: { name: string };
  errors: string[];
}

export interface MediaLibraryState {
  media: MediaObject[];
  invalidMedia: InvalidMedia[];
  validationErrors: MappedValidationErrors;
  topLevelErrors: string[];
}

/** One HTTP request issued by the uploader. */
export interface UploadRequest {
  method: 'POST' | 'PUT';
  url: string;
  headers: Record<string, string>;
  body: FormData | Blob | string;
  credentials: 'include' | 'same-origin' | 'omit';
  signal: AbortSignal;
  onProgress?: (percent: number) => void;
}

/** A response as seen by the uploader: the status code and the parsed JSON body (or null). */
export interface UploadTransportResponse {
  status: number;
  body: unknown;
}

/** Sends one request. Inject a custom transport through `MediaLibraryConfig.fetch`. */
export type UploadTransport = (request: UploadRequest) => Promise<UploadTransportResponse>;

/** Payload passed to `afterUpload`. Failures also carry the messages and, if any, the cause. */
export interface AfterUploadResult {
  success: boolean;
  uuid: string;
  errors?: string[];
  status?: number;
  cause?: unknown;
}

/** A file or file-like object (`name`, `size`, `type`). */
export interface FileLike {
  name: string;
  size: number;
  type: string;
}

export interface MediaLibraryConfig {
  /** Form field name; server errors are looked up under this key. Required. */
  name: string;
  initialValue?: MediaValue | ValueItemInput[] | null | undefined;
  routePrefix?: string | undefined;
  uploadDomain?: string | undefined;
  validationRules?: ValidationRules | undefined;
  validationErrors?: ValidationErrorBag | null | undefined;
  multiple?: boolean | undefined;
  maxItems?: number | undefined;
  vapor?: boolean | undefined;
  vaporSignedStorageUrl?: string | undefined;
  maxSizeForPreviewInBytes?: number | undefined;
  translations?: PartialTranslations | undefined;
  beforeUpload?: ((file: File) => unknown) | undefined;
  afterUpload?: ((result: AfterUploadResult) => unknown) | undefined;
  onChange?: ((value: MediaValue) => unknown) | undefined;
  onIsReadyToSubmitChange?: ((isReadyToSubmit: boolean) => unknown) | undefined;
  /** Injectable transport; defaults to an XMLHttpRequest transport with progress events. */
  fetch?: UploadTransport | undefined;
}
