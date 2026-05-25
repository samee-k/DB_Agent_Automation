/// <reference types="cypress" />

export interface SendPromptOptions {
  /** Timeout in ms for each waited alias. Defaults to TIMEOUTS.llmResponse. */
  timeout?: number;
  /** One or more cy.intercept aliases to wait on after submitting the prompt. */
  waitFor?: string | string[];
}

declare global {
  namespace Cypress {
    interface Chainable {
      undo(): Chainable;
      getAccessToken(): Chainable<string>;
      undoJS(selector: string): Chainable;
      loginBySession(): Chainable<void>;
      clearSessionStorage(): Chainable<void>;
      clearChatsByProjectViaApi(): Chainable<void>;
      seedChatsByProjectViaApiIfEmpty(targetCount?: number, upperLimit?: number): Chainable<void>;
      ensureChatsByProjectMinCount(minCount?: number, upperLimit?: number): Chainable<void>;
      sendPrompt(promptText: string, options?: SendPromptOptions): Chainable<void>;
    }
  }
}

