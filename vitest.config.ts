import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // React tests opt into jsdom with a `// @vitest-environment jsdom` docblock; everything
    // else runs in node so the core is proven not to touch the DOM at import time.
    include: ['tests/**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      reporter: ['text', 'lcov'],
    },
  },
});
