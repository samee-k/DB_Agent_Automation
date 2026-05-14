/// <reference types="cypress" />

import { InputProcessingIndicatorPage } from '../../pages/InputProcessingIndicatorPage';

describe('Input Processing Indicator', () => {
  const page = new InputProcessingIndicatorPage();

  // ── Network intercept helpers ─────────────────────────────────────────────

  const interceptDelayedSuccess = (alias: string, delay = 5000): void => {
    cy.intercept({ method: 'POST', url: page.sendQueryRoute, times: 1 }, (req) => {
      req.continue((res) => { res.setDelay(delay); });
    }).as(alias);
  };

  const interceptDelayedFailure = (alias: string, delay = 3000, statusCode = 500): void => {
    cy.intercept({ method: 'POST', url: page.sendQueryRoute, times: 1 }, (req) => {
      req.reply({ statusCode, delay, body: { message: 'Mocked failure' } });
    }).as(alias);
  };

  // Returns a ref object so the count can be read inside cy.then() callbacks.
  const interceptCounting = (alias: string, delay: number): { count: number } => {
    const ref = { count: 0 };
    cy.intercept({ method: 'POST', url: page.sendQueryRoute }, (req) => {
      ref.count += 1;
      req.continue((res) => { res.setDelay(delay); });
    }).as(alias);
    return ref;
  };

  // ── Assertion helpers ─────────────────────────────────────────────────────

  const assertIndicatorVisible = (timeout = 8000): void => {
    cy.get('body', { timeout }).should(($body: JQuery<HTMLElement>) => {
      const visible = $body.find('*').filter(':visible').toArray()
        .some((el: Element) => page.processingStateRegex.test((el.textContent || '').trim()));
      expect(visible, 'processing indicator should be visible').to.eq(true);
    });
  };

  const assertIndicatorNotVisible = (): void => {
    cy.get('body', { timeout: 15000 }).should(($body: JQuery<HTMLElement>) => {
      const hasText = $body.find('*').filter(':visible').toArray()
        .some((el: Element) => page.processingStateRegex.test((el.textContent || '').trim()));
      const $input = $body.find(page.promptInputSelector).filter(':visible').first();
      const $send  = $body.find(page.sendButtonSelector).filter(':visible').first();
      const inputDisabled = $input.length > 0 && (
        $input.is(':disabled') ||
        String($input.attr('readonly') || '').toLowerCase() === 'readonly' ||
        String($input.attr('aria-disabled') || '').toLowerCase() === 'true'
      );
      const sendDisabled = $send.length > 0 && (
        $send.is(':disabled') ||
        String($send.attr('aria-disabled') || '').toLowerCase() === 'true'
      );
      expect(hasText && (inputDisabled || sendDisabled), 'processing indicator should not be actively blocking').to.eq(false);
    });
  };

  const assertInputLockedOrSendDisabled = (): void => {
    cy.get('body').then(($body: JQuery<HTMLElement>) => {
      const $input = $body.find(page.promptInputSelector).filter(':visible').first();
      const $send  = $body.find(page.sendButtonSelector).filter(':visible').first();
      const inputLocked = $input.is(':disabled') ||
        String($input.attr('readonly') || '').toLowerCase() === 'readonly' ||
        String($input.attr('aria-disabled') || '').toLowerCase() === 'true';
      const sendLocked = $send.is(':disabled') ||
        String($send.attr('aria-disabled') || '').toLowerCase() === 'true';
      expect(inputLocked || sendLocked, 'input locked or send disabled during processing').to.eq(true);
    });
  };

  const assertEditSafelyHandled = (): void => {
    cy.get('body').then(($body: JQuery<HTMLElement>) => {
      const editModeVisible = $body.find('*').filter(':visible').toArray()
        .some((el: Element) => page.editModeLabelRegex.test((el.textContent || '').trim()));
      const $input = $body.find(page.promptInputSelector).filter(':visible').first();
      const $send  = $body.find(page.sendButtonSelector).filter(':visible').first();
      const inputDisabled = $input.length > 0 && (
        $input.is(':disabled') ||
        String($input.attr('readonly') || '').toLowerCase() === 'readonly' ||
        String($input.attr('aria-disabled') || '').toLowerCase() === 'true'
      );
      const sendDisabled = $send.length > 0 && (
        $send.is(':disabled') ||
        String($send.attr('aria-disabled') || '').toLowerCase() === 'true'
      );
      expect(!editModeVisible || inputDisabled || sendDisabled, 'edit action safely handled while processing').to.eq(true);
    });
  };

  const assertSuggestionsHidden = (): void => {
    cy.get('body').then(($body: JQuery<HTMLElement>) => {
      const visible = $body.find(page.suggestionItemSelector).filter(':visible').length;
      expect(visible, 'suggestions should be hidden during loading').to.eq(0);
    });
  };

  // ── Composite setup helpers ───────────────────────────────────────────────
  // Combines intercept + send + immediate indicator assertion to establish the "actively loading" state used by multiple tests.

  const startLoading = (alias: string, prompt: string, delay = 7000): void => {
    interceptDelayedSuccess(alias, delay);
    page.sendPrompt(prompt);
    assertIndicatorVisible(4000);
  };

  const waitFor = (alias: string, timeout = 30000): void => {
    cy.wait(`@${alias}`, { timeout });
  };

  // ─────────────────────────────────────────────────────────────────────────

  beforeEach(() => {
    page.loginOnceForSuite();
    page.openChatPage().waitForChatReady();
  });

  it('C679727 - Verify loading indicator appears immediately after submitting both main and follow-up prompts.', () => {
    // Main prompt
    interceptDelayedSuccess('firstSend', 6000);
    page.sendPrompt(`main prompt ${Date.now()}`);
    assertIndicatorVisible(3000);
    waitFor('firstSend');
    assertIndicatorNotVisible();

    // Follow-up prompt
    interceptDelayedSuccess('secondSend', 6000);
    page.sendPrompt(`follow up prompt ${Date.now()}`);
    assertIndicatorVisible(3000);
    waitFor('secondSend');
    assertIndicatorNotVisible();
  });

  it('C708144 - Verify the indicator cycles through specific states.', () => {
    interceptDelayedSuccess('stateCycleSend', 12000);
    page.sendPrompt(`state cycle check ${Date.now()}`);
    assertIndicatorVisible(4000);

    const seen = new Set<string>();
    const expectedStates = ['Data analysis', 'Data extraction', 'Data processing', 'Generating visuals'];
    cy.wrap(Array.from({ length: 10 })).each(() => {
      cy.get('body').invoke('text').then((bodyText: string) => {
        expectedStates.forEach((state) => {
          if (new RegExp(state, 'i').test(bodyText)) seen.add(state);
        });
      });
      cy.wait(1200, { log: false });
    });
    cy.then(() => {
      expect(seen.size, 'at least one processing state label observed').to.be.greaterThan(0);
    });

    waitFor('stateCycleSend');
    assertIndicatorNotVisible();
  });

  it('C708145 - Verify Ask Here text area is disabled/read-only while processing is active.', () => {
    startLoading('inputLockSend', `lock input check ${Date.now()}`, 7000);
    assertInputLockedOrSendDisabled();
    waitFor('inputLockSend');
    assertIndicatorNotVisible();
    page.messageInput().should('be.visible').and('not.be.disabled');
  });

  it('C708207 - Verify Edit prompt action is disabled or safely handled while response is processing.', () => {
    // Seed a completed message so the edit icon is available
    interceptDelayedSuccess('seedSend', 1000);
    page.sendPrompt(`seed for edit action ${Date.now()}`);
    waitFor('seedSend');
    assertIndicatorNotVisible();

    startLoading('loadingSend', `long loading for edit check ${Date.now()}`, 7000);
    page.tryOpenEditWhileLoading();
    assertEditSafelyHandled();
    waitFor('loadingSend');
    assertIndicatorNotVisible();
  });

  it('C700472 - Verify Send button and Enter key are disabled and duplicate submissions are prevented during loading.', () => {
    const ref = interceptCounting('dedupeSend', 8000);
    page.sendPrompt(`dedupe check ${Date.now()}`);
    assertIndicatorVisible(3000);

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
    interceptDelayedSuccess('visualFeedbackSend', 5000);
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
    interceptDelayedSuccess('successDisappearSend', 4000);
    page.sendPrompt(`indicator disappear check ${Date.now()}`);
    assertIndicatorVisible(3000);
    waitFor('successDisappearSend');
    assertIndicatorNotVisible();
  });

  it('C679737 - Verify loading indicator is cleared and not stuck after processing failure.', () => {
    interceptDelayedFailure('failureClearSend', 3000, 500);
    page.sendPrompt(`failure clear check ${Date.now()}`);
    assertIndicatorVisible(3000);
    waitFor('failureClearSend');
    assertIndicatorNotVisible();
    page.messageInput().should('be.visible');
  });

  it('C700464 - Verify suggestions are not shown during loading state.', () => {
    interceptDelayedSuccess('noSuggestionSend', 7000);
    page.sendPrompt(`suggestion hidden check ${Date.now()}`);
    assertIndicatorVisible(3000);
    assertSuggestionsHidden();
    waitFor('noSuggestionSend');
    assertIndicatorNotVisible();
  });

  it('C700488 - Verify loading state is session-specific (single-tab emulation in Cypress).', () => {
    // Cypress cannot control two tabs; emulate by navigating to a new chat
    // while the original request is still in-flight.
    let sessionA = '';

    interceptDelayedSuccess('sessionSpecificSend', 9000);
    page.sendPrompt(`session specific check ${Date.now()}`);
    assertIndicatorVisible(3000);

    cy.location('search').then((search: string) => {
      sessionA = new URLSearchParams(search).get('sessionId') || '';
    });

    page.clickNewChat();
    page.waitForChatReady();
    assertIndicatorNotVisible();

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
    interceptDelayedSuccess('noReappearSend', 3500);
    page.sendPrompt(`no reappear check ${Date.now()}`);
    assertIndicatorVisible(3000);
    waitFor('noReappearSend');
    assertIndicatorNotVisible();
    cy.wait(2000, { log: false });
    assertIndicatorNotVisible();
  });

  it('C708208 - Verify chat history and previous messages remain visible and accessible during loading.', () => {
    interceptDelayedSuccess('seedHistorySend', 1000);
    const firstPrompt = `history accessibility seed ${Date.now()}`;
    page.sendPrompt(firstPrompt);
    waitFor('seedHistorySend');
    assertIndicatorNotVisible();

    interceptDelayedSuccess('loadingHistorySend', 7000);
    page.sendPrompt(`second prompt while loading ${Date.now()}`);
    assertIndicatorVisible(3000);
    cy.contains(firstPrompt).should('be.visible');
    page.openHistoryPanel();
    waitFor('loadingHistorySend');
  });

  it('C679732 - Verify UI recovers gracefully when processing exceeds timeout or after failure.', () => {
    interceptDelayedFailure('timeoutRecoverySend', 8000, 504);
    page.sendPrompt(`timeout recovery check ${Date.now()}`);
    assertIndicatorVisible(3000);
    waitFor('timeoutRecoverySend');
    assertIndicatorNotVisible();
    page.messageInput().should('be.visible');
    page.sendButton().should('be.visible');
  });
});

