/// <reference types="cypress" />

export class LoginPage {
  // Selectors - Based on your actual app HTML
  private readonly logo = 'img[src*="aI-studio-logo"]';
  private readonly emailInput = '#email';
  private readonly passwordInput = '#password';
  private readonly loginButton = 'button[type="submit"]';
  private readonly loginButtonAlt = 'button.btn.btn-primary.btn-lg > span';
  private readonly toastMessage = '.toast__error .text-black';


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

  //Login actions
  // C669525 
  login_username_required() {
    cy.get(this.loginButtonAlt).click();
  }
  // C669526
  login_password_required() {
    cy.fixture('users').then((users: any) => {
      cy.get(this.emailInput).type(users.validUser.email);
      cy.get(this.loginButtonAlt).click();
    });
  }

  // C669527 
  login_with_wrong_credential() {
    cy.fixture('users').then((users: any) => {
      cy.get(this.emailInput).type(users.invalidUser.email);
      cy.get(this.passwordInput).type(users.invalidUser.password);
      cy.get(this.loginButton).click();
    });
  }

    // Assertions
  shouldShowError(message: string) {
    cy.contains(message).should('be.visible');
    return this;
  }

  shouldShowErrorToast(message: string) {
    cy.get(this.toastMessage, { timeout: 10000 })
      .should('be.visible')
      .and('contain.text', message);
    return this;
  }

}
