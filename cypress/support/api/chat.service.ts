/// <reference types="cypress" />

import { Chat, ChatApiBody, ChatApiBodyData, ChatListResponse } from '../types';

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, '');
}

/**
 * Returns the single configured API base URL.
 * Prefers CYPRESS_API_URL; falls back to baseUrl + '/api'.
 * Throws immediately if neither is configured so misconfiguration is obvious.
 */
function resolveApiBase(): string {
  const apiUrl = trimTrailingSlash(String(Cypress.env('apiUrl') || ''));
  if (apiUrl) return apiUrl;

  const baseUrl = trimTrailingSlash(String(Cypress.config('baseUrl') || ''));
  if (baseUrl) return `${baseUrl}/api`;

  throw new Error(
    'Chat API base URL is not configured. ' +
    'Set CYPRESS_API_URL or CYPRESS_BASE_URL before running tests.',
  );
}

function apiRequest(
  method: 'GET' | 'POST' | 'DELETE',
  path: string,
  accessToken: string,
  body?: unknown,
): Cypress.Chainable<Cypress.Response<ChatApiBody>> {
  const base = resolveApiBase();
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const url = `${base}${normalizedPath}`;

  const options: Partial<Cypress.RequestOptions> = {
    method,
    url,
    headers: { Authorization: `Bearer ${accessToken}` },
    failOnStatusCode: false,
    timeout: 120000,
  };

  if (body !== undefined) {
    options.body = body as Cypress.RequestBody;
  }

  return cy.request(options) as Cypress.Chainable<Cypress.Response<ChatApiBody>>;
}

/**
 * Normalise the many shapes the chat-list endpoint can return.
 * Used by both this service and chat-history.helpers — kept as a single
 * source of truth so the two callers can't drift on which body paths they
 * accept.
 */
export function extractChatList(body: ChatApiBody | unknown): Chat[] {
  if (!body) return [];
  if (Array.isArray(body)) return body as Chat[];
  const typed = body as ChatApiBody;
  const data = typed.data as ChatApiBodyData | Chat[] | undefined;
  if (data) {
    if (Array.isArray(data)) return data as Chat[];
    if (Array.isArray(data.chats)) return data.chats;
    if (Array.isArray(data.data)) return data.data;
    if (Array.isArray(data.items)) return data.items;
    if (Array.isArray(data.records)) return data.records;
  }
  if (Array.isArray(typed.chats)) return typed.chats;
  if (Array.isArray(typed.items)) return typed.items;
  if (Array.isArray(typed.records)) return typed.records;
  return [];
}

function waitForEmptyChatList(
  accessToken: string,
  projectId: string,
  retries = 8,
  intervalMs = 1000,
) : Cypress.Chainable<unknown> {
  return apiRequest('GET', `/chats/by-project/${projectId}`, accessToken).then((res: ChatListResponse) => {
    expect(res.status).to.eq(200);

    const chatList = extractChatList(res.body);
    if (chatList.length === 0) {
      return cy.wrap(null, { log: false }) as Cypress.Chainable<unknown>;
    }

    expect(retries, 'chat list should become empty after cleanup').to.be.greaterThan(0);
    return cy.wait(intervalMs, { log: false }).then(() =>
      waitForEmptyChatList(accessToken, projectId, retries - 1, intervalMs),
    ) as Cypress.Chainable<unknown>;
  });
}

export function clearChatsByProjectViaApiService() {
  const projectId = Cypress.env('projectId') || '11';

  return cy.window().then((windowObject: Window) => {
    const accessToken = windowObject.localStorage.getItem('access_token') || '';
    expect(accessToken, 'access_token for cleanup').to.be.a('string').and.not.be.empty;

    return apiRequest('GET', `/chats/by-project/${projectId}`, accessToken).then((res: ChatListResponse) => {
      expect(res.status).to.eq(200);

      const chatList = extractChatList(res.body);

      if (chatList.length === 0) return;

      cy.log(`Deleting ${chatList.length} chats`);

      const apiBase = resolveApiBase();

      // Sequential deletion via cy.request (bypasses CORS, reliable)
      cy.wrap(chatList, { log: false, timeout: 300000 }).each((chat: Chat) => {
        if (!chat?.id) return;
        return cy.request({
          method: 'DELETE',
          url: `${apiBase}/chats/${chat.id}`,
          headers: { Authorization: `Bearer ${accessToken}` },
          failOnStatusCode: false,
          timeout: 60000,
        });
      });

      return cy.then(() => waitForEmptyChatList(accessToken, String(projectId)));
    });
  });
}

export function seedChatsByProjectViaApiIfEmptyService(targetCount = 5, upperLimit = 20) {
  const projectId = Number(Cypress.env('projectId') || '11');

  return cy.window().then((windowObject: Window) => {
    const accessToken = windowObject.localStorage.getItem('access_token') || '';
    expect(accessToken, 'access_token for seeding').to.be.a('string').and.not.be.empty;

    apiRequest('GET', `/chats/by-project/${projectId}`, accessToken).then((listRes: ChatListResponse) => {
      expect(listRes.status).to.eq(200);

      const chatList = extractChatList(listRes.body);

      const existingCount = chatList.length;

      if (existingCount > upperLimit) {
        return;
      }

      if (existingCount > 0) {
        return;
      }

      const payloads = Array.from({ length: targetCount }, () => ({ projectId }));

      cy.wrap(payloads).each((payload: { projectId: number }) => {
        return apiRequest('POST', '/chats', accessToken, payload).then((createRes) => {
            // Some backend environments block direct chat creation via POST /chats (405).
            // In those cases callers can fall back to UI-driven chat creation.
            if (createRes.status >= 200 && createRes.status < 400) {
              expect(createRes.status).to.be.oneOf([200, 201]);
            }
          });
      });
    });
  });
}

export function ensureChatsByProjectMinCountService(minCount = 10, upperLimit = 50) {
  const projectId = Number(Cypress.env('projectId') || '11');

  return cy.window().then((windowObject: Window) => {
    const accessToken = windowObject.localStorage.getItem('access_token') || '';
    expect(accessToken, 'access_token for min-count seeding').to.be.a('string').and.not.be.empty;

    apiRequest('GET', `/chats/by-project/${projectId}`, accessToken).then((listRes: ChatListResponse) => {
      const chatList = extractChatList(listRes.body);

      const existingCount = chatList.length;
      if (existingCount >= minCount || existingCount >= upperLimit) {
        return cy.wrap(undefined);
      }

      const toCreate = Math.min(minCount - existingCount, upperLimit - existingCount);
      const payloads = Array.from({ length: Math.max(toCreate, 0) }, () => ({ projectId }));

      return cy.wrap(payloads).each((payload: { projectId: number }) => {
        return apiRequest('POST', '/chats', accessToken, payload).then((createRes) => {
            if (createRes.status >= 200 && createRes.status < 400) {
              expect(createRes.status).to.be.oneOf([200, 201]);
            }
          });
      });
    });
  });
}
