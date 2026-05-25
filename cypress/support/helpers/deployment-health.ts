/// <reference types="cypress" />

import { CHAT_INPUT_SELECTOR } from '../selectors/CommonSelectors';

// ---------------------------------------------------------------------------
// LLM deployment health probe
//
// Why this exists:
//   When the deployment is not set (or is misconfigured), `POST /send-query`
//   never responds in a reasonable time. Without this gate, every LLM-dependent
//   spec waits the full 90–120s `cy.wait('@sendQuery')` timeout before failing.
//
// What it does:
//   - Drives the UI to send one tiny "ping" prompt.
//   - Polls a flag set inside `cy.intercept` instead of `cy.wait` so a timeout
//     does not throw and abort the probe.
//   - Caches the verdict in a tmp file (cleared at start of every `cypress run`)
//     so the probe is paid once per run, then reused across specs.
//
// How to use it in a spec that needs a working deployment:
//
//   describe('My suite', () => {
//     requireLlmHealthy();
//     it('...', () => { ... });
//   });
// ---------------------------------------------------------------------------

const PROBE_PROMPT = 'health-check ping';
const PROBE_RESPONSE_TIMEOUT_MS = 45000;
const POLL_INTERVAL_MS = 500;
const PROBE_ALIAS = 'llmHealthProbeSendQuery';

export interface LlmHealthCache {
  healthy: boolean;
  timestamp: number;
}

/**
 * Reads cached health from disk (or returns null), runs a fresh UI-driven
 * probe if no cache is present, then writes the result back to disk.
 * Sets `Cypress.env('llmHealthy', boolean)` so `requireLlmHealthy()` and
 * any caller can read the verdict synchronously.
 */
export function probeAndCacheLlmHealth(): Cypress.Chainable<boolean> {
  return cy.task<LlmHealthCache | null>('llmHealth:read', null, { log: false }).then((cached) => {
    if (cached && typeof cached.healthy === 'boolean') {
      Cypress.env('llmHealthy', cached.healthy);
      Cypress.log({
        name: 'LLM HEALTH',
        message: `cached verdict: ${cached.healthy ? 'healthy' : 'unhealthy'}`,
      });
      return cy.wrap(cached.healthy, { log: false });
    }

    return performProbe().then((healthy: boolean) => {
      Cypress.env('llmHealthy', healthy);
      Cypress.log({
        name: 'LLM HEALTH',
        message: `probe verdict: ${healthy ? 'healthy' : 'unhealthy'}`,
      });
      cy.task('llmHealth:write', { healthy, timestamp: Date.now() }, { log: false });
      return cy.wrap(healthy, { log: false });
    });
  });
}

function performProbe(): Cypress.Chainable<boolean> {
  const probeState = { responded: false };
  const chatPath = String(Cypress.env('chatPath') || '/dbagent/11/chat');

  cy.intercept('POST', '**/api/chats/*/send-query', (req) => {
    req.continue(() => {
      probeState.responded = true;
    });
  }).as(PROBE_ALIAS);

  cy.loginBySession();
  cy.visit(chatPath);
  cy.contains(/Welcome to DB Agent/i, { timeout: 30000 }).should('be.visible');

  // Type and submit without using cy.wait — we poll the flag ourselves so a
  // hung backend does not throw mid-probe.
  cy.get(CHAT_INPUT_SELECTOR, { timeout: 20000 })
    .filter(':visible')
    .first()
    .then(($input: JQuery<HTMLElement>) => {
      const el = $input[0] as HTMLElement;
      const isContentEditable = el.getAttribute('contenteditable') === 'true' || el.isContentEditable;
      cy.wrap($input).click();
      if (!isContentEditable) cy.wrap($input).clear();
      cy.wrap($input).type(PROBE_PROMPT, { delay: 0 });
      cy.wrap($input).type('{enter}');
    });

  const maxPolls = Math.ceil(PROBE_RESPONSE_TIMEOUT_MS / POLL_INTERVAL_MS);
  return pollForResponse(probeState, maxPolls);
}

function pollForResponse(
  state: { responded: boolean },
  remaining: number,
): Cypress.Chainable<boolean> {
  if (state.responded) return cy.wrap(true, { log: false });
  if (remaining <= 0) return cy.wrap(false, { log: false });
  return cy.wait(POLL_INTERVAL_MS, { log: false }).then(() => pollForResponse(state, remaining - 1));
}

/**
 * Attach a single-shot probe + per-test skip to a `describe` block. Specs that
 * require a working deployment should call this at the top of the describe.
 */
export function requireLlmHealthy(): void {
  before(() => {
    probeAndCacheLlmHealth();
  });

  beforeEach(function skipIfLlmUnhealthy(this: Mocha.Context) {
    if (Cypress.env('llmHealthy') === false) {
      this.skip();
    }
  });
}
