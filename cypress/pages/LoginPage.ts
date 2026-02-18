/// <reference types="cypress" />

export class LoginPage {
  // Selectors - Based on your actual app HTML
  private readonly logo = 'img[src*="aI-studio-logo"]';
  private readonly emailInput = '#email';
  private readonly passwordInput = '#password';
  private readonly loginButton = 'button[type="submit"]';

  // Visit page
  visitPage() {
    cy.visit('/');
  }

  // Element visibility checks - C669521
  isLogoAndTextVisible() {  // Logo and text are combined in the SVG image
    cy.get(this.logo)
      .should('be.visible')
      .and('have.attr', 'src')
      .and('include', 'aI-studio-logo');
    return this;
  }

  // C669522
  isEmailFieldVisible() {
    cy.get(this.emailInput).should('be.visible');
    return this;
  }

  // C669523
  isPasswordFieldVisible() {
    cy.get(this.passwordInput).should('be.visible');
    return this;
  }

  // C669524
  isLoginButtonVisible() {
    cy.get(this.loginButton).should('be.visible');
    return this;
  }

}
