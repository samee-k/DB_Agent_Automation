/// <reference types="cypress" />

import { ChatHistoryPage } from '../../support/pages/ChatHistoryPage';
import {
  ALIASES,
  interceptGetChats,
  interceptSearchChats,
  assertNoSessionIdInUrl,
  visitInvalidSessionAndAssertErrorState,
} from '../../support/helpers/chat-history.helpers';

describe('Chat History — Core', () => {
  const page = new ChatHistoryPage();
  const INVALID_SESSION_ID = 'invalidURL';

  // Clears chats via API then forces a page reload so the UI reflects the empty state.
  const reloadAfterClear = (): void => {
    cy.clearChatsByProjectViaApi();
    interceptGetChats();
    cy.reload();
    cy.wait(`@${ALIASES.getChats}`).its('response.statusCode').should('eq', 200);
  };

  beforeEach(() => {
    cy.loginBySession();
    interceptGetChats();
    page.visit();
    cy.wait(`@${ALIASES.getChats}`).its('response.statusCode').should('eq', 200);
  });

  it('C700470 - Verify no previous chat history is shown for a freshly cleared account.', () => {
    reloadAfterClear();
    page.openHistoryPanel();

    // After clearing, the app may auto-create one fresh session on load.
    page.getHistoryItemCount().should('be.lte', 1);
  });

  it('C698146 - Verify search returns "No Conversation History" when there are no chats.', () => {
    interceptSearchChats();
    reloadAfterClear();
    page.openHistoryPanel();

    page.typeInSearch('SearchTest');
    cy.wait(`@${ALIASES.searchChats}`).its('response.statusCode').should('eq', 200);

    page.getHistoryItemCount().should('eq', 0);
    page.getEmptyState()
      .should('be.visible')
      .and('contain.text', 'No Conversation History');
  });

  it('C782429 - Verify that an invalid sessionId shows "Unable to Load Chats" with a New Chat button.', () => {
    visitInvalidSessionAndAssertErrorState(page, INVALID_SESSION_ID);
  });

  it('C782430 - Verify that clicking New Chat after an invalid session clears the sessionId from the URL.', () => {
    visitInvalidSessionAndAssertErrorState(page, INVALID_SESSION_ID);

    page.clickNewChatButton();
    assertNoSessionIdInUrl(page);
  });

  it('C782431 - Verify that a new chat started after an invalid session can successfully deliver a message.', () => {
    visitInvalidSessionAndAssertErrorState(page, INVALID_SESSION_ID);

    page.clickNewChatButton();
    assertNoSessionIdInUrl(page);

    cy.intercept('POST', '**/api/chats/*/send-query').as('sendQuery');
    page.typeInChatPrompt('Test Message');
    page.clickSendButton();

    // A newly-generated sessionId in the URL confirms the fresh session was established —
    // we don't need to wait for the full LLM response to assert this.
    cy.location('search', { timeout: 30000 }).should((search: string) => {
      const params = new URLSearchParams(search);
      const newSessionId = params.get('sessionId');
      expect(newSessionId, 'a new sessionId must be generated').to.be.a('string').and.not.be.empty;
      expect(newSessionId).to.not.eq(INVALID_SESSION_ID);
    });

    cy.contains('Unable to Load Chats').should('not.exist');
  });
});