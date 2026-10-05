import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';

// typescript-eslint v8의 recommended는 설정 배열 — TS 파일에만 적용
const tsRecommended = tseslint.configs.recommended.map((config) => ({
  ...config,
  files: ['src/**/*.{ts,tsx}'],
}));

export default [
  { ignores: ['dist', 'node_modules', 'coverage'] },
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      sourceType: 'module',
      globals: {
        ...globals.browser,
      },
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    rules: {
      ...js.configs.recommended.rules,
      'no-unused-vars': 'off',
      // 운영 콘솔 노출 방지 — error 외에는 필요한 곳만 eslint-disable로 명시
      'no-console': ['warn', { allow: ['error'] }],
    },
  },
  ...tsRecommended,
  {
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        project: ['./tsconfig.json'],
      },
    },
    plugins: {
      'react-hooks': reactHooks,
    },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
  {
    files: ['*.config.{js,ts}', '**/*.d.ts'],
    languageOptions: {
      parser: tseslint.parser,
    },
  },
];
