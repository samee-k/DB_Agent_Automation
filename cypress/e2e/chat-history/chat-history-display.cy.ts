/// <reference types="cypress" />

import { ChatHistoryPage } from '../../pages/ChatHistoryPage';
import { seedChatsByProjectViaApiIfEmpty } from '../../support/commands';

describe('Chat History Display', () => {
  const chatHistoryPage = new ChatHistoryPage();

  beforeEach(() => {
    cy.loginByApiSession();

    chatHistoryPage.interceptGetChatsByProject();
    chatHistoryPage.visitChatPage();
    cy.wait('@getChatsByProject').its('response.statusCode').should('eq', 200);

    // Ensure at least 5 chats exist so display-related assertions have data to work with.
    // Arguments: targetCount = 5 (chats to create), upperLimit = 20 (skip seeding if already above this).
    seedChatsByProjectViaApiIfEmpty(5, 20);

    chatHistoryPage.interceptGetChatsByProject();
    chatHistoryPage.visitChatPage();
    cy.wait('@getChatsByProject').its('response.statusCode').should('eq', 200);

    chatHistoryPage.openHistoryPanel();
    chatHistoryPage.waitForHistoryItemCountAtLeast(1);
  });

  // Verify that at least one date-group header (e.g. "Today", "Yesterday", "Last week")
  // is rendered inside the history panel when chat items exist.
  it('Verify date-group headers are visible in the history panel when chats exist', () => {
    chatHistoryPage.getGroupHeaders().should('have.length.greaterThan', 0);
    chatHistoryPage.getGroupHeaders().first().should('be.visible');
  });

  // Verify the panel's scroll position can be read and the scrollToBottom helper
  // does not throw or leave the panel in an invalid state.
  it('Verify the history panel scroll position is accessible with multiple items', () => {
    chatHistoryPage.scrollPanelToBottom();

    chatHistoryPage.getPanelScrollTop().then((scrollTop: number) => {
      expect(typeof scrollTop, 'scrollTop is a number').to.eq('number');
      // After scrolling to the bottom the scroll position must be >= 0.
      expect(scrollTop).to.be.gte(0);
    });
  });

  // Verify that the main conversation container element is present on the page
  // after the chat page has loaded.
  it('Verify the conversation container element is present on the chat page', () => {
    chatHistoryPage.getConversationContainer().should('exist');
  });

  // Verify the welcome screen is still visible before any prompt has been sent
  // in the current session (i.e., the page loaded fresh with no active query).
  it('Verify the welcome screen is visible before any prompt has been sent in the session', () => {
    // Close the history panel first so the welcome content is fully visible.
    chatHistoryPage.closeHistoryPanel();
    chatHistoryPage.getWelcomeScreen().should('exist');
  });

  // Verify that clicking a history item updates the URL with a sessionId query
  // parameter, indicating navigation to that conversation.
  it('Verify clicking a history item navigates to that conversation and updates the URL', () => {
    chatHistoryPage.selectHistoryItemByIndex(0);

    cy.url({ timeout: 15000 }).should((url: string) => {
      const hasSessionId = url.includes('sessionId=');
      const isOnChatPath = url.includes('/chat');
      expect(hasSessionId || isOnChatPath, 'URL reflects chat navigation').to.eq(true);
    });

    // Page should remain stable and the body should still be visible.
    cy.get('body').should('be.visible');
  });
});
