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
  
});
