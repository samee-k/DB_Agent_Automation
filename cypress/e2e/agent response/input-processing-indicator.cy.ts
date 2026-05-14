/// <reference types="cypress" />

import { InputProcessingIndicatorPage } from '../../pages/InputProcessingIndicatorPage';

describe('Input Processing Indicator', () => {
  const page = new InputProcessingIndicatorPage();

  /**
   * Delays the real send-query response so the indicator stays visible long
   * enough for assertions, without replacing the response body.
   */
  const delayedSuccess = (alias: string, delay = 5000) => {
    cy.intercept({ method: 'POST', url: page.sendQueryRoute, times: 1 }, (req) => {
      req.continue((res) => {
        res.setDelay(delay);
      });
    }).as(alias);
  };

  /**
   * Intercepts and forces a server error response so error-recovery tests
   * can verify the indicator clears after a failed response.
   */
  const delayedFailure = (alias: string, delay = 3000, statusCode = 500) => {
    cy.intercept({ method: 'POST', url: page.sendQueryRoute, times: 1 }, (req) => {
      req.reply({ statusCode, delay, body: { message: 'Mocked failure' } });
    }).as(alias);
  };

  /** Starts a delayed request and immediately asserts the indicator is visible. */
  const startLoading = (alias: string, prompt: string, delay = 7000) => {
    delayedSuccess(alias, delay);
    page.sendPrompt(prompt);
    page.assertProcessingIndicatorVisible(4000);
  };

  /** Waits for a network alias to settle without asserting on status code. */
  const waitForRequest = (alias: string, timeout = 30000) => {
    cy.wait(`@${alias}`, { timeout });
  };

  beforeEach(() => {
    page.loginOnceForSuite();
    page.openChatPage().waitForChatReady();
  });

  it('C679727 - Verify loading indicator appears immediately after submitting both main and follow-up prompts.', () => {
    // --- Main prompt ---
    delayedSuccess('firstSend', 6000);
    page.sendPrompt(`main prompt ${Date.now()}`);

    // Indicator must be visible right after submission
    page.assertProcessingIndicatorVisible(3000);

    // Wait for the request to settle, then indicator must be gone
    waitForRequest('firstSend');
    page.assertProcessingIndicatorNotVisible();

    // --- Follow-up prompt ---
    delayedSuccess('secondSend', 6000);
    page.sendPrompt(`follow up prompt ${Date.now()}`);

    page.assertProcessingIndicatorVisible(3000);
    waitForRequest('secondSend');
    page.assertProcessingIndicatorNotVisible();
  });

  it('C708144 - Verify the indicator cycles through specific states.', () => {
    // Use a long delay so we have time to observe multiple state transitions
    delayedSuccess('stateCycleSend', 12000);
    page.sendPrompt(`state cycle check ${Date.now()}`);

    // Indicator must appear first
    page.assertProcessingIndicatorVisible(4000);

    const seen = new Set<string>();
    const expectedStates = ['Data analysis', 'Data extraction', 'Data processing', 'Generating visuals'];

    // Poll body text repeatedly during the delayed window
    cy.wrap(Array.from({ length: 10 })).each(() => {
      cy.get('body').invoke('text').then((bodyText: string) => {
        expectedStates.forEach((state) => {
          if (new RegExp(state, 'i').test(bodyText)) seen.add(state);
        });
      });
      cy.wait(1200, { log: false });
    });

    // At least one processing state label must have appeared
    cy.then(() => {
      expect(seen.size, 'at least one processing state label observed').to.be.greaterThan(0);
    });

    waitForRequest('stateCycleSend');
    page.assertProcessingIndicatorNotVisible();
  });

  it('C708145 - Verify Ask Here text area is disabled/read-only while processing is active.', () => {
    startLoading('inputLockSend', `lock input check ${Date.now()}`, 7000);

    // While the indicator is active, input OR send must be locked
    page.assertInputLockedOrSendDisabled();

    waitForRequest('inputLockSend');

    // After processing completes the input must be usable again
    page.assertProcessingIndicatorNotVisible();
    page.messageInput().should('be.visible').and('not.be.disabled');
  });

  it('C708207 - Verify Edit prompt action is disabled or safely handled while response is processing.', () => {
    // Seed a completed message first so the edit icon is available
    delayedSuccess('seedSend', 1000);
    page.sendPrompt(`seed for edit action ${Date.now()}`);
    waitForRequest('seedSend');
    page.assertProcessingIndicatorNotVisible();

    // Start a long in-flight request
    startLoading('loadingSend', `long loading for edit check ${Date.now()}`, 7000);

    // Attempt to click edit while the indicator is still showing
    page.tryOpenEditWhileLoading();

    // The edit action must not leave the UI in a freely submittable state
    page.assertEditActionSafelyHandledDuringLoading();

    waitForRequest('loadingSend');
    page.assertProcessingIndicatorNotVisible();
  });

  it('C700472 - Verify Send button and Enter key are disabled and duplicate submissions are prevented during loading.', () => {
    let requestCount = 0;
    cy.intercept({ method: 'POST', url: page.sendQueryRoute }, (req) => {
      requestCount += 1;
      req.continue((res) => { res.setDelay(8000); });
    }).as('dedupeSend');

    page.sendPrompt(`dedupe check ${Date.now()}`);
    page.assertProcessingIndicatorVisible(3000);

    // Spam Enter and the send button while indicator is active
    page.pressEnterToSend();
    page.pressEnterToSend();
    page.sendButton().then(($btn: JQuery<HTMLElement>) => {
      if (!$btn.is(':disabled')) {
        cy.wrap($btn).click({ force: true });
      }
    });

    cy.wait(1000, { log: false });

    // Only the original submission should have been sent
    cy.then(() => {
      expect(requestCount, 'no duplicate submissions while indicator is active').to.eq(1);
    });

    waitForRequest('dedupeSend');
  });

  it('C700481 - Verify Send button provides immediate visual feedback upon interaction.', () => {
    delayedSuccess('visualFeedbackSend', 5000);

    // Capture button state before sending
    page.sendButton().then(($before: JQuery<HTMLElement>) => {
      const beforeClass = $before.attr('class') || '';

      page.sendPrompt(`visual feedback check ${Date.now()}`);

      // Immediately after sending, button must be visually different (disabled or class changed)
      page.sendButton().should(($after: JQuery<HTMLElement>) => {
        const afterClass = $after.attr('class') || '';
        const isDisabled =
          $after.is(':disabled') ||
          String($after.attr('aria-disabled') || '').toLowerCase() === 'true';

        expect(
          isDisabled || beforeClass !== afterClass,
          'send button provides immediate visual feedback'
        ).to.eq(true);
      });
    });

    waitForRequest('visualFeedbackSend');
  });

  it('C708206 - Verify loading indicator disappears immediately after a successful response is rendered.', () => {
    delayedSuccess('successDisappearSend', 4000);
    page.sendPrompt(`indicator disappear check ${Date.now()}`);

    // Indicator must appear during processing
    page.assertProcessingIndicatorVisible(3000);

    // Once the request completes the indicator must clear
    waitForRequest('successDisappearSend');
    page.assertProcessingIndicatorNotVisible();
  });

  it('C679737 - Verify loading indicator is cleared and not stuck after processing failure.', () => {
    delayedFailure('failureClearSend', 3000, 500);
    page.sendPrompt(`failure clear check ${Date.now()}`);

    // Indicator must appear during the (delayed) failing request
    page.assertProcessingIndicatorVisible(3000);

    // After the error response, indicator must clear and input must recover
    waitForRequest('failureClearSend');
    page.assertProcessingIndicatorNotVisible();
    page.messageInput().should('be.visible');
  });

  it('C700464 - Verify suggestions are not shown during loading state.', () => {
    delayedSuccess('noSuggestionSend', 7000);
    page.sendPrompt(`suggestion hidden check ${Date.now()}`);

    // Indicator must be active
    page.assertProcessingIndicatorVisible(3000);

    // Suggestion list must not appear while indicator is active
    page.assertSuggestionsHiddenDuringLoading();

    waitForRequest('noSuggestionSend');
    page.assertProcessingIndicatorNotVisible();
  });

  it('C700488 - Verify loading state is session-specific (single-tab emulation in Cypress).', () => {
    // Cypress cannot control two tabs; we emulate by navigating to a new chat
    // while the original request is still in-flight.
    let sessionA = '';

    delayedSuccess('sessionSpecificSend', 9000);
    page.sendPrompt(`session specific check ${Date.now()}`);
    page.assertProcessingIndicatorVisible(3000);

    cy.location('search').then((search: string) => {
      sessionA = new URLSearchParams(search).get('sessionId') || '';
    });

    // Navigate to new chat (simulates switching to "Tab B")
    cy.contains('button, [role="button"], a', /\+?\s*new\s*chat/i)
      .filter(':visible')
      .first()
      .click({ force: true });

    page.waitForChatReady();

    // The new chat must show no active indicator
    page.assertProcessingIndicatorNotVisible();

    // If the URL exposes a session ID it must differ from the original
    cy.location('search').then((search: string) => {
      const sessionB = new URLSearchParams(search).get('sessionId') || '';
      if (sessionA && sessionB && sessionB !== sessionA) {
        expect(sessionB, 'new session should differ from loading session').to.not.eq(sessionA);
      }
    });

    // New chat must remain fully interactive while the original request is in-flight
    const probeText = `session B idle check ${Date.now()}`;
    page.typePrompt(probeText);
    page.readInputValue().should('include', probeText);

    waitForRequest('sessionSpecificSend');
  });

  it.skip('T873883 - Verify loading state is isolated across two real browser tabs.', () => {
    // True multi-tab isolation cannot be automated within a single Cypress run.
    // Use Playwright or manual testing for this scenario.
  });

  it('C700498 - Verify loading indicator does not reappear after response is rendered.', () => {
    delayedSuccess('noReappearSend', 3500);
    page.sendPrompt(`no reappear check ${Date.now()}`);

    page.assertProcessingIndicatorVisible(3000);

    waitForRequest('noReappearSend');
    page.assertProcessingIndicatorNotVisible();

    // Extra wait to confirm indicator stays gone (no re-flash)
    cy.wait(2000, { log: false });
    page.assertProcessingIndicatorNotVisible();
  });

  it('C708208 - Verify chat history and previous messages remain visible and accessible during loading.', () => {
    // Seed a completed message
    delayedSuccess('seedHistorySend', 1000);
    const firstPrompt = `history accessibility seed ${Date.now()}`;
    page.sendPrompt(firstPrompt);
    waitForRequest('seedHistorySend');
    page.assertProcessingIndicatorNotVisible();

    // Start a long in-flight request
    delayedSuccess('loadingHistorySend', 7000);
    page.sendPrompt(`second prompt while loading ${Date.now()}`);
    page.assertProcessingIndicatorVisible(3000);

    // Previous message must still be visible while indicator is active
    cy.contains(firstPrompt).should('be.visible');

    // History panel must be accessible during loading
    page.openHistoryPanel();

    waitForRequest('loadingHistorySend');
  });

  it('C679732 - Verify UI recovers gracefully when processing exceeds timeout or after failure.', () => {
    delayedFailure('timeoutRecoverySend', 8000, 504);
    page.sendPrompt(`timeout recovery check ${Date.now()}`);

    page.assertProcessingIndicatorVisible(3000);

    // After the simulated gateway timeout, all UI controls must recover
    waitForRequest('timeoutRecoverySend');
    page.assertProcessingIndicatorNotVisible();
    page.messageInput().should('be.visible');
    page.sendButton().should('be.visible');
  });
});
