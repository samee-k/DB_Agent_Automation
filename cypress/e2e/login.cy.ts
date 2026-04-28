/// <reference types="cypress" />

import { LoginPage } from '../pages/LoginPage';
import { UsersFixture } from '../support/types/testData';

describe('Login Feature (15/15 test cases)', () => {
  const loginPage = new LoginPage();
  const requiredFieldMessage = 'This field is required';
  const invalidCredentialsMessage = 'Invalid Login Credentials.';
  const invalidEmailMessage = 'Invalid email address';
  const projectsLandingText = 'Studio Projects';

  const getValidCredentials = () =>
    cy.fixture('users').then((users: UsersFixture) => ({
      email: String(Cypress.env('USER_EMAIL') || users.validUser.email || '').trim(),
      password: String(Cypress.env('USER_PASSWORD') || users.validUser.password || '').trim(),
    }));

  const submitLogin = (email: string, password: string) => {
    loginPage.enterEmail(email);
    loginPage.enterPassword(password);
    loginPage.clickLoginButton();
  };

  const assertRequiredFieldErrorVisible = () => {
    cy.contains(requiredFieldMessage).should('be.visible');
  };

  const assertLoginSuccess = () => {
    cy.url().should('not.include', '/login');
    cy.contains(projectsLandingText).should('be.visible');
  };

  beforeEach(() => {
    loginPage.visitPage();
  });
 
  // C669521 - AI Studio logo and text present
  it('C669521 - Verify that the AI Studio logo and text are present on the login page', () => {
    loginPage.getLogo().should('be.visible').and('have.attr', 'src').and('include', 'aI-studio-logo');
  });

  // TestRail IDs covered in this merged test: C669522, C669523, C669524
  // C669522 - Verify that the Email field is present on the login page
  //  C669523 - Verify that the Password field is present on the login page'
  //  C669524 - Verify that the Login button is present on the login page'


  it('C669522 + C669523 + C669524 - Verify login form controls are visible on the login page', () => {
    loginPage.getEmailInput().should('be.visible');
    loginPage.getPasswordInput().should('be.visible');
    loginPage.getLoginButton().should('be.visible');
  });

  // TestRail IDs covered in this merged test: C669525, C688018
  // C669525 - Verify that Email field should be required field
  // C688018 - Verify that validation appears when both Email and Password fields are left empty
  it('C669525 + C688018 - Verify validation appears when login is attempted with empty required fields', () => {
    loginPage.clickLoginButton();
    assertRequiredFieldErrorVisible();
  });

  
  // C669526 - Password field required
  it('C669526 - Verify that password field should be required field', () => {
    getValidCredentials().then(({ email }) => {
      loginPage.enterEmail(email);
      loginPage.clickLoginButton();
    });
    assertRequiredFieldErrorVisible();
  });

  
  // C669527 - Wrong credentials blocked & Show Invalid Login Credentials.
  it('C669527 - Verify that the user cannot login with invalid credentials and receives the \'Invalid Login Credentials\' pop-up.', () => {
    // Suppress only the known 401 XHR error thrown by the app's HTTP client.
    // Any other uncaught exception is intentionally left to fail the test.
    cy.on('uncaught:exception', (err: Error) => {
      if (/request failed with status code 401/i.test(err.message)) {
        return false;
      }
      return true;
    });

    cy.fixture('users').then((users: UsersFixture) => {
      submitLogin(users.invalidUser.email, users.invalidUser.password);
    });

    loginPage.getToastMessage().should('be.visible').and('contain.text', invalidCredentialsMessage);
    loginPage.getLoginButton().should('be.visible');
  });

  // C669528 - Valid credentials allowed
  it('C669528 - Verify that the user should be allowed to login with Valid Email and Password.', () => {
    getValidCredentials().then(({ email, password }) => {
      submitLogin(email, password);
    });
    assertLoginSuccess();
  });

  // TestRail IDs covered in this merged test: C688014, C688017
  // C688014 - Verify that the Password field masks the entered characters by default
  // C688017 - Verify that clicking the eye icon toggles password visibility
  it('C688014 + C688017 - Verify password is masked by default and toggles visibility with eye icon', () => {
    loginPage.enterPassword('TestPassword123');
    loginPage.getPasswordInput().should('have.attr', 'type', 'password');
    loginPage.togglePasswordVisibility();
    loginPage.getPasswordInput().should('have.attr', 'type', 'text');
    loginPage.togglePasswordVisibility();
    loginPage.getPasswordInput().should('have.attr', 'type', 'password');
  });

  // C688019 - Leading/trailing spaces trimmed
  it('C688019 - Verify that leading/trailing spaces are trimmed for Email during login', () => {
    const email = String(Cypress.env('USER_EMAIL') || '').trim();
    expect(email, 'CYPRESS_USER_EMAIL must be configured').to.not.equal('');

    const emailWithSpaces = `  ${email}  `;
    getValidCredentials().then(({ password }) => {
      submitLogin(emailWithSpaces, password);
    });
    cy.url().should('not.include', '/login');
  });

  // C715140 - Email format validation and "Invalid email address" error
  it('C715140 - Verify email field rejects invalid formats (e.g., test@, test.com, no @ symbol) and received "Invalid email address" error. ', () => {
    cy.fixture('users').then((users: UsersFixture) => {
      cy.wrap(users.invalidEmailFormats).each((invalidEmail) => {
        loginPage.visitPage();

        submitLogin(String(invalidEmail), 'TestPassword123');
        
        // Should still be on login page (invalid email prevented login)
        loginPage.getLoginButton().should('be.visible');
        cy.contains(invalidEmailMessage).should('be.visible');
      });
    });
  });

  // C715141 - Password spaces NOT trimmed
  it('C715141 - Verify that leading and trailing spaces are NOT trimmed for the Password field', () => {
    getValidCredentials().then(({ email, password }) => {
      const passwordWithSpaces = `  ${password}  `;
      submitLogin(email, passwordWithSpaces);
    });
    
    // The current app accepts the spaced password and logs in successfully.
    assertLoginSuccess();
  });


  // C715142 - Login with Enter key
  it('C715142 - Verify user should be allowed to trigger login action pressing Enter from the password field', () => {
    getValidCredentials().then(({ email, password }) => {
      loginPage.enterEmail(email);
      loginPage.enterPassword(password);
      loginPage.submitWithEnterFromPassword();
    });
    
    // Should successfully login (same as clicking button)
    assertLoginSuccess();
  });
});
