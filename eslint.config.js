import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    rules: {
      'no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrors: 'none' }],
    },
  },
  {
    // Node code: CLI scripts, serverless API functions, Cloud Functions.
    // These legitimately use process/Buffer/__dirname/console/fetch/setTimeout.
    files: ['scripts/**/*.js', 'functions/**/*.js', 'api/**/*.js'],
    languageOptions: {
      globals: { ...globals.node },
    },
    rules: {
      'no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrors: 'none' }],
    },
  },
  {
    // Root build/config files and standalone Node seeders.
    files: ['*.config.js', 'seed.js'],
    languageOptions: {
      globals: { ...globals.node },
    },
  },
  {
    // Service worker runs in a worker scope (self, caches, clients, etc.).
    files: ['public/sw.js'],
    languageOptions: {
      globals: { ...globals.browser, ...globals.serviceworker },
    },
  },
])
