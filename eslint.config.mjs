import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default [
  {
    ignores: ['build/**', 'node_modules/**', 'coverage/**', 'database-reference/**'],
  },
  js.configs.recommended,
  {
    languageOptions: {
      globals: globals.node,
    },
  },
  ...tseslint.configs.recommended,
  {
    files: ['**/*.test.ts', '**/*.spec.ts', '**/tests/**/*.ts'],
    rules: {
      // Type checking - allow flexibility in tests
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/ban-ts-comment': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',

      // Unused variables - common in mocks
      '@typescript-eslint/no-unused-vars': 'off',
      'no-unused-vars': 'off',

      // Code style - tests can be longer
      'max-lines': 'off',
      'max-lines-per-function': 'off',
      'max-statements': 'off',

      // Allow require in tests
      '@typescript-eslint/no-var-requires': 'off',
    },
  },
];
