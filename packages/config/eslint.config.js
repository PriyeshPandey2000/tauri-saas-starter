import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import js from '@eslint/js';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import reactHooks from 'eslint-plugin-react-hooks';
import boundaries from 'eslint-plugin-boundaries';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');

export default [
  js.configs.recommended,
  {
    ignores: [
      '**/dist/**',
      '**/build/**',
      '**/target/**',
      '**/.turbo/**',
      '**/node_modules/**',
      '**/src-tauri/**',
      '**/routeTree.gen.ts',
      '**/src/shared/ipc/bindings.ts',
    ],
  },
  {
    files: ['**/*.mjs', '**/scripts/**/*.{js,mjs}'],
    languageOptions: {
      globals: {
        process: 'readonly',
        console: 'readonly',
        URL: 'readonly',
        Buffer: 'readonly',
      },
    },
  },
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'],
    languageOptions: {
      parser: tsParser,
      ecmaVersion: 'latest',
      sourceType: 'module',
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
      'react-hooks': reactHooks,
      boundaries,
    },
    settings: {
      'import/resolver': {
        alias: {
          map: [
            ['@app/shared', resolve(repoRoot, 'packages/shared/src')],
            ['@', resolve(repoRoot, 'apps/desktop/src')],
          ],
          extensions: ['.ts', '.tsx', '.js', '.jsx'],
        },
        node: { extensions: ['.js', '.jsx', '.ts', '.tsx'] },
      },
      'boundaries/ignore': ['**/*.d.ts', '**/packages/shared/**'],
      'boundaries/files': [{ pattern: '**/ports/index.ts', category: 'composition-root' }],
      'boundaries/elements': [
        { type: 'adapter', pattern: 'ports/adapters/*', capture: ['adapterName'] },
        { type: 'port', pattern: 'ports' },
        { type: 'app', pattern: 'src/app' },
        { type: 'routes', pattern: 'src/routes' },
        { type: 'feature', pattern: 'features/*', capture: ['featureName'] },
        { type: 'shared', pattern: 'shared' },
        { type: 'entry', pattern: 'src' },
      ],
    },
    rules: {
      ...tsPlugin.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      'no-undef': 'off',
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      'boundaries/no-unknown-dependencies': 'error',
      'boundaries/dependencies': [
        'error',
        {
          default: 'disallow',
          checkAllOrigins: true,
          policies: [
            { from: { element: { type: 'entry' } }, allow: { to: { element: { type: 'entry' } } } },
            {
              from: { element: { type: 'entry' } },
              allow: { to: { element: { type: ['app', 'routes', 'shared', 'port'] } } },
            },
            {
              from: { element: { type: 'entry' } },
              allow: { to: { element: { type: 'feature', fileInternalPath: 'index.ts' } } },
            },
            {
              from: { element: { type: 'app' } },
              allow: { to: { element: { type: ['routes', 'shared', 'port'] } } },
            },
            {
              from: { element: { type: 'app' } },
              allow: { to: { element: { type: 'feature', fileInternalPath: 'index.ts' } } },
            },
            {
              from: { element: { type: 'routes' } },
              allow: { to: { element: { type: ['shared', 'port'] } } },
            },
            {
              from: { element: { type: 'routes' } },
              allow: { to: { element: { type: 'feature', fileInternalPath: 'index.ts' } } },
            },
            {
              from: { element: { type: 'feature' } },
              allow: { to: { element: { type: ['shared', 'port'] } } },
            },
            {
              from: { element: { type: 'feature' } },
              allow: {
                to: {
                  element: {
                    type: 'feature',
                    captured: { featureName: '{{ from.element.captured.featureName }}' },
                  },
                },
              },
            },
            {
              from: { element: { type: 'shared' } },
              allow: { to: { element: { type: 'shared' } } },
            },
            {
              from: { element: { type: 'port' } },
              allow: { to: { element: { type: ['shared', 'port'] } } },
            },
            {
              from: { element: { type: 'port' }, file: { categories: 'composition-root' } },
              allow: { to: { element: { type: 'adapter' } } },
            },
            {
              from: { element: { type: 'adapter' } },
              allow: { to: { element: { type: ['shared', 'port'] } } },
            },
            {
              from: { element: { type: '*' } },
              disallow: {
                to: {
                  module: {
                    origin: 'external',
                    source: [
                      '@sentry/*',
                      'posthog-js',
                      'posthog-node',
                      'better-auth',
                      '@better-auth/*',
                    ],
                  },
                },
              },
            },
            {
              from: { element: { type: 'adapter' } },
              allow: { to: { module: { origin: 'external' } } },
            },
            {
              from: { element: { type: '*' } },
              allow: { to: { module: { origin: ['external', 'core'] } } },
            },
          ],
        },
      ],
    },
  },
];
