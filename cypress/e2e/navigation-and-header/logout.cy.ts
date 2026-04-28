/// <reference types="cypress" />

import { loginBySession } from '../../support/commands';

describe('Navigation and Header - Logout', () => {
  const chatPath = Cypress.env('chatPath') ?? '/dbagent/11/chat';

  // Selectors for a user-profile / avatar dropdown that typically houses the logout option.
  // Uses a broad fallback chain so the tests survive minor markup changes.
  const profileMenuSelectors = [
    '[data-cy="user-menu"]',
    '[data-testid="user-menu"]',
    '.user-profile',
    '.user-avatar',
    '.profile-menu',
    'button[aria-label*="user" i]',
    'button[aria-label*="profile" i]',
    '[class*="avatar"]',
    '[class*="user-icon"]',
  ].join(', ');

  /**
   * Attempts to open a profile/user-menu dropdown and then clicks the logout item.
   * If no profile menu is found, it falls back to directly looking for "Log out" text.
   */
  const performLogout = () => {
    cy.get('body').then(($body: JQuery<HTMLElement>) => {
      const hasProfileMenu = $body.find(profileMenuSelectors).filter(':visible').length > 0;
      if (hasProfileMenu) {
        cy.get(profileMenuSelectors).filter(':visible').first().click({ force: true });
      }
    });
    cy.contains(/log.?out/i, { timeout: 10000 }).filter(':visible').first().click({ force: true });
  };

  beforeEach(() => {
    loginBySession();
    cy.visit(chatPath);
  });

  // Verify the logout option is accessible from within the authenticated application.
  it('Verify that a logout option is accessible from the authenticated application', () => {
    cy.get('body').then(($body: JQuery<HTMLElement>) => {
      const hasProfileMenu = $body.find(profileMenuSelectors).filter(':visible').length > 0;
      if (hasProfileMenu) {
        cy.get(profileMenuSelectors).filter(':visible').first().click({ force: true });
      }
    });

    cy.contains(/log.?out/i, { timeout: 10000 }).should('exist');
  });

  // Verify that clicking logout redirects the user to the login page.
  it('Verify that clicking logout redirects the user to the login page', () => {
    performLogout();
    cy.url({ timeout: 15000 }).should('include', '/login');
  });

  // Verify that after logout, visiting a protected chat route redirects back to login.
  it('Verify that after logout, visiting a protected route redirects to the login page', () => {
    performLogout();
    cy.url({ timeout: 15000 }).should('include', '/login');

    // Attempt to access the protected chat route without a valid session.
    cy.visit(chatPath);
    cy.url({ timeout: 15000 }).should('include', '/login');
  });
});
