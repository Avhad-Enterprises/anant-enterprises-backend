import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default [
  {
    ignores: ['build/**', 'node_modules/**', 'coverage/**', 'tests/**', '**/*.test.ts'],
  },
  js.configs.recommended,
  {
    languageOptions: {
      globals: globals.node,
    },
  },
  ...tseslint.configs.recommended,
];
