// ***********************************************************
// This support file is loaded automatically before test files.
// Use this for global configuration and behavior.
// ***********************************************************

import './commands';

// Prevent uncaught exceptions from failing tests
Cypress.on('uncaught:exception', (err, runnable) => {
  return false;
});
