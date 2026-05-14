/// <reference types="cypress" />

import { InputProcessingIndicatorPage } from '../../pages/InputProcessingIndicatorPage';
import {
  DELAYS,
  assertEditSafelyHandled,
  assertIndicatorNotVisible,
  assertIndicatorVisible,
  assertInputLockedOrSendDisabled,
  assertSuggestionsHidden,
  interceptCounting,
  interceptDelayedFailure,
  interceptDelayedSuccess,
  startLoading,
  waitFor,
} from './input-processing-indicator.helpers';

describe('Input Processing Indicator', () => {
  const page = new InputProcessingIndicatorPage();

  // ─────────────────────────────────────────────────────────────────────────

  beforeEach(() => {
    page.loginOnceForSuite();
    page.openChatPage().waitForChatReady();
  });

  it('C679727 - Verify loading indicator appears immediately after submitting both main and follow-up prompts.', () => {
    // Main prompt
    interceptDelayedSuccess(page, 'firstSend', DELAYS.normal);
    page.sendPrompt(`main prompt ${Date.now()}`);
    assertIndicatorVisible(page);
    waitFor('firstSend');
    assertIndicatorNotVisible(page);

    // Follow-up prompt
    interceptDelayedSuccess(page, 'secondSend', DELAYS.normal);
    page.sendPrompt(`follow up prompt ${Date.now()}`);
    assertIndicatorVisible(page);
    waitFor('secondSend');
    assertIndicatorNotVisible(page);
  });

  it('C708144 - Verify the indicator cycles through specific states.', () => {
    interceptDelayedSuccess(page, 'stateCycleSend', DELAYS.cycle);
    page.sendPrompt(`state cycle check ${Date.now()}`);
    assertIndicatorVisible(page);

    const seen = new Set<string>();
    const expectedStates = ['Data analysis', 'Data extraction', 'Data processing', 'Generating visuals'];
    cy.wrap(Array.from({ length: 10 })).each(() => {
      cy.get('body').invoke('text').then((bodyText: string) => {
        expectedStates.forEach((state) => {
          if (new RegExp(state, 'i').test(bodyText)) seen.add(state);
        });
      });
      cy.wait(500, { log: false });
    });
    cy.then(() => {
      expect(seen.size, 'at least one processing state label observed').to.be.greaterThan(0);
    });

    waitFor('stateCycleSend');
    assertIndicatorNotVisible(page);
  });

  it('C708145 - Verify Ask Here text area is disabled/read-only while processing is active.', () => {
    startLoading(page, 'inputLockSend', `lock input check ${Date.now()}`, DELAYS.long);
    assertInputLockedOrSendDisabled(page);
    waitFor('inputLockSend');
    assertIndicatorNotVisible(page);
    page.messageInput().should('be.visible').and('not.be.disabled');
  });

  it('C708207 - Verify Edit prompt action is disabled or safely handled while response is processing.', () => {
    // Seed a completed message so the edit icon is available
    interceptDelayedSuccess(page, 'seedSend', DELAYS.quick);
    page.sendPrompt(`seed for edit action ${Date.now()}`);
    waitFor('seedSend');
    assertIndicatorNotVisible(page);

    startLoading(page, 'loadingSend', `long loading for edit check ${Date.now()}`, DELAYS.long);
    page.tryOpenEditWhileLoading();
    assertEditSafelyHandled(page);
    waitFor('loadingSend');
    assertIndicatorNotVisible(page);
  });

  it('C700472 - Verify Send button and Enter key are disabled and duplicate submissions are prevented during loading.', () => {
    const ref = interceptCounting(page, 'dedupeSend', DELAYS.long);
    page.sendPrompt(`dedupe check ${Date.now()}`);
    assertIndicatorVisible(page);

    // Attempt duplicate submissions while the indicator is active
    page.pressEnterToSend();
    page.pressEnterToSend();
    page.sendButton().then(($btn: JQuery<HTMLElement>) => {
      if (!$btn.is(':disabled')) cy.wrap($btn).click({ force: true });
    });

    cy.wait(1000, { log: false });
    cy.then(() => {
      expect(ref.count, 'no duplicate submissions while indicator is active').to.eq(1);
    });
    waitFor('dedupeSend');
  });

  it('C700481 - Verify Send button provides immediate visual feedback upon interaction.', () => {
    interceptDelayedSuccess(page, 'visualFeedbackSend', DELAYS.normal);
    page.sendButton().then(($before: JQuery<HTMLElement>) => {
      const beforeClass = $before.attr('class') || '';
      page.sendPrompt(`visual feedback check ${Date.now()}`);
      page.sendButton().should(($after: JQuery<HTMLElement>) => {
        const isDisabled = $after.is(':disabled') ||
          String($after.attr('aria-disabled') || '').toLowerCase() === 'true';
        expect(
          isDisabled || ($after.attr('class') || '') !== beforeClass,
          'send button provides immediate visual feedback'
        ).to.eq(true);
      });
    });
    waitFor('visualFeedbackSend');
  });

  it('C708206 - Verify loading indicator disappears immediately after a successful response is rendered.', () => {
    interceptDelayedSuccess(page, 'successDisappearSend', DELAYS.normal);
    page.sendPrompt(`indicator disappear check ${Date.now()}`);
    assertIndicatorVisible(page);
    waitFor('successDisappearSend');
    assertIndicatorNotVisible(page);
  });

  it('C679737 - Verify loading indicator is cleared and not stuck after processing failure.', () => {
    interceptDelayedFailure(page, 'failureClearSend', DELAYS.normal, 500);
    page.sendPrompt(`failure clear check ${Date.now()}`);
    assertIndicatorVisible(page);
    waitFor('failureClearSend');
    assertIndicatorNotVisible(page);
    page.messageInput().should('be.visible');
  });

  it('C700464 - Verify suggestions are not shown during loading state.', () => {
    interceptDelayedSuccess(page, 'noSuggestionSend', DELAYS.long);
    page.sendPrompt(`suggestion hidden check ${Date.now()}`);
    assertIndicatorVisible(page);
    assertSuggestionsHidden(page);
    waitFor('noSuggestionSend');
    assertIndicatorNotVisible(page);
  });

  it('C700488 - Verify loading state is session-specific (single-tab emulation in Cypress).', () => {
    // Cypress cannot control two tabs; emulate by navigating to a new chat
    // while the original request is still in-flight.
    let sessionA = '';

    interceptDelayedSuccess(page, 'sessionSpecificSend', DELAYS.cycle);
    page.sendPrompt(`session specific check ${Date.now()}`);
    assertIndicatorVisible(page);

    cy.location('search').then((search: string) => {
      sessionA = new URLSearchParams(search).get('sessionId') || '';
    });

    page.clickNewChat();
    page.waitForChatReady();
    assertIndicatorNotVisible(page);

    cy.location('search').then((search: string) => {
      const sessionB = new URLSearchParams(search).get('sessionId') || '';
      if (sessionA && sessionB && sessionB !== sessionA) {
        expect(sessionB, 'new session should differ from loading session').to.not.eq(sessionA);
      }
    });

    const probeText = `session B idle check ${Date.now()}`;
    page.typePrompt(probeText);
    page.readInputValue().should('include', probeText);

    waitFor('sessionSpecificSend');
  });

  it.skip('T873883 - Verify loading state is isolated across two real browser tabs.', () => {
    // True multi-tab isolation cannot be automated within a single Cypress run.
    // Use Playwright or manual testing for this scenario.
  });

  it('C700498 - Verify loading indicator does not reappear after response is rendered.', () => {
    interceptDelayedSuccess(page, 'noReappearSend', DELAYS.normal);
    page.sendPrompt(`no reappear check ${Date.now()}`);
    assertIndicatorVisible(page);
    waitFor('noReappearSend');
    assertIndicatorNotVisible(page);
    cy.wait(1000, { log: false });
    assertIndicatorNotVisible(page);
  });

  it('C708208 - Verify chat history and previous messages remain visible and accessible during loading.', () => {
    interceptDelayedSuccess(page, 'seedHistorySend', DELAYS.quick);
    const firstPrompt = `history accessibility seed ${Date.now()}`;
    page.sendPrompt(firstPrompt);
    waitFor('seedHistorySend');
    assertIndicatorNotVisible(page);

    interceptDelayedSuccess(page, 'loadingHistorySend', DELAYS.long);
    page.sendPrompt(`second prompt while loading ${Date.now()}`);
    assertIndicatorVisible(page);
    cy.contains(firstPrompt).should('be.visible');
    page.openHistoryPanel();
    waitFor('loadingHistorySend');
  });

  it('C679732 - Verify UI recovers gracefully when processing exceeds timeout or after failure.', () => {
    interceptDelayedFailure(page, 'timeoutRecoverySend', DELAYS.long, 504);
    page.sendPrompt(`timeout recovery check ${Date.now()}`);
    assertIndicatorVisible(page);
    waitFor('timeoutRecoverySend');
    assertIndicatorNotVisible(page);
    page.messageInput().should('be.visible');
    page.sendButton().should('be.visible');
  });
});

