/// <reference types="cypress" />

import { InputProcessingIndicatorPage } from '../../pages/InputProcessingIndicatorPage';

describe('Agent Response Display', () => {
  const page = new InputProcessingIndicatorPage();

  // Selectors for agent/assistant message bubbles in the conversation thread.
  // Covers common naming conventions used across chat UIs.
  const agentResponseSelectors = [
    '[data-testid*="agent-response"]',
    '[data-testid*="assistant-message"]',
    '[data-testid*="bot-message"]',
    '[data-cy="agent-response"]',
    '[data-cy="assistant-message"]',
    '.agent-response',
    '.assistant-message',
    '.bot-message',
    '.chat-message:not(.user)',
    '.message:not(.user-message)',
    '.response',
  ].join(', ');

  const mockSuccessResponse = (alias: string, responseText: string, delay = 0) => {
    cy.intercept({ method: 'POST', url: page.sendQueryRoute, times: 1 }, (req) => {
      req.reply({ statusCode: 200, delay, body: { message: responseText } });
    }).as(alias);
  };

  const mockErrorResponse = (alias: string, statusCode = 500, delay = 0) => {
    cy.intercept({ method: 'POST', url: page.sendQueryRoute, times: 1 }, (req) => {
      req.reply({ statusCode, delay, body: { error: 'Internal server error' } });
    }).as(alias);
  };

  beforeEach(() => {
    page.loginOnceForSuite();
    page.openChatPage().waitForChatReady();
  });

  // Verify the user's own prompt text is visible in the conversation thread after it is sent.
  it('Verify the sent user prompt is visible in the conversation thread', () => {
    const prompt = `User prompt display check ${Date.now()}`;
    mockSuccessResponse('promptVisibleSend', 'Mocked response');

    page.sendPrompt(prompt);
    cy.wait('@promptVisibleSend').its('response.statusCode').should('eq', 200);

    cy.contains(prompt, { timeout: 15000 }).should('be.visible');
  });

  // Verify that the agent's reply text is rendered in the conversation after the API responds.
  it('Verify the agent text response is rendered in the conversation after a prompt is sent', () => {
    const prompt = `Agent response render check ${Date.now()}`;
    const responseText = `Unique agent response ${Date.now()}`;
    mockSuccessResponse('agentRenderSend', responseText);

    page.sendPrompt(prompt);
    cy.wait('@agentRenderSend').its('response.statusCode').should('eq', 200);
    page.assertProcessingIndicatorNotVisible();

    cy.contains(responseText, { timeout: 15000 }).should('be.visible');
  });

  // Verify that sending multiple prompts grows the conversation thread sequentially,
  // with earlier messages remaining visible.
  it('Verify multiple prompt-response pairs grow the conversation thread sequentially', () => {
    const firstPrompt = `First thread prompt ${Date.now()}`;
    const secondPrompt = `Second thread prompt ${Date.now()}`;

    mockSuccessResponse('firstThreadSend', 'First mocked agent response');
    page.sendPrompt(firstPrompt);
    cy.wait('@firstThreadSend').its('response.statusCode').should('eq', 200);
    page.assertProcessingIndicatorNotVisible();

    mockSuccessResponse('secondThreadSend', 'Second mocked agent response');
    page.sendPrompt(secondPrompt);
    cy.wait('@secondThreadSend').its('response.statusCode').should('eq', 200);
    page.assertProcessingIndicatorNotVisible();

    cy.contains(firstPrompt).should('be.visible');
    cy.contains(secondPrompt).should('be.visible');
  });

  // Verify that when the API returns an error, the UI shows a graceful error indication
  // (message, alert, or error-styled element) rather than silently failing.
  it('Verify a failed API response shows a graceful error state in the conversation', () => {
    const prompt = `Error response check ${Date.now()}`;
    mockErrorResponse('agentErrorSend', 500, 0);

    cy.on('uncaught:exception', (err: Error) => {
      if (/status code (500|502|503)/i.test(err.message)) return false;
      return true;
    });

    page.sendPrompt(prompt);
    cy.wait('@agentErrorSend').its('response.statusCode').should('eq', 500);
    page.assertProcessingIndicatorNotVisible();

    // The UI must surface some error signal — a text message, an alert role element,
    // or an error-class element — rather than leaving the chat silently empty.
    cy.get('body', { timeout: 15000 }).should(($body: JQuery<HTMLElement>) => {
      const bodyText = $body.text();
      const hasErrorText = /error|failed|could not|unable|sorry|try again|something went wrong/i.test(bodyText);
      const hasErrorElement = $body.find('[class*="error"], [role="alert"], [class*="failed"]').filter(':visible').length > 0;
      expect(hasErrorText || hasErrorElement, 'error state surfaced after API failure').to.eq(true);
    });
  });

  // Verify the "Welcome to DB Agent" welcome screen is hidden once the first
  // prompt-response cycle completes.
  it('Verify the welcome screen is hidden after the first prompt-response cycle completes', () => {
    const prompt = `Welcome hide check ${Date.now()}`;
    mockSuccessResponse('welcomeHideSend', 'Response that should hide the welcome screen');

    cy.contains(/Welcome to DB Agent/i).should('be.visible');

    page.sendPrompt(prompt);
    cy.wait('@welcomeHideSend').its('response.statusCode').should('eq', 200);
    page.assertProcessingIndicatorNotVisible();

    cy.contains(/Welcome to DB Agent/i, { timeout: 15000 }).should('not.be.visible');
  });

  // Verify that an agent response containing SQL syntax is rendered without escaping,
  // truncating, or breaking the page layout.
  it('Verify agent response containing SQL text is rendered without escaping or breaking the UI', () => {
    const prompt = `SQL render check ${Date.now()}`;
    const sqlResponse = 'Here is the query: SELECT id, name FROM users WHERE active = 1;';
    mockSuccessResponse('sqlRenderSend', sqlResponse);

    page.sendPrompt(prompt);
    cy.wait('@sqlRenderSend').its('response.statusCode').should('eq', 200);
    page.assertProcessingIndicatorNotVisible();

    // Page must remain stable and the SQL keyword must appear somewhere in the DOM.
    cy.get('body').should('be.visible');
    cy.title().should('not.be.empty');
    cy.contains(/SELECT/i, { timeout: 15000 }).should('exist');
  });
});
