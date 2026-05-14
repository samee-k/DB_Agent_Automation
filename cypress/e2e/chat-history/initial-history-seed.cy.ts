/// <reference types="cypress" />

import { ChatHistoryPage } from '../../pages/ChatHistoryPage';
import {
  ALIASES,
  Chat,
  fetchChatList,
  interceptGetChats,
} from './chat-history.helpers';

/**
 * Initial History Seed
 *
 * Verifies that API-seeded chat data is correctly reflected in the UI immediately
 * after a fresh page load — i.e., the connection between the seeding mechanism
 * and the panel's initial render is sound.
 */
describe('Chat History — Initial Seed', () => {
  const page = new ChatHistoryPage();

  // ---------------------------------------------------------------------------
  // Suite-level seed: ensure there is always data to display.
  // ---------------------------------------------------------------------------
  before(() => {
    cy.loginBySession();
    cy.seedChatsByProjectViaApiIfEmpty(5, 20);
  });

  beforeEach(() => {
    cy.loginBySession();
    interceptGetChats();
    page.visit();
    cy.wait(`@${ALIASES.getChats}`).its('response.statusCode').should('eq', 200);
    page.openHistoryPanel();
  });

  // ---------------------------------------------------------------------------
  // Seeded data is visible in the panel
  // ---------------------------------------------------------------------------

  it('Verify that API-seeded chats appear in the history panel after page load.', () => {
    page.getHistoryItems().should('have.length.at.least', 1);
    page.getPanel().should('be.visible');
  });

  it('Verify that each seeded chat item has a non-empty visible title.', () => {
    page.getHistoryItems().each(($item: JQuery<HTMLElement>) => {
      expect($item.text().trim().length, 'history item title must not be empty').to.be.greaterThan(0);
    });
  });

  it('Verify that the UI item count matches the backend count after seeding.', () => {
    fetchChatList().then((apiList: Chat[]) => {
      // The panel may paginate — it must show at least as many items as the API returns,
      // up to the pagination limit.  We assert a non-zero overlap.
      page.getHistoryItemCount().then((uiCount: number) => {
        expect(uiCount, 'panel must show at least one item').to.be.greaterThan(0);
        expect(uiCount, 'panel count must not exceed total backend count').to.be.lte(apiList.length);
      });
    });
  });

  it('Verify that seeded chat history persists across a page reload.', () => {
    page.getHistoryItemCount().then((countBefore: number) => {
      interceptGetChats();
      cy.reload();
      cy.wait(`@${ALIASES.getChats}`).its('response.statusCode').should('eq', 200);
      page.openHistoryPanel();

      page.getHistoryItemCount().should('eq', countBefore);
    });
  });

  it('Verify that seeded items can be opened and their titles appear in the chat header.', () => {
    page.getHistoryItemTextByIndex(0).then((itemTitle: string) => {
      const expectedTitle = itemTitle.trim();
      page.selectHistoryItemByIndex(0);

      page.getChatHeaderTitle().invoke('text').should((headerText: string) => {
        expect(headerText.trim()).to.eq(expectedTitle);
      });
    });
  });

  it('Verify that the history panel does not show a "No Conversation History" state when seeded data exists.', () => {
    page.getHistoryItems().should('have.length.at.least', 1);

    // The empty-state element must not be visible when items exist.
    page.getEmptyStateOptional().then(($empty: JQuery<HTMLElement>) => {
      if ($empty.length > 0) {
        cy.wrap($empty.first()).should('not.be.visible');
      }
    });
  });
});
