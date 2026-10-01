import { defineConfig } from 'tsup';
import type { Options } from 'tsup';

type EsbuildPlugin = NonNullable<Options['esbuildPlugins']>[number];

/**
 * The root and react entries import the core through `./core/index.js`. Rewrite that import to
 * the built `dist/core` file so every entry shares one MediaLibrary class instead of inlining
 * a copy each.
 */
const sharedCore: EsbuildPlugin = {
  name: 'media-pro-shared-core',
  setup(build) {
    const extension = build.initialOptions.outExtension?.['.js'] ?? '.js';
    build.onResolve({ filter: /(^|\/)core\/index\.js$/ }, (args) => {
      if (args.kind === 'entry-point') return undefined;
      return { path: `./core${extension}`, external: true };
    });
  },
};

/** Marks the react outputs as client modules for React Server Components frameworks. */
const useClientBanner: NonNullable<Options['plugins']>[number] = {
  name: 'media-pro-use-client',
  renderChunk(code, chunk) {
    if (!/(^|[\\/])react\.c?js$/.test(chunk.path)) return undefined;
    return { code: `"use client";\n${code}` };
  },
};

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    core: 'src/core/index.ts',
    react: 'src/react/index.ts',
  },
  format: ['esm', 'cjs'],
  // tsup's dts step injects `baseUrl`, which TypeScript 6 deprecates.
  dts: { compilerOptions: { ignoreDeprecations: '6.0' } },
  sourcemap: true,
  clean: true,
  // esbuild already tree-shakes the bundle; tsup's extra rollup pass would strip "use client".
  target: 'es2022',
  external: ['react', 'react-dom', 'react/jsx-runtime'],
  esbuildPlugins: [sharedCore],
  plugins: [useClientBanner],
});
