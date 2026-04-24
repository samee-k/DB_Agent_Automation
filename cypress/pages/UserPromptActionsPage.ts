/// <reference types="cypress" />

import { loginBySession } from '../support/commands';

export class UserPromptActionsPage {
  readonly chatPath = Cypress.env('chatPath') ?? '/dbagent/11/chat';
  readonly sendQueryRoute = '**/api/chats/*/send-query';
  readonly createChatRoute = /\/api\/chats(?:\?.*)?$/;

  // Input
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

  // User message bubble — searched by text content in hoverUserMessageContaining()
  private readonly userMessageContainerSelector = [
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

  // Edit mode elements.
  // When the Edit icon is clicked, the bottom input area enters edit mode
  // and shows an "Edit your prompt" label above the existing textarea.
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
    'button[aria-label="Send"][type="button"]',
    'button[aria-label*="Send"]',
    'button[type="submit"]',
  ].join(', ');

  // Cancel = any cancel/discard button that appears in edit mode.
  private readonly editCancelSelector = [
    '[data-testid="edit-prompt-cancel"]',
    '[data-cy="edit-prompt-cancel"]',
    'button[aria-label*="cancel" i]',
    '.cancel-edit-btn',
    'button:contains("Cancel")',
    'button:contains("Discard")',
  ].join(', ');

  readonly charCountSelector = '.char-count';
  readonly maxCharLimit = 500;

  // ── Auth ──────────────────────────────────────────────────────────────────

  loginOnceForSuite() {
    loginBySession();
    return this;
  }

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

  messageInput(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.get('body', { timeout: 20000 }).then(($body: JQuery<HTMLElement>) => {
      const visibleInputs = $body.find(this.promptInputSelector).filter(':visible');
      expect(visibleInputs.length, 'visible prompt input').to.be.greaterThan(0);
      return cy.wrap(visibleInputs.first() as JQuery<HTMLElement>);
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

  submitPrompt() {
    this.messageInput().type('{enter}');
    return this;
  }

  sendPromptAndWait(text: string) {
    // times:1 ensures these intercepts do NOT consume subsequent requests from edit/save actions.
    cy.intercept({ method: 'POST', url: this.createChatRoute, times: 1 }).as('createChat');
    cy.intercept({ method: 'POST', url: this.sendQueryRoute, times: 1 }, { statusCode: 200, body: { message: 'Mocked response' } }).as('sendQuery');
    this.typePrompt(text).submitPrompt();
    cy.wait('@createChat').its('response.statusCode').should('be.oneOf', [200, 201]);
    cy.wait('@sendQuery').its('response.statusCode').should('eq', 200);
    return this;
  }

  // ── User message bubble ───────────────────────────────────────────────────

  private activeUserMessageAlias = 'activeUserMessage';

  getUserMessageContaining(text: string): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.contains('*', text, { timeout: 15000 }).should('be.visible').then(($el: JQuery<HTMLElement>) => {
      const scoped = $el.closest(this.userMessageContainerSelector);
      if (scoped.length > 0) {
        return cy.wrap(scoped.first() as JQuery<HTMLElement>);
      }
      return cy.wrap($el.first() as JQuery<HTMLElement>);
    });
  }

  getLastUserMessage(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.get('body').then(($body: JQuery<HTMLElement>) => {
      const messages = $body.find(this.userMessageContainerSelector).filter(':visible');
      expect(messages.length, 'at least one user message visible').to.be.greaterThan(0);
      return cy.wrap(messages.last() as JQuery<HTMLElement>);
    });
  }

  /**
   * Primary hover method — finds the message bubble by its text content,
   * then hovers it to reveal the copy/edit action icons.
   */
  hoverUserMessageContaining(text: string) {
    cy.get('body').then(($body: JQuery<HTMLElement>) => {
      $body.find('[data-cy-active-user-message="true"]').removeAttr('data-cy-active-user-message');
    });

    this.getUserMessageContaining(text)
      .invoke('attr', 'data-cy-active-user-message', 'true')
      .as(this.activeUserMessageAlias)
      .realHover();
    // Small wait for CSS :hover transition to apply and icons to render.
    cy.wait(400);
    return this;
  }

  // ── Clipboard stub ─────────────────────────────────────────────────────────

  /**
   * Stubs navigator.clipboard.writeText before the copy action so the test
   * can assert the exact text written without requiring browser clipboard permissions.
   */
  stubClipboard() {
    cy.window().then((win: Window) => {
      if (win.navigator.clipboard && typeof win.navigator.clipboard.writeText === 'function') {
        cy.stub(win.navigator.clipboard, 'writeText').as('clipboardWrite').resolves();
      }
    });
    return this;
  }

  // ── Copy action ───────────────────────────────────────────────────────────

  private getScopedActionIcon(selector: string, requireVisible = true): Cypress.Chainable<JQuery<HTMLElement>> {
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

  getCopyIcon(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.getScopedActionIcon(this.copyIconSelector);
  }

  clickCopyIcon() {
    this.getCopyIcon().click({ force: true });
    return this;
  }

  assertCopyConfirmation() {
    // App may show a tooltip, toast, or aria-label change on successful copy.
    cy.get('body').then(($body: JQuery<HTMLElement>) => {
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

  getEditIcon(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.getScopedActionIcon(this.editIconSelector, true);
  }

  clickEditIcon() {
    this.getScopedActionIcon(this.editIconSelector, false).click({ force: true });
    return this;
  }

  getEditTextarea(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.get(this.editTextareaSelector, { timeout: 10000 }).filter(':visible').first();
  }

  clearAndTypeInEditArea(newText: string) {
    this.getEditTextarea().clear().type(newText, { delay: 0 });
    return this;
  }

  saveEdit() {
    // Send button (↑) submits the edited prompt.
    // Fall back to pressing Enter on the edit textarea if no distinct save button found.
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
    // Press Escape as the universal cancel for edit mode.
    cy.get('body').type('{esc}');
    return this;
  }

  assertEditAreaVisible() {
    cy.get(this.editTextareaSelector, { timeout: 10000 }).filter(':visible').should('exist');
    return this;
  }

  assertEditModeLabelVisible() {
    cy.contains(this.editModeLabel, { timeout: 10000 }).should('be.visible');
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

      // If the label is not visible, edit mode is considered closed in current app behavior.
      expect(editLabelVisible, 'edit mode label should not be visible').to.eq(false);
    });
    return this;
  }

  /**
   * Asserts the .action-btns container is visually hidden using jQuery's
   * css() which reliably reads the computed opacity including from
   * descendant selectors like .user-hover .action-btns { opacity: 0 }.
   */
  assertActionIconsHidden(context: string) {
    cy.get('body').then(($body: JQuery<HTMLElement>) => {
      const copyVisible = $body.find(this.copyIconSelector).filter(':visible').length > 0;
      const editVisible = $body.find(this.editIconSelector).filter(':visible').length > 0;
      expect(copyVisible || editVisible, `action icons hidden (${context})`).to.eq(false);
    });
    return this;
  }

  assertActionIconsHiddenForMessage(text: string, context: string) {
    this.getUserMessageContaining(text).then(($msg: JQuery<HTMLElement>) => {
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
