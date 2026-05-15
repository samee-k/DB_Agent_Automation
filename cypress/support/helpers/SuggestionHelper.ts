/// <reference types="cypress" />

import { InitialPromptPage } from '../pages/InitialPromptPage';

export const SUGGESTION_ITEM_SELECTOR = '.floating-suggestion-box .suggestion-item';
export const SUGGESTION_CONTAINER_SELECTOR = '.floating-suggestion-box';

export class SuggestionHelper {
  readonly page: InitialPromptPage;

  constructor(page: InitialPromptPage) {
    this.page = page;
  }

  // ── Suggestion visibility ──

  getVisibleSuggestions(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.get(SUGGESTION_ITEM_SELECTOR, { timeout: 15000 }).filter(':visible');
  }

  getVisibleSuggestionTexts(): Cypress.Chainable<string[]> {
    return this.getVisibleSuggestions().then(($options: JQuery<HTMLElement>) =>
      Array.from($options).map((option) => (option.textContent ?? '').trim()),
    );
  }

  // ── Input helpers ──

  typeInPrompt(text: string): void {
    this.page.clearPrompt();
    this.page.appendPrompt(text);
  }

  openSuggestions(seed = 'A'): void {
    this.typeInPrompt(seed);
  }

  readInputText(): Cypress.Chainable<string> {
    return this.page.inputValue().then((value) => String(value ?? ''));
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

}