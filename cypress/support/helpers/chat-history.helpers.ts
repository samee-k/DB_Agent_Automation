/// <reference types="cypress" />

import { ChatHistoryPage } from '../pages/ChatHistoryPage';

// ---------------------------------------------------------------------------
// Intercept alias names — single source of truth across all chat-history specs.
// ---------------------------------------------------------------------------
export const ALIASES = {
  getChats: 'getChatsByProject',
  searchChats: 'searchChatsByProject',
  deleteChat: 'deleteChat',
  updateTitle: 'updateChatTitle',
  sendQuery: 'sendQuery',
} as const;

// ---------------------------------------------------------------------------
// Intercept helpers — register network intercepts and attach aliases.
// ---------------------------------------------------------------------------
export function interceptGetChats(): void {
  const projectId = Cypress.env('projectId') || '11';
  cy.intercept('GET', `**/api/chats/by-project/${projectId}*`).as(ALIASES.getChats);
}

export function interceptSearchChats(): void {
  const projectId = Cypress.env('projectId') || '11';
  cy.intercept('GET', `**/api/chats/by-project/${projectId}?search=*`).as(ALIASES.searchChats);
}

export function interceptDeleteChat(): void {
  cy.intercept('DELETE', '**/api/chats/*').as(ALIASES.deleteChat);
}

export function interceptUpdateTitle(): void {
  cy.intercept('PATCH', '**/api/chats/*/update-title').as(ALIASES.updateTitle);
}

export function interceptSendQuery(): void {
  // Regex handles optional chat-ID segment and query strings: /api/chats/{id}/send-query?...
  cy.intercept('POST', /\/api\/chats(?:\/[^/?#]+)?\/send-query(?:\?.*)?$/).as(ALIASES.sendQuery);
}

// ---------------------------------------------------------------------------
// Standard suite setup — DRYs up the repeated beforeEach across all specs:
//   register intercepts → visit → wait for list → seed if empty → revisit.
// ---------------------------------------------------------------------------
export function seedAndVisit(page: ChatHistoryPage): void {
  // Validate that every chat API request carries a Bearer token (auth regression guard).
  page.setupAuthHeaderCheck();

  interceptGetChats();
  interceptDeleteChat();
  page.visit();
  cy.wait(`@${ALIASES.getChats}`).its('response.statusCode').should('eq', 200);

  cy.seedChatsByProjectViaApiIfEmpty(5, 20);

  interceptGetChats();
  page.visit();
  cy.wait(`@${ALIASES.getChats}`).its('response.statusCode').should('eq', 200);

  page.openHistoryPanel();

  // Retrying assertion — waits until items actually render in the DOM.
  // If the API seed hasn't committed yet (eventual consistency) or the panel
  // is slow to populate, this will keep retrying before timing out.
  page.getHistoryItems().then(($items) => {
    if ($items.length > 0) return;

    // API seeding may be disabled in some environments (e.g., POST /chats returns 405).
    // Create one chat through the UI to guarantee deterministic test preconditions.
    interceptSendQuery();
    page.clickNewChatButton();
    page.typeInChatPrompt(`Seed chat ${Date.now()}`);
    page.clickSendButton();
    cy.wait(`@${ALIASES.sendQuery}`).its('response.statusCode').should('be.oneOf', [200, 201]);

    interceptGetChats();
    page.visit();
    cy.wait(`@${ALIASES.getChats}`).its('response.statusCode').should('eq', 200);
    page.openHistoryPanel();
    page.getHistoryItems().should('have.length.at.least', 1);
  });
}

// ---------------------------------------------------------------------------
// API helpers — read the chat list directly from the backend (auth via token
// stored in localStorage after UI login).
// ---------------------------------------------------------------------------
export interface Chat {
  id: string | number;
  title?: string;
}

export function fetchChatList(): Cypress.Chainable<Chat[]> {
  const rawApiUrl = (Cypress.env('apiUrl') as string) || '';
  // The local dev server (localhost) typically serves the SPA and does NOT proxy
  // /api routes.  Fall back to the real API host when a localhost URL is detected.
  const isLocalhost = /^https?:\/\/(localhost|127\.0\.0\.1)/i.test(rawApiUrl);
  const apiUrl = isLocalhost ? 'https://qastudio.fuse.ai/api' : rawApiUrl;
  const projectId = Number(Cypress.env('projectId') || '11');

  return cy.window().then((win: Window) => {
    const accessToken = win.localStorage.getItem('access_token') || '';
    expect(accessToken, 'access_token must be present for API call').to.be.a('string').and.not.be.empty;

    return cy.request({
      method: 'GET',
      url: `${apiUrl}/chats/by-project/${projectId}`,
      headers: { Authorization: `Bearer ${accessToken}` },
      failOnStatusCode: false,
    }).then((res: any) => {
      if (res.status < 200 || res.status >= 400) {
        return [] as Chat[];
      }
      const body = res.body;
      if (Array.isArray(body)) return body as Chat[];
      if (Array.isArray(body?.data?.data)) return body.data.data as Chat[];
      if (Array.isArray(body?.data?.chats)) return body.data.chats as Chat[];
      if (Array.isArray(body?.data?.items)) return body.data.items as Chat[];
      if (Array.isArray(body?.data)) return body.data as Chat[];
      if (Array.isArray(body?.chats)) return body.chats as Chat[];
      if (Array.isArray(body?.items)) return body.items as Chat[];
      return [] as Chat[];
    });
  });
}

// ---------------------------------------------------------------------------
// Polling helpers — retry-based polling for eventual-consistency assertions
// after UI actions (e.g. verifying a new chat is persisted in the backend).
// ---------------------------------------------------------------------------

export function pollUntilChatCountGrows(
  beforeCount: number,
  retries = 8,
  intervalMs = 1500,
): Cypress.Chainable<any> {
  return fetchChatList().then((list: Chat[]) => {
    if (list.length > beforeCount) return cy.wrap(undefined);
    expect(retries, `chat count should grow beyond ${beforeCount} within retries`).to.be.greaterThan(0);
    return cy.wait(intervalMs, { log: false }).then(() =>
      pollUntilChatCountGrows(beforeCount, retries - 1, intervalMs),
    );
  });
}

export function pollUntilChatCountGrowsAndPreserves(
  beforeCount: number,
  preservedIds: string[],
  retries = 8,
  intervalMs = 1500,
): Cypress.Chainable<any> {
  return fetchChatList().then((list: Chat[]) => {
    const ids = new Set(list.map((c: Chat) => String(c.id)));
    const allPreserved = preservedIds.every((id) => ids.has(id));
    if (list.length > beforeCount && allPreserved) return cy.wrap(undefined);
    expect(retries, 'chat list should grow and preserve previous IDs').to.be.greaterThan(0);
    return cy.wait(intervalMs, { log: false }).then(() =>
      pollUntilChatCountGrowsAndPreserves(beforeCount, preservedIds, retries - 1, intervalMs),
    );
  });
}

// ---------------------------------------------------------------------------
// Invalid-session flow helpers — reused across core and panel specs.
// ---------------------------------------------------------------------------
const ERROR_HEADING = 'Unable to Load Chats';
const ERROR_SUBTEXT = /your previous conversations.*loaded at the moment.*start a new chat to keep going/i;

export function suppressExpectedInvalidSessionErrors(): void {
  cy.on('uncaught:exception', (err) => {
    if (/Request failed with status code (400|404|422|500)/i.test(err.message)) {
      return false;
    }
    return true;
  });
}

export function visitInvalidSessionAndAssertErrorState(
  page: ChatHistoryPage,
  invalidSessionId: string,
): void {
  suppressExpectedInvalidSessionErrors();

  cy.intercept('GET', '**/api/chats/by-session/*').as('getChatBySessionError');
  cy.visit(`${page.chatPath}?sessionId=${invalidSessionId}`);

  cy.wait('@getChatBySessionError', { timeout: 20000 })
    .its('response.statusCode')
    .should('be.oneOf', [400, 404, 422, 500]);

  cy.get('body').should('exist').and('be.visible');
  cy.contains(ERROR_HEADING, { timeout: 15000 }).should('be.visible');
  cy.contains(ERROR_SUBTEXT).should('be.visible');
  cy.contains('button, [role="button"], a', /\+?\s*new\s*chat/i)
    .filter(':visible')
    .first()
    .should('be.visible');

  page.getSelectedItemCount().should('eq', 0);
}

export function assertNoSessionIdInUrl(page: ChatHistoryPage): void {
  cy.location('pathname', { timeout: 15000 }).should('eq', page.chatPath);
  cy.location('search').then((search: string) => {
    const params = new URLSearchParams(search);
    expect(params.get('sessionId')).to.be.null;
  });
}
