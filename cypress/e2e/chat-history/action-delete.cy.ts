/// <reference types="cypress" />

import { ChatHistoryPage } from '../../support/pages/ChatHistoryPage';
import {
  ALIASES,
  interceptDeleteChat,
  interceptGetChats,
  seedAndVisit,
} from '../../support/helpers/chat-history.helpers';

describe('Chat History — Action (Delete)', () => {
  const page = new ChatHistoryPage();

  // TODO(QA-BACKEND): Replace API seeding with deterministic cleanup endpoint when available.
  beforeEach(() => {
    cy.loginBySession();
    seedAndVisit(page);
  });

  it('C698115 - Verify that the user can delete a chat history item.', () => {
    page.getHistoryItems().its('length').then((initialCount: number) => {
      page.openHistoryMenuByIndex(0);
      page.clickDeleteAction();
      page.confirmDelete();
      cy.wait(`@${ALIASES.deleteChat}`).its('response.statusCode').should('eq', 200);

      page.getHistoryItems().its('length').should('be.lessThan', initialCount);
      page.waitForPanelVisible();
    });
  });

  it('C698113 - Verify that the Delete flow supports both confirm and cancel actions.', () => {
    page.getHistoryItems().its('length').then((initialCount: number) => {
      // Cancel — item count must remain unchanged.
      page.openHistoryMenuByIndex(0);
      page.clickDeleteAction();
      page.cancelDelete();
      page.getHistoryItems().its('length').should('eq', initialCount);

      // Confirm — item count must decrease.
      page.openHistoryMenuByIndex(0);
      page.clickDeleteAction();
      page.confirmDelete();
      cy.wait(`@${ALIASES.deleteChat}`).its('response.statusCode').should('eq', 200);
      page.getHistoryItems().its('length').should('be.lessThan', initialCount);
    });
  });

  it('C698116 - Verify that cancelling Delete discards the action and retains the chat.', () => {
    page.getHistoryItems().its('length').then((initialCount: number) => {
      page.openHistoryMenuByIndex(0);
      page.clickDeleteAction();
      page.cancelDelete();

      page.getHistoryItems().its('length').should('eq', initialCount);
      page.waitForPanelVisible();
    });
  });

  it('C698117 - Verify that confirming Delete removes the item and updates the history panel.', () => {
    page.getHistoryItems().its('length').then((initialCount: number) => {
      page.openHistoryMenuByIndex(0);
      page.clickDeleteAction();
      page.confirmDelete();
      cy.wait(`@${ALIASES.deleteChat}`).its('response.statusCode').should('eq', 200);

      page.getHistoryItems().its('length').should('be.lessThan', initialCount);
      page.waitForPanelVisible();
    });
  });

  it('C698140 - Verify deleting the active chat leaves no item selected and keeps the panel visible.', () => {
    page.selectHistoryItemByIndex(0);
    // App uses in-place navigation — URL stays at the base /chat path.
    cy.location('pathname').should('include', '/chat');

    page.openHistoryPanel();
    page.openHistoryMenuByIndex(0);
    page.clickDeleteAction();
    page.confirmDelete();
    cy.wait(`@${ALIASES.deleteChat}`).its('response.statusCode').should('eq', 200);

    page.waitForPanelVisible();
    page.getSelectedItemsOptional().then(($selected) => {
      expect($selected.length).to.eq(0);
    });
    cy.location('pathname').should('include', '/chat');
  });

  it('C775313 - Verify deleting the last chat shows the "No Conversation History" empty state.', () => {
    const initialChat = {
      id: 999001,
      session: 'seed-session',
      title: 'Seed chat',
      createdAt: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    let chatList = [initialChat];

    interceptDeleteChat(() => {
      chatList = [];
    });

    interceptGetChats(() => ({ data: chatList }));

    page.visit();
    cy.wait(`@${ALIASES.getChats}`, { timeout: 30000 }).its('response.statusCode').should('eq', 200);

    page.openHistoryPanel();
    page.getHistoryItems().should('have.length', 1);

    page.openHistoryMenuByIndex(0);
    page.clickDeleteAction();

    page.confirmDelete();
    cy.wait(`@${ALIASES.deleteChat}`).its('response.statusCode').should('eq', 200);

    page.getPanel().should('be.visible');
    page.getEmptyState()
      .should('be.visible')
      .and('contain.text', 'No Conversation History');
    page.getHistoryItemsOptional().its('length').should('eq', 0);
  });
});