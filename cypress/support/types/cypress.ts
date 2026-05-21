/** Reusable Cypress type aliases — keeps verbose generics out of page objects. */

export type ChainableEl = Cypress.Chainable<JQuery<HTMLElement>>;
export type ChainableVoid = Cypress.Chainable<void>;

export interface RequestCountRef {
  count: number;
}
