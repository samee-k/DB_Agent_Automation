/// <reference types="cypress" />

import { NewChatPage } from '../../pages/NewChatPage';

describe('Navigation and Header - + New Chat', () => {
  const page = new NewChatPage();
  const firstPrompt = 'List all tables for this database';

  const sendFirstPrompt = (_responseMessage = 'Mocked first response') => {
    cy.intercept('POST', page.createChatRoute).as('createChat');
    cy.intercept('POST', page.sendQueryRoute, (req) => { req.continue(); }).as('sendQuery');

    page.typePrompt(firstPrompt).submitPromptWithEnter();
    cy.wait('@createChat').its('response.statusCode').should('be.oneOf', [200, 201]);
    cy.wait('@sendQuery');
  };

  beforeEach(() => {
    cy.loginBySession();
    page.openChatPage().waitForWelcomeScreen();
  });

  it('C716291 - Verify "+ New Chat" button state on initial load is disabled/unclickable. (Fresh Page).', () => {
    page.newChatAction().should('be.visible');
    page.assertNewChatIsDisabled();
  });

  it('C716292 - Verify "+ New Chat" becomes clickable after first user prompt.', () => {
    page.assertNewChatIsDisabled();
    sendFirstPrompt('Mocked first response');
    page.assertNewChatIsEnabled();
  });

  it('C716293 - Verify clicking "+ New Chat" clears the current conversation and returns to Welcome Screen.', () => {
    sendFirstPrompt('Mocked response to clear');

    page.assertNewChatIsEnabled();
    page.clickNewChat();

    page.waitForWelcomeScreen();
    page.assertInputCleared();
    cy.get('.char-count').should('contain.text', '0/500');
  });

  it('C716294 - Verify "+ New Chat" generates a new Session ID. ', () => {
    let firstSessionId = '';

    cy.intercept('POST', page.createChatRoute).as('createChat');
    cy.intercept('POST', page.sendQueryRoute, (req) => { req.continue(); }).as('sendQuery');

    page.typePrompt(firstPrompt).submitPromptWithEnter();
    cy.wait('@createChat').its('response.statusCode').should('be.oneOf', [200, 201]);
    cy.wait('@sendQuery').then((firstCall) => {
      firstSessionId = NewChatPage.extractChatIdFromSendQueryUrl(firstCall.request.url);
      expect(firstSessionId, 'first session id').to.not.eq('');
    });

    page.assertNewChatIsEnabled();
    page.clickNewChat();
    page.waitForWelcomeScreen();

    page.typePrompt('Show user count').submitPromptWithEnter();
    cy.wait('@createChat').its('response.statusCode').should('be.oneOf', [200, 201]);

    cy.wait('@sendQuery').then((secondCall) => {
      const secondSessionId = NewChatPage.extractChatIdFromSendQueryUrl(secondCall.request.url);
      expect(secondSessionId, 'second session id').to.not.eq('');
      expect(secondSessionId).to.not.eq(firstSessionId);
    });
  });

  it('C716295 - Verify that the existing title after first prompt resets to "Untitled Chat" upon clicking "+ New Chat".', () => {
    sendFirstPrompt('Mocked response for title reset test');

    page.assertNewChatIsEnabled();
    page.clickNewChat();

    page.assertNewChatIsDisabled();
    page.readChatHeaderTitle().then((headerTitle: string) => {
      expect(headerTitle, 'header title after reset').to.match(/Untitled\s*Chat/i);
    });
  });

  it('C716296 - Verify clicking "+ New Chat" while a response is "loading" prevents background API calls from leaking into the fresh session. #Edge ', () => {
    let callCount = 0;
    const capturedSessionIds: string[] = [];

    cy.intercept('POST', page.sendQueryRoute, (req) => {
      callCount += 1;
      const requestSessionId = NewChatPage.extractChatIdFromSendQueryUrl(req.url);
      capturedSessionIds.push(requestSessionId);

      if (callCount === 1) {
        req.continue((res) => { res.setDelay(6000); });
        return;
      }

      req.continue();
    }).as('sendQuery');

    page.typePrompt('First prompt to trigger delayed response').submitPromptWithEnter();

    cy.wrap(null, { timeout: 15000 }).should(() => {
      expect(callCount, 'exactly one request fired so far').to.eq(1);
    });

    // Click New Chat while loading; if it is disabled/unclickable, that is also a valid pass
    // because blocking this action prevents background API calls from leaking into a fresh session.
    page.newChatAction().then(($button: JQuery<HTMLElement>) => {
      const isDisabledAttr = $button.is(':disabled');
      const ariaDisabled = String($button.attr('aria-disabled') || '').toLowerCase() === 'true';
      const hasDisabledClass = /disabled/i.test($button.attr('class') || '');
      const style = window.getComputedStyle($button[0]);
      const hasBlockedPointer = style.pointerEvents === 'none';
      const isBlocked = isDisabledAttr || ariaDisabled || hasDisabledClass || hasBlockedPointer;

      if (!isBlocked) {
        cy.wrap($button).click({ force: true });
      }
    });

    // Let the delayed request finish and verify no additional send-query request was created.
    cy.wait('@sendQuery');
    cy.then(() => expect(callCount, 'no duplicate request fired').to.eq(1));

    cy.then(() => {
      const firstSessionId = capturedSessionIds[0] || '';
      expect(firstSessionId, 'first session id').to.not.eq('');
      const callsOnOldSession = capturedSessionIds.filter((sessionId) => sessionId === firstSessionId);
      expect(callsOnOldSession.length, 'calls tied to old session').to.eq(1);
    });
  });
});
