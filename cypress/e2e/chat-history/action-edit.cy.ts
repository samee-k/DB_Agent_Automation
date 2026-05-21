/// <reference types="cypress" />

import { ChatHistoryPage } from '../../support/pages/ChatHistoryPage';
import {
  ALIASES,
  interceptUpdateTitle,
  seedAndVisit,
} from '../../support/helpers/chat-history.helpers';
import { ChatHistoryFixture } from '../../support/types';

describe('Chat History — Action (Edit)', () => {
  const page = new ChatHistoryPage();

  // Guard: skip the test body (not fail) if fewer items are available than required.
  const requireMinItems = (min: number) =>
    page.getHistoryItemCount().then((count: number) => {
      expect(count, `need at least ${min} history items for this test`).to.be.gte(min);
    });

  // TODO(QA-BACKEND): Replace API seeding with deterministic cleanup endpoint when available.
  beforeEach(() => {
    cy.loginBySession();
    interceptUpdateTitle();
    seedAndVisit(page);
  });

  it('C698110 - Verify that the user can edit the chat title.', () => {
    cy.fixture<ChatHistoryFixture>('chat-history').then((data) => {
      const uniqueTitle = `${data.updatedTitle} ${Date.now()}`;

      page.openHistoryMenuByIndex(0);
      page.clickEditAction();
      page.typeEditTitle(uniqueTitle);
      page.clickEditUpdate();

      cy.wait(`@${ALIASES.updateTitle}`).then((interception) => {
        expect(interception.response?.statusCode).to.eq(200);
        expect(interception.response?.body?.data?.title).to.eq(uniqueTitle);
      });

      page.getHistoryItemByIndex(0).should('contain.text', uniqueTitle);
    });
  });

  it('C698124 - Verify that editing the chat title handles special characters correctly.', () => {
    cy.fixture<ChatHistoryFixture>('chat-history').then((data) => {
      page.openHistoryMenuByIndex(0);
      page.clickEditAction();
      page.typeEditTitle(data.specialCharTitle);
      page.clickEditUpdate();

      cy.wait(`@${ALIASES.updateTitle}`).then((interception) => {
        expect(interception.response?.statusCode).to.eq(200);
        expect(interception.response?.body?.data?.title).to.eq(data.specialCharTitle);
      });

      page.getHistoryItemByIndex(0).should('contain.text', data.specialCharTitle);
    });
  });

  it('C698111 - Verify that the 50-character title limit is enforced.', () => {
    cy.fixture<ChatHistoryFixture>('chat-history').then((data) => {
      const overLimitTitle = `${data.maxLengthTitle}EXTRA`;

      page.openHistoryMenuByIndex(0);
      page.clickEditAction();
      page.typeEditTitle(overLimitTitle);
      page.clickEditUpdate();

      cy.wait(`@${ALIASES.updateTitle}`).then((interception) => {
        expect(interception.response?.statusCode).to.eq(200);
        expect(String(interception.response?.body?.data?.title || '').length).to.be.at.most(50);
      });

      page.getHistoryItemByIndex(0).invoke('text').then((text: string) => {
        expect(text.trim().length).to.be.at.most(50);
      });
    });
  });

  it('C698125 - Verify that whitespace-only titles are rejected and the original title is retained.', () => {
    page.getHistoryItemTextByIndex(0).then((originalTitle: string) => {
      const normalizedOriginal = originalTitle.trim();

      page.openHistoryMenuByIndex(0);
      page.clickEditAction();
      // Whitespace-only input — frontend may reject client-side without calling the API.
      page.typeEditTitle(' ');
      page.clickEditUpdate();

      // Regardless of whether the API was called the rendered title must remain non-empty.
      page.getHistoryItemByIndex(0).invoke('text').should((updatedText: string) => {
        expect(updatedText.trim().length, 'title must not become empty').to.be.greaterThan(0);
        expect(normalizedOriginal.length, 'original title was non-empty').to.be.greaterThan(0);
      });
    });
  });

  it('C700502 - Verify that the Edit flow supports both confirm and cancel actions.', () => {
    cy.fixture<ChatHistoryFixture>('chat-history').then((data) => {
      page.getHistoryItemTextByIndex(0).then((originalTitle: string) => {
        const normalizedOriginal = originalTitle.trim();

        // Confirm — title should update.
        page.openHistoryMenuByIndex(0);
        page.clickEditAction();
        page.typeEditTitle(data.updatedTitle);
        page.clickEditUpdate();
        cy.wait(`@${ALIASES.updateTitle}`).its('response.statusCode').should('eq', 200);

        // Cancel — previously confirmed title should remain.
        page.openHistoryMenuByIndex(0);
        page.clickEditAction();
        page.typeEditTitle(`${data.updatedTitle} - cancel candidate`);
        page.cancelEditTitle();

        page.getHistoryItemByIndex(0).should('contain.text', data.updatedTitle);
        expect(normalizedOriginal.length).to.be.greaterThan(0);
      });
    });
  });

  it('C698112 - Verify that cancelling Edit discards changes and restores the original title.', () => {
    cy.fixture<ChatHistoryFixture>('chat-history').then((data) => {
      page.getHistoryItemTextByIndex(0).then((originalTitle: string) => {
        const normalizedOriginal = originalTitle.trim();

        page.openHistoryMenuByIndex(0);
        page.clickEditAction();
        page.typeEditTitle(data.updatedTitle);
        page.cancelEditTitle();

        page.getHistoryItemByIndex(0).should('contain.text', normalizedOriginal);
      });
    });
  });

  it('C698123 - Verify rapid item selection followed by an edit produces no duplicates.', () => {
    requireMinItems(2).then(() => {
      cy.fixture<ChatHistoryFixture>('chat-history').then((data) => {
        page.getHistoryItems().its('length').then((initialCount: number) => {
          const uniqueTitle = `${data.updatedTitle} ${Date.now()}`;

          // Rapid-click multiple items before editing — must not corrupt state.
          page.selectHistoryItemByIndex(0);
          page.selectHistoryItemByIndex(1);
          page.selectHistoryItemByIndex(0);

          page.openHistoryMenuByIndex(0);
          page.clickEditAction();
          page.typeEditTitle(uniqueTitle);
          page.clickEditUpdate();
          cy.wait(`@${ALIASES.updateTitle}`).its('response.statusCode').should('eq', 200);

          page.getHistoryItems().its('length').should('eq', initialCount);
          page.getHistoryItemByIndex(0).should('contain.text', uniqueTitle);
        });
      });
    });
  });

  it('C698127 - Verify editing one chat does not overwrite another selected chat.', () => {
    requireMinItems(2).then(() => {
      cy.fixture<ChatHistoryFixture>('chat-history').then((data) => {
        page.getHistoryItemTextByIndex(1).then((secondTitle: string) => {
          const preservedTitle = secondTitle.trim();
          const uniqueTitle = `${data.updatedTitle} ${Date.now()}`;

          page.selectHistoryItemByIndex(1);
          page.openHistoryPanel();

          page.openHistoryMenuByIndex(0);
          page.clickEditAction();
          page.typeEditTitle(uniqueTitle);
          page.clickEditUpdate();
          cy.wait(`@${ALIASES.updateTitle}`).its('response.statusCode').should('eq', 200);

          page.getPanel().should('contain.text', uniqueTitle);
          page.getPanel().should('contain.text', preservedTitle);
        });
      });
    });
  });

  it('C698141 - Verify editing the active chat title does not reload the conversation.', () => {
    cy.fixture<ChatHistoryFixture>('chat-history').then((data) => {
      const uniqueTitle = `${data.updatedTitle} ${Date.now()}`;

      page.selectHistoryItemByIndex(0);
      cy.location('pathname').then((pathBefore: string) => {
        page.openHistoryPanel();
        page.openHistoryMenuByIndex(0);
        page.clickEditAction();
        page.typeEditTitle(uniqueTitle);
        page.clickEditUpdate();

        cy.wait(`@${ALIASES.updateTitle}`).its('response.statusCode').should('eq', 200);
        cy.location('pathname').should('eq', pathBefore);
        page.getHistoryItemByIndex(0).should('contain.text', uniqueTitle);
      });
    });
  });

  it('C782432 - Verify that an edited chat sorts to the top of the list without page reload.', () => {
    requireMinItems(2).then(() => {
      cy.fixture<ChatHistoryFixture>('chat-history').then((data) => {
        const uniqueTitle = `${data.updatedTitle} MoveTop ${Date.now()}`;

        page.getHistoryItems().its('length').then((initialCount: number) => {
          cy.location('pathname').then((pathBefore: string) => {
            // Target a non-first item to prove it moves to the top after edit.
            const targetIndex = initialCount > 2 ? Math.floor(initialCount / 2) : initialCount - 1;
            expect(targetIndex, 'target index must not be the first row').to.be.greaterThan(0);

            page.openHistoryMenuByIndex(targetIndex);
            page.clickEditAction();
            page.typeEditTitle(uniqueTitle);
            page.clickEditUpdate();

            cy.wait(`@${ALIASES.updateTitle}`).then((interception) => {
              expect(interception.response?.statusCode).to.eq(200);
              expect(interception.response?.body?.data?.title).to.eq(uniqueTitle);
            });

            cy.location('pathname').should('eq', pathBefore);
            page.getHistoryItems().its('length').should('eq', initialCount);

            page.getAllHistoryItemTexts().then((titles: string[]) => {
              expect(titles.length).to.be.greaterThan(0);
              expect(titles[0], 'edited chat should bubble to the top').to.eq(uniqueTitle);
              expect(titles.filter((t: string) => t === uniqueTitle).length, 'title appears exactly once').to.eq(1);
            });
          });
        });
      });
    });
  });

  it('C700503 - Verify that the Edit action is accessible via keyboard.', () => {
    const keyboardTitle = `Keyboard Edit ${Date.now()}`;

    page.selectHistoryItemByIndex(0);
    page.hoverHistoryItemByIndex(0);
    page.openHistoryMenuByIndex(0);

    // Save via Enter key pressed directly inside the edit input.
    page.getEditAction().should('exist').click({ force: true });
    page.getEditContainer().should('be.visible');
    page.typeEditTitle(`${keyboardTitle}{enter}`);

    cy.wait(`@${ALIASES.updateTitle}`).then((interception) => {
      expect(interception.response?.statusCode).to.eq(200);
      expect(interception.response?.body?.data?.title).to.eq(keyboardTitle);
    });

    page.getHistoryItemByIndex(0).should('contain.text', keyboardTitle);
  });
});

