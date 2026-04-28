/// <reference types="cypress" />

import { ChatHistoryPage } from '../../pages/ChatHistoryPage';

describe('Chat History Initial Seeder', () => {
  const chatHistoryPage = new ChatHistoryPage();

  beforeEach(() => {
    cy.clearCookies();
    cy.clearLocalStorage();
    cy.visit('/');
    cy.clearAllSessionStorage();

    cy.loginByApiSession();

    chatHistoryPage.interceptGetChatsByProject();
    chatHistoryPage.visitChatPage();
    cy.wait('@getChatsByProject').its('response.statusCode').should('eq', 200);
    chatHistoryPage.openHistoryPanel();
  });

  it('Checks history and seeds 10 only when empty', () => {
    cy.seedChatsByProjectViaApiIfEmpty(10, 20);

    chatHistoryPage.interceptGetChatsByProject();
    chatHistoryPage.visitChatPage();
    cy.wait('@getChatsByProject').its('response.statusCode').should('eq', 200);
    chatHistoryPage.openHistoryPanel();
    chatHistoryPage.waitForHistoryItemCountAtLeast(1);

    chatHistoryPage.getHistoryItemCount().then((count: number) => {
      cy.log(`Final history count: ${count}`);
      expect(count).to.be.greaterThan(0);
    });
  });
});
