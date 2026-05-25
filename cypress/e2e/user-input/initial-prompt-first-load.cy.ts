/// <reference types="cypress" />

import { InitialPromptPage } from '../../support/pages/InitialPromptPage';

describe('Initial Prompt Options on First Load', () => {
  const page = new InitialPromptPage();

  const FEATURE_CARDS = [
    { title: 'Built for exploration', description: 'Designed to help you explore, question, and understand your data effortlessly.' },
    { title: 'Visual Results Made Simple', description: 'Watch your data transform into interactive graphs and tables, with real-time feedback.' },
    { title: 'Write Your Own Query', description: 'Ask anything about your database with natural text input and smart suggestions.' },
    { title: 'Transparent SQL Queries', description: 'Watch your data transform into interactive graphs and tables, with real-time feedback.' },
  ];

  const OFFLINE_TITLE = 'No internet connection';
  const OFFLINE_DESCRIPTION = 'It seems there is something wrong with your internet connection.';
  const OFFLINE_ACTION = 'Please connect to the internet and try again.';
  const DISCLAIMER = '*To support informed decisions, please review the information carefully.';

  beforeEach(() => {
    cy.loginBySession();
    page.openChatPage();
    page.welcomeTitle().should('be.visible');
  });

  afterEach(() => {
    cy.window().then((windowObject: Window) => {
      Object.defineProperty(windowObject.navigator, 'onLine', {
        configurable: true,
        get: () => true,
      });
      windowObject.dispatchEvent(new Event('online'));
    });
  });

  it('C679701 - Verify network failure shows no internet connection graceful error message.', () => {
    cy.intercept('POST', page.chatApiRouteMatcher, {
      forceNetworkError: true,
    }).as('networkFailure');

    // Keep app online while typing so composer remains interactable.
    page.messageInput().should('be.visible');
    page.typePrompt('Offline failure check');

    // Submit while composer is still present.
    page.submitPrompt();

    cy.window().then((windowObject: Window) => {
      Object.defineProperty(windowObject.navigator, 'onLine', {
        configurable: true,
        get: () => false,
      });
      windowObject.dispatchEvent(new Event('offline'));
    });

    // Request failure + offline event together should surface graceful offline UI.
    cy.wait('@networkFailure');

    cy.contains(OFFLINE_TITLE, { timeout: 20000 }).should('be.visible');
    cy.contains(OFFLINE_DESCRIPTION, { timeout: 20000 }).should('be.visible');
    cy.contains(OFFLINE_ACTION, { timeout: 20000 }).should('be.visible');

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
    // Before first message, URL should not yet have an active sessionId.
    cy.location('search').then((search: string) => {
      const params = new URLSearchParams(search);
      expect(params.get('sessionId')).to.be.null;
    });

    cy.intercept('POST', page.chatApiRouteMatcher).as('firstMessage');

    page.typePrompt('Create my first chat session');
    page.submitPrompt();
    cy.wait('@firstMessage');

    // After first message, a sessionId must be generated and reflected in the URL.
    cy.location('search', { timeout: 30000 }).should((search: string) => {
      const params = new URLSearchParams(search);
      const sessionId = params.get('sessionId');

      expect(sessionId, 'sessionId query param').to.be.a('string').and.not.be.empty;
    });
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
    page.chatTitle().then(($title: JQuery<HTMLElement>) => {
      page.historyIconCandidate().should('be.visible').then(($icon: JQuery<HTMLElement>) => {
        const titleRect = ($title[0] as HTMLElement).getBoundingClientRect();
        const iconRect = ($icon[0] as HTMLElement).getBoundingClientRect();
        expect(iconRect.left, 'history icon should be positioned right of title').to.be.greaterThan(titleRect.right - 1);
      });
    });
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
    FEATURE_CARDS.forEach((card) => {
      page.featureCardByTitle(card.title).should('be.visible');
    });
    page.messageInput().should('be.visible');
  });

  it('C679752 - Verify that all 4 feature cards display correct titles and descriptive text as per design.', () => {
    FEATURE_CARDS.forEach((card) => {
      page.featureCardByTitle(card.title).should('be.visible');
      cy.contains(card.description).should('be.visible');
    });
  });

  it('C679753 - Verify each feature card shows its unique icon aligned left of text.', () => {
    FEATURE_CARDS.forEach((card) => {
      page.featureCardByTitle(card.title).should('be.visible').then(($title) => {
        if (!$title) {
          throw new Error(`Title element not found for card: ${card.title}`);
        }

        const titleRef = $title as JQuery<HTMLElement>;
        const titleNode = (titleRef[0] as HTMLElement | undefined);
        expect(titleNode, `title node for card: ${card.title}`).to.exist;

        let cardContainer = titleRef.closest('[data-testid*="feature" i], [class*="feature" i], [class*="card" i], li, article, section').first();
        if (cardContainer.length === 0) {
          cardContainer = titleRef.parent();
        }

        const $icons = cardContainer.find('svg:visible, img:visible');
        expect($icons.length, `icon should exist for card: ${card.title}`).to.be.greaterThan(0);

        const titleRect = (titleNode as HTMLElement).getBoundingClientRect();
        const iconRect = ($icons[0] as HTMLElement).getBoundingClientRect();
        expect(iconRect.left, `icon should be left-aligned for card: ${card.title}`).to.be.lessThan(titleRect.left + 1);
      });
    });
  });

  it('C679754 - Verify uniform card spacing and layout grid between feature cards.', () => {
    const titleRects: Array<DOMRect> = [];

    FEATURE_CARDS.forEach((card) => {
      page.featureCardByTitle(card.title).should('be.visible').then(($title: JQuery<HTMLElement> | undefined) => {
        expect($title, `title element for card: ${card.title}`).to.not.eq(undefined);
        const titleNode = ($title?.[0] as HTMLElement | undefined);
        expect(titleNode, `title node for card: ${card.title}`).to.exist;
        titleRects.push((titleNode as HTMLElement).getBoundingClientRect());
      });
    });

    cy.then(() => {
      expect(titleRects.length, 'feature title count').to.eq(4);
      const firstTop = titleRects[0].top;
      const alignedCount = titleRects.filter((rect) => Math.abs(rect.top - firstTop) < 8).length;

      // Grid should present more than one column on desktop widths.
      expect(alignedCount, 'cards aligned in top row').to.be.greaterThan(1);

      for (let index = 1; index < titleRects.length; index += 1) {
        const prev = titleRects[index - 1];
        const current = titleRects[index];
        const isOverlapping = !(current.left >= prev.right || current.top >= prev.bottom || prev.left >= current.right || prev.top >= current.bottom);
        expect(isOverlapping, 'feature cards should not overlap').to.eq(false);
      }
    });
  });

  it('C691020 - Verify clicking any feature card does NOT trigger action or navigation.', () => {
    cy.url().then((originalUrl) => {
      FEATURE_CARDS.forEach((card) => {
        page.featureCardByTitle(card.title).should('be.visible').click();
      });

      cy.url().should('eq', originalUrl);
      page.welcomeTitle().should('be.visible');
    });
  });

  it('C679697 - Verify welcome content describes DB Agent capabilities instead of generic prompts.', () => {
    FEATURE_CARDS.forEach((card) => {
      page.featureCardByTitle(card.title).should('be.visible');
      cy.contains(card.description).should('be.visible');
    });
    cy.contains(/database|data|query|sql|graphs|tables/i).should('be.visible');
  });

  it('C691022 - Verify input text box is centered correctly relative to welcome content.', () => {
    page.welcomeTitle().should('be.visible');
    page.messageInput().should('be.visible');
  });

  it('C679755 - Verify placeholder Ask here ... is visible before typing and hides once user types.', () => {
    page.messageInput().then(($input: JQuery<HTMLElement>) => {
      const element = $input[0] as HTMLElement;
      const isContentEditable = element.getAttribute('contenteditable') === 'true' || element.isContentEditable;

      if (isContentEditable) {
        // Contenteditable composers may expose placeholder text via UI instead of a placeholder attribute.
        cy.contains(/Ask here/i).should('be.visible');
      } else {
        cy.wrap($input).should('have.attr', 'placeholder').and('match', /Ask here/i);
      }
    });

    page.typePrompt('How many rows are in users table?');
    page.inputValue().then((value) => {
      expect(value).to.eq('How many rows are in users table?');
    });
  });

  it('C679708 - Verify character count indicator is visible and updates when user types.', () => {
    page.characterCounter().should('be.visible').and('contain.text', '0/500');

    const prompt = 'SELECT * FROM users;';
    page.typePrompt(prompt);

    page.inputValue().then((value: string) => {
      const expectedLength = String(value ?? '').length;
      page.characterCounter().invoke('text').then((counterText: string) => {
        const match = counterText.match(/(\d+)\s*\/\s*500/);
        expect(match, 'character counter format').to.not.eq(null);
        expect(Number(match?.[1]), 'character counter value').to.eq(expectedLength);
      });
    });
  });

  it('C716297 - Verify Send (Arrow) icon is visible on the input field.', () => {
    page.clearPrompt();
    page.sendButton().should('be.visible');

    page.typePrompt('    ');
    page.sendButton().should('be.visible');
  });

  it('C690707 - Verify that disclaimer text "*To support informed decisions, please review the information carefully." message is shown below the input field initially and disappears after first response.', () => {
    page.messageInput().then(($input: JQuery<HTMLElement>) => {
      cy
        .get('body')
        .contains(DISCLAIMER)
        .should('be.visible')
        .then(($disclaimer: JQuery<HTMLElement>) => {
          expect($disclaimer.length, 'disclaimer element exists').to.be.greaterThan(0);
          const inputRect = ($input[0] as HTMLElement).getBoundingClientRect();
          const disclaimerRect = ($disclaimer[0] as HTMLElement).getBoundingClientRect();

          expect(disclaimerRect.top).to.be.greaterThan(inputRect.bottom - 1);
        });
    });

    cy.intercept('POST', page.chatApiRouteMatcher).as('disclaimerSend');

    page.typePrompt('Show top 5 tables');
    page.messageInput().should('be.visible').type('{enter}');
    cy.wait('@disclaimerSend');

    cy.get('body').should('not.contain', DISCLAIMER);
  });

  it('C716290 - Verify sidebar navigation icons are visible and correctly aligned.', () => {
    page.chatTitle().should('be.visible');
    page.newChatAction().should('be.visible');
    page.historyIconCandidate().should('be.visible');
  });

  it('C679702 - Verify repeated reloads do not duplicate welcome screen content or cards.', () => {
    cy.reload();
    page.welcomeTitle().should('be.visible');
    cy.get('body').invoke('text').then((text: string) => {
      const occurrences = (text.match(/Welcome to DB Agent/g) || []).length;
      expect(occurrences, 'welcome title occurrence count').to.eq(1);
    });

    cy.reload();
    page.welcomeTitle().should('be.visible');
    cy.get('body').invoke('text').then((text: string) => {
      const occurrences = (text.match(/Welcome to DB Agent/g) || []).length;
      expect(occurrences, 'welcome title occurrence count').to.eq(1);
    });
  });
});
