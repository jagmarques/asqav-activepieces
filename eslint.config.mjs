import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['**/dist/**', '**/node_modules/**', 'coverage/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  { files: ['scripts/*.cjs'], rules: { '@typescript-eslint/no-require-imports': 'off' } },
  {
    languageOptions: {
      globals: { Buffer: 'readonly', process: 'readonly', URL: 'readonly',
        fetch: 'readonly', AbortSignal: 'readonly', console: 'readonly',
        require: 'readonly', __dirname: 'readonly', module: 'readonly' },
    },
  },
);
