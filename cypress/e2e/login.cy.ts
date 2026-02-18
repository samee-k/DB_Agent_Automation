/// <reference types="cypress" />

import { LoginPage } from '../pages/LoginPage';

describe('Login Feature', () => {
  const loginPage = new LoginPage();

  beforeEach(() => {
    loginPage.visitPage();
    cy.wait(2000);
  });

  // C669521 - AI Studio logo and text present
  it('C669521 - Verify that the AI Studio logo and text are present on the login page', () => {
    loginPage.isLogoAndTextVisible();
  });

  // C669522 - Email field presence
  it('C669522 - Verify that the Email field is present on the login page', () => {
    loginPage.isEmailFieldVisible();
  });

  // C669523 - Password field presence
  it('C669523 - Verify that the Password field is present on the login page', () => {
    loginPage.isPasswordFieldVisible();
  });

  // C669524 - Login button presence
  it('C669524 - Verify that the Login button is present on the login page', () => {
    loginPage.isLoginButtonVisible();
  });

  // C669525 - Email field required
  it('C669525 - Verify that Email field should be required field', () => {
    loginPage.login_username_required();
    cy.wait(2000);
    loginPage.shouldShowError('This field is required');
  });

  // C669526 - Password field required
  it('C669526 - Verify that password field should be required field', () => {
    loginPage.login_password_required();
    cy.wait(2000);
    loginPage.shouldShowError('This field is required');
  });
});
