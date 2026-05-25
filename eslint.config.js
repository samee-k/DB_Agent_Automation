const js = require('@eslint/js');
const tsPlugin = require('@typescript-eslint/eslint-plugin');
const tsParser = require('@typescript-eslint/parser');
const cypressPlugin = require('eslint-plugin-cypress');
const chaiFriendly = require('eslint-plugin-chai-friendly');

const browserNodeGlobals = {
  cy: 'readonly',
  Cypress: 'readonly',
  CypressCommandLine: 'readonly',
  expect: 'readonly',
  assert: 'readonly',
  JQuery: 'readonly',
  before: 'readonly',
  after: 'readonly',
  beforeEach: 'readonly',
  afterEach: 'readonly',
  context: 'readonly',
  describe: 'readonly',
  it: 'readonly',
  specify: 'readonly',
  // Browser
  window: 'readonly',
  document: 'readonly',
  btoa: 'readonly',
  atob: 'readonly',
  fetch: 'readonly',
  URL: 'readonly',
  URLSearchParams: 'readonly',
  FormData: 'readonly',
  setTimeout: 'readonly',
  clearTimeout: 'readonly',
  Event: 'readonly',
  // Sinon (bundled with Cypress)
  sinon: 'readonly',
  // Node
  Buffer: 'readonly',
  require: 'readonly',
  module: 'writable',
  process: 'readonly',
  console: 'readonly',
  __dirname: 'readonly',
};

module.exports = [
  {
    ignores: ['node_modules/', 'dist/', 'cypress/videos/', 'cypress/screenshots/', '.eslintrc.js', 'eslint.config.js'],
  },
  js.configs.recommended,
  // JS files — no TypeScript project reference
  {
    files: ['**/*.js'],
    languageOptions: { globals: browserNodeGlobals },
    plugins: { cypress: cypressPlugin },
    rules: {
      ...cypressPlugin.configs.recommended.rules,
      'cypress/no-unnecessary-waiting': 'warn',
      'no-console': 'warn',
    },
  },
  // TS files — full TypeScript + Cypress + Chai-friendly rules
  {
    files: ['**/*.ts'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 2020,
        sourceType: 'module',
        project: './tsconfig.json',
      },
      globals: browserNodeGlobals,
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
      cypress: cypressPlugin,
      'chai-friendly': chaiFriendly,
    },
    rules: {
      ...tsPlugin.configs.recommended.rules,
      ...cypressPlugin.configs.recommended.rules,
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-unused-vars': ['error', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
      }],
      '@typescript-eslint/no-unused-expressions': 'off',
      'no-unused-expressions': 'off',
      'chai-friendly/no-unused-expressions': 'error',
      'cypress/no-unnecessary-waiting': 'warn',
      'no-console': 'warn',
    },
  },
  // ── Targeted overrides ──────────────────────────────────────────────────

  // Test specs + helpers: cy.wait() is intentional for UI stabilisation and polling.
  {
    files: ['cypress/e2e/**/*.cy.ts', 'cypress/support/helpers/**/*.ts', 'cypress/support/pages/**/*.ts'],
    rules: {
      'cypress/no-unnecessary-waiting': 'off',
    },
  },
  // Node-side config & plugins: console.log is standard for CLI / reporter output.
  {
    files: ['cypress.config.ts', 'cypress/plugins/**/*.ts'],
    rules: {
      'no-console': 'off',
    },
  },
];
