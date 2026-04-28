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

    cy.request({
      method: 'GET',
      url: `/api/chats/by-project/${projectId}`,
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }).then((res: ChatListResponse) => {
      expect(res.status).to.eq(200);

      const chatList = extractChatList(res.body);

      cy.wrap(chatList).each((chat: Chat) => {
        const chatId = chat?.id;
        if (!chatId) {
          return;
        }

        cy.request({
          method: 'DELETE',
          url: `/api/chats/${chatId}`,
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }).its('status').should('eq', 200);
      });
    });
  });
}

export function seedChatsByProjectViaApiIfEmptyService(targetCount = 5, upperLimit = 20) {
  const projectId = Number(Cypress.env('projectId') || '11');

  cy.window().then((windowObject: Window) => {
    const accessToken = windowObject.localStorage.getItem('access_token') || '';
    expect(accessToken, 'access_token for seeding').to.be.a('string').and.not.be.empty;

    cy.request({
      method: 'GET',
      url: `/api/chats/by-project/${projectId}`,
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }).then((listRes: ChatListResponse) => {
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
        cy.request({
          method: 'POST',
          url: '/api/chats',
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          body: payload,
        }).its('status').should('eq', 201);
      });
    });
  });
}

export function ensureChatsByProjectMinCountService(minCount = 10, upperLimit = 50) {
  const projectId = Number(Cypress.env('projectId') || '11');

  cy.window().then((windowObject: Window) => {
    const accessToken = windowObject.localStorage.getItem('access_token') || '';
    expect(accessToken, 'access_token for min-count seeding').to.be.a('string').and.not.be.empty;

    cy.request({
      method: 'GET',
      url: `/api/chats/by-project/${projectId}`,
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }).then((listRes: ChatListResponse) => {
      expect(listRes.status).to.eq(200);

      const chatList = extractChatList(listRes.body);

      const existingCount = chatList.length;
      if (existingCount >= minCount || existingCount >= upperLimit) {
        return;
      }

      const toCreate = Math.min(minCount - existingCount, upperLimit - existingCount);
      const payloads = Array.from({ length: Math.max(toCreate, 0) }, () => ({ projectId }));

      cy.wrap(payloads).each((payload: { projectId: number }) => {
        cy.request({
          method: 'POST',
          url: '/api/chats',
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          body: payload,
        }).its('status').should('eq', 201);
      });
    });
  });
}
