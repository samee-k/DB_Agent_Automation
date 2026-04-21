/// <reference types="cypress" />

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

  private readonly chatInput = [
    '[data-cy="chat-input"]',
    'textarea.chat-input',
    'textarea[placeholder*="Ask here" i]',
    '[role="textbox"][placeholder*="Ask here" i]',
    '[data-testid="chat-input"]',
    '[data-testid="message-input"]',
    '[role="textbox"]',
    '[contenteditable="true"]',
    '.ProseMirror',
    '.ql-editor',
  ].join(', ');

  private readonly sendButton = [
    '[data-cy="send-button"]',
    'button[aria-label="Send"]',
  ].join(', ');

  private readonly newChatButton = [
    '[data-cy="new-chat-button"]',
    '.new-chat-btn',
    'button.icon-btn-alt',
    'button[title*="new chat" i]',
    'button[aria-label*="new chat" i]',
  ].join(', ');

  readonly chatPath = Cypress.env('chatPath') || `/dbagent/${Cypress.env('projectId') || '11'}/chat`;

  visitChatPage() {
    cy.visit(this.chatPath);
    return this;
  }

  setupAuthHeaderCheck() {
    cy.intercept('GET', '**/api/chats/**', (req) => {
      expect(String(req.headers.authorization || '')).to.include('Bearer');
    }).as('chatAuthHeader');
    return this;
  }

  interceptGetChatsByProject() {
    const projectId = Cypress.env('projectId') || '11';
    cy.intercept('GET', `**/api/chats/by-project/${projectId}*`).as('getChatsByProject');
    return this;
  }

  interceptUpdateTitle() {
    cy.intercept('PATCH', '**/api/chats/*/update-title').as('updateChatTitle');
    return this;
  }

  interceptDeleteChat() {
    cy.intercept('DELETE', '**/api/chats/*').as('deleteChat');
    return this;
  }

  interceptSendQuery() {
    cy.intercept('POST', '**/api/chats/*/send-query').as('sendQuery');
    return this;
  }

  interceptSearchByProject() {
    const projectId = Cypress.env('projectId') || '11';
    cy.intercept('GET', `**/api/chats/by-project/${projectId}?search=*`).as('searchChatsByProject');
    return this;
  }

  openHistoryPanel() {
    cy.get('body').then(($body: JQuery<HTMLElement>) => {
      const panelVisible = $body.find(this.historyPanel).filter(':visible').length > 0;
      if (!panelVisible) {
        const visibleToggle = $body.find(this.historyToggle).filter(':visible').first();
        if (visibleToggle.length > 0) {
          cy.wrap(visibleToggle).click({ force: true });
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

  updateTitle(newTitle: string) {
    this.typeEditTitle(newTitle);
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
    cy.get(this.chatInput)
      .filter(':visible')
      .first()
      .clear({ force: true })
      .type(prompt, { delay: 0, force: true });
    return this;
  }

  clickSendButton() {
    cy.get('body').then(($body: JQuery<HTMLElement>) => {
      const visibleSend = $body.find(this.sendButton).filter(':visible').first();
      if (visibleSend.length > 0) {
        cy.wrap(visibleSend).click({ force: true });
      } else {
        cy.get(this.chatInput)
          .filter(':visible')
          .first()
          .type('{enter}', { force: true });
      }
    });
    return this;
  }

  clickNewChatButton() {
    cy.get(this.newChatButton).filter(':visible').first().click({ force: true });
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

  getPanel() {
    return cy.get(this.historyPanel).first();
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

  waitForHistoryItemCountAtLeast(minCount: number, timeout = 20000) {
    return cy.get(this.historyPanel, { timeout }).first().should(($panel: JQuery<HTMLElement>) => {
      const count = $panel.find(this.historyItems).length;
      expect(count, `history items count >= ${minCount}`).to.be.gte(minCount);
    });
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