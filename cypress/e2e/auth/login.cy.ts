/// <reference types="cypress" />

import { LoginPage } from '../../support/pages/LoginPage';
import { UsersFixture } from '../../support/types';

describe('Login Feature (15/15 test cases)', () => {
  const loginPage = new LoginPage();
  const requiredFieldMessage = 'This field is required';
  const invalidCredentialsMessage = 'Invalid Login Credentials.';
  const invalidEmailMessage = 'Invalid email address';
  const projectsLandingText = 'Studio Projects';
  const samplePassword = 'TestPassword123';

  // Resolved once before all tests — avoids repeated fixture reads per test
  let validEmail: string;
  let validPassword: string;
  let usersFixture: UsersFixture;

  before(() => {
    cy.fixture<UsersFixture>('users').then((users) => {
      usersFixture = users;
      validEmail = String(Cypress.env('USER_EMAIL') || users.validUser.email || '').trim();
      validPassword = String(Cypress.env('USER_PASSWORD') || users.validUser.password || '').trim();
    });
  });

  const fillCredentials = (email: string, password: string): void => {
    loginPage.enterEmail(email);
    loginPage.enterPassword(password);
  };

  const submitLogin = (email: string, password: string): void => {
    fillCredentials(email, password);
    loginPage.clickLoginButton();
  };

  const assertRequiredFieldErrorVisible = (): void => {
    cy.contains(requiredFieldMessage).should('be.visible');
  };

  const assertLoginSuccess = (): void => {
    cy.url().should('not.include', '/login');
    cy.contains(projectsLandingText).should('be.visible');
  };

  const assertPasswordInputType = (type: 'password' | 'text'): void => {
    loginPage.getPasswordInput().should('have.attr', 'type', type);
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Group 1 – Page Structure
  // Checks static UI elements on the login page. Zero credential input needed.
  // ─────────────────────────────────────────────────────────────────────────
  describe('Page Structure', () => {
    beforeEach(() => loginPage.visitPage());

    // C669521 - AI Studio logo and text present
    it('C669521 - Verify that the AI Studio logo and text are present on the login page', () => {
      loginPage.getLogo().should('be.visible').and('have.attr', 'src').and('include', 'aI-studio-logo');
    });

    // TestRail IDs covered in this merged test: C669522, C669523, C669524
    // C669522 - Verify that the Email field is present on the login page
    // C669523 - Verify that the Password field is present on the login page
    // C669524 - Verify that the Login button is present on the login page
    it('C669522 + C669523 + C669524 - Verify login form controls are visible on the login page', () => {
      loginPage.getEmailInput().should('be.visible');
      loginPage.getPasswordInput().should('be.visible');
      loginPage.getLoginButton().should('be.visible');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Group 2 – Client-side Validation
  // Types characters but never submits a successful login — all assertions
  // resolve without a network round-trip or page navigation.
  // ─────────────────────────────────────────────────────────────────────────
  describe('Client-side Validation', () => {
    beforeEach(() => loginPage.visitPage());

    // TestRail IDs covered in this merged test: C669525, C688018
    // C669525 - Verify that Email field should be required field
    // C688018 - Verify that validation appears when both Email and Password fields are left empty
    it('C669525 + C688018 - Verify validation appears when login is attempted with empty required fields', () => {
      loginPage.clickLoginButton();
      assertRequiredFieldErrorVisible();
    });

    // C669526 - Password field required
    it('C669526 - Verify that password field should be required field', () => {
      loginPage.enterEmail(validEmail);
      loginPage.clickLoginButton();
      assertRequiredFieldErrorVisible();
    });

    // TestRail IDs covered in this merged test: C688014, C688017
    // C688014 - Verify that the Password field masks the entered characters by default
    // C688017 - Verify that clicking the eye icon toggles password visibility
    it('C688014 + C688017 - Verify password is masked by default and toggles visibility with eye icon', () => {
      loginPage.enterPassword(samplePassword);
      assertPasswordInputType('password');
      loginPage.togglePasswordVisibility();
      assertPasswordInputType('text');
      loginPage.togglePasswordVisibility();
      assertPasswordInputType('password');
    });

    // C715140 - Email format validation
    // Stays on the login page between iterations (client-side rejection keeps us on /login),
    // so only one page load is needed for all 5 invalid email formats.
    // cy.wrap().each() lets Cypress own the iteration — better error scoping and retry behaviour
    // per item compared to a native forEach.
    it('C715140 - Verify email field rejects invalid formats (e.g., test@, test.com, no @ symbol) and received "Invalid email address" error.', () => {
      cy.wrap(usersFixture.invalidEmailFormats).each((invalidEmail: string, index: number) => {
        if (index > 0) {
          loginPage.getEmailInput().clear();
          loginPage.getPasswordInput().clear();
        }
        submitLogin(invalidEmail, samplePassword);
        loginPage.getLoginButton().should('be.visible');
        cy.contains(invalidEmailMessage).should('be.visible');
      });
    });

    // C715141 - Password field does not trim spaces
    // Checks the DOM value of the password input after typing — no login submission needed.
    it('C715141 - Verify that leading and trailing spaces are NOT trimmed for the Password field', () => {
      const passwordWithSpaces = `  ${validPassword}  `;
      loginPage.enterPassword(passwordWithSpaces);
      loginPage.getPasswordInput().should('have.value', passwordWithSpaces);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Group 3 – Authentication Flows
  // These 4 tests must submit real credentials and assert on the outcome.
  // All other cases have been handled above without a server round-trip.
  // ─────────────────────────────────────────────────────────────────────────
  // Retry config for network-dependent tests: 1 retry in CI (runMode), none in interactive mode.
  // Only applied to Authentication Flows — DOM-only and client-side tests should never need retries.
  const networkRetry: Cypress.TestConfigOverrides = { retries: { runMode: 1, openMode: 0 } };

  describe('Authentication Flows', () => {
    beforeEach(() => loginPage.visitPage());

    // C669527 - Wrong credentials blocked & Show Invalid Login Credentials.
    it("C669527 - Verify that the user cannot login with invalid credentials and receives the 'Invalid Login Credentials' pop-up.", networkRetry, () => {
      // Suppress only the known 401 client-side exception thrown by the app's HTTP client
      cy.on('uncaught:exception', (err: Error) =>
        /request failed with status code 401/i.test(err.message) ? false : true
      );

      submitLogin(usersFixture.invalidUser.email, usersFixture.invalidUser.password);
      loginPage.getToastMessage().should('be.visible').and('contain.text', invalidCredentialsMessage);
      loginPage.getLoginButton().should('be.visible');
    });

    // C669528 - Valid credentials allowed
    it('C669528 - Verify that the user should be allowed to login with Valid Email and Password.', networkRetry, () => {
      submitLogin(validEmail, validPassword);
      assertLoginSuccess();
    });

    // C688019 - Leading/trailing spaces trimmed for Email
    it('C688019 - Verify that leading/trailing spaces are trimmed for Email during login', networkRetry, () => {
      expect(validEmail, 'USER_EMAIL must be configured').to.not.equal('');
      submitLogin(`  ${validEmail}  `, validPassword);
      assertLoginSuccess();
    });

    // C715142 - Login with Enter key
    it('C715142 - Verify user should be allowed to trigger login action pressing Enter from the password field', networkRetry, () => {
      fillCredentials(validEmail, validPassword);
      loginPage.submitWithEnterFromPassword();
      assertLoginSuccess();
    });
  });
});
