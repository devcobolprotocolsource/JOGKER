import solidPlugin from 'eslint-plugin-solid';
import tseslint from 'typescript-eslint';
import parser from '@typescript-eslint/parser';

export default tseslint.config(
  {
    ignores: [
      'dist',
      'node_modules',
      '.vite',
      'coverage',
      'playwright-report',
      'test-results',
      'src/shared/types/database.ts',
    ],
  },
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parser: parser,
      parserOptions: {
        ecmaFeatures: { jsx: true },
        project: ['./tsconfig.json', './tsconfig.node.json'],
        tsconfigRootDir: import.meta.dirname,
      },
    },
    settings: {
      solid: {
        htmlExtensions: ['.tsx'],
      },
    },
    plugins: {
      solid: solidPlugin,
      '@typescript-eslint': tseslint.plugin,
    },
    rules: {
      'solid/prefer-for': 'error',
      'solid/prefer-show': 'error',
      'solid/no-destructure': 'error',
      'solid/self-closing-comp': 'error',
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/consistent-type-imports': 'error',
      'no-console': ['error', { allow: ['warn', 'error'] }],
      'prefer-const': 'error',
    },
  }
);
