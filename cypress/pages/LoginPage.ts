/// <reference types="cypress" />

export class LoginPage {
  // Selectors - Based on your actual app
  private readonly logo = 'img[src*="aI-studio-logo"]';

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

  
}
