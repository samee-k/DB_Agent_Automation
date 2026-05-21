/// <reference types="cypress" />

import { ChainableEl } from '../types';

export class InputProcessingIndicatorPage {
  readonly chatPath = Cypress.env('chatPath') ?? '/dbagent/11/chat';
  readonly sendQueryRoute = '**/api/chats/*/send-query';
  readonly processingStateRegex = /Data analysis|Data extraction|Data processing|Generating visuals/i;
  readonly editModeLabelRegex = /Edit your prompt/i;

  readonly promptInputSelector = [
    '#dbagent-textarea',
    'textarea.dbagent-textarea',
    'textarea[id="dbagent-textarea"]',
    '[data-testid="message-input"]',
    '[data-testid="chat-input"]',
    '[data-cy="chat-input"]',
    'textarea.chat-input',
    'textarea[placeholder*="Ask here"]',
    '[role="textbox"][placeholder*="Ask here"]',
    '[role="textbox"]',
    '[contenteditable="true"]',
    '.ProseMirror',
    '.ql-editor',
  ].join(', ');

  readonly sendButtonSelector = [
    '[data-cy="send-button"]',
    'button[aria-label="Send"][type="button"]',
    'button[aria-label*="Send"]',
    'button[type="submit"]',
  ].join(', ');

  readonly suggestionItemSelector = '.floating-suggestion-box .suggestion-item';
  readonly historyToggleSelector = '[data-cy="chat-history-toggle"], button.icon-btn-alt';
  readonly historyPanelSelector = '[data-cy="chat-history-panel"], aside.chat-history';

  readonly editIconSelector = [
    'button[aria-label="Edit Prompt"]',
    '[data-testid="edit-prompt"]',
    '[data-cy="edit-prompt"]',
    'button:has(i.icn-edit-1)',
    '.edit-btn',
  ].join(', ');

  readonly userMessageSelector = [
    '[data-testid*="user-message"]',
    '[data-testid*="user-prompt"]',
    '[data-cy="user-message"]',
    '.user-message',
    '.user-prompt',
    '.chat-message.user',
    '.message.user',
    '.question',
    '.user-query',
  ].join(', ');

  // ── Navigation ────────────────────────────────────────────────────────────

  loginOnceForSuite() {
    cy.loginBySession();
    return this;
  }

  openChatPage() {
    cy.visit(this.chatPath);
    return this;
  }

  waitForChatReady() {
    cy.get('body', { timeout: 30000 }).should(($body: JQuery<HTMLElement>) => {
      const hasInput = $body.find(this.promptInputSelector).filter(':visible').length > 0;
      const text = ($body.text() || '').replace(/\s+/g, ' ').trim();
      const hasWelcomeOrChat = /Welcome to DB Agent|Untitled Chat/i.test(text);
      expect(hasInput || hasWelcomeOrChat, 'chat screen should be ready').to.eq(true);
    });
    return this;
  }

  clickNewChat() {
    cy.contains('button, [role="button"], a', /\+?\s*new\s*chat/i)
      .filter(':visible')
      .first()
      .click({ force: true });
    return this;
  }

  // ── Element accessors ─────────────────────────────────────────────────────

  messageInput(): ChainableEl {
    return cy.get(this.promptInputSelector, { timeout: 20000 }).filter(':visible').first();
  }

  sendButton(): ChainableEl {
    return cy.get(this.sendButtonSelector, { timeout: 10000 }).filter(':visible').first();
  }

  readInputValue(): Cypress.Chainable<string> {
    return this.messageInput().then(($input: JQuery<HTMLElement>) => {
      const el = $input[0] as HTMLElement;
      const isContentEditable = el.getAttribute('contenteditable') === 'true' || el.isContentEditable;
      if (isContentEditable) return ($input.text() || '').trim();
      const raw = $input.val();
      if (Array.isArray(raw)) return raw.join(' ').trim();
      return String(raw ?? '').trim();
    });
  }

  // ── User actions ──────────────────────────────────────────────────────────

  typePrompt(text: string) {
    this.messageInput().then(($input: JQuery<HTMLElement>) => {
      const el = $input[0] as HTMLElement;
      const isContentEditable = el.getAttribute('contenteditable') === 'true' || el.isContentEditable;
      cy.wrap($input).click();
      if (!isContentEditable) cy.wrap($input).clear();
      cy.wrap($input).type(text, { delay: 0 });
    });
    return this;
  }

  clickSend() {
    this.sendButton().click({ force: true });
    return this;
  }

  pressEnterToSend() {
    this.messageInput().type('{enter}');
    return this;
  }

  sendPrompt(text: string, method: 'button' | 'enter' = 'button') {
    this.typePrompt(text);
    if (method === 'enter') {
      this.pressEnterToSend();
    } else {
      this.clickSend();
    }
    return this;
  }

  hoverLastUserMessage() {
    cy.get(this.userMessageSelector).filter(':visible').last().realHover();
    cy.wait(250);
    return this;
  }

  tryOpenEditWhileLoading() {
    this.hoverLastUserMessage();
    cy.get('body').then(($body: JQuery<HTMLElement>) => {
      const $edit = $body.find(this.editIconSelector).filter(':visible').first();
      if ($edit.length > 0) cy.wrap($edit).click({ force: true });
    });
    return this;
  }

  openHistoryPanel() {
    cy.get(this.historyToggleSelector).filter(':visible').first().click({ force: true });
    cy.get(this.historyPanelSelector).filter(':visible').first().should('be.visible');
    return this;
  }
}
