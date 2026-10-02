// Read from package.json at build time (esbuild inlines only this field), so the exported value
// always matches the published version.
import { version } from '../package.json';

/** Current version of the media-pro package. */
export const VERSION: string = version;
