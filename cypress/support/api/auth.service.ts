/// <reference types="cypress" />

import { UsersFixture, Credentials } from '../types';
import { LOGIN_BUTTON_SELECTOR } from '../selectors/CommonSelectors';

function isPlaceholderCredential(value: string): boolean {
  return value.includes('__SET_VIA_CYPRESS_');
}

function resolveValidCredentials(users: UsersFixture): Credentials {
  const email = String(Cypress.env('USER_EMAIL') || users.validUser.email || '').trim();
  const password = String(Cypress.env('USER_PASSWORD') || users.validUser.password || '').trim();

  if (!email || !password || isPlaceholderCredential(email) || isPlaceholderCredential(password)) {
    throw new Error(
      'Valid credentials not resolved. Set CYPRESS_USER_EMAIL and CYPRESS_USER_PASSWORD in the same terminal before running Cypress.',
    );
  }

  return { email, password };
}

export function loginBySessionUi() {
  cy.session('login-session', () => {
    cy.visit('/login');
    cy.fixture<UsersFixture>('users').then((users) => {
      const credentials = resolveValidCredentials(users);
      cy.get('#email').type(credentials.email);
      cy.get('#password').type(credentials.password);
      cy.get(LOGIN_BUTTON_SELECTOR).filter(':visible').first().click();
      cy.url({ timeout: 30000 }).should('not.include', '/login');
    });
  }, {
    cacheAcrossSpecs: true,
    validate: () => {
      cy.window().its('localStorage.access_token').should('be.a', 'string').and('not.be.empty');
    },
  });
}

