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

  
  // C669527 - Wrong credentials blocked & Show Invalid Login Credentials.
  it('C669527 - Verify that the user cannot login with invalid credentials and receives the \'Invalid Login Credentials\' pop-up.', () => {
    loginPage.login_with_wrong_credential();
    cy.wait(2000);
    
    // Verify the Toastify error message appears
    loginPage.shouldShowErrorToast('Invalid Login Credentials.');
    
    // Verify user is still on login page (login failed)
    loginPage.isLoginButtonVisible();
  });

  // C669528 - Correct credentials allowed
  it('C669528 - Verify that the user should be allowed to login with correct user name and password.', () => {
    loginPage.login_with_right_credential();
    cy.url().should('not.include', '/login');
    //TODO: cy.contains('Studio Projects').should('be.visible');
  });

  // C688018 - Validation when both fields empty
  it('C688018 - Verify that validation appears when both Email and Password fields are left empty', () => {
    loginPage.login_with_empty_fields();
    cy.wait(2000);
    loginPage.shouldShowError('This field is required');
  });

  // C688014 - Password field masked by default
  it('C688014 - Verify that the Password field masks the entered characters by default', () => {
    loginPage.fillPassword('TestPassword123');
    loginPage.isPasswordMasked();
  });

  // C688017 - Password show/hide toggle
  it('C688017 - Verify that the Password field has a show/hide (eye) icon and toggles visibility', () => {
    loginPage.fillPassword('TestPassword123');
    loginPage.isPasswordMasked();
    loginPage.togglePasswordVisibility();
    loginPage.isPasswordVisible();
    loginPage.togglePasswordVisibility();
    loginPage.isPasswordMasked();
  });

  // C688019 - Leading/trailing spaces trimmed
  it('C688019 - Verify that leading/trailing spaces are trimmed for Email during login', () => {
    cy.fixture('users').then((users: any) => {
      const emailWithSpaces = `  ${users.validUser.email}  `;
      loginPage.login_with_email_spaces(emailWithSpaces);
      cy.wait(2000);
      cy.url().should('not.include', '/login');
    });
  });

  // C715140 - Email format validation and "Invalid email address" error
  it('C715140 - Verify email field rejects invalid formats (e.g., test@, test.com, no @ symbol) and received "Invalid email address" error. ', () => {
    cy.fixture('users').then((users: any) => {
      users.invalidEmailFormats.forEach((invalidEmail: string) => {
        loginPage.visitPage();
        cy.wait(1000);
        
        loginPage.fillEmailAndAttemptLogin(invalidEmail, 'TestPassword123');
        cy.wait(2000);
        
        // Should still be on login page (invalid email prevented login)
        loginPage.isLoginButtonVisible();
        loginPage.shouldShowError('Invalid email address');
      });
    });
  });

  // C715141 - Password spaces NOT trimmed
  it('C715141 - Verify that leading and trailing spaces are NOT trimmed for the Password field', () => {
    loginPage.login_with_password_spaces();
    cy.wait(2000);
    
    // Login failed, user still on login page and see error message
    cy.url().should('include', '/login');
    loginPage.isLoginButtonVisible();
    loginPage.shouldShowErrorToast('Invalid Login Credentials.');
  });

});
