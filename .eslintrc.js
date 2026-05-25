module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
    project: './tsconfig.json',
  },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:cypress/recommended',
  ],
  plugins: ['@typescript-eslint', 'cypress'],
  env: {
    'cypress/globals': true,
    node: true,
    es6: true,
  },
  rules: {
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    'cypress/no-unnecessary-waiting': 'warn',
    'no-console': 'warn',
  },
  ignorePatterns: ['node_modules/', 'dist/', 'cypress/videos/', 'cypress/screenshots/'],
};
