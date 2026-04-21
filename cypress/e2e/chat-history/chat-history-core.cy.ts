/// <reference types="cypress" />

import { ChatHistoryPage } from '../../pages/ChatHistoryPage';
import { clearChatsByProjectViaApi } from '../../support/commands';

describe('Chat History - Core', () => {
  const chatHistoryPage = new ChatHistoryPage();

  beforeEach(() => {
    cy.loginByApiSession();

    chatHistoryPage.interceptGetChatsByProject();
    chatHistoryPage.visitChatPage();
    cy.wait('@getChatsByProject').its('response.statusCode').should('eq', 200);
  });

  it('C700470 - Verify no previous chat history is shown for new user load.', () => {
    // 1. Clear backend data via API
    clearChatsByProjectViaApi();  
    
    // 2. Reload to ensure the UI fetches the fresh empty state
    chatHistoryPage.interceptGetChatsByProject();
    cy.reload();
    cy.wait('@getChatsByProject').its('response.statusCode').should('eq', 200);

    chatHistoryPage.openHistoryPanel();

    // 3. Assertions for empty state
    chatHistoryPage.getHistoryItemCount().should('eq', 0);
    chatHistoryPage.getEmptyState()
      .should('be.visible')
      .and('contain.text', 'No Conversation History');
  });

  it('C698146 - Verify search returns "No Conversation History" initially when no conversation has been started.', () => {
    // This assumes we are continuing from an empty state
    clearChatsByProjectViaApi();
    chatHistoryPage.interceptGetChatsByProject();
    chatHistoryPage.interceptSearchByProject();
    cy.reload();
    cy.wait('@getChatsByProject').its('response.statusCode').should('eq', 200);
    
    chatHistoryPage.openHistoryPanel();
    
    // Type in search even though it's empty
    chatHistoryPage.typeInSearch('SearchTest');
    cy.wait('@searchChatsByProject').its('response.statusCode').should('eq', 200);

    // UI should still show the empty state message
    chatHistoryPage.getHistoryItemCount().should('eq', 0);
    chatHistoryPage.getEmptyState()
      .should('be.visible')
      .and('contain.text', 'No Conversation History');
  });
});