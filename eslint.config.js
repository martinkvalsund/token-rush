import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist', 'node_modules', 'playwright-report', 'test-results', 'screenshots'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['src/sim/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        { paths: [{ name: 'three', message: 'sim/ must stay free of three.js' }] },
      ],
    },
  },
);
