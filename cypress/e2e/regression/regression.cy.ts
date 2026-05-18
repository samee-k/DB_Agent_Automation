/// <reference types="cypress" />

/**
 * REGRESSION SUITE — Single Entry Point
 *
 * Running this file executes every spec in the project in a single Cypress context.
 * Login is performed only once because `cy.session` uses `cacheAcrossSpecs: true`.
 *
 * How to run:
 *   npx cypress run --spec 'cypress/e2e/regression/regression.cy.ts'
 *   npm run test:regression
 *   npm run test:regression:chrome
 *
 * ⚠  Before running regression, make sure no spec file contains `it.only` or
 *    `describe.only` — those will cause all other tests to be skipped.
 *
 * Each import below has a side-effect: importing a Cypress spec file causes its
 * top-level `describe()` calls to register, so all tests are collected automatically.
 */

// Auth tests (login.cy) are intentionally excluded from regression.
// They test the unauthenticated login flow and require a clean browser state.
// Running them after cy.session caches credentials (cacheAcrossSpecs: true) causes
// false failures when the app redirects already-authenticated users away from /login.
// Run auth tests independently: cypress run --spec 'cypress/e2e/auth/login.cy.ts'

// Smoke
import '../smoke/happy-flow.cy';

// Navigation
import '../navigation/navigation-sidebar-admin.cy';
import '../navigation/new-chat.cy';

// Agent Response
import '../agent-response/input-processing-indicator.cy';

// User Input
import '../user-input/character-count-validation.cy';
import '../user-input/click-suggested-prompt.cy';
import '../user-input/free-form-input-field.cy';
import '../user-input/initial-prompt-first-load.cy';
import '../user-input/smart-suggestions-autocomplete.cy';
import '../user-input/user-prompt-actions.cy';

// Chat History
import '../chat-history/initial-history-seed.cy';
import '../chat-history/chat-history-core.cy';
import '../chat-history/chat-history-panel.cy';
import '../chat-history/action-delete.cy';
import '../chat-history/action-edit.cy';
import '../chat-history/search-on-chat-history.cy';
