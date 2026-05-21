/// <reference types="cypress" />

import { ChainableEl } from '../types';

export class LoginPage {
  private readonly logo = 'img[src*="aI-studio-logo"]';
  private readonly emailInput = '#email';
  private readonly passwordInput = '#password';
  private readonly loginButton = [
    '[data-cy="login-button"]',
    'button[type="submit"]',
    'button.btn.btn-primary.btn-lg',
  ].join(', ');
  private readonly toastMessage = '.toast__error .text-black';
  private readonly passwordToggle = '.pwd-block button, .password-toggle, [data-cy="toggle-password"]';

  visitPage() {
    cy.visit('/login');
  }

  getLogo(): ChainableEl {
    return cy.get(this.logo);
  }

  getEmailInput(): ChainableEl {
    return cy.get(this.emailInput);
  }

  getPasswordInput(): ChainableEl {
    return cy.get(this.passwordInput);
  }

  getLoginButton(): ChainableEl {
    return cy.get(this.loginButton).filter(':visible').first();
  }

  getToastMessage(): ChainableEl {
    return cy.get(this.toastMessage, { timeout: 10000 });
  }

  enterEmail(email: string) {
    cy.get(this.emailInput).clear();
    cy.get(this.emailInput).type(email);
    return this;
  }

  enterPassword(password: string) {
    cy.get(this.passwordInput).clear();
    cy.get(this.passwordInput).type(password);
    return this;
  }

  clickLoginButton() {
    this.getLoginButton().click();
    return this;
  }

  submitWithEnterFromPassword() {
    cy.get(this.passwordInput).type('{enter}');
    return this;
  }

  togglePasswordVisibility() {
    cy.get(this.passwordToggle).click();
    return this;
  }
}
