/// <reference types="cypress" />

import { ChatHistoryPage } from '../../pages/ChatHistoryPage';
import { seedChatsByProjectViaApiIfEmpty } from '../../support/commands';

describe('Action (Edit)', () => {
  const chatHistoryPage = new ChatHistoryPage();

  const ensureMinHistoryItems = (minimumCount: number): Cypress.Chainable<any> => {
    return chatHistoryPage.getHistoryItemCount().then((count: number) => {
      expect(count, `history items available for test (need at least ${minimumCount})`).to.be.gte(minimumCount);
    });
  };

  beforeEach(() => {
    // TODO(QA-BACKEND): Enable deterministic cleanup when backend endpoint is available.
    // cy.request('POST', '/api/test/cleanup');

    cy.loginByApiSession();

    chatHistoryPage.interceptGetChatsByProject();
    chatHistoryPage.interceptUpdateTitle();
    chatHistoryPage.visitChatPage();
    cy.wait('@getChatsByProject').its('response.statusCode').should('eq', 200);

    seedChatsByProjectViaApiIfEmpty(5, 20);
    chatHistoryPage.interceptGetChatsByProject();
    chatHistoryPage.visitChatPage();
    cy.wait('@getChatsByProject').its('response.statusCode').should('eq', 200);

    chatHistoryPage.openHistoryPanel();
    chatHistoryPage.waitForHistoryItemCountAtLeast(1);
  });

  it('C698110 - Verify that the user can edit the chat title.', () => {
    cy.fixture('chatHistory').then((chatHistoryData: any) => {
      const uniqueTitle = `${chatHistoryData.updatedTitle} ${Date.now()}`;
      chatHistoryPage.openHistoryMenuByIndex(0);
      chatHistoryPage.clickEditAction();
      chatHistoryPage.updateTitle(uniqueTitle);

      cy.wait('@updateChatTitle').then((interception: any) => {
        expect(interception.response?.statusCode).to.eq(200);
        expect(interception.response?.body?.data?.title).to.eq(uniqueTitle);
      });

      chatHistoryPage.getHistoryItemByIndex(0).should('contain.text', uniqueTitle);
    });
  });

  it('C698124 - Verify that editing the chat title can handle special characters.', () => {
    cy.fixture('chatHistory').then((chatHistoryData: any) => {
      chatHistoryPage.openHistoryMenuByIndex(0);
      chatHistoryPage.clickEditAction();
      chatHistoryPage.updateTitle(chatHistoryData.specialCharTitle);

      cy.wait('@updateChatTitle').then((interception: any) => {
        expect(interception.response?.statusCode).to.eq(200);
        expect(interception.response?.body?.data?.title).to.eq(chatHistoryData.specialCharTitle);
      });

      chatHistoryPage.getHistoryItemByIndex(0).should('contain.text', chatHistoryData.specialCharTitle);
    });
  });

  it('C698111 - Verify that the character limit (50) is enforced when editing the title.', () => {
    cy.fixture('chatHistory').then((chatHistoryData: any) => {
      const overLimitTitle = `${chatHistoryData.maxLengthTitle}EXTRA`;
      chatHistoryPage.openHistoryMenuByIndex(0);
      chatHistoryPage.clickEditAction();
      chatHistoryPage.updateTitle(overLimitTitle);

      cy.wait('@updateChatTitle').then((interception: any) => {
        expect(interception.response?.statusCode).to.eq(200);
        const title = String(interception.response?.body?.data?.title || '');
        expect(title.length).to.be.at.most(50);
      });

      chatHistoryPage.getHistoryItemByIndex(0).invoke('text').then((text: string) => {
        expect(text.trim().length).to.be.at.most(50);
      });
    });
  });

  it('C698125 - Verify that empty titles are handled gracefully.', () => {
    chatHistoryPage.getHistoryItemTextByIndex(0).then((originalTitle: string) => {
      const normalizedOriginalTitle = originalTitle.trim();
      chatHistoryPage.openHistoryMenuByIndex(0);
      chatHistoryPage.clickEditAction();
      // Type whitespace-only — frontend may reject without calling API
      chatHistoryPage.updateTitle(' ');
      // Do NOT wait for @updateChatTitle — frontend may have client-side validation
      // Regardless of whether the API was called, the displayed title must remain non-empty
      chatHistoryPage.getHistoryItemByIndex(0).invoke('text').should((updatedText: string) => {
        expect(updatedText.trim().length, 'title must not be empty after whitespace-only save').to.be.greaterThan(0);
        expect(normalizedOriginalTitle.length, 'original title must be non-empty').to.be.greaterThan(0);
      });
    });
  });

  it('C700502 - Verify that the Edit title flow allows confirm or cancel action.', () => {
    cy.fixture('chatHistory').then((chatHistoryData: any) => {
      chatHistoryPage.getHistoryItemTextByIndex(0).then((originalTitle: string) => {
        const normalizedOriginalTitle = originalTitle.trim();
        chatHistoryPage.openHistoryMenuByIndex(0);
        chatHistoryPage.clickEditAction();
        chatHistoryPage.updateTitle(chatHistoryData.updatedTitle);
        cy.wait('@updateChatTitle').its('response.statusCode').should('eq', 200);

        chatHistoryPage.openHistoryMenuByIndex(0);
        chatHistoryPage.clickEditAction();
        chatHistoryPage.typeEditTitle(`${chatHistoryData.updatedTitle} - cancel candidate`);
        chatHistoryPage.cancelEditTitle();

        chatHistoryPage.getHistoryItemByIndex(0).should('contain.text', chatHistoryData.updatedTitle);
        expect(normalizedOriginalTitle.length).to.be.greaterThan(0);
      });
    });
  });

  it('C698112 - Verify that the Cancel button in Edit discards changes when editing a title.', () => {
    cy.fixture('chatHistory').then((chatHistoryData: any) => {
      chatHistoryPage.getHistoryItemTextByIndex(0).then((originalTitle: string) => {
        const normalizedOriginalTitle = originalTitle.trim();
        chatHistoryPage.openHistoryMenuByIndex(0);
        chatHistoryPage.clickEditAction();
        chatHistoryPage.typeEditTitle(chatHistoryData.updatedTitle);
        chatHistoryPage.cancelEditTitle();

        chatHistoryPage.getHistoryItemByIndex(0).should('contain.text', normalizedOriginalTitle);
      });
    });
  });

  it('C698123 - Verify rapid selection and edits are handled gracefully with no duplicate entries.', () => {
    return ensureMinHistoryItems(2).then(() => {
      cy.fixture('chatHistory').then((chatHistoryData: any) => {
        chatHistoryPage.getHistoryItems().its('length').then((initialCount: number) => {
          const uniqueTitle = `${chatHistoryData.updatedTitle} ${Date.now()}`;
          chatHistoryPage.selectHistoryItemByIndex(0);
          chatHistoryPage.selectHistoryItemByIndex(1);
          chatHistoryPage.selectHistoryItemByIndex(0);

          chatHistoryPage.openHistoryMenuByIndex(0);
          chatHistoryPage.clickEditAction();
          chatHistoryPage.updateTitle(uniqueTitle);
          cy.wait('@updateChatTitle').its('response.statusCode').should('eq', 200);

          chatHistoryPage.getHistoryItems().its('length').should('eq', initialCount);
          chatHistoryPage.getHistoryItemByIndex(0).should('contain.text', uniqueTitle);
        });
      });
    });
  });

   it('C698127 - Verify editing a chat while another is selected does not overwrite other chats.', () => {
    return ensureMinHistoryItems(2).then(() => {
      cy.fixture('chatHistory').then((chatHistoryData: any) => {
        chatHistoryPage.getHistoryItemTextByIndex(1).then((secondTitle: string) => {
          const preservedTitle = secondTitle.trim();
          const uniqueTitle = `${chatHistoryData.updatedTitle} ${Date.now()}`;
          chatHistoryPage.selectHistoryItemByIndex(1);
          chatHistoryPage.openHistoryPanel();

          chatHistoryPage.openHistoryMenuByIndex(0);
          chatHistoryPage.clickEditAction();
          chatHistoryPage.updateTitle(uniqueTitle);
          cy.wait('@updateChatTitle').its('response.statusCode').should('eq', 200);

          chatHistoryPage.getPanel().should('contain.text', uniqueTitle);
          chatHistoryPage.getPanel().should('contain.text', preservedTitle);
        });
      });
    });
  });

  it('C698141 - Verify editing active chat title updates without reloading conversation.', () => {
    cy.fixture('chatHistory').then((chatHistoryData: any) => {
      const uniqueTitle = `${chatHistoryData.updatedTitle} ${Date.now()}`;
      chatHistoryPage.selectHistoryItemByIndex(0);
      cy.location('pathname').then((pathBefore: string) => {
        chatHistoryPage.openHistoryPanel();
        chatHistoryPage.openHistoryMenuByIndex(0);
        chatHistoryPage.clickEditAction();
        chatHistoryPage.updateTitle(uniqueTitle);

        cy.wait('@updateChatTitle').its('response.statusCode').should('eq', 200);
        cy.location('pathname').should('eq', pathBefore);
        chatHistoryPage.getHistoryItemByIndex(0).should('contain.text', uniqueTitle);
      });
    });
  });

  it('C782432 - Verify that edited chat sorts to top of the list without refreshing the page.', () => {
    return ensureMinHistoryItems(2).then(() => {
      cy.fixture('chatHistory').then((chatHistoryData: any) => {
        const uniqueTitle = `${chatHistoryData.updatedTitle} MoveTop ${Date.now()}`;

        chatHistoryPage.getHistoryItems().its('length').then((initialCount: number) => {
          cy.location('pathname').then((pathBefore: string) => {
            // Edit a middle/end non-top item to validate it bubbles to the top in-place.
            const targetIndex = initialCount > 2 ? Math.floor(initialCount / 2) : initialCount - 1;
            expect(targetIndex, 'target index should never be the first row').to.be.greaterThan(0);

            chatHistoryPage.openHistoryMenuByIndex(targetIndex);
            chatHistoryPage.clickEditAction();
            chatHistoryPage.updateTitle(uniqueTitle);

            cy.wait('@updateChatTitle').then((interception: any) => {
              expect(interception.response?.statusCode).to.eq(200);
              expect(interception.response?.body?.data?.title).to.eq(uniqueTitle);
            });

            cy.location('pathname').should('eq', pathBefore);
            chatHistoryPage.getHistoryItems().its('length').should('eq', initialCount);

            chatHistoryPage.getAllHistoryItemTexts().then((titles: string[]) => {
              expect(titles.length, 'history list should not be empty').to.be.greaterThan(0);
              expect(titles[0], 'edited chat should be sorted to top').to.eq(uniqueTitle);
              const occurrences = titles.filter((title: string) => title === uniqueTitle).length;
              expect(occurrences, 'edited title should appear exactly once').to.eq(1);
            });
          });
        });
      });
    });
  });

  it('C700503 - Verify that Edit buttons are accessible via keyboard.', () => {
    chatHistoryPage.openHistoryPanel();

    const keyboardTitle = `Keyboard Edit ${Date.now()}`;

    // Row actions are hover-gated in this UI.
    chatHistoryPage.selectHistoryItemByIndex(0);
    chatHistoryPage.hoverHistoryItemByIndex(0);
    chatHistoryPage.openHistoryMenuByIndex(0);

    // Open Edit and save using keyboard Enter from the input field.
    chatHistoryPage.getEditAction().should('exist').click({ force: true });
    chatHistoryPage.getEditContainer().should('be.visible');
    chatHistoryPage.typeEditTitle(`${keyboardTitle}{enter}`);

    cy.wait('@updateChatTitle').then((interception: any) => {
      expect(interception.response?.statusCode).to.eq(200);
      expect(interception.response?.body?.data?.title).to.eq(keyboardTitle);
    });

    chatHistoryPage.getHistoryItemByIndex(0).should('contain.text', keyboardTitle);
  });
  
});
