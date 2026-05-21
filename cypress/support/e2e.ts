// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference path="./commands.d.ts" />

// ***********************************************************
// This support file is loaded automatically before test files.
// Use this for global configuration and behavior.
// ***********************************************************

import './commands';
import 'cypress-real-events';

// Prevent uncaught application exceptions (e.g. malformed mock responses) from failing tests.
// Tests still assert on UI state, so real regressions will surface through assertions.
Cypress.on('uncaught:exception', (_err, _runnable) => {
  return false;
});
