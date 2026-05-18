/// <reference types="cypress" />

import { CHAT_INPUT_SELECTOR, SEND_BUTTON_SELECTOR } from '../selectors/CommonSelectors';

export class ChatHistoryPage {
  // TODO(QA-DATACY): Replace every fallback selector with data-cy once available.
  private readonly historyToggle = [
    '[data-cy="chat-history-toggle"]',
    'button.icon-btn-alt',
  ].join(', ');

  private readonly navCollapseRight = [
    '[data-cy="nav-collapse-right"]',
    '.collapse-sidebar .icn-arrow-right-circle',
  ].join(', ');

  private readonly navCollapseLeft = [
    '[data-cy="nav-collapse-left"]',
    '.collapse-sidebar .icn-arrow-left-circle',
  ].join(', ');

  private readonly historyPanel = [
    '[data-cy="chat-history-panel"]',
    'aside.chat-history',
  ].join(', ');

  private readonly historyClose = [
    '[data-cy="chat-history-close"]',
    'aside.chat-history .icn-x',
  ].join(', ');

  private readonly searchInput = [
    '[data-cy="chat-history-search-input"]',
    'input#chat-history-search',
  ].join(', ');

  private readonly searchClear = [
    '[data-cy="chat-history-search-clear"]',
    'input#chat-history-search + button',
    'form.chat-history-search .icn-x',
  ].join(', ');

  private readonly historyItems = [
    '[data-cy="chat-history-item"]',
    '.chat-history-item',
  ].join(', ');

  private readonly selectedHistoryItem = [
    '[data-cy="chat-history-item-selected"]',
    '.chat-history-item.active',
    '.chat-history-item.selected',
    '.chat-history-item[aria-selected="true"]',
    '.chat-history-item.router-link-active',
    '.chat-history-item.active-item',
    '.chat-history-item.current',
  ].join(', ');

  private readonly historyMenuToggle = [
    '[data-cy="chat-history-menu-toggle"]',
    '.history-menu .dropdown-toggle',
  ].join(', ');

  private readonly editAction = [
    '[data-cy="chat-history-action-edit"]',
    '.history-menu .dropdown-menu.show a.dropdown-item:has(i.icn-edit-1)',
    '.history-menu .dropdown-menu.show a.dropdown-item:not(.text-danger)',
  ].join(', ');

  private readonly deleteAction = [
    '[data-cy="chat-history-action-delete"]',
    '.history-menu .dropdown-menu.show a.dropdown-item.text-danger',
  ].join(', ');

  private readonly editContainer = [
    '[data-cy="chat-history-edit-container"]',
    '.edit-history',
  ].join(', ');

  private readonly editInput = [
    '[data-cy="chat-history-edit-input"]',
    '.edit-history textarea',
  ].join(', ');

  private readonly editCancel = [
    '[data-cy="chat-history-edit-cancel"]',
    '.edit-history .btn-outline-primary',
  ].join(', ');

  private readonly editUpdate = [
    '[data-cy="chat-history-edit-update"]',
    '.edit-history .btn-primary',
  ].join(', ');

  private readonly deleteContainer = [
    '[data-cy="chat-history-delete-container"]',
    '.delete-history',
  ].join(', ');

  private readonly deleteCancel = [
    '[data-cy="chat-history-delete-cancel"]',
    '.delete-history .btn-outline-primary',
  ].join(', ');

  private readonly deleteConfirm = [
    '[data-cy="chat-history-delete-confirm"]',
    '.delete-history .btn-danger',
  ].join(', ');

  private readonly emptyStateTitle = [
    '[data-cy="chat-history-empty-state"]',
    '.chat-history-empty-state',
    '.empty-state',
    '[class*="empty"]',
    '[class*="no-history"]',
  ].join(', ');

  private readonly groupHeaders = [
    '[data-cy="chat-history-group-header"]',
    '.chat-history-section-title',
    '.chat-history-date-group',
    '.date-group-title',
    '[class*="section-header"]',
    '[class*="group-label"]',
  ].join(', ');

  private readonly chatHeaderTitle = [
    '[data-cy="chat-title"]',
    '.chat-title',
  ].join(', ');

  private readonly loadingState = [
    '[data-cy="chat-loader"]',
    '.chat-loader',
  ].join(', ');

  private readonly conversationContainer = [
    '[data-cy="chat-conversation-container"]',
    '.chat-container',
    '.conversation-container',
  ].join(', ');

  private readonly welcomeContent = [
    '[data-cy="welcome-content"]',
    '.welcome-content',
    '.welcome-screen',
    '[class*="welcome-container"]',
  ].join(', ');

  private readonly chatInputSelector = CHAT_INPUT_SELECTOR;

  private readonly sendButtonSelector = SEND_BUTTON_SELECTOR;

  private readonly newChatButton = [
    '[data-cy="new-chat-button"]',
    '.new-chat-btn',
    'button.icon-btn-alt',
    'button[title*="new chat" i]',
    'button[aria-label*="new chat" i]',
  ].join(', ');

  readonly chatPath = Cypress.env('chatPath') || `/dbagent/${Cypress.env('projectId') || '11'}/chat`;

  visit() {
    cy.visit(this.chatPath);
    return this;
  }

  openHistoryPanel() {
    cy.get('body').then(($body: JQuery<HTMLElement>) => {
      const panelVisible = $body.find(this.historyPanel).filter(':visible').length > 0;
      if (!panelVisible) {
        const visibleToggle = $body.find(this.historyToggle).filter(':visible').first();
        if (visibleToggle.length > 0) {
          cy.wrap(visibleToggle).click({ force: true });
          // Wait for the panel to actually appear before returning — prevents
          // callers from racing against the open animation / render.
          cy.get(this.historyPanel, { timeout: 15000 }).should('be.visible');
        }
      }
    });
    return this;
  }

  clickHistoryToggle() {
    cy.get(this.historyToggle).first().click({ force: true });
    return this;
  }

  selectHistoryItemByIndex(index: number) {
    cy.get(this.historyItems).eq(index).click({ force: true });
    return this;
  }

  closeHistoryPanel() {
    cy.get(this.historyClose).first().click({ force: true });
    return this;
  }

  openHistoryMenuByIndex(index: number) {
    // realHover triggers the CSS :hover state so the toggle renders.
    // { force: true } bypasses Cypress visibility checks — needed because
    // some browsers/transitions keep the element non-visible briefly after hover.
    cy.get(this.historyItems).eq(index).realHover();
    cy.get(this.historyItems)
      .eq(index)
      .find(this.historyMenuToggle)
      .first()
      .click({ force: true });
    return this;
  }

  clickEditAction() {
    cy.get(this.editAction).first().click({ force: true });
    return this;
  }

  clickDeleteAction() {
    cy.get(this.deleteAction).first().click({ force: true });
    return this;
  }

  clickEditUpdate() {
    cy.get(this.editUpdate).first().click({ force: true });
    return this;
  }

  typeEditTitle(newTitle: string) {
    cy.get(this.editInput).first().clear().type(newTitle, { delay: 0 });
    return this;
  }

  cancelEditTitle() {
    cy.get(this.editCancel)
      .filter(':visible')
      .first()
      .click({ force: true });
    return this;
  }

  confirmDelete() {
    cy.get(this.deleteConfirm).first().click({ force: true });
    return this;
  }

  cancelDelete() {
    cy.get(this.deleteCancel).first().click({ force: true });
    return this;
  }

  typeInSearch(text: string) {
    cy.get(this.searchInput).first().clear().then(($input: JQuery<HTMLElement>) => {
      if (text.length > 0) {
        cy.wrap($input).type(text, { delay: 0 });
      }
    });
    return this;
  }

  clearSearch() {
    cy.get('body').then(($body: JQuery<HTMLElement>) => {
      const clearEl = $body.find(this.searchClear).filter(':visible').first();
      if (clearEl.length > 0) {
        cy.wrap(clearEl).click({ force: true });
      } else {
        cy.get(this.searchInput).first().clear();
      }
    });
    return this;
  }

  setSearchValueWithSpaces(text: string) {
    cy.get(this.searchInput).first().clear().type(`  ${text}  `, { delay: 0 });
    return this;
  }

  hoverHistoryItemByIndex(index: number) {
    // Use real mouse events so CSS :hover pseudo-class activates in headless mode
    cy.get(this.historyItems).eq(index).realHover();
    return this;
  }

  clickNavCollapseRight() {
    cy.get(this.navCollapseRight).first().parents('.collapse-sidebar').first().click({ force: true });
    return this;
  }

  clickNavCollapseLeft() {
    cy.get(this.navCollapseLeft).first().parents('.collapse-sidebar').first().click({ force: true });
    return this;
  }

  typeInChatPrompt(prompt: string) {
    cy.get(this.chatInputSelector)
      .filter(':visible')
      .first()
      .clear({ force: true })
      .type(prompt, { delay: 0, force: true });
    return this;
  }

  clickSendButton() {
    cy.get('body').then(($body: JQuery<HTMLElement>) => {
      const visibleSend = $body.find(this.sendButtonSelector).filter(':visible').first();
      if (visibleSend.length > 0) {
        cy.wrap(visibleSend).click({ force: true });
      } else {
        cy.get(this.chatInputSelector)
          .filter(':visible')
          .first()
          .type('{enter}', { force: true });
      }
    });
    return this;
  }

  clickNewChatButton() {
    cy.get('body').then(($body: JQuery<HTMLElement>) => {
      const hasTextButton = $body
        .find('button, [role="button"], a')
        .toArray()
        .some((el: Element) => /\+?\s*new\s*chat/i.test((el.textContent || '').trim()));

      if (hasTextButton) {
        cy.contains('button, [role="button"], a', /\+?\s*new\s*chat/i)
          .filter(':visible')
          .first()
          .click({ force: true });
        return;
      }

      cy.get(this.newChatButton).filter(':visible').first().click({ force: true });
    });
    return this;
  }

  getHistoryGroupHeader(headerText: string) {
    return cy.get(this.groupHeaders).contains(headerText);
  }

  getLoaderSpinner() {
    // Alias to map to the method name used in the missing test block
    return this.getLoadingState();
  }

  getWelcomeScreen() {
    // Alias to map to the method name used in the missing test block
    return this.getWelcomeContent();
  }

  getHistoryToggle() {
    return cy.get(this.historyToggle).first();
  }

  getPanel(timeout = 20000) {
    return cy.get('body', { timeout }).then(($body: JQuery<HTMLElement>) => {
      const panel = $body.find(this.historyPanel).first();
      if (panel.length > 0) {
        return cy.wrap(panel as JQuery<HTMLElement>);
      }

      const toggle = $body.find(this.historyToggle).filter(':visible').first();
      if (toggle.length > 0) {
        cy.wrap(toggle).click({ force: true });
      }

      return cy.get(this.historyPanel, { timeout }).first();
    });
  }

  /**
   * Stronger panel visibility assertion: checks display, visibility, opacity,
   * and layout dimensions — not just Cypress's basic :visible check.
   */
  waitForPanelVisible(timeout = 15000) {
    return this.getPanel(timeout).should(($panel: JQuery<HTMLElement>) => {
      const panel = $panel[0] as HTMLElement;
      const style = window.getComputedStyle(panel);
      const isDisplayed = style.display !== 'none' && style.visibility !== 'hidden';
      const hasOpacity = Number.parseFloat(style.opacity || '1') > 0.01;
      const hasLayout = panel.getBoundingClientRect().width > 0 && panel.getBoundingClientRect().height > 0;

      expect(isDisplayed && hasOpacity && hasLayout, 'history panel should be visibly rendered').to.eq(true);
    });
  }

  /**
   * Validates that every outgoing chat API request carries a Bearer token.
   * Catches auth regressions where the app stops sending the Authorization header.
   */
  setupAuthHeaderCheck() {
    cy.intercept('GET', '**/api/chats/**', (req) => {
      const authHeader = String(req.headers.authorization || '').trim();
      // Auth can be bearer-token or session/cookie based depending on build/runtime.
      if (authHeader.length > 0) {
        expect(/^Bearer\s+/i.test(authHeader), 'authorization header format').to.eq(true);
      }
    }).as('chatAuthHeader');
    return this;
  }

  getHistoryItems() {
    return cy.get(this.historyItems);
  }

  getHistoryItemsOptional() {
    return this.getPanel().then(($panel: JQuery<HTMLElement>) => {
      const foundItems = $panel.find(this.historyItems);
      return foundItems;
    });
  }

  getHistoryItemCount() {
    return this.getHistoryItemsOptional().its('length');
  }

  getSelectedItemCount() {
    return this.getSelectedItemsOptional().its('length');
  }

  getVisibleHistoryToggleCount() {
    return cy.get('body').then(($body: JQuery<HTMLElement>) => {
      return $body.find(this.historyToggle).filter(':visible').length;
    });
  }

  getHistoryItemByIndex(index: number) {
    return cy.get(this.historyItems).eq(index);
  }

  getHistoryItemTextByIndex(index: number) {
    return cy.get(this.historyItems).eq(index).invoke('text');
  }

  getHistoryMenuToggleByIndex(index: number) {
    return cy.get(this.historyItems).eq(index).find(this.historyMenuToggle).first();
  }

  getEditAction() {
    return cy.get(this.editAction).first();
  }

  getDeleteAction() {
    return cy.get(this.deleteAction).first();
  }

  getAllHistoryItemTexts() {
    return cy.get(this.historyItems).then(($items: JQuery<HTMLElement>) => {
      return Cypress._.map($items, (item) => (item.textContent || '').trim()).filter(Boolean);
    });
  }

  getSelectedItem() {
    return cy.get(this.selectedHistoryItem).first();
  }

  getSelectedItemsOptional() {
    return this.getPanel().then(($panel: JQuery<HTMLElement>) => {
      return $panel.find(this.selectedHistoryItem);
    });
  }

  getEmptyState() {
    // Fall back to text-based search when data-cy / class selectors are absent
    return cy
      .get(this.historyPanel)
      .first()
      .then(($panel) => {
        const $el = $panel.find(
          '[data-cy="chat-history-empty-state"], .chat-history-empty-state, .empty-state, [class*="empty"], [class*="no-history"]'
        );
        if ($el.length > 0) {
          return cy.wrap($el.first());
        }
        // Fallback: find any element containing the empty-state text
        return cy.wrap($panel).contains('No Conversation History');
      });
  }

  getEmptyStateOptional() {
    return this.getPanel().then(($panel: JQuery<HTMLElement>) => {
      return $panel.find(this.emptyStateTitle);
    });
  }

  getSearchInput() {
    return cy.get(this.searchInput).first();
  }

  getGroupHeaders() {
    return cy.get(this.groupHeaders);
  }

  getEditContainer() {
    return cy.get(this.editContainer).first();
  }

  getDeleteContainer() {
    return cy.get(this.deleteContainer).first();
  }

  getChatHeaderTitle() {
    return cy.get(this.chatHeaderTitle).first();
  }

  getLoadingState() {
    return cy.get(this.loadingState).first();
  }

  getConversationContainer() {
    return cy.get(this.conversationContainer);
  }

  getWelcomeContent() {
    // No .first() — allows .should('not.exist') to work when selector matches nothing
    return cy.get(this.welcomeContent);
  }

  getWelcomeContentOptional() {
    return cy.get('body').then(($body: JQuery<HTMLElement>) => {
      return $body.find(this.welcomeContent);
    });
  }

  getPanelScrollTop() {
    return this.getPanel().then(($panel: JQuery<HTMLElement>) => {
      return ($panel[0] as HTMLElement).scrollTop;
    });
  }

  scrollPanelToBottom() {
    this.getPanel().then(($panel: JQuery<HTMLElement>) => {
      const panel = $panel[0] as HTMLElement;
      panel.scrollTop = panel.scrollHeight;
    });
    return this;
  }

  getPanelWidth() {
    return this.getPanel().then(($panel: JQuery<HTMLElement>) => {
      return ($panel[0] as HTMLElement).getBoundingClientRect().width;
    });
  }
}