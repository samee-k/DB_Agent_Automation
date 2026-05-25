/// <reference types="cypress" />

/**
 * Happy Flow — Smoke Test
 *
 * Covers the critical end-to-end path a user takes in a single session:
 *   1. Login with valid credentials
 *   2. Welcome screen renders correctly
 *   3. Send a prompt and receive a response
 *   4. Chat appears in history panel
 *   5. Start a new chat (session resets)
 *   6. Logout (navigates back to login)
 */

import { LoginPage } from '../../support/pages/LoginPage';
import { NewChatPage } from '../../support/pages/NewChatPage';
import { ChatHistoryPage } from '../../support/pages/ChatHistoryPage';
import { NavigationPage } from '../../support/pages/NavigationPage';
import { probeAndCacheLlmHealth } from '../../support/helpers/deployment-health';
import { TIMEOUTS } from '../../support/constants';
import { PromptsFixture, UsersFixture } from '../../support/types';

describe('Happy Flow — Smoke', () => {
  const loginPage = new LoginPage();
  const chatPage = new NewChatPage();
  const historyPage = new ChatHistoryPage();
  const navPage = new NavigationPage();

  let smokePrompt = 'Hi';

  // One-time deployment-health probe so SMOKE-03/04/05 fail fast (skipped) when
  // the LLM is down, instead of burning 120s each in `cy.wait('@sendQuery')`.
  before(() => {
    probeAndCacheLlmHealth();
  });

  beforeEach(function () {
    cy.fixture<PromptsFixture>('prompts').then((data) => {
      smokePrompt = data.shortPrompt;
    });
  });

  // Tests that send a prompt and wait for the agent response must skip when
  // the deployment is unhealthy. Login/welcome/logout tests (01, 02, 06) still
  // run because they don't depend on a working agent.
  const requiresLlm = function (this: Mocha.Context) {
    if (Cypress.env('llmHealthy') === false) this.skip();
  };

  // ── Step 1: Login ─────────────────────────────────────────────────────────
  // Credentials are resolved inside the test so SMOKE-01 has no external setup dependency.
  it('SMOKE-01 — User can log in with valid credentials', () => {
    cy.fixture<UsersFixture>('users').then((users) => {
      const email = String(Cypress.env('USER_EMAIL') || users.validUser.email || '').trim();
      const password = String(Cypress.env('USER_PASSWORD') || users.validUser.password || '').trim();

      expect(email, 'USER_EMAIL must be set').to.not.equal('');
      expect(password, 'USER_PASSWORD must be set').to.not.equal('');

      loginPage.visitPage();
      loginPage.getLogo().should('be.visible');

      loginPage.enterEmail(email);
      loginPage.enterPassword(password);
      loginPage.clickLoginButton();

      cy.url().should('not.include', '/login');
      cy.contains(/Studio Projects|DB Agent|Welcome/i, { timeout: TIMEOUTS.ui }).should('be.visible');
    });
  });

  // ── Step 2: Welcome screen ────────────────────────────────────────────────
  it('SMOKE-02 — Chat page loads and displays the Welcome screen', () => {
    cy.loginBySession();
    chatPage.openChatPage().waitForWelcomeScreen();

    cy.contains(/Welcome to DB Agent/i).should('be.visible');
    chatPage.newChatAction().should('be.visible');
    chatPage.assertNewChatIsDisabled();
  });

  // ── Step 3: Send a prompt and receive a response ──────────────────────────
  it('SMOKE-03 — User can send a prompt and the agent responds', function () {
    requiresLlm.call(this);
    cy.loginBySession();
    chatPage.openChatPage().waitForWelcomeScreen();

    cy.intercept('POST', chatPage.createChatRoute).as('createChat');
    cy.intercept('POST', chatPage.sendQueryRoute).as('sendQuery');

    chatPage.typePrompt(smokePrompt).submitPromptWithEnter();

    cy.wait('@createChat', { timeout: TIMEOUTS.ui }).its('response.statusCode').should('be.oneOf', [200, 201]);
    cy.wait('@sendQuery', { timeout: TIMEOUTS.llmResponse });

    // Input should be cleared and New Chat should now be enabled
    chatPage.assertNewChatIsEnabled();
    chatPage.assertInputCleared();
  });

  // ── Step 4: Chat appears in history ──────────────────────────────────────
  it('SMOKE-04 — Sent prompt creates a chat entry in history', function () {
    requiresLlm.call(this);
    cy.loginBySession();
    chatPage.openChatPage().waitForWelcomeScreen();

    cy.intercept('POST', chatPage.createChatRoute).as('createChat');
    cy.intercept('POST', chatPage.sendQueryRoute).as('sendQuery');

    chatPage.typePrompt(smokePrompt).submitPromptWithEnter();
    cy.wait('@createChat', { timeout: TIMEOUTS.ui });
    cy.wait('@sendQuery', { timeout: TIMEOUTS.llmResponse });

    historyPage.openHistoryPanel();
    historyPage.getHistoryItemCount().should('be.gte', 1);
  });

  // ── Step 5: New Chat resets the session ───────────────────────────────────
  it('SMOKE-05 — Clicking "+ New Chat" resets the conversation', function () {
    requiresLlm.call(this);
    cy.loginBySession();
    chatPage.openChatPage().waitForWelcomeScreen();

    cy.intercept('POST', chatPage.createChatRoute).as('createChat');
    cy.intercept('POST', chatPage.sendQueryRoute).as('sendQuery');

    chatPage.typePrompt(smokePrompt).submitPromptWithEnter();
    cy.wait('@createChat', { timeout: TIMEOUTS.ui });
    cy.wait('@sendQuery', { timeout: TIMEOUTS.llmResponse });

    chatPage.assertNewChatIsEnabled();
    chatPage.clickNewChat();

    chatPage.waitForWelcomeScreen();
    chatPage.assertInputCleared();
    chatPage.assertNewChatIsDisabled();
  });

  // ── Step 6: Logout ────────────────────────────────────────────────────────
  it('SMOKE-06 — Logging out redirects the user back to the login page', () => {
    cy.loginBySession();
    chatPage.openChatPage().waitForWelcomeScreen();

    navPage.clickLogout();

    cy.url({ timeout: TIMEOUTS.ui }).should('include', '/login');
    loginPage.getEmailInput().should('be.visible');
  });
});
