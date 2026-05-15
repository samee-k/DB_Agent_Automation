/// <reference types="cypress" />

export class NewChatPage {
  readonly chatPath = Cypress.env('chatPath') ?? '/dbagent/11/chat';
  readonly createChatRoute = /\/api\/chats(?:\?.*)?$/;
  readonly sendQueryRoute = '**/api/chats/*/send-query';

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

  private readonly welcomeTitleRegex = /Welcome to DB Agent/i;
  private readonly chatTitleSelectors = [
    '[data-testid="chat-title"]',
    '[data-testid*="title"]',
    '[data-cy="chat-title"]',
    '.chat-title',
    '.chat-header .text-truncate',
    'header .text-truncate',
    'p.text-truncate',
    'header h1',
    'header h2',
    'h1',
    'h2',
  ].join(', ');

  openChatPage() {
    cy.visit(this.chatPath);
    return this;
  }

  waitForWelcomeScreen() {
    cy.contains(this.welcomeTitleRegex, { timeout: 30000 }).should('be.visible');
    return this;
  }

  newChatAction() {
    return cy
      .contains('button, [role="button"], a', /\+?\s*new\s*chat/i)
      .filter(':visible')
      .first();
  }

  messageInput(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.get('body', { timeout: 20000 }).then(($body: JQuery<HTMLElement>) => {
      const visibleInputs = $body.find(this.promptInputSelector).filter(':visible');

      expect(
        visibleInputs.length,
        `visible input count for selectors: ${this.promptInputSelector}`,
      ).to.be.greaterThan(0);

      return cy.wrap(visibleInputs.first() as JQuery<HTMLElement>);
    });
  }

  typePrompt(promptText: string) {
    this.messageInput().then(($input: JQuery<HTMLElement>) => {
      const inputElement = $input[0] as HTMLElement;
      const isContentEditable = inputElement.getAttribute('contenteditable') === 'true' || inputElement.isContentEditable;

      cy.wrap($input).click();
      if (!isContentEditable) {
        cy.wrap($input).clear();
      }
      cy.wrap($input).type(promptText, { delay: 0 });
    });

    return this;
  }

  submitPromptWithEnter() {
    this.messageInput().type('{enter}');
    return this;
  }

  clickNewChat() {
    this.newChatAction().click({ force: true });
    return this;
  }

  assertNewChatIsDisabled() {
    this.newChatAction().should(($button: JQuery<HTMLElement>) => {
      const isDisabledAttr = $button.is(':disabled');
      const ariaDisabled = String($button.attr('aria-disabled') || '').toLowerCase() === 'true';
      const hasDisabledClass = /disabled/i.test($button.attr('class') || '');
      const style = window.getComputedStyle($button[0]);
      const hasBlockedPointer = style.pointerEvents === 'none';

      expect(
        isDisabledAttr || ariaDisabled || hasDisabledClass || hasBlockedPointer,
        'new chat disabled state',
      ).to.eq(true);
    });

    return this;
  }

  assertNewChatIsEnabled() {
    this.newChatAction().should(($button: JQuery<HTMLElement>) => {
      const isDisabledAttr = $button.is(':disabled');
      const ariaDisabled = String($button.attr('aria-disabled') || '').toLowerCase() === 'true';
      const hasDisabledClass = /disabled/i.test($button.attr('class') || '');
      const style = window.getComputedStyle($button[0]);
      const hasBlockedPointer = style.pointerEvents === 'none';

      expect(
        isDisabledAttr || ariaDisabled || hasDisabledClass || hasBlockedPointer,
        'new chat enabled state',
      ).to.eq(false);
    });

    return this;
  }

  assertInputCleared() {
    this.messageInput().then(($input: JQuery<HTMLElement>) => {
      const inputElement = $input[0] as HTMLElement;
      const isContentEditable = inputElement.getAttribute('contenteditable') === 'true' || inputElement.isContentEditable;

      if (isContentEditable) {
        expect(($input.text() || '').trim()).to.eq('');
      } else {
        const value = $input.val();
        const normalized = Array.isArray(value) ? value.join(' ') : String(value ?? '');
        expect(normalized.trim()).to.eq('');
      }
    });

    return this;
  }

  readChatHeaderTitle() {
    return cy.get('body').then(($body: JQuery<HTMLElement>) => {
      const titleElements = $body.find(this.chatTitleSelectors).filter(':visible');
      const normalizedTitles = Array.from(titleElements)
        .map((element: Element) => (element.textContent || '').replace(/\s+/g, ' ').trim())
        .filter((text: string) => text.length > 0 && !/new\s*chat/i.test(text));

      return normalizedTitles[0] || '';
    });
  }

  static extractChatIdFromSendQueryUrl(url: string): string {
    const match = url.match(/\/api\/chats\/([^/]+)\/send-query/i);
    return match?.[1] || '';
  }
}
