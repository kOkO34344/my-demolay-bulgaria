import js from '@eslint/js';
import { defineConfig, globalIgnores } from 'eslint/config';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import globals from 'globals';
import tseslint from 'typescript-eslint';

/** Role names that UI code must never branch on (use permissions / policy helpers instead). */
const PRIVILEGED_ROLE_LITERAL =
  '/^(chapter_officer|chapter_advisor|national_officer|national_admin)$/';

export default defineConfig([
  globalIgnores([
    'dist',
    'dev-dist',
    'coverage',
    'playwright-report',
    'test-results',
    'node_modules',
    'public',
  ]),

  // JavaScript config files (eslint.config.js etc.)
  {
    files: ['**/*.{js,mjs,cjs}'],
    extends: [js.configs.recommended],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      globals: { ...globals.node },
    },
  },

  // All TypeScript (type-aware)
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommendedTypeChecked,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
      jsxA11y.flatConfigs.recommended,
    ],
    languageOptions: {
      ecmaVersion: 2023,
      globals: { ...globals.browser },
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-misused-promises': [
        'error',
        { checksVoidReturn: { attributes: false } },
      ],
      '@typescript-eslint/no-explicit-any': 'error',
      'no-console': ['error', { allow: ['warn', 'error'] }],
    },
  },

  // Node-side config files
  {
    files: ['*.config.ts', 'e2e/**/*.ts'],
    languageOptions: { globals: { ...globals.node } },
    rules: { 'react-hooks/rules-of-hooks': 'off' },
  },

  // shadcn primitives export variants next to components; test utils export helpers.
  {
    files: ['src/components/ui/**/*.{ts,tsx}', 'src/test/**/*.{ts,tsx}', '**/*.test.{ts,tsx}'],
    rules: { 'react-refresh/only-export-components': 'off' },
  },

  // Architecture guard rails for UI code (everything outside the data/auth/domain/test layers).
  {
    files: ['src/**/*.{ts,tsx}'],
    ignores: [
      'src/data/**',
      'src/test/**',
      'src/auth/**',
      'src/domain/**',
      'src/i18n/**',
      'src/**/*.test.{ts,tsx}',
    ],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                '@/data/mock',
                '@/data/mock/*',
                '@/data/store',
                '@/data/store/*',
                '@/data/api',
                '@/data/api/*',
                '@/data/registry',
                '@/data/repositories/*',
                '**/data/mock/**',
              ],
              message:
                'UI code must use the TanStack Query hooks in @/data/hooks (and types from @/domain) — never repositories, the store or mock seeds directly.',
            },
          ],
        },
      ],
      'no-restricted-syntax': [
        'error',
        {
          selector: `Literal[value=${PRIVILEGED_ROLE_LITERAL}]`,
          message:
            'Do not branch on role names in UI code. Use permissions via useCan()/<Can>/usePolicy() (src/auth).',
        },
      ],
    },
  },
]);
