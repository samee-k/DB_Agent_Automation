/// <reference types="cypress" />

import { ChainableEl } from '../types';
import { CHAT_INPUT_SELECTOR, SEND_BUTTON_SELECTOR } from '../selectors/CommonSelectors';
import { appendIntoComposer, clearComposer, readComposerValue, typeIntoComposer } from '../helpers/composer';

export class InitialPromptPage {
  readonly chatPath = Cypress.env('chatPath') || `/dbagent/${Cypress.env('projectId') || '11'}/chat`;
  readonly chatApiRouteMatcher = '**/api/chats/*/send-query';
  private readonly chatInputSelector = `${CHAT_INPUT_SELECTOR}, textarea.form-control`;
  private readonly historyIconSelector = [
    '[data-cy="chat-history-toggle"]',
    '[data-testid="history-icon"]',
    'button[aria-label*="history" i]',
    '[role="button"][aria-label*="history" i]',
    'button[title*="history" i]',
    '[role="button"][title*="history" i]',
    'button.icon-btn-alt',
  ].join(', ');
  private readonly appLogoSelector = [
    '[data-testid="app-logo"]',
    'img[alt*="DB" i]',
    'img[src*="logo" i]',
    'header img',
    'header svg',
  ].join(', ');
  private readonly chatTitleSelector = [
    '[data-testid="chat-title"]',
    '[data-cy="chat-title"]',
    '.chat-title',
    '.chat-header .text-truncate',
    'header .text-truncate',
    'header h1',
    'header h2',
    'p.text-truncate',
  ].join(', ');
  openChatPage() {
    cy.visit(this.chatPath);
    return this;
  }

  waitForWelcomeScreen() {
    cy.contains(/Welcome to DB Agent/i, { timeout: 30000 }).should('be.visible');
    return this;
  }

  welcomeTitle() {
    return cy.contains(/Welcome to DB Agent/i);
  }

  chatTitle() {
    return cy.get(this.chatTitleSelector, { timeout: 20000 }).filter(':visible').contains(/Untitled\s*chat/i);
  }

  newChatAction() {
    return cy.contains('button, [role="button"], a', /new\s*chat/i);
  }

  historyIconCandidate() {
    return cy.get(this.historyIconSelector).filter(':visible').first();
  }

  appLogo() {
    return cy.get(this.appLogoSelector).filter(':visible').first();
  }

  messageInput(): ChainableEl {
    return cy.get(this.chatInputSelector, { timeout: 20000 }).filter(':visible').first();
  }

  sendButton() {
    return cy.get(SEND_BUTTON_SELECTOR).filter(':visible').first();
  }

  characterCounter() {
    return cy.get('.char-count');
  }

  featureCardByTitle(title: string) {
    return cy.contains(new RegExp(title, 'i'));
  }

  typePrompt(promptText: string) {
    this.messageInput().then(($input: JQuery<HTMLElement>) => typeIntoComposer($input, promptText));
    return this;
  }

  appendPrompt(promptText: string) {
    this.messageInput().then(($input: JQuery<HTMLElement>) => appendIntoComposer($input, promptText));
    return this;
  }

  clearPrompt() {
    this.messageInput().then(($input: JQuery<HTMLElement>) => clearComposer($input));
    return this;
  }

  inputValue(): Cypress.Chainable<string> {
    return this.messageInput().then(($input: JQuery<HTMLElement>): string => readComposerValue($input));
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

  submitPrompt() {
    this.sendButton().click();
    return this;
  }
}