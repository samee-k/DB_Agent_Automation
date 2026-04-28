/// <reference types="cypress" />

declare global {
  namespace Cypress {
    interface Chainable {
      undo(): Chainable;
      getAccessToken(): Chainable<string>;
      undoJS(selector: string): Chainable;
      loginBySession(): Chainable<void>;
      loginByApi(): Chainable<void>;
      loginByApiSession(): Chainable<void>;
      clearSessionStorage(): Chainable<void>;
      clearChatsByProjectViaApi(): Chainable<void>;
      seedChatsByProjectViaApiIfEmpty(targetCount?: number, upperLimit?: number): Chainable<void>;
      ensureChatsByProjectMinCount(minCount?: number, upperLimit?: number): Chainable<void>;
    }
  }
}

export {};

