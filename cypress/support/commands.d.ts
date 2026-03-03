/// <reference types="cypress" />

declare global {
  namespace Cypress {
    interface Chainable {
      undo(): Chainable;
      undoJS(selector: string): Chainable;
    }
  }
}

export {};

