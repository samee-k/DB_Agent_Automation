/// <reference types="cypress" />

import { ChatHistoryPage } from '../../pages/ChatHistoryPage';
import {
  ALIASES,
  interceptDeleteChat,
  interceptSearchChats,
  interceptUpdateTitle,
  seedAndVisit,
} from './chat-history.helpers';

describe('Chat History — Search', () => {
  const page = new ChatHistoryPage();

  // Returns the first word (2–8 chars) of the top history item's title — a safe search term.
  const getSearchableToken = (): Cypress.Chainable<string> =>
    page.getHistoryItemTextByIndex(0).then((title: string) => {
      const token = title.trim().split(/\s+/)[0] || title.trim();
      return token.slice(0, Math.max(2, Math.min(token.length, 8)));
    });

  // TODO(QA-BACKEND): Replace API seeding with deterministic cleanup endpoint when available.
  beforeEach(() => {
    cy.loginBySession();
    interceptSearchChats();
    interceptUpdateTitle();
    interceptDeleteChat();
    seedAndVisit(page);
  });

  // ---------------------------------------------------------------------------
  // Search box visibility
  // ---------------------------------------------------------------------------

  it('C698131 - Verify the search box is present and visible in the history panel.', () => {
    page.getSearchInput().should('be.visible');
    page.getPanel().should('be.visible');
  });

  // ---------------------------------------------------------------------------
  // Search result correctness
  // ---------------------------------------------------------------------------

  it('C698130 - Verify search returns matching results for valid input.', () => {
    getSearchableToken().then((searchTerm) => {
      page.typeInSearch(searchTerm);
      cy.wait(`@${ALIASES.searchChats}`).its('response.statusCode').should('eq', 200);

      page.getHistoryItemCount().should('be.greaterThan', 0);
      page.getPanel().should('be.visible');
    });
  });

  it('C698139 - Verify search results narrow as the user types more characters.', () => {
    getSearchableToken().then((searchTerm) => {
      const partial = searchTerm.slice(0, 2);

      page.typeInSearch(partial);
      cy.wait(`@${ALIASES.searchChats}`).its('response.statusCode').should('eq', 200);

      page.getHistoryItemCount().then((partialCount: number) => {
        page.typeInSearch(searchTerm);
        cy.wait(`@${ALIASES.searchChats}`).its('response.statusCode').should('eq', 200);

        page.getHistoryItemCount().should('be.at.most', partialCount);
      });
    });
  });

  it('C698147 - Verify search is case-insensitive.', () => {
    getSearchableToken().then((searchTerm) => {
      page.typeInSearch(searchTerm.toLowerCase());
      cy.wait(`@${ALIASES.searchChats}`).its('response.statusCode').should('eq', 200);

      page.getHistoryItemCount().then((lowerCount: number) => {
        page.typeInSearch(searchTerm.toUpperCase());
        cy.wait(`@${ALIASES.searchChats}`).its('response.statusCode').should('eq', 200);

        page.getHistoryItemCount().should('eq', lowerCount);
      });
    });
  });

  it('C698128 - Verify search trims leading and trailing whitespace.', () => {
    getSearchableToken().then((searchTerm) => {
      page.setSearchValueWithSpaces(searchTerm);
      cy.wait(`@${ALIASES.searchChats}`).its('response.statusCode').should('eq', 200);

      page.getHistoryItemCount().should('be.greaterThan', 0);
      page.getPanel().should('be.visible');
    });
  });

  // ---------------------------------------------------------------------------
  // Clear behaviour
  // ---------------------------------------------------------------------------

  it('C698129 - Verify the search clear button resets the input.', () => {
    getSearchableToken().then((searchTerm) => {
      page.typeInSearch(searchTerm);
      cy.wait(`@${ALIASES.searchChats}`).its('response.statusCode').should('eq', 200);

      page.clearSearch();
      page.getSearchInput().should('have.value', '');
      page.getHistoryItemCount().should('be.greaterThan', 0);
    });
  });

  it('C698144 - Verify clearing the search restores the full history list.', () => {
    getSearchableToken().then((searchTerm) => {
      page.getHistoryItemCount().then((initialCount: number) => {
        page.typeInSearch(searchTerm);
        cy.wait(`@${ALIASES.searchChats}`).its('response.statusCode').should('eq', 200);

        page.clearSearch();
        page.getHistoryItemCount().should('eq', initialCount);
      });
    });
  });

  it('C698150 - Verify the selected chat remains active after search is cleared.', () => {
    page.selectHistoryItemByIndex(0);
    page.getChatHeaderTitle().invoke('text').then((loadedTitle: string) => {
      const normalizedTitle = loadedTitle.trim();

      getSearchableToken().then((searchTerm) => {
        page.typeInSearch(searchTerm);
        cy.wait(`@${ALIASES.searchChats}`).its('response.statusCode').should('eq', 200);
        page.clearSearch();

        page.getHistoryItemCount().should('be.greaterThan', 0);
        page.getPanel().should('be.visible');

        page.getChatHeaderTitle().invoke('text').should((headerTitle: string) => {
          expect(headerTitle.trim()).to.eq(normalizedTitle);
        });
      });
    });
  });

  // ---------------------------------------------------------------------------
  // Edge cases
  // ---------------------------------------------------------------------------

  it('C698132 - Verify search handles special characters without crashing.', () => {
    page.typeInSearch('!@#$%^&*');
    cy.wait(`@${ALIASES.searchChats}`).its('response.statusCode').should('eq', 200);

    page.getPanel().should('be.visible');
    // Special characters may match nothing or everything — both are valid; no error is the contract.
    page.getHistoryItemCount().should('be.gte', 0);
  });

  it('C698133 - Verify an empty search query restores the full list.', () => {
    page.typeInSearch('');
    page.getSearchInput().should('have.value', '');
    // We seeded at least 1 item — the full list must come back.
    page.getHistoryItemCount().should('be.gte', 1);
  });

  // ---------------------------------------------------------------------------
  // Cross-action search integrity
  // ---------------------------------------------------------------------------

  it('C698134 - Verify renamed chats are discoverable by their new title.', () => {
    cy.fixture('chatHistory').then((data: any) => {
      page.openHistoryMenuByIndex(0);
      page.clickEditAction();
      page.typeEditTitle(data.updatedTitle);
      page.clickEditUpdate();
      cy.wait(`@${ALIASES.updateTitle}`).its('response.statusCode').should('eq', 200);

      page.typeInSearch(data.updatedTitle);
      cy.wait(`@${ALIASES.searchChats}`).its('response.statusCode').should('eq', 200);

      page.getHistoryItemByIndex(0).should('contain.text', data.updatedTitle);
    });
  });

  it('C698148 - Verify deleted chats are not returned in search results.', () => {
    page.getHistoryItemTextByIndex(0).then((deletedTitle: string) => {
      const normalizedTitle = deletedTitle.trim();

      page.openHistoryMenuByIndex(0);
      page.clickDeleteAction();
      page.confirmDelete();
      cy.wait(`@${ALIASES.deleteChat}`).its('response.statusCode').should('eq', 200);

      page.typeInSearch(normalizedTitle);
      cy.wait(`@${ALIASES.searchChats}`).its('response.statusCode').should('eq', 200);

      // getHistoryItems() throws on empty DOM — use panel text check instead.
      page.getPanel().should('not.contain.text', normalizedTitle);
    });
  });

  it('C775314 - Verify a no-match search shows the "No Conversation History" empty state.', () => {
    cy.fixture('chatHistory').then((data: any) => {
      page.typeInSearch(data.searchNoMatchTerm);
      cy.wait(`@${ALIASES.searchChats}`).its('response.statusCode').should('eq', 200);

      page.getEmptyState().should('contain.text', 'No Conversation History');
      page.getHistoryItemCount().should('eq', 0);
    });
  });
});
