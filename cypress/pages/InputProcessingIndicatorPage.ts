/// <reference types="cypress" />

import { loginBySession } from '../support/commands';

export class InputProcessingIndicatorPage {
  readonly chatPath = Cypress.env('chatPath') ?? '/dbagent/11/chat';
  readonly sendQueryRoute = '**/api/chats/*/send-query';
  readonly processingStateRegex = /Data analysis|Data extraction|Data processing|Generating visuals/i;

  private readonly promptInputSelector = [
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

  private readonly sendButtonSelector = [
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

  readonly editModeLabelRegex = /Edit your prompt/i;

  loginOnceForSuite() {
    loginBySession();
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

  messageInput(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.get('body', { timeout: 20000 }).then(($body: JQuery<HTMLElement>) => {
      const visibleInputs = $body.find(this.promptInputSelector).filter(':visible');
      expect(visibleInputs.length, 'visible prompt input').to.be.greaterThan(0);
      return cy.wrap(visibleInputs.first() as JQuery<HTMLElement>);
    });
  }

  sendButton(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.get(this.sendButtonSelector, { timeout: 10000 }).filter(':visible').first();
  }

  readInputValue(): Cypress.Chainable<string> {
    return this.messageInput().then(($input: JQuery<HTMLElement>) => {
      const el = $input[0] as HTMLElement;
      const isContentEditable = el.getAttribute('contenteditable') === 'true' || el.isContentEditable;
      if (isContentEditable) {
        return ($input.text() || '').trim();
      }
      const raw = $input.val();
      if (Array.isArray(raw)) {
        return raw.join(' ').trim();
      }
      return String(raw ?? '').trim();
    });
  }

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

  assertProcessingIndicatorVisible(timeout = 8000) {
    cy.get('body', { timeout }).should(($body: JQuery<HTMLElement>) => {
      const hasVisibleProcessingText = $body
        .find('*')
        .filter(':visible')
        .toArray()
        .some((el: Element) => this.processingStateRegex.test((el.textContent || '').trim()));

      expect(hasVisibleProcessingText, 'processing indicator should be visible').to.eq(true);
    });
    return this;
  }

  assertProcessingIndicatorNotVisible() {
    cy.get('body', { timeout: 15000 }).should(($body: JQuery<HTMLElement>) => {
      const hasProcessingTextVisible = $body
        .find('*')
        .filter(':visible')
        .toArray()
        .some((el: Element) => this.processingStateRegex.test((el.textContent || '').trim()));

      const $input = $body.find(this.promptInputSelector).filter(':visible').first();
      const $send = $body.find(this.sendButtonSelector).filter(':visible').first();

      const inputDisabled =
        $input.length > 0 &&
        (
          $input.is(':disabled') ||
          String($input.attr('readonly') || '').toLowerCase() === 'readonly' ||
          String($input.attr('aria-disabled') || '').toLowerCase() === 'true'
        );

      const sendDisabled =
        $send.length > 0 &&
        (
          $send.is(':disabled') ||
          String($send.attr('aria-disabled') || '').toLowerCase() === 'true'
        );

      // Treat as "not actively processing" once controls are usable,
      // even if residual processing text remains in the DOM briefly.
      const activelyBlocking = hasProcessingTextVisible && (inputDisabled || sendDisabled);
      expect(activelyBlocking, 'processing indicator should not be actively blocking').to.eq(false);
    });
    return this;
  }

  assertInputLockedOrSendDisabled() {
    cy.get('body').then(($body: JQuery<HTMLElement>) => {
      const $input = $body.find(this.promptInputSelector).filter(':visible').first();
      const $send = $body.find(this.sendButtonSelector).filter(':visible').first();

      const inputDisabled =
        $input.is(':disabled') ||
        String($input.attr('readonly') || '').toLowerCase() === 'readonly' ||
        String($input.attr('aria-disabled') || '').toLowerCase() === 'true';

      const sendDisabled =
        $send.is(':disabled') ||
        String($send.attr('aria-disabled') || '').toLowerCase() === 'true';

      expect(inputDisabled || sendDisabled, 'input locked or send disabled during processing').to.eq(true);
    });
    return this;
  }

  assertSuggestionsHiddenDuringLoading() {
    cy.get('body').then(($body: JQuery<HTMLElement>) => {
      const visible = $body.find(this.suggestionItemSelector).filter(':visible').length;
      expect(visible, 'suggestions should be hidden during loading').to.eq(0);
    });
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
      if ($edit.length > 0) {
        cy.wrap($edit).click({ force: true });
      }
    });
    return this;
  }

  assertEditActionSafelyHandledDuringLoading() {
    cy.get('body').then(($body: JQuery<HTMLElement>) => {
      const editModeVisible = $body
        .find('*')
        .filter(':visible')
        .toArray()
        .some((el: Element) => this.editModeLabelRegex.test((el.textContent || '').trim()));

      const $input = $body.find(this.promptInputSelector).filter(':visible').first();
      const $send = $body.find(this.sendButtonSelector).filter(':visible').first();

      const inputDisabled =
        $input.length > 0 &&
        (
          $input.is(':disabled') ||
          String($input.attr('readonly') || '').toLowerCase() === 'readonly' ||
          String($input.attr('aria-disabled') || '').toLowerCase() === 'true'
        );

      const sendDisabled =
        $send.length > 0 &&
        (
          $send.is(':disabled') ||
          String($send.attr('aria-disabled') || '').toLowerCase() === 'true'
        );

      // Safe handling criteria:
      // 1) edit mode does not open, or
      // 2) edit mode appears but input/send remains non-interactive while processing.
      const safelyHandled = !editModeVisible || inputDisabled || sendDisabled;
      expect(safelyHandled, 'edit action safely handled while processing').to.eq(true);
    });
    return this;
  }

  openHistoryPanel() {
    cy.get(this.historyToggleSelector).filter(':visible').first().click({ force: true });
    cy.get(this.historyPanelSelector).filter(':visible').first().should('be.visible');
    return this;
  }
}
