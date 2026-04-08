/// <reference types="cypress" />

/**
 * Helper class for Character Count and Input Validation features
 * Provides reusable methods for testing character limit functionality
 */
export class CharacterCountValidator {
  private readonly MAX_CHAR_LIMIT = 500;
  private readonly ERROR_COLOR = 'rgb(220, 38, 38)'; // Red color for overflow
  private readonly TOOLTIP_MESSAGE = 'Please limit your response to 500 words or fewer';

  /**
   * Verify the character counter displays the expected count
   * @param expectedCount Expected character count
   */
  verifyCharacterCount(expectedCount: number): void {
    cy.get('.char-count').should('contain', `${expectedCount}/${this.MAX_CHAR_LIMIT}`);
  }

  /**
   * Verify the input field is in neutral state (no error)
   */
  verifyNeutralState(): void {
    cy.get('[data-testid="message-input"], textarea, [role="textbox"]')
      .filter(':visible')
      .first()
      .then(($input) => {
        // Should not have error classes
        expect($input).not.to.have.class('error');
        expect($input).not.to.have.class('overflow');
      });
  }

  /**
   * Verify the input field is in error state (red color, overflow)
   */
  verifyErrorState(): void {
    cy.get('[data-testid="message-input"], textarea, [role="textbox"]')
      .filter(':visible')
      .first()
      .then(($input: JQuery<HTMLElement>) => {
        const hasErrorClass = $input.hasClass('error');
        const hasOverflowClass = $input.hasClass('overflow');
        expect(hasErrorClass || hasOverflowClass).to.be.true;
      });
  }

  /**
   * Verify the send button is disabled
   */
  verifySendButtonDisabled(): void {
    cy.get('button[aria-label="Send"][type="button"]').then(($button: JQuery<HTMLElement>) => {
      const isDisabled = $button.prop('disabled') === true;
      const hasAriaDisabled = $button.attr('aria-disabled') === 'true';
      expect(isDisabled || hasAriaDisabled).to.be.true;
    });
  }

  /**
   * Verify the send button is enabled
   */
  verifySendButtonEnabled(): void {
    cy.get('button[aria-label="Send"][type="button"]')
      .should('not.be.disabled')
      .and('not.have.attr', 'aria-disabled', 'true');
  }

  /**
   * Verify the error tooltip message appears on send button
   */
  verifyErrorTooltip(): void {
    cy.get('button[aria-label="Send"][type="button"]').trigger('mouseover');
    cy.get('[role="tooltip"]').should('contain', this.TOOLTIP_MESSAGE);
  }

  /**
   * Verify the text color is red (error state)
   */
  verifyTextColorIsRed(): void {
    cy.get('[data-testid="message-input"], textarea, [role="textbox"]')
      .filter(':visible')
      .first()
      .should('have.css', 'color')
      .and('include', this.ERROR_COLOR);
  }

  /**
   * Verify the counter color is red (error state)
   */
  verifyCounterColorIsRed(): void {
    cy.get('.char-count').should('have.css', 'color').and('include', this.ERROR_COLOR);
  }

  /**
   * Get the current character count from the counter
   * @returns Cypress chainable with the count value
   */
  getCharacterCount(): Cypress.Chainable<number> {
    return cy.get('.char-count').then(($counter: JQuery<HTMLElement>) => {
      const text = $counter.text();
      const match = text.match(/(\d+)\/\d+/);
      return match ? parseInt(match[1], 10) : 0;
    });
  }

  /**
   * Verify character count is at the boundary (500)
   */
  verifyAtBoundary(): void {
    this.verifyCharacterCount(500);
    this.verifyNeutralState();
    this.verifySendButtonEnabled();
  }

  /**
   * Verify character count exceeds the boundary
   */
  verifyOverBoundary(): void {
    cy.get('.char-count').then(($counter: JQuery<HTMLElement>) => {
      const text = $counter.text();
      const match = text.match(/(\d+)\/(\d+)/);
      if (match) {
        const current = parseInt(match[1], 10);
        const max = parseInt(match[2], 10);
        expect(current).to.be.greaterThan(max);
      }
    });
    this.verifyErrorState();
    this.verifySendButtonDisabled();
  }
}
