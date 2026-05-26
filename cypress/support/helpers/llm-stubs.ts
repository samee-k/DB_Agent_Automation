/// <reference types="cypress" />

// ---------------------------------------------------------------------------
// LLM response stubs
//
// For UI/UX specs that only care that `POST /send-query` *fired* (input
// cleared, request counted, etc.) we passthrough via `req.continue()` and
// attach an alias. Synthetic response bodies break the chat view's renderer
// and trip its error boundary, unmounting the composer — so any spec that
// touches the composer after the request *cannot* stub the body.
//
// Specs that read the rendered response (chat title, message body) should
// rely on `requireLlmHealthy()` from `deployment-health.ts` and the real
// backend.
// ---------------------------------------------------------------------------

export interface StubChatSendQueryOptions {
  /** Alias to attach the intercept to. Default: 'chatRequest'. */
  alias?: string;
  /** Artificial delay in ms before the response resolves. Passthrough still happens. */
  delay?: number;
  /**
   * Ignored for the success case — we always passthrough to avoid tripping
   * the chat view's error boundary. Retained for callsite signature compat.
   */
  statusCode?: number;
  body?: Record<string, unknown>;
}

export function stubChatSendQuerySuccess(options: StubChatSendQueryOptions = {}): string {
  const alias = options.alias ?? 'chatRequest';
  const delay = options.delay;

  cy.intercept('POST', '**/api/chats/*/send-query', (req) => {
    req.continue((res) => {
      if (delay !== undefined) res.setDelay(delay);
    });
  }).as(alias);

  return alias;
}

/**
 * Stub a failure response. Useful for indicator-recovery and offline-state tests.
 */
export function stubChatSendQueryFailure(options: { alias?: string; statusCode?: number; delay?: number } = {}): string {
  const alias = options.alias ?? 'chatRequest';
  const statusCode = options.statusCode ?? 500;

  cy.intercept('POST', '**/api/chats/*/send-query', (req) => {
    req.reply({
      statusCode,
      body: { message: 'Stubbed failure' },
      delay: options.delay,
    });
  }).as(alias);

  return alias;
}
