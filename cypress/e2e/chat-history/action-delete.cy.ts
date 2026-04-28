/// <reference types="cypress" />

import { ChatHistoryPage } from '../../pages/ChatHistoryPage';

describe('Action (Delete)', () => {
  const chatHistoryPage = new ChatHistoryPage();

  beforeEach(() => {
    // TODO(QA-BACKEND): Enable deterministic cleanup when backend endpoint is available.
    // cy.request('POST', '/api/test/cleanup');

    cy.loginByApiSession();

    chatHistoryPage.interceptGetChatsByProject();
    chatHistoryPage.interceptDeleteChat();
    chatHistoryPage.visitChatPage();
    cy.wait('@getChatsByProject').its('response.statusCode').should('eq', 200);

    cy.seedChatsByProjectViaApiIfEmpty(5, 20);
    chatHistoryPage.interceptGetChatsByProject();
    chatHistoryPage.visitChatPage();
    cy.wait('@getChatsByProject').its('response.statusCode').should('eq', 200);

    chatHistoryPage.openHistoryPanel();
    chatHistoryPage.waitForHistoryItemCountAtLeast(1);
  });

  it('C698115 - Verify that the user can delete a chat history item.', () => {
    chatHistoryPage.getHistoryItems().its('length').then((initialCount: number) => {
      chatHistoryPage.openHistoryMenuByIndex(0);
      chatHistoryPage.clickDeleteAction();
      chatHistoryPage.confirmDelete();
      cy.wait('@deleteChat').its('response.statusCode').should('eq', 200);

      chatHistoryPage.getHistoryItems().its('length').should('be.lessThan', initialCount);
      chatHistoryPage.getPanel().should('be.visible');
    });
  });

  it('C698113 - Verify that the Delete title flow allows confirm or cancel action.', () => {
    chatHistoryPage.getHistoryItems().its('length').then((initialCount: number) => {
      chatHistoryPage.openHistoryMenuByIndex(0);
      chatHistoryPage.clickDeleteAction();
      chatHistoryPage.cancelDelete();
      chatHistoryPage.getHistoryItems().its('length').should('eq', initialCount);

      chatHistoryPage.openHistoryMenuByIndex(0);
      chatHistoryPage.clickDeleteAction();
      chatHistoryPage.confirmDelete();
      cy.wait('@deleteChat').its('response.statusCode').should('eq', 200);
      chatHistoryPage.getHistoryItems().its('length').should('be.lessThan', initialCount);
    });
  });

  it('C698116 - Verify that the Cancel button in Delete discards deletion and retains the chat.', () => {
    chatHistoryPage.getHistoryItems().its('length').then((initialCount: number) => {
      chatHistoryPage.openHistoryMenuByIndex(0);
      chatHistoryPage.clickDeleteAction();
      chatHistoryPage.cancelDelete();

      chatHistoryPage.getHistoryItems().its('length').should('eq', initialCount);
      chatHistoryPage.getPanel().should('be.visible');
    });
  });

  it('C698117 - Verify that deleting a chat updates the history panel.', () => {
    chatHistoryPage.getHistoryItems().its('length').then((initialCount: number) => {
      chatHistoryPage.openHistoryMenuByIndex(0);
      chatHistoryPage.clickDeleteAction();
      chatHistoryPage.confirmDelete();
      cy.wait('@deleteChat').its('response.statusCode').should('eq', 200);

      chatHistoryPage.getHistoryItems().its('length').should('be.lessThan', initialCount);
      chatHistoryPage.getPanel().should('be.visible');
    });
  });

  it('C698140 - Verify deleting active chat redirects user to safe fallback state.', () => {
    // Select the first history item to make it the active chat
    chatHistoryPage.selectHistoryItemByIndex(0);
    // App uses in-place navigation — URL stays at the base /chat path (no per-chat URL segment)
    cy.location('pathname').should('include', '/chat');

    chatHistoryPage.openHistoryPanel();
    chatHistoryPage.openHistoryMenuByIndex(0);
    chatHistoryPage.clickDeleteAction();
    chatHistoryPage.confirmDelete();
    cy.wait('@deleteChat').its('response.statusCode').should('eq', 200);

    chatHistoryPage.getPanel().should('be.visible');
    // The active chat was deleted; no selected item should remain in the panel.
    chatHistoryPage.getSelectedItemsOptional().then(($selected) => {
      expect($selected.length).to.eq(0);
    });
    cy.location('pathname').should('include', '/chat');
  });


  it('C775313 - Verify deleting all existing history shows No Conversation History.', () => {
    // Clear all via API then seed exactly 1 item so the UI test only needs
    cy.clearChatsByProjectViaApi();
    cy.seedChatsByProjectViaApiIfEmpty(1, 5);

    chatHistoryPage.interceptDeleteChat();
    chatHistoryPage.visitChatPage();
    chatHistoryPage.openHistoryPanel();
    chatHistoryPage.waitForHistoryItemCountAtLeast(1);

    // Delete the last remaining item through the UI
    chatHistoryPage.openHistoryMenuByIndex(0);
    chatHistoryPage.clickDeleteAction();
    chatHistoryPage.confirmDelete();
    cy.wait('@deleteChat').its('response.statusCode').should('eq', 200);

    chatHistoryPage.getPanel().should('contain.text', 'No Conversation History');
    cy.get('[data-cy="chat-history-item"]').should('not.exist');
  });
  
});
