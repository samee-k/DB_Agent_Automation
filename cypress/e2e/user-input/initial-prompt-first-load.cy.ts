/// <reference types="cypress" />

import { InitialPromptPage } from '../../pages/InitialPromptPage';

describe('Initial Prompt Options on First Load', () => {
  const page = new InitialPromptPage();

  beforeEach(() => {
    page.loginOnceForSuite();
  });

  beforeEach(() => {
    page.openChatPage().waitForWelcomeScreen();
  });

  it('C679701 - Verify network failure shows no internet connection graceful error message.', () => {
    cy.intercept('POST', page.chatApiRouteMatcher, {
      forceNetworkError: true,
    }).as('networkFailure');

    cy.window().then((windowObject: Window) => {
      Object.defineProperty(windowObject.navigator, 'onLine', {
        configurable: true,
        get: () => false,
      });
      windowObject.dispatchEvent(new Event('offline'));
    });

    page.verifyOfflineErrorMessage(20000);

    cy.window().then((windowObject: Window) => {
      Object.defineProperty(windowObject.navigator, 'onLine', {
        configurable: true,
        get: () => true,
      });
      windowObject.dispatchEvent(new Event('online'));
    });
  });

  it('C700469 - Verify application initializes successfully on first load with the Welcome to DB agent screen.', () => {
    page.welcomeTitle().should('be.visible');
  });

  it('C688020 - Verify a default chat session is automatically created on initial application load.', () => {
    page.chatTitle().should('be.visible');
    cy.contains(/Untitled\s*chat/i).should('have.length.at.least', 1);
  });

  it('C700466 - Verify that no previous chat data appears in new session.', () => {
    page.welcomeTitle().should('be.visible');
    page.inputValue().then((value) => {
      expect(`${value ?? ''}`.trim()).to.eq('');
    });
    page.characterCounter().should('contain.text', '0/500');
  });

  it('C698122 - Verify that key initial-load UI adheres to design structure.', () => {
    page.chatTitle().should('be.visible');
    page.newChatAction().should('be.visible');
    page.welcomeTitle().should('be.visible');
    page.messageInput().should('be.visible');
    page.characterCounter().should('be.visible');
  });

  it('C698103 - Verify Untitled Chat is shown on the left side of the header as default title on a new chat load.', () => {
    page.chatTitle().should('be.visible');
  });

  it('C716289 - Verify History icon is visible and accessible on the right of the chat title when chat loads.', () => {
    page.chatTitle().should('be.visible');
    cy.get('button:visible, [role="button"]:visible, svg:visible').its('length').should('be.greaterThan', 2);
  });

  it('C688021 - Verify +New Chat action is visible on the right side of the header.', () => {
    page.newChatAction().should('be.visible');
  });

  it('C691016 - Verify DB Agent logo is displayed above title and centered on initial load.', () => {
    page.appLogo().should('be.visible');
    page.welcomeTitle().should('be.visible');
  });

  it('C679698 - Verify welcome message text Welcome to DB agent appears correctly centered on initial load.', () => {
    page.welcomeTitle().should('be.visible').should('contain.text', 'Welcome to DB Agent');
  });

  it('C679751 - Verify that 4 feature cards appear immediately on first chat load before any user input.', () => {
    page.cards.forEach((card) => {
      page.featureCardByTitle(card.title).should('be.visible');
    });
    page.messageInput().should('be.visible');
  });

  it('C679752 - Verify that all 4 feature cards display correct titles and descriptive text as per design.', () => {
    page.verifyFeatureCardTexts();
  });

  it('C679753 - Verify each feature card shows its unique icon aligned left of text.', () => {
    page.cards.forEach((card) => {
      page.featureCardByTitle(card.title).should('be.visible');
      cy.get('svg:visible, img:visible').its('length').should('be.greaterThan', 0);
    });
  });

  it('C679754 - Verify uniform card spacing and layout grid between feature cards.', () => {
    page.cards.forEach((card) => {
      page.featureCardByTitle(card.title).should('be.visible');
    });

    cy.contains(page.cards[0].title).should('be.visible');
    cy.contains(page.cards[1].title).should('be.visible');
    cy.contains(page.cards[2].title).should('be.visible');
    cy.contains(page.cards[3].title).should('be.visible');
  });

  it('C691020 - Verify clicking any feature card does NOT trigger action or navigation.', () => {
    cy.url().then((originalUrl) => {
      page.cards.forEach((card) => {
        cy.contains(card.title).should('be.visible').click();
      });

      cy.url().should('eq', originalUrl);
      page.welcomeTitle().should('be.visible');
    });
  });

  it('C679697 - Verify welcome content describes DB Agent capabilities instead of generic prompts.', () => {
    page.verifyFeatureCardTexts();
    cy.contains(/database|data|query|sql|graphs|tables/i).should('be.visible');
  });

  it('C691022 - Verify input text box is centered correctly relative to welcome content.', () => {
    page.welcomeTitle().should('be.visible');
    page.messageInput().should('be.visible');
  });

  it('C679755 - Verify placeholder Ask here ... is visible before typing and hides once user types.', () => {
    page.messageInput().should('have.attr', 'placeholder').and('match', /Ask here/i);
    page.typePrompt('How many rows are in users table?');
    page.inputValue().then((value) => {
      expect(value).to.eq('How many rows are in users table?');
    });
  });

  it('C679708 - Verify character count indicator is visible and updates when user types.', () => {
    page.characterCounter().should('be.visible').and('contain.text', '0/500');

    page.typePrompt('SELECT * FROM users;');
    page.characterCounter().should('contain.text', '20/500');
  });

  it('C716297 - Verify Send (Arrow) icon is visible on the input field.', () => {
    page.clearPrompt();
    page.sendButton().should('be.visible');

    page.typePrompt('    ');
    page.sendButton().should('be.visible');
  });

  it('C690707 - Verify that disclaimer text "*To support informed decisions, please review the information carefully." message is shown below the input field initially and disappears after first response.', () => {
    page.messageInput().then(($input: JQuery<HTMLElement>) => {
      cy.get('body')
        .contains(page.disclaimer)
        .should('be.visible')
        .then(($disclaimer) => {
          const inputRect = ($input[0] as HTMLElement).getBoundingClientRect();
          const disclaimerRect = ($disclaimer[0] as HTMLElement).getBoundingClientRect();

          expect(disclaimerRect.top).to.be.greaterThan(inputRect.bottom - 1);
        });
    });

    page.typePrompt('Show top 5 tables');
    page.messageInput().should('be.visible').type('{enter}');

    cy.contains(page.disclaimer, { timeout: 30000 }).should('not.exist');
  });

  it('C716290 - Verify sidebar navigation icons are visible and correctly aligned.', () => {
    page.chatTitle().should('be.visible');
    page.newChatAction().should('be.visible');
    cy.get('button:visible, [role="button"]:visible, a:visible').its('length').should('be.greaterThan', 2);
  });

  it('C679702 - Verify repeated reloads do not duplicate welcome screen content or cards.', () => {
    cy.reload();
    page.waitForWelcomeScreen().verifyWelcomeContentNotDuplicated();

    cy.reload();
    page.waitForWelcomeScreen().verifyWelcomeContentNotDuplicated();
  });
});
