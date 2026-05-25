/// <reference types="cypress" />

import { UsersFixture, Credentials } from '../types';

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

function stubBootstrapApis(): void {
  const testEmail = String(Cypress.env('USER_EMAIL') || 'test@example.com').trim();

  cy.intercept('GET', '**/engine', { statusCode: 200, body: { data: [] } }).as('engines');
  cy.intercept('GET', '**/engine/dynamic-engine', { statusCode: 200, body: { data: [] } }).as('dynamicEngines');
  cy.intercept('GET', '**/users/get-loggedIn-user', {
    statusCode: 200,
    body: {
      data: {
        email: testEmail,
        firstName: 'Test',
        lastName: 'User',
        profileImageUrl: null,
      },
    },
  }).as('userDetail');
  cy.intercept('GET', '**/users/get-user-role-by-userId*', {
    statusCode: 200,
    body: { data: { role: 'Admin' } },
  }).as('userRole');
  cy.intercept('GET', '**/users/all-user-projects', { statusCode: 200, body: { data: [] } }).as('userProjects');
  cy.intercept('GET', '**/notifications**', { statusCode: 200, body: { data: [] } }).as('notifications');
}

export function loginBySessionUi() {
  cy.session('login-session', () => {
    cy.visit('/login');
    cy.fixture<UsersFixture>('users').then((users) => {
      const credentials = resolveValidCredentials(users);
      cy.get('#email').type(credentials.email);
      cy.get('#password').type(credentials.password);
      cy.get('button.btn.btn-primary.btn-lg > span').click();
      cy.url({ timeout: 30000 }).should('not.include', '/login');
    });
  }, { cacheAcrossSpecs: true });

  stubBootstrapApis();
}

