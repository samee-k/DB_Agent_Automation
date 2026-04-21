/// <reference types="cypress" />

export class LoginPage {
  // Selectors - Based on your actual app HTML
  private readonly logo = 'img[src*="aI-studio-logo"]';
  private readonly emailInput = '#email';
  private readonly passwordInput = '#password';
  private readonly loginButton = 'button[type="submit"]';
  private readonly loginButtonAlt = 'button.btn.btn-primary.btn-lg > span';
  private readonly toastMessage = '.toast__error .text-black';
  private readonly passwordToggle = '.pwd-block button, .password-toggle, [data-cy="toggle-password"]';

  private isPlaceholderCredential(value: string): boolean {
    return value.includes('__SET_VIA_CYPRESS_');
  }

  private getValidCredentials() {
    return cy.fixture('users').then((users: any) => {
      const email = String(Cypress.env('USER_EMAIL') || users.validUser.email || '').trim();
      const password = String(Cypress.env('USER_PASSWORD') || users.validUser.password || '').trim();

      if (!email || !password || this.isPlaceholderCredential(email) || this.isPlaceholderCredential(password)) {
        throw new Error(
          'Valid credentials not resolved for LoginPage. Set CYPRESS_USER_EMAIL and CYPRESS_USER_PASSWORD before running tests.',
        );
      }

      return { email, password, users };
    });
  }

  // Visit page
  visitPage() {
    cy.visit('/login');
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
    this.getValidCredentials().then(({ email }) => {
      cy.get(this.emailInput).type(email);
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

  // C669528
  login_with_right_credential() {
    cy.visit('/login');
    this.getValidCredentials().then(({ email, password }) => {
      cy.get(this.emailInput).type(email);
      cy.get(this.passwordInput).type(password);
      cy.get(this.loginButton).click();
    });
  }

  // C688018
  login_with_empty_fields() {
    cy.get(this.loginButtonAlt).click();
  }

  // C688019
  login_with_email_spaces(email: string) {
    this.getValidCredentials().then(({ password }) => {
      cy.get(this.emailInput).type(email);
      cy.get(this.passwordInput).type(password);
      cy.get(this.loginButton).click();
    });
  }

  // C715140 - Email validation
  fillEmailAndAttemptLogin(email: string, password: string) {
    cy.get(this.emailInput).clear().type(email);
    cy.get(this.passwordInput).clear().type(password);
    cy.get(this.loginButton).click();
    return this;
  }

  // C715141
  login_with_password_spaces() {
    this.getValidCredentials().then(({ email, password }) => {
      const passwordWithSpaces = `  ${password}  `;
      cy.get(this.emailInput).type(email);
      cy.get(this.passwordInput).type(passwordWithSpaces);
      cy.get(this.loginButton).click();
    });
  }

  // C715142 - Login with Enter key
  login_with_enter_key() {
    this.getValidCredentials().then(({ email, password }) => {
      cy.get(this.emailInput).type(email);
      cy.get(this.passwordInput).type(password).type('{enter}');
    });
  }
  
  // Individual field actions
  fillPassword(password: string) {
    cy.get(this.passwordInput).clear().type(password);
    return this;
  }

  // Password masking and visibility
  isPasswordMasked() {
    cy.get(this.passwordInput).should('have.attr', 'type', 'password');
    return this;
  }

  togglePasswordVisibility() {
    cy.get(this.passwordToggle).click();
    return this;
  }

  isPasswordVisible() {
    cy.get(this.passwordInput).should('have.attr', 'type', 'text');
    return this;
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
