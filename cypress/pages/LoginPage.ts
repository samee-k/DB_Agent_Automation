/// <reference types="cypress" />

export class LoginPage {
  private readonly logo = 'img[src*="aI-studio-logo"]';
  private readonly emailInput = '#email';
  private readonly passwordInput = '#password';
  private readonly loginButton = 'button[type="submit"]';
  private readonly toastMessage = '.toast__error .text-black';
  private readonly passwordToggle = '.pwd-block button, .password-toggle, [data-cy="toggle-password"]';

  visitPage() {
    cy.visit('/login');
  }

  getLogo() {
    return cy.get(this.logo);
  }

  getEmailInput() {
    return cy.get(this.emailInput);
  }

  getPasswordInput() {
    return cy.get(this.passwordInput);
  }

  getLoginButton() {
    return cy.get(this.loginButton);
  }

  getToastMessage() {
    return cy.get(this.toastMessage, { timeout: 10000 });
  }

  enterEmail(email: string) {
    cy.get(this.emailInput).clear().type(email);
    return this;
  }

  enterPassword(password: string) {
    cy.get(this.passwordInput).clear().type(password);
    return this;
  }

  clickLoginButton() {
    cy.get(this.loginButton).click();
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
