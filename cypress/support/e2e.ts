// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference path="./commands.d.ts" />

// ***********************************************************
// This support file is loaded automatically before test files.
// Use this for global configuration and behavior.
// ***********************************************************

import './commands';
import 'cypress-real-events';

// Only suppress known-benign vendor/framework errors that do not affect test assertions.
// All other uncaught exceptions will fail the test
const KNOWN_BENIGN_ERRORS: string[] = [
  // Example: 'ResizeObserver loop limit exceeded',
];

Cypress.on('uncaught:exception', (err) => {
  if (KNOWN_BENIGN_ERRORS.some((msg) => err.message.includes(msg))) return false;
  return true;
});

// `cypress run` clears the LLM health cache in its `before:run` hook, but
// `cypress open` doesn't fire that hook. Without this, a stale "unhealthy"
// verdict from a previous run silently skips every spec that calls
// `requireLlmHealthy()` during interactive debugging.
before(() => {
  cy.task('llmHealth:clear', null, { log: false });
});
