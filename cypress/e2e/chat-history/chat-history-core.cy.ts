/// <reference types="cypress" />

import { ChatHistoryPage } from '../../pages/ChatHistoryPage';
import { clearChatsByProjectViaApi } from '../../support/commands';

describe('Chat History - Core', () => {
  const chatHistoryPage = new ChatHistoryPage();
  const invalidSessionId = 'invalidURL';

  const errorHeading = 'Unable to Load Chats';
  const errorSubtextPattern = /your previous conversations.*loaded at the moment.*start a new chat to keep going/i;

  // Suppresses expected 4xx/5xx uncaught exceptions thrown by the app on invalid-session flows.
  const allowExpectedInvalidSessionException = () => {
    cy.on('uncaught:exception', (err) => {
      if (/Request failed with status code (400|404|422|500)/i.test(err.message)) {
        return false;
      }
      return true;
    });
  };

  // Clears chats via API then reloads so the UI reflects an empty state.
  const reloadAfterClear = () => {
    clearChatsByProjectViaApi();
    chatHistoryPage.interceptGetChatsByProject();
    cy.reload();
    cy.wait('@getChatsByProject').its('response.statusCode').should('eq', 200);
  };

  // Visits with an invalid sessionId and asserts the graceful error state is shown.
  const visitInvalidSessionAndVerifyErrorState = () => {
    allowExpectedInvalidSessionException();

    cy.intercept('GET', '**/api/chats/by-session/*').as('getChatBySessionError');
    cy.visit(`${chatHistoryPage.chatPath}?sessionId=${invalidSessionId}`);

    // Wait for the API to respond with an error (don't block on it — just capture status).
    cy.wait('@getChatBySessionError', { timeout: 20000 })
      .its('response.statusCode')
      .should('be.oneOf', [400, 404, 422, 500]);

    cy.get('body').should('exist').and('be.visible');
    cy.contains(errorHeading, { timeout: 15000 }).should('be.visible');
    cy.contains(errorSubtextPattern).should('be.visible');
    cy.contains('button, [role="button"], a', /\+?\s*new\s*chat/i)
      .filter(':visible')
      .first()
      .should('be.visible');

    // No history entry should be selected for an invalid session.
    chatHistoryPage.getSelectedItemCount().should('eq', 0);
  };

  // Asserts the URL has been reset to the base chat path with no sessionId.
  const verifyNoSessionIdInUrl = () => {
    cy.location('pathname', { timeout: 15000 }).should('eq', chatHistoryPage.chatPath);
    cy.location('search').then((search: string) => {
      const params = new URLSearchParams(search);
      expect(params.get('sessionId')).to.be.null;
    });
  };

  beforeEach(() => {
    cy.loginByApiSession();

    chatHistoryPage.interceptGetChatsByProject();
    chatHistoryPage.visitChatPage();
    cy.wait('@getChatsByProject').its('response.statusCode').should('eq', 200);
  });

  it('C700470 - Verify no previous chat history is shown for new user load.', () => {
    reloadAfterClear();
    chatHistoryPage.openHistoryPanel();

    chatHistoryPage.getHistoryItemCount().should('eq', 0);
    chatHistoryPage.getEmptyState()
      .should('be.visible')
      .and('contain.text', 'No Conversation History');
  });

  it('C698146 - Verify search returns "No Conversation History" initially when no conversation has been started.', () => {
    chatHistoryPage.interceptSearchByProject();
    reloadAfterClear();
    chatHistoryPage.openHistoryPanel();

    chatHistoryPage.typeInSearch('SearchTest');
    cy.wait('@searchChatsByProject').its('response.statusCode').should('eq', 200);

    chatHistoryPage.getHistoryItemCount().should('eq', 0);
    chatHistoryPage.getEmptyState()
      .should('be.visible')
      .and('contain.text', 'No Conversation History');
  });

  it('C782429 - Verify UI displays "Unable to Load Chats" and "New Chat" button when when the system is unable to load previous chat conversations.', () => {
    visitInvalidSessionAndVerifyErrorState();
  });

  it('C782430 - Verify that clicking the New Chat button redirects the user to the base URL (without any sessionId in URL).', () => {
    visitInvalidSessionAndVerifyErrorState();

    chatHistoryPage.clickNewChatButton();
    verifyNoSessionIdInUrl();
  });

  it('C782431 - Verify that "New Chat" action after invalid session fully purges invalid session state and allows successful message delivery in fresh sessions.', () => {
    visitInvalidSessionAndVerifyErrorState();

    chatHistoryPage.clickNewChatButton();
    verifyNoSessionIdInUrl();

    // typeInChatPrompt already retries until the visible input is ready.
    chatHistoryPage.interceptSendQuery();
    chatHistoryPage.typeInChatPrompt('Test Message');
    chatHistoryPage.clickSendButton();

    // A new valid sessionId in the URL proves the fresh session was created —
    // no need to wait for the full LLM response.
    cy.location('search', { timeout: 30000 }).should((search: string) => {
      const params = new URLSearchParams(search);
      const generatedSessionId = params.get('sessionId');

      expect(generatedSessionId, 'newly generated sessionId').to.be.a('string').and.not.be.empty;
      expect(generatedSessionId).to.not.eq(invalidSessionId);
    });

    cy.contains(errorHeading).should('not.exist');
  });
});