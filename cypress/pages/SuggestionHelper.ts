/// <reference types="cypress" />

import { InitialPromptPage } from './InitialPromptPage';

export const SUGGESTION_ITEM_SELECTOR = '.floating-suggestion-box .suggestion-item';
export const SUGGESTION_CONTAINER_SELECTOR = '.floating-suggestion-box';

export class SuggestionHelper {
  readonly page: InitialPromptPage;

  constructor(page: InitialPromptPage) {
    this.page = page;
  }

  // ── Suggestion visibility ──

  getVisibleSuggestions(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.get(SUGGESTION_ITEM_SELECTOR, { timeout: 15000 }).filter(':visible').should('have.length.greaterThan', 0);
  }

  getVisibleSuggestionTexts(): Cypress.Chainable<string[]> {
    return this.getVisibleSuggestions().then(($options: JQuery<HTMLElement>) =>
      Array.from($options).map((option) => (option.textContent ?? '').trim()),
    );
  }

  expectSuggestionsVisible(): void {
    cy.get(SUGGESTION_ITEM_SELECTOR).filter(':visible').should('have.length.greaterThan', 0);
  }

  expectSuggestionsHidden(): void {
    cy.get('body').then(($body: JQuery<HTMLElement>) => {
      const visible = $body.find(SUGGESTION_ITEM_SELECTOR).filter(':visible');
      expect(visible.length, 'suggestions should be hidden').to.eq(0);
    });
  }

  expectSuggestionContainer(): void {
    cy.get(SUGGESTION_CONTAINER_SELECTOR).filter(':visible').should('exist');
  }

  // ── Input helpers ──

  typeInPrompt(text: string): void {
    this.page.clearPrompt();
    this.page.appendPrompt(text);
  }

  openSuggestions(seed = 'A'): void {
    this.typeInPrompt(seed);
    this.expectSuggestionsVisible();
  }

  readInputText(): Cypress.Chainable<string> {
    return this.page.inputValue().then((value) => String(value ?? ''));
  }

  stubChatRequest(): void {
    cy.intercept('POST', '**/chat**', { statusCode: 200, body: { message: 'Mocked response' } }).as('chatRequest');
  }

  // ── Selection state helpers ──

  isOptionSelected(option: HTMLElement): boolean {
    const byAria = option.getAttribute('aria-selected') === 'true';
    const byData = option.getAttribute('data-selected') === 'true' || option.getAttribute('data-active') === 'true';
    const byClass = /selected|active|highlight|focused/i.test(option.className ?? '');
    return byAria || byData || byClass;
  }

  isOptionHovered(option: HTMLElement): boolean {
    let hovered = document.querySelector(':hover') as HTMLElement | null;
    while (hovered) {
      if (hovered === option) {
        return true;
      }
      hovered = hovered.parentElement;
    }
    return false;
  }

  getSelectedCount(): Cypress.Chainable<number> {
    return cy.get('body').then(($body: JQuery<HTMLElement>) => {
      return $body.find(SUGGESTION_ITEM_SELECTOR).filter(':visible').toArray().filter((el) => this.isOptionSelected(el)).length;
    });
  }

  getSelectedText(): Cypress.Chainable<string> {
    return cy.get('body').then(($body: JQuery<HTMLElement>) => {
      const selected = $body.find(SUGGESTION_ITEM_SELECTOR).filter(':visible').toArray().find((el) => this.isOptionSelected(el));
      return (selected?.textContent ?? '').trim();
    });
  }

  // ── Common setup (call at suite level) ──

  setupSuite(): void {
    this.page.loginOnceForSuite();
  }

  setupTest(): void {
    this.page.openChatPage().waitForWelcomeScreen();
    this.page.clearPrompt();
  }
}
