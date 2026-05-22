/// <reference types="cypress" />

import { InitialPromptPage } from '../../support/pages/InitialPromptPage';

describe('Character Count and Input Validation Limit', () => {
  const promptPage = new InitialPromptPage();
  const MAX_CHAR_LIMIT = 500;

  // Stable selectors using data-testid where possible; assume backend adds them for reliability
  const selectors = {
    tooltip: '[role="tooltip"]',
  };

  // Reusable helpers for better readability and maintainability
  const getInputField = () => promptPage.messageInput();
  const getCharCounter = () => promptPage.characterCounter();
  const getSendButton = () => promptPage.sendButton();

  const assertCounterNeutral = () => {
    getCharCounter()
      .should('have.class', 'neutral-text-150')
      .and('not.have.class', 'warning-text-300');
  };

  const assertCounterError = () => {
    getCharCounter()
      .should('have.class', 'warning-text-300')
      .and('not.have.class', 'neutral-text-150')
      .and('have.css', 'color', 'rgb(255, 44, 72)');
  };

  const assertInputNeutral = () => {
    getInputField().should('not.have.class', 'warning-text-300');
  };

  const assertSendDisabled = () => {
    getSendButton().should('be.disabled').and('have.attr', 'disabled');
  };

  const assertSendEnabled = () => {
    getSendButton().should('not.be.disabled').and('not.have.attr', 'disabled');
  };

  // Setup per test for isolation
  beforeEach(() => {
    cy.loginBySession();
    promptPage.openChatPage().waitForWelcomeScreen();
    promptPage.clearPrompt();
    // Wait for counter to reset deterministically
    getCharCounter().should('contain', '0/500');
    assertCounterNeutral();
  });

  // Clean up after each test: Reset mouse position to prevent stickiness
  afterEach(() => {
    cy.get('body').realMouseMove(0, 0);
  });

  it('C716299 - Verify that the input field correctly handles the 500-character boundary limit and remains neutral (500/500)', () => {
    const text500 = 'a'.repeat(500);
    
    promptPage.typePrompt(text500);
    
    getCharCounter().should('contain', '500/500');
    promptPage.inputValue().should('have.lengthOf', 500).and('equal', text500);
    assertInputNeutral();
    assertCounterNeutral();
    assertSendEnabled();
  });

  it('C716300 - Verify that the character counter increments in real-time as the user types', () => {
    const sequence = [
      { keys: 'a', expected: '1/500' },
      { keys: 'bcd', expected: '4/500' },
      { keys: 'e'.repeat(46), expected: '50/500' },
      { keys: 'f'.repeat(50), expected: '100/500' },
      { keys: 'g'.repeat(150), expected: '250/500' },
    ];

    sequence.forEach(({ keys, expected }) => {
      getInputField().type(keys, { force: true });
      getCharCounter().should('contain', expected);
      assertCounterNeutral();
    });

    promptPage.inputValue().should('have.lengthOf', 250);
  });

  it('C716301 - Verify that the character counter (e.g., 501/500) turns red color turn Red when input exceeds 500 characters.', () => {
    const textOverLimit = 'a'.repeat(MAX_CHAR_LIMIT + 1);
    
    promptPage.typePrompt(textOverLimit);
    
    getCharCounter().should('contain', `${MAX_CHAR_LIMIT + 1}/${MAX_CHAR_LIMIT}`);
    assertCounterError();
  });

  it('C716302 - Verify that a tooltip on Send button states "Please limit your response to 500 words or fewer" during overflow', () => {
    const textOverLimit = 'a'.repeat(501);
    
    promptPage.typePrompt(textOverLimit);
    
    getSendButton().realHover();
    cy.get(selectors.tooltip).should('be.visible').and('contain', 'Please limit your response to 500 words or fewer');
  });

  it('C716303 - Verify that the Send button and Enter are disabled when character count overflows', () => {
    const textOverLimit = 'a'.repeat(501);
    
    promptPage.typePrompt(textOverLimit);
    
    assertSendDisabled();
    
    // Intercept API to validate no call on Enter
    let sendMessageCount = 0;
    cy.intercept('POST', '**/send-message', (req) => {
      sendMessageCount++;
      req.reply({ statusCode: 200 });
    }).as('sendMessage');
    getInputField().type('{enter}');
    cy.then(() => expect(sendMessageCount, 'no API call when over character limit').to.eq(0)); // No API call should occur
    promptPage.inputValue().should('equal', textOverLimit);
    cy.url().should('include', '/chat');
  });

  it('C716304 - Verify that large pastes are handled without crashing but flagged as invalid', () => {
    const largePasteText = 'a'.repeat(1284);
    
    promptPage.typePrompt(largePasteText);
    
    cy.url().should('include', '/chat');
    cy.title().should('not.be.empty');
    getCharCounter().should('contain', `1284/${MAX_CHAR_LIMIT}`);
    assertCounterError();
    assertSendDisabled();
  });

  it('C716305 - Verify that deleting overflow text to 500 characters clears error states', () => {
    const textOverLimit = 'a'.repeat(MAX_CHAR_LIMIT + 1);
    
    promptPage.typePrompt(textOverLimit);
    getCharCounter().should('contain', `${MAX_CHAR_LIMIT + 1}/${MAX_CHAR_LIMIT}`);
    assertCounterError();
    
    getInputField().type('{backspace}');
    getCharCounter().should('contain', `${MAX_CHAR_LIMIT}/${MAX_CHAR_LIMIT}`);
    assertCounterNeutral();
    assertInputNeutral();
    assertSendEnabled();
    
    getSendButton().realHover();
    cy.get(selectors.tooltip).should('not.exist');
  });
});

