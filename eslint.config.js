import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist', 'coverage', 'node_modules', '.paqad', 'vendor', 'laravel', '.claude'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
);
