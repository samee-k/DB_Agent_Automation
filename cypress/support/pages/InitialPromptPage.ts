/// <reference types="cypress" />

import { ChainableEl } from '../types';
import { CHAT_INPUT_SELECTORS, SEND_BUTTON_SELECTOR } from '../selectors/CommonSelectors';

export class InitialPromptPage {
  readonly chatPath = Cypress.env('chatPath') || `/dbagent/${Cypress.env('projectId') || '11'}/chat`;
  readonly chatApiRouteMatcher = '**/api/chats/*/send-query';
  private readonly chatInputSelector = [...CHAT_INPUT_SELECTORS, 'textarea.form-control'].join(', ');
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

  private isContentEditableInput($input: JQuery<HTMLElement>): boolean {
    const element = $input[0] as HTMLElement;
    return element.getAttribute('contenteditable') === 'true' || element.isContentEditable;
  }

  private focusInput($input: JQuery<HTMLElement>) {
    cy.wrap($input).click();
  }

  typePrompt(promptText: string) {
    this.messageInput().then(($input: JQuery<HTMLElement>) => {
      const isContentEditable = this.isContentEditableInput($input);

      this.focusInput($input);
      if (!isContentEditable) {
        cy.wrap($input).clear();
      }
      cy.wrap($input).type(promptText, { delay: 0 });
    });
    return this;
  }

  appendPrompt(promptText: string) {
    this.messageInput().then(($input: JQuery<HTMLElement>) => {
      this.focusInput($input);
      cy.wrap($input).type(promptText, { delay: 0 });
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

  submitPrompt() {
    this.sendButton().click();
    return this;
  }
}