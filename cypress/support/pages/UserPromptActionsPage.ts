/// <reference types="cypress" />

import { ChainableEl } from '../types';
import { TIMEOUTS } from '../constants';
import { CHAT_INPUT_SELECTOR, SEND_BUTTON_SELECTORS, USER_MESSAGE_SELECTOR } from '../selectors/CommonSelectors';
import { typeIntoComposer } from '../helpers/composer';

export class UserPromptActionsPage {
  readonly chatPath = Cypress.env('chatPath') ?? '/dbagent/11/chat';
  readonly sendQueryRoute = '**/api/chats/*/send-query';
  readonly createChatRoute = /\/api\/chats(?:\?.*)?$/;

  // Input
  private readonly chatInputSelector = CHAT_INPUT_SELECTOR;

  // User message bubble — searched by text content in hoverUserMessageContaining()
  private readonly userMessageContainerSelector = USER_MESSAGE_SELECTOR;

  // Action icons that appear on hover of the user message.
  // aria-label values confirmed from actual DOM: "Copy Text" and "Edit Prompt".
  private readonly copyIconSelector = [
    'button[aria-label="Copy Text"]',
    '[data-testid="copy-prompt"]',
    '[data-cy="copy-prompt"]',
    'button:has(i.icn-copy)',
    'button:has(i.icn-copy-1)',
    '.copy-btn',
  ].join(', ');

  private readonly editIconSelector = [
    'button[aria-label="Edit Prompt"]',
    '[data-testid="edit-prompt"]',
    '[data-cy="edit-prompt"]',
    'button:has(i.icn-edit-1)',
    'button:has(i.icn-edit)',
    'button:has(i.icn-pencil)',
    '.edit-btn',
  ].join(', ');

  private readonly editModeLabel = /Edit your prompt/i;

  private readonly editTextareaSelector = [
    '[data-testid="edit-prompt-input"]',
    '[data-cy="edit-prompt-input"]',
    '.edit-prompt-input',
    '.prompt-edit-area',
    'textarea.dbagent-textarea',
    'textarea.form-control',
    'textarea',
  ].join(', ');

  // Save = the send button (↑) active in edit mode.
  private readonly editSaveSelector = [
    '[data-testid="edit-prompt-save"]',
    '[data-cy="edit-prompt-save"]',
    ...SEND_BUTTON_SELECTORS,
  ].join(', ');

  readonly charCountSelector = '.char-count';
  readonly maxCharLimit = 500;

  // ── Navigation ────────────────────────────────────────────────────────────

  openChatPage() {
    cy.visit(this.chatPath);
    return this;
  }

  waitForWelcomeScreen() {
    cy.contains(/Welcome to DB Agent/i, { timeout: 30000 }).should('be.visible');
    return this;
  }

  // ── Input helpers ─────────────────────────────────────────────────────────

  messageInput(): ChainableEl {
    return cy.get(this.chatInputSelector, { timeout: 20000 }).filter(':visible').first();
  }

  typePrompt(text: string) {
    this.messageInput().then(($input: JQuery<HTMLElement>) => typeIntoComposer($input, text));
    return this;
  }

  submitPrompt() {
    this.messageInput().type('{enter}');
    return this;
  }

  sendPromptAndWait(text: string) {
    cy.intercept({ method: 'POST', url: this.createChatRoute, times: 1 }).as('createChat');
    cy.intercept({ method: 'POST', url: this.sendQueryRoute, times: 1 }).as('sendQuery');

    this.typePrompt(text).submitPrompt();

    cy.wait('@createChat', { timeout: TIMEOUTS.apiFast }).its('response.statusCode').should('be.oneOf', [200, 201]);
    cy.wait('@sendQuery', { timeout: TIMEOUTS.llmResponse }).its('response.statusCode').should('be.oneOf', [200, 201, 202]);

    cy.location('search', { timeout: 30000 }).should((search: string) => {
      const params = new URLSearchParams(search);
      const sessionId = params.get('sessionId');
      expect(sessionId, 'sessionId after first prompt').to.be.a('string').and.not.be.empty;
    });

    this.getUserMessageContaining(text, 30000).should('be.visible');
    return this;
  }

  sendPromptAndEnsureUserMessage(text: string) {
    cy.intercept({ method: 'POST', url: this.createChatRoute, times: 1 }).as('createChat');

    this.typePrompt(text).submitPrompt();

    cy.wait('@createChat', { timeout: TIMEOUTS.apiFast }).its('response.statusCode').should('be.oneOf', [200, 201]);

    cy.location('search', { timeout: 30000 }).should((search: string) => {
      const params = new URLSearchParams(search);
      const sessionId = params.get('sessionId');
      expect(sessionId, 'sessionId after first prompt').to.be.a('string').and.not.be.empty;
    });

    this.getUserMessageContaining(text, 30000).should('be.visible');
    return this;
  }

  // ── User message bubble ───────────────────────────────────────────────────

  private activeUserMessageAlias = 'activeUserMessage';

  getUserMessageContaining(text: string, timeoutMs = 30000): ChainableEl {
    return cy.contains('*', text, { timeout: timeoutMs }).should('be.visible').then(($el: JQuery<HTMLElement>) => {
      const scoped = $el.closest(this.userMessageContainerSelector);
      if (scoped.length > 0) {
        return cy.wrap(scoped.first() as JQuery<HTMLElement>);
      }
      return cy.wrap($el.first() as JQuery<HTMLElement>);
    });
  }

  getLastUserMessage(): ChainableEl {
    return cy.get('body').then(($body: JQuery<HTMLElement>) => {
      const messages = $body.find(this.userMessageContainerSelector).filter(':visible');
      expect(messages.length, 'at least one user message visible').to.be.greaterThan(0);
      return cy.wrap(messages.last() as JQuery<HTMLElement>);
    });
  }

  hoverUserMessageContaining(text: string) {
    cy.get('body').then(($body: JQuery<HTMLElement>) => {
      $body.find('[data-cy-active-user-message="true"]').removeAttr('data-cy-active-user-message');
    });

    this.getUserMessageContaining(text)
      .invoke('attr', 'data-cy-active-user-message', 'true')
      .as(this.activeUserMessageAlias)
      .realHover();
    cy.wait(600);
    return this;
  }

  // ── Clipboard stub ─────────────────────────────────────────────────────────

  stubClipboard() {
    cy.window().then((win: Window) => {
      if (win.navigator.clipboard && typeof win.navigator.clipboard.writeText === 'function') {
        cy.stub(win.navigator.clipboard, 'writeText').as('clipboardWrite').resolves();
      }
    });
    return this;
  }

  // ── Copy action ───────────────────────────────────────────────────────────

  private getScopedActionIcon(selector: string, requireVisible = true): ChainableEl {
    return cy.get('body').then(($body: JQuery<HTMLElement>) => {
      const scopedMessage = $body.find('[data-cy-active-user-message="true"]');
      if (scopedMessage.length > 0) {
        const scopedIcons = scopedMessage.find(selector);
        const scopedIcon = requireVisible ? scopedIcons.filter(':visible').first() : scopedIcons.first();
        if (scopedIcon.length > 0) {
          return cy.wrap(scopedIcon as JQuery<HTMLElement>);
        }
      }

      return cy.get(selector, { timeout: 10000 }).then(($icons: JQuery<HTMLElement>) => {
        const icon = requireVisible ? $icons.filter(':visible').first() : $icons.first();
        expect(icon.length, `action icon found for selector: ${selector}`).to.be.greaterThan(0);
        return cy.wrap(icon as JQuery<HTMLElement>);
      });
    });
  }

  getCopyIcon(): ChainableEl {
    return this.getScopedActionIcon(this.copyIconSelector);
  }

  clickCopyIcon() {
    this.getCopyIcon().click({ force: true });
    return this;
  }

  assertCopyConfirmation() {
    cy.get('body').should(($body: JQuery<HTMLElement>) => {
      const hasCopiedText = /copied/i.test($body.text());
      const hasToast = $body.find('[class*="toast"], [class*="snack"], [role="status"], [role="alert"]').filter(':visible').length > 0;
      const copyIconChangedLabel = $body.find('[aria-label*="copied"], [aria-label*="Copied"]').length > 0;
      expect(
        hasCopiedText || hasToast || copyIconChangedLabel,
        'copy confirmation visible',
      ).to.eq(true);
    });
    return this;
  }

  // ── Edit action ───────────────────────────────────────────────────────────

  getEditIcon(): ChainableEl {
    return this.getScopedActionIcon(this.editIconSelector, true);
  }

  clickEditIcon() {
    // requireVisible=true: wait until the icon is actually rendered before clicking,
    // preventing clicks on icons still hidden by CSS hover transitions.
    this.getScopedActionIcon(this.editIconSelector, true).click({ force: true });
    return this;
  }

  getEditTextarea(): ChainableEl {
    return cy.get(this.editTextareaSelector, { timeout: 10000 }).filter(':visible').first();
  }

  clearAndTypeInEditArea(newText: string) {
    this.getEditTextarea().type(`{selectall}{backspace}${newText}`, { delay: 0, force: true });
    return this;
  }

  saveEdit() {
    cy.get('body').then(($body: JQuery<HTMLElement>) => {
      const saveBtn = $body.find(this.editSaveSelector).filter(':visible');
      if (saveBtn.length > 0) {
        cy.wrap(saveBtn.first()).click({ force: true });
      } else {
        this.getEditTextarea().type('{enter}');
      }
    });
    return this;
  }

  cancelEdit() {
    cy.get('body').type('{esc}');
    return this;
  }

  assertEditAreaVisible() {
    // Prefer specific edit-mode selectors; fall back to any visible textarea only
    // if a specific selector already confirms edit mode is active.
    const specificSelectors = [
      '[data-testid="edit-prompt-input"]',
      '[data-cy="edit-prompt-input"]',
      '.edit-prompt-input',
      '.prompt-edit-area',
      'textarea.dbagent-textarea',
      'textarea.form-control',
    ].join(', ');

    cy.get('body', { timeout: 10000 }).should(($body) => {
      const specific = $body.find(specificSelectors).filter(':visible');
      const generic = $body.find('textarea').filter(':visible');
      // Edit mode is confirmed when a specific selector matches, OR when the
      // label is present alongside any visible textarea.
      const labelPresent =
        $body
          .find('*')
          .filter((_: number, el: Element) =>
            /Edit your prompt/i.test((el.textContent || '').trim()),
          )
          .filter(':visible').length > 0;
      expect(
        specific.length > 0 || (generic.length > 0 && labelPresent),
        'edit-mode textarea is visible',
      ).to.be.true;
    });
    return this;
  }

  assertEditModeLabelVisible() {
    // Use a .should() callback so Cypress retries until the label is visible,
    // which handles delayed renders and CSS transitions reliably.
    cy.get('body', { timeout: 15000 }).should(($body) => {
      const labelEl = $body
        .find('*')
        .filter((_: number, el: Element) =>
          /Edit your prompt/i.test((el.textContent || '').trim()),
        )
        .filter(':visible');
      expect(labelEl.length, '"Edit your prompt" label is visible').to.be.greaterThan(0);
    });
    return this;
  }

  assertEditModeLabelNotVisible() {
    cy.contains(this.editModeLabel).should('not.exist');
    return this;
  }

  assertEditAreaNotVisible() {
    cy.get('body').then(($body: JQuery<HTMLElement>) => {
      const editLabelVisible = $body
        .find('*')
        .filter((_, el: Element) => /Edit your prompt/i.test((el.textContent || '').trim()))
        .filter(':visible').length > 0;
      expect(editLabelVisible, 'edit mode label should not be visible').to.eq(false);
    });
    return this;
  }

  assertActionIconsHidden(context: string) {
    cy.get('body').then(($body: JQuery<HTMLElement>) => {
      const copyVisible = $body.find(this.copyIconSelector).filter(':visible').length > 0;
      const editVisible = $body.find(this.editIconSelector).filter(':visible').length > 0;
      expect(copyVisible || editVisible, `action icons hidden (${context})`).to.eq(false);
    });
    return this;
  }

  assertActionIconsHiddenForMessage(text: string, context: string) {
    // .should() with a callback retries until the assertion passes or
    // defaultCommandTimeout — handles the CSS hover transition without a
    // hardcoded sleep at the call site.
    this.getUserMessageContaining(text).should(($msg: JQuery<HTMLElement>) => {
      const copyVisible = $msg.find(this.copyIconSelector).filter(':visible').length > 0;
      const editVisible = $msg.find(this.editIconSelector).filter(':visible').length > 0;
      expect(copyVisible || editVisible, `action icons hidden (${context})`).to.eq(false);
    });
    return this;
  }

  getEditAreaCharCount(): Cypress.Chainable<number> {
    return this.getEditTextarea().then(($el: JQuery<HTMLElement>) => {
      const el = $el[0] as HTMLTextAreaElement;
      return (el.value || $el.text() || '').length;
    });
  }

  assertEditTextareaContains(text: string) {
    this.getEditTextarea().should('have.value', text);
    return this;
  }

  assertCharCounterReflectsCurrentLength() {
    this.getEditAreaCharCount().then((count: number) => {
      cy.get('body').invoke('text').then((bodyText: string) => {
        const pattern = new RegExp(`(\\d+)\\s*\\/\\s*${this.maxCharLimit}`, 'g');
        const matches = [...bodyText.matchAll(pattern)];

        expect(matches.length > 0, 'character counter is visible').to.eq(true);

        const displayed = Number(matches[matches.length - 1]?.[1] ?? NaN);
        expect(Number.isNaN(displayed), 'character counter numeric value').to.eq(false);
        expect(Math.abs(displayed - count) <= 1, 'character counter reflects current edit length').to.eq(true);
      });
    });
    return this;
  }

  assertUserMessageContains(text: string) {
    this.getLastUserMessage().invoke('text').should('include', text);
    return this;
  }

  assertUserMessageText(text: string) {
    this.getLastUserMessage().invoke('text').then((msgText: string) => {
      expect(msgText.replace(/\s+/g, ' ').trim()).to.include(text.replace(/\s+/g, ' ').trim());
    });
    return this;
  }
}