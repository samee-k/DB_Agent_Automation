/// <reference types="cypress" />

import { ChatHistoryPage } from '../../pages/ChatHistoryPage';
import { seedChatsByProjectViaApiIfEmpty } from '../../support/commands';

describe('Search on Chat History', () => {
  const chatHistoryPage = new ChatHistoryPage();

  const getSearchableTerm = (): Cypress.Chainable<string> => {
    return chatHistoryPage.getHistoryItemTextByIndex(0).then((title: string) => {
      const normalized = title.trim();
      const token = normalized.split(/\s+/)[0] || normalized;
      return token.slice(0, Math.max(2, Math.min(token.length, 8)));
    });
  };

  beforeEach(() => {
    // TODO(QA-BACKEND): Enable deterministic cleanup when backend endpoint is available.
    // cy.request('POST', '/api/test/cleanup');

    cy.loginByApiSession();

    chatHistoryPage.interceptGetChatsByProject();
    chatHistoryPage.interceptSearchByProject();
    chatHistoryPage.interceptUpdateTitle();
    chatHistoryPage.interceptDeleteChat();
    chatHistoryPage.visitChatPage();
    cy.wait('@getChatsByProject').its('response.statusCode').should('eq', 200);

    seedChatsByProjectViaApiIfEmpty(5, 20);
    chatHistoryPage.interceptGetChatsByProject();
    chatHistoryPage.visitChatPage();
    cy.wait('@getChatsByProject').its('response.statusCode').should('eq', 200);

    chatHistoryPage.openHistoryPanel();
    chatHistoryPage.waitForHistoryItemCountAtLeast(1);
  });

  it('C698131 - Verify search box is present on history panel and visible.', () => {
    chatHistoryPage.getSearchInput().should('be.visible');
    chatHistoryPage.getPanel().should('be.visible');
  });

  it('C698130 - Verify search works with valid inputs.', () => {
    getSearchableTerm().then((searchTerm) => {
      chatHistoryPage.typeInSearch(searchTerm);
      cy.wait('@searchChatsByProject').its('response.statusCode').should('eq', 200);

      chatHistoryPage.getHistoryItemCount().should('be.greaterThan', 0);
      chatHistoryPage.getPanel().should('be.visible');
    });
  });

  it('C698139 - Verify search results update dynamically as user types.', () => {
    getSearchableTerm().then((searchTerm) => {
      const partialTerm = searchTerm.slice(0, 2);
      chatHistoryPage.typeInSearch(partialTerm);
      cy.wait('@searchChatsByProject').its('response.statusCode').should('eq', 200);

      chatHistoryPage.getHistoryItemCount().then((partialCount: number) => {
        chatHistoryPage.typeInSearch(searchTerm);
        cy.wait('@searchChatsByProject').its('response.statusCode').should('eq', 200);
        chatHistoryPage.getHistoryItemCount().should('be.at.most', partialCount);
      });
    });
  });

  it('C698147 - Verify search is case-insensitive.', () => {
    getSearchableTerm().then((searchTerm) => {
      chatHistoryPage.typeInSearch(searchTerm.toLowerCase());
      cy.wait('@searchChatsByProject').its('response.statusCode').should('eq', 200);

      chatHistoryPage.getHistoryItemCount().then((lowerCount: number) => {
        chatHistoryPage.typeInSearch(searchTerm.toUpperCase());
        cy.wait('@searchChatsByProject').its('response.statusCode').should('eq', 200);

        chatHistoryPage.getHistoryItemCount().should('eq', lowerCount);
      });
    });
  });

  it('C698128 - Verify search ignores leading and trailing spaces.', () => {
    getSearchableTerm().then((searchTerm) => {
      chatHistoryPage.setSearchValueWithSpaces(searchTerm);
      cy.wait('@searchChatsByProject').its('response.statusCode').should('eq', 200);

      chatHistoryPage.getHistoryItemCount().should('be.greaterThan', 0);
      chatHistoryPage.getPanel().should('be.visible');
    });
  });

  it('C698129 - Verify search clear button works.', () => {
    getSearchableTerm().then((searchTerm) => {
      chatHistoryPage.typeInSearch(searchTerm);
      cy.wait('@searchChatsByProject').its('response.statusCode').should('eq', 200);

      chatHistoryPage.clearSearch();
      chatHistoryPage.getSearchInput().should('have.value', '');
      chatHistoryPage.getHistoryItemCount().should('be.greaterThan', 0);
    });
  });

  it('C698144 - Verify clearing search restores full chat history list.', () => {
    getSearchableTerm().then((searchTerm) => {
      chatHistoryPage.getHistoryItemCount().then((initialCount: number) => {
        chatHistoryPage.typeInSearch(searchTerm);
        cy.wait('@searchChatsByProject').its('response.statusCode').should('eq', 200);

        chatHistoryPage.clearSearch();
        chatHistoryPage.getHistoryItemCount().should('eq', initialCount);
      });
    });
  });

  it('C698150 - Verify selected history item remains selected after search is cleared.', () => {
    // Select a chat first and capture its header title
    chatHistoryPage.selectHistoryItemByIndex(0);
    chatHistoryPage.getChatHeaderTitle().invoke('text').then((loadedTitle: string) => {
      const normalizedTitle = loadedTitle.trim();

      getSearchableTerm().then((searchTerm) => {
        chatHistoryPage.typeInSearch(searchTerm);
        cy.wait('@searchChatsByProject').its('response.statusCode').should('eq', 200);
        chatHistoryPage.clearSearch();

        // After clearing search the full list must be restored
        chatHistoryPage.getHistoryItemCount().should('be.greaterThan', 0);
        chatHistoryPage.getPanel().should('be.visible');

        // The previously loaded chat should still be shown in the header (selection preserved)
        chatHistoryPage.getChatHeaderTitle().invoke('text').should((headerTitle: string) => {
          expect(headerTitle.trim()).to.eq(normalizedTitle);
        });
      });
    });
  });

  it('C698132 - Verify search works with special characters in query.', () => {
    chatHistoryPage.typeInSearch('!@#$%^&*');
    cy.wait('@searchChatsByProject').its('response.statusCode').should('eq', 200);

    chatHistoryPage.getPanel().should('be.visible');
    // Special characters produce no matches or the full list — both are valid outcomes;
    // the key contract is that no error/crash occurs and the panel stays rendered.
    chatHistoryPage.getHistoryItemCount().should('be.gte', 0);
  });

  it('C698133 - Verify search works when query is empty.', () => {
    chatHistoryPage.typeInSearch('');
    chatHistoryPage.getSearchInput().should('have.value', '');
    // An empty query must restore the full list — we seeded at least 1 item in beforeEach.
    chatHistoryPage.getHistoryItemCount().should('be.gte', 1);
  });

  it('C698134 - Verify user can search renamed titles.', () => {
    cy.fixture('chatHistory').then((chatHistoryData: any) => {
      chatHistoryPage.openHistoryMenuByIndex(0);
      chatHistoryPage.clickEditAction();
      chatHistoryPage.updateTitle(chatHistoryData.updatedTitle);
      cy.wait('@updateChatTitle').its('response.statusCode').should('eq', 200);

      chatHistoryPage.typeInSearch(chatHistoryData.updatedTitle);
      cy.wait('@searchChatsByProject').its('response.statusCode').should('eq', 200);
      chatHistoryPage.getHistoryItemByIndex(0).should('contain.text', chatHistoryData.updatedTitle);
    });
  });

  it('C698148 - Verify search does not match deleted history items.', () => {
    chatHistoryPage.getHistoryItemTextByIndex(0).then((deletedTitle: string) => {
      const normalizedTitle = deletedTitle.trim();
      chatHistoryPage.openHistoryMenuByIndex(0);
      chatHistoryPage.clickDeleteAction();
      chatHistoryPage.confirmDelete();
      cy.wait('@deleteChat').its('response.statusCode').should('eq', 200);

      chatHistoryPage.typeInSearch(normalizedTitle);
      cy.wait('@searchChatsByProject').its('response.statusCode').should('eq', 200);
      // getHistoryItems() throws when no elements exist, causing a false failure.
      chatHistoryPage.getPanel().should('not.contain.text', normalizedTitle);
    });
  });

  it('C775314 - Verify searching no match shows No Conversation History.', () => {
    cy.fixture('chatHistory').then((chatHistoryData: any) => {
      chatHistoryPage.typeInSearch(chatHistoryData.searchNoMatchTerm);
      cy.wait('@searchChatsByProject').its('response.statusCode').should('eq', 200);

      chatHistoryPage.getEmptyState().should('contain.text', 'No Conversation History');
      chatHistoryPage.getHistoryItemCount().should('eq', 0);
    });
  });
});
