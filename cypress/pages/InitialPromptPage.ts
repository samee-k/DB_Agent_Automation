/// <reference types="cypress" />

import { LoginPage } from './LoginPage';

type CardDefinition = {
  title: string;
  description: string;
};
export class InitialPromptPage {
  // readonly chatPath = '/dbagent/1/chat'; // DB AGent
  readonly chatPath = '/dbagent/872/chat'; // AI Studio
  readonly chatApiRouteMatcher = '**/dbagent/**/chat**';
  private readonly promptInputSelector = [
    '[data-testid="message-input"]',
    '[data-testid="chat-input"]',
    'textarea',
    'input[placeholder*="Ask"]',
    'input[placeholder*="ask"]',
    'input[placeholder*="Type"]',
    'input[placeholder*="type"]',
    '[contenteditable="true"]',
    '[role="textbox"]',
    '[aria-label*="Ask"]',
    '[data-placeholder*="Ask"]',
    '.ProseMirror',
    '.ql-editor',
  ].join(', ');
  private readonly historyIconSelector = [
    '[data-testid="history-icon"]',
    'button[aria-label*="history" i]',
    '[role="button"][aria-label*="history" i]',
  ].join(', ');
  private readonly appLogoSelector = [
    '[data-testid="app-logo"]',
    'img[alt*="DB" i]',
    'img[src*="logo" i]',
    'header img',
    'header svg',
  ].join(', ');
  private readonly loginPage = new LoginPage();

  readonly cards: CardDefinition[] = [
    {
      title: 'Built for exploration',
      description: 'Designed to help you explore, question, and understand your data effortlessly.',
    },
    {
      title: 'Visual Results Made Simple',
      description: 'Watch your data transform into interactive graphs and tables, with real-time feedback.',
    },
    {
      title: 'Write Your Own Query',
      description: 'Ask anything about your database with natural text input and smart suggestions.',
    },
    {
      title: 'Transparent SQL Queries',
      description: 'Watch your data transform into interactive graphs and tables, with real-time feedback.',
    },
  ];

  readonly disclaimer = '*To support informed decisions, please review the information carefully.';
  readonly offlineTitle = 'No internet connection';
  readonly offlineDescription = 'It seems there is something wrong with your internet connection.';
  readonly offlineAction = 'Please connect to the internet and try again.';

  visitRoot() {
    cy.visit(this.chatPath);
    return this;
  }

  loginOnceForSuite() {
    this.loginPage.visitPage();
    this.loginPage.login_with_right_credential();
    cy.url({ timeout: 30000 }).should('not.include', '/login');
    return this;
  }

  openChatPage() {
    cy.visit(this.chatPath);
    return this;
  }

  loginIfLoginPageIsVisible() {
    cy.url({ timeout: 20000 }).then((currentUrl: string) => {
      if (currentUrl.includes('/login')) {
        this.loginPage.login_with_right_credential();
      }
    });

    cy.visit(this.chatPath);

    return this;
  }

  waitForWelcomeScreen() {
    cy.document({ timeout: 30000 }).should((documentObject: Document) => {
      const pageText = documentObject.body?.innerText?.replace(/\s+/g, ' ').trim() ?? '';
      const hasWelcomeText = /Welcome to DB agent/i.test(pageText);
      const hasFeatureSection = /Built for exploration|Write Your Own Query|Visual Results Made Simple|Transparent SQL Queries/i.test(pageText);

      if (!hasWelcomeText && !hasFeatureSection) {
        throw new Error(
          `Welcome content not found. URL: ${documentObject.location.href} | Title: ${documentObject.title} | Body: ${pageText.slice(0, 300)}`,
        );
      }
    });
    return this;
  }

  welcomeTitle() {
    return cy.contains('Welcome to DB Agent');
  }

  chatTitle() {
    return cy.contains(/Untitled\s*chat/i);
  }

  newChatAction() {
    return cy.contains('button, [role="button"], a', /new\s*chat/i);
  }

  historyIconCandidate() {
    return cy.get(this.historyIconSelector).filter(':visible').first().should('exist');
  }

  appLogo() {
    return cy.get(this.appLogoSelector).filter(':visible').first().should('exist');
  }

  messageInput(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy
      .get(this.promptInputSelector, { timeout: 20000 })
      .filter(':visible')
      .first()
      .should('exist');
  }

  sendButton() {
    return cy.get('button[aria-label="Send"][type="button"]');
  }

  characterCounter() {
    return cy.get('.char-count');
  }

  featureCardByTitle(title: string) {
    return cy.contains(new RegExp(title, 'i')).should('be.visible');
  }

  verifyFeatureCardTexts() {
    this.cards.forEach((card) => {
      cy.contains(card.title).should('be.visible');
      cy.contains(card.description).should('be.visible');
    });
    return this;
  }

  private isContentEditableInput($input: JQuery<HTMLElement>): boolean {
    const element = $input[0] as HTMLElement;
    return element.getAttribute('contenteditable') === 'true' || element.isContentEditable;
  }

  private focusInput($input: JQuery<HTMLElement>) {
    cy.wrap($input).should('exist').should('be.visible').click();
  }

  typePrompt(promptText: string) {
    this.messageInput().then(($input: JQuery<HTMLElement>) => {
      const isContentEditable = this.isContentEditableInput($input);

      this.focusInput($input);
      if (!isContentEditable) {
        cy.wrap($input).clear();
      }
      cy.wrap($input).type(promptText);
    });
    return this;
  }

  appendPrompt(promptText: string) {
    this.messageInput().then(($input: JQuery<HTMLElement>) => {
      this.focusInput($input);
      cy.wrap($input).type(promptText);
    });
    return this;
  }

  clearPrompt() {
    this.messageInput().then(($input: JQuery<HTMLElement>) => {
      const isContentEditable = this.isContentEditableInput($input);

      if (isContentEditable) {
        this.focusInput($input);
        cy.wrap($input).type('{selectall}{backspace}');
      } else {
        this.focusInput($input);
        cy.wrap($input).clear();
      }
    });
    return this;
  }

  inputValue(): Cypress.Chainable<string> {
    return this.messageInput().then(($input: JQuery<HTMLElement>): string => {
      const isContentEditable = this.isContentEditableInput($input);

      if (isContentEditable) {
        return $input.text() ?? '';
      }

      const value = $input.val();

      if (Array.isArray(value)) {
        return value.join(' ');
      }

      return value == null ? '' : String(value);
    });
  }

  inputHtml(): Cypress.Chainable<string> {
    return this.messageInput().then(($input: JQuery<HTMLElement>): string => {
      return $input.html() ?? '';
    });
  }

  inputHeight(): Cypress.Chainable<number> {
    return this.messageInput().then(($input: JQuery<HTMLElement>): number => {
      const element = $input[0] as HTMLElement;
      return element.getBoundingClientRect().height;
    });
  }

  inputScrollInfo(): Cypress.Chainable<{ scrollHeight: number; clientHeight: number }> {
    return this.messageInput().then(($input: JQuery<HTMLElement>): { scrollHeight: number; clientHeight: number } => {
      const element = $input[0] as HTMLElement;
      return {
        scrollHeight: element.scrollHeight,
        clientHeight: element.clientHeight,
      };
    });
  }

  inputShouldBeEnabled() {
    return this.messageInput().should('not.be.disabled');
  }

  sendPromptResilient(promptText: string) {
    this.typePrompt(promptText);
    this.submitPrompt();
    return this;
  }

  submitPrompt() {
    this.sendButton().should('exist').should('be.visible').click();
    return this;
  }

  verifyOfflineErrorMessage(timeout = 20000) {
    cy.contains(this.offlineTitle, { timeout }).should('be.visible');
    cy.contains(this.offlineDescription, { timeout }).should('be.visible');
    cy.contains(this.offlineAction, { timeout }).should('be.visible');
    return this;
  }

  verifyWelcomeContentNotDuplicated() {
    cy.contains(/Welcome to DB agent/i).should('have.length', 1);
    cy.contains(/Built for exploration/i).should('have.length', 1);
    cy.contains(/Visual Results Made Simple/i).should('have.length', 1);
    cy.contains(/Write Your Own Query/i).should('have.length', 1);
    cy.contains(/Transparent SQL Queries/i).should('have.length', 1);
    return this;
  }
}