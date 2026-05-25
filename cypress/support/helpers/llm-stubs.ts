/// <reference types="cypress" />

// ---------------------------------------------------------------------------
// LLM response stubs
//
// Most UI/UX specs only care that `POST /send-query` *fired* and the input
// state cleared — they don't read response content. Using `req.continue()`
// in those specs still hits the real LLM and inherits the deployment's
// latency, which is the root cause of timeout flake.
//
// `stubChatSendQuerySuccess()` replaces send-query with a synthetic 200 so
// those specs run in ~ms instead of seconds, and remain green when the LLM
// deployment is down.
//
// Specs that read the rendered response (chat title, message body) must
// NOT use this helper — they should rely on `requireLlmHealthy()` from
// `deployment-health.ts` and the real backend.
// ---------------------------------------------------------------------------

export interface StubChatSendQueryOptions {
  /** Alias to attach the intercept to. Default: 'chatRequest'. */
  alias?: string;
  /** Artificial delay in ms before the stubbed response resolves. */
  delay?: number;
  /** HTTP status to return. Default: 200. */
  statusCode?: number;
  /** Body override. Default: a permissive minimal shape. */
  body?: Record<string, unknown>;
}

const DEFAULT_BODY = {
  data: {
    id: 'stub-chat-id',
    sessionId: 'stub-session-id',
    response: 'Stubbed agent response',
    chats: [],
  },
};

export function stubChatSendQuerySuccess(options: StubChatSendQueryOptions = {}): string {
  const alias = options.alias ?? 'chatRequest';
  const statusCode = options.statusCode ?? 200;
  const body = options.body ?? DEFAULT_BODY;
  const delay = options.delay;

  cy.intercept('POST', '**/api/chats/*/send-query', (req) => {
    req.reply({
      statusCode,
      body,
      delay,
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
