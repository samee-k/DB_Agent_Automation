/// <reference types="cypress" />

interface ApiResponse<T> {
  data: T;
}

interface Chat {
  id: string | number;
  title?: string;
  createdAt?: string;
}

interface ChatListResponse {
  body: ApiResponse<Chat[] | { chats: Chat[] }>;
  status: number;
}

const DEFAULT_API_BASE = 'https://qastudio.fuse.ai/api';

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, '');
}

function uniquePush(target: string[], value: string) {
  if (!value) return;
  if (!target.includes(value)) {
    target.push(value);
  }
}

function buildApiBaseCandidates(): string[] {
  const configuredApiUrl = trimTrailingSlash(String(Cypress.env('apiUrl') || ''));
  const configuredAppUrl = trimTrailingSlash(String(Cypress.env('appUrl') || ''));
  const configuredBaseUrl = trimTrailingSlash(String(Cypress.config('baseUrl') || ''));

  const rawBases = [configuredApiUrl, DEFAULT_API_BASE, configuredAppUrl, configuredBaseUrl]
    .filter(Boolean);

  const candidates: string[] = [];
  rawBases.forEach((base) => {
    const normalized = trimTrailingSlash(base);

    // Skip localhost — the local dev server typically serves the SPA and does
    // NOT proxy /api routes.  The real API lives on a remote host.
    if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?(\/.*)?$/i.test(normalized)) {
      return;
    }

    uniquePush(candidates, normalized);

    if (normalized.endsWith('/api')) {
      uniquePush(candidates, normalized.replace(/\/api$/, ''));
    } else {
      uniquePush(candidates, `${normalized}/api`);
    }
  });

  return candidates;
}

function requestWithApiFallback(
  method: 'GET' | 'POST' | 'DELETE',
  path: string,
  accessToken: string,
  body?: unknown,
  throwOnFailure = true,
): Cypress.Chainable<any> {
  const bases = buildApiBaseCandidates();
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;

  const tryBase = (index: number): Cypress.Chainable<any> => {
    const base = bases[index];
    const url = `${base}${normalizedPath}`;

    const options: Partial<Cypress.RequestOptions> = {
      method,
      url,
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      failOnStatusCode: false,
      timeout: 15000,
    };

    if (body !== undefined) {
      options.body = body as Cypress.RequestBody;
    }

    return cy.request(options).then((res) => {
      if (res.status >= 200 && res.status < 400) {
        return res;
      }

      if (index < bases.length - 1) {
        return tryBase(index + 1);
      }

      if (!throwOnFailure) {
        return res;
      }

      throw new Error(
        `All chat API endpoints failed for ${method} ${normalizedPath}. ` +
        `Tried: ${bases.join(', ')}. Last status: ${res.status}`,
      );
    });
  };

  return tryBase(0);
}

function extractChatList(body: ApiResponse<Chat[] | { chats: Chat[] }> | any): Chat[] {
  if (!body) return [];
  if (Array.isArray(body)) return body as Chat[];
  const data = (body as any)?.data;
  if (!data) return [];
  if (Array.isArray(data)) return data as Chat[];
  if (Array.isArray((data as any)?.chats)) return (data as any).chats as Chat[];
  if (Array.isArray((data as any)?.data)) return (data as any).data as Chat[];
  if (Array.isArray((data as any)?.items)) return (data as any).items as Chat[];
  return [];
}

export function clearChatsByProjectViaApiService() {
  const projectId = Cypress.env('projectId') || '11';

  cy.window().then((windowObject: Window) => {
    const accessToken = windowObject.localStorage.getItem('access_token') || '';
    expect(accessToken, 'access_token for cleanup').to.be.a('string').and.not.be.empty;

    requestWithApiFallback('GET', `/chats/by-project/${projectId}`, accessToken).then((res: ChatListResponse) => {
      expect(res.status).to.eq(200);

      const chatList = extractChatList(res.body);

      if (chatList.length === 0) return;

      cy.log(`Deleting ${chatList.length} chats via parallel fetch`);

      // Use the configured API URL (first candidate — localhost filtered out)
      const apiBase = buildApiBaseCandidates()[0];

      // Sequential deletion via cy.request (bypasses CORS, reliable)
      cy.wrap(chatList, { log: false, timeout: 300000 }).each((chat: Chat) => {
        if (!chat?.id) return;
        cy.request({
          method: 'DELETE',
          url: `${apiBase}/chats/${chat.id}`,
          headers: { Authorization: `Bearer ${accessToken}` },
          failOnStatusCode: false,
          timeout: 10000,
        });
      });
    });
  });
}

export function seedChatsByProjectViaApiIfEmptyService(targetCount = 5, upperLimit = 20) {
  const projectId = Number(Cypress.env('projectId') || '11');

  cy.window().then((windowObject: Window) => {
    const accessToken = windowObject.localStorage.getItem('access_token') || '';
    expect(accessToken, 'access_token for seeding').to.be.a('string').and.not.be.empty;

    requestWithApiFallback('GET', `/chats/by-project/${projectId}`, accessToken).then((listRes: ChatListResponse) => {
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
        requestWithApiFallback('POST', '/chats', accessToken, payload, false)
          .then((createRes) => {
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

  cy.window().then((windowObject: Window) => {
    const accessToken = windowObject.localStorage.getItem('access_token') || '';
    expect(accessToken, 'access_token for min-count seeding').to.be.a('string').and.not.be.empty;

    requestWithApiFallback('GET', `/chats/by-project/${projectId}`, accessToken).then((listRes: ChatListResponse) => {
      expect(listRes.status).to.eq(200);

      const chatList = extractChatList(listRes.body);

      const existingCount = chatList.length;
      if (existingCount >= minCount || existingCount >= upperLimit) {
        return;
      }

      const toCreate = Math.min(minCount - existingCount, upperLimit - existingCount);
      const payloads = Array.from({ length: Math.max(toCreate, 0) }, () => ({ projectId }));

      cy.wrap(payloads).each((payload: { projectId: number }) => {
        requestWithApiFallback('POST', '/chats', accessToken, payload, false)
          .then((createRes) => {
            if (createRes.status >= 200 && createRes.status < 400) {
              expect(createRes.status).to.be.oneOf([200, 201]);
            }
          });
      });
    });
  });
}
