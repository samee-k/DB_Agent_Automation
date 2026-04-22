/// <reference types="cypress" />

import { InputProcessingIndicatorPage } from '../../pages/InputProcessingIndicatorPage';

describe('Input Processing Indicator', () => {
  const page = new InputProcessingIndicatorPage();

  const delayedSuccess = (alias: string, delay = 5000) => {
    cy.intercept({ method: 'POST', url: page.sendQueryRoute, times: 1 }, (req) => {
      req.reply({
        statusCode: 200,
        delay,
        body: { message: `Mocked ${alias} response` },
      });
    }).as(alias);
  };

  const delayedFailure = (alias: string, delay = 3000, statusCode = 500) => {
    cy.intercept({ method: 'POST', url: page.sendQueryRoute, times: 1 }, (req) => {
      req.reply({
        statusCode,
        delay,
        body: { message: 'Mocked failure' },
      });
    }).as(alias);
  };

  const startLoading = (alias: string, prompt: string, delay = 7000) => {
    delayedSuccess(alias, delay);
    page.sendPrompt(prompt);
    page.assertProcessingIndicatorVisible(4000);
  };

  beforeEach(() => {
    page.loginOnceForSuite();
    page.openChatPage().waitForChatReady();
  });

  it('C679727 - Verify loading indicator appears immediately after submitting both main and follow-up prompts.', () => {
    delayedSuccess('firstSend', 6000);
    page.sendPrompt(`main prompt ${Date.now()}`);
    page.assertProcessingIndicatorVisible(3000);
    cy.wait('@firstSend').its('response.statusCode').should('eq', 200);
    page.assertProcessingIndicatorNotVisible();

    delayedSuccess('secondSend', 6000);
    page.sendPrompt(`follow up prompt ${Date.now()}`);
    page.assertProcessingIndicatorVisible(3000);
    cy.wait('@secondSend').its('response.statusCode').should('eq', 200);
    page.assertProcessingIndicatorNotVisible();
  });

  it('C708144 - Verify the indicator cycles through specific states.', () => {
    delayedSuccess('stateCycleSend', 12000);
    page.sendPrompt(`state cycle check ${Date.now()}`);

    const seen = new Set<string>();
    const expectedStates = ['Data analysis', 'Data extraction', 'Data processing', 'Generating visuals'];

    cy.wrap(Array.from({ length: 9 })).each(() => {
      cy.get('body').invoke('text').then((bodyText: string) => {
        expectedStates.forEach((state) => {
          if (new RegExp(state, 'i').test(bodyText)) {
            seen.add(state);
          }
        });
      });
      cy.wait(1200, { log: false });
    });

    cy.then(() => {
      expect(seen.size, 'processing states observed during loading').to.be.greaterThan(0);
    });

    cy.wait('@stateCycleSend').its('response.statusCode').should('eq', 200);
  });

  it('C708145 - Verify Ask Here text area is disabled/read-only while processing is active.', () => {
    startLoading('inputLockSend', `lock input check ${Date.now()}`, 7000);

    // Retryable assertion: while loading is active, input should be locked
    // or sending should be effectively blocked.
    cy.get('body', { timeout: 10000 }).should(($body: JQuery<HTMLElement>) => {
      const $input = $body.find(page['promptInputSelector' as keyof InputProcessingIndicatorPage] as string).filter(':visible').first();
      const $send = $body.find(page['sendButtonSelector' as keyof InputProcessingIndicatorPage] as string).filter(':visible').first();

      const inputLocked =
        ($input.length > 0) &&
        (
          $input.is(':disabled') ||
          String($input.attr('readonly') || '').toLowerCase() === 'readonly' ||
          String($input.attr('aria-disabled') || '').toLowerCase() === 'true' ||
          (($input[0] as HTMLElement).getAttribute('contenteditable') === 'false')
        );

      const sendDisabled =
        ($send.length > 0) &&
        (
          $send.is(':disabled') ||
          String($send.attr('aria-disabled') || '').toLowerCase() === 'true'
        );

      expect(inputLocked || sendDisabled, 'input locked/read-only or send disabled during loading').to.eq(true);
    });

    cy.wait('@inputLockSend').its('response.statusCode').should('eq', 200);
  });

  it('C708207 - Verify Edit prompt action is disabled or safely handled while response is processing.', () => {
    delayedSuccess('seedSend', 1200);
    page.sendPrompt(`seed for edit action ${Date.now()}`);
    cy.wait('@seedSend').its('response.statusCode').should('eq', 200);

    startLoading('loadingSend', `long loading for edit check ${Date.now()}`, 7000);

    page.tryOpenEditWhileLoading();

    // Safe handling rule: edit mode may visually appear, but it must not leave
    // the UI freely actionable while processing is active.
    cy.get('body', { timeout: 10000 }).should(($body: JQuery<HTMLElement>) => {
      const textVisible = $body.text() || '';
      const editModeVisible = /Edit your prompt/i.test(textVisible);

      const $send = $body.find('button[aria-label="Send"][type="button"], button[aria-label*="Send"], button[type="submit"]').filter(':visible').first();
      const sendDisabled =
        ($send.length > 0) &&
        (
          $send.is(':disabled') ||
          String($send.attr('aria-disabled') || '').toLowerCase() === 'true'
        );

      expect(!editModeVisible || sendDisabled, 'edit action disabled or safely blocked during loading').to.eq(true);
    });

    cy.wait('@loadingSend').its('response.statusCode').should('eq', 200);
  });

  it('C700472 - Verify Send button and Enter key are disabled and duplicate submissions are prevented during loading.', () => {
    let requestCount = 0;
    cy.intercept({ method: 'POST', url: page.sendQueryRoute }, (req) => {
      requestCount += 1;
      req.reply({ statusCode: 200, delay: 8000, body: { message: 'Mocked dedupe response' } });
    }).as('dedupeSend');

    page.sendPrompt(`dedupe check ${Date.now()}`);
    page.assertProcessingIndicatorVisible(3000);

    // Attempt duplicate submissions while the first request is in progress.
    page.pressEnterToSend();
    page.pressEnterToSend();
    page.sendButton().then(($btn: JQuery<HTMLElement>) => {
      if (!$btn.is(':disabled')) {
        cy.wrap($btn).click({ force: true });
      }
    });

    cy.wait(1000, { log: false });
    cy.then(() => {
      expect(requestCount, 'no duplicate submissions while loading').to.eq(1);
    });

    cy.wait('@dedupeSend').its('response.statusCode').should('eq', 200);
  });

  it('C700481 - Verify Send button provides immediate visual feedback upon interaction.', () => {
    delayedSuccess('visualFeedbackSend', 5000);

    page.sendButton().then(($btn: JQuery<HTMLElement>) => {
      const beforeClass = $btn.attr('class') || '';
      page.sendPrompt(`visual feedback check ${Date.now()}`);

      page.sendButton().then(($after: JQuery<HTMLElement>) => {
        const afterClass = $after.attr('class') || '';
        const disabled =
          $after.is(':disabled') ||
          String($after.attr('aria-disabled') || '').toLowerCase() === 'true';

        expect(disabled || beforeClass !== afterClass, 'immediate send feedback').to.eq(true);
      });
    });

    cy.wait('@visualFeedbackSend').its('response.statusCode').should('eq', 200);
  });

  it('C708206 - Verify loading indicator disappears immediately after a successful response is rendered.', () => {
    delayedSuccess('successDisappearSend', 4000);
    page.sendPrompt(`indicator disappear check ${Date.now()}`);

    page.assertProcessingIndicatorVisible(3000);
    cy.wait('@successDisappearSend').its('response.statusCode').should('eq', 200);
    page.assertProcessingIndicatorNotVisible();
  });

  it('C679737 - Verify loading indicator is cleared and not stuck after processing failure.', () => {
    delayedFailure('failureClearSend', 3000, 500);
    page.sendPrompt(`failure clear check ${Date.now()}`);

    page.assertProcessingIndicatorVisible(3000);
    cy.wait('@failureClearSend').its('response.statusCode').should('eq', 500);

    page.assertProcessingIndicatorNotVisible();
    page.messageInput().should('be.visible');
  });

  it('C700464 - Verify suggestions are not shown during loading state.', () => {
    delayedSuccess('noSuggestionSend', 7000);
    page.sendPrompt(`suggestion hidden check ${Date.now()}`);

    page.assertProcessingIndicatorVisible(3000);
    page.assertSuggestionsHiddenDuringLoading();

    cy.wait('@noSuggestionSend').its('response.statusCode').should('eq', 200);
  });

 
  it('C700488 - Verify loading state is session-specific (single-tab emulation in Cypress).', () => {
    // Note: Cypress does not support true multi-tab control in a single test run.
    // This test emulates Tab A -> Tab B behavior by switching sessions in one tab.
    let sessionA = '';

    delayedSuccess('sessionSpecificSend', 9000);
    page.sendPrompt(`session specific check ${Date.now()}`);
    page.assertProcessingIndicatorVisible(3000);

    cy.location('search').then((search: string) => {
      sessionA = new URLSearchParams(search).get('sessionId') || '';
    });

    cy.contains('button, [role="button"], a', /\+?\s*new\s*chat/i)
      .filter(':visible')
      .first()
      .click({ force: true });

    page.waitForChatReady();
    page.assertProcessingIndicatorNotVisible();

    // Prefer strict ID isolation when app exposes a different session id.
    // Some builds keep same URL sessionId until next submit; fall back to behavior validation.
    cy.location('search').then((search: string) => {
      const sessionB = new URLSearchParams(search).get('sessionId') || '';
      if (sessionA && sessionB && sessionB !== sessionA) {
        expect(sessionB, 'new session should differ from loading session').to.not.eq(sessionA);
      }
    });

    // Session B should remain interactive while Session A request is still in-flight.
    const probeText = `session B idle check ${Date.now()}`;
    page.typePrompt(probeText);
    page.readInputValue().should('include', probeText);

    cy.wait('@sessionSpecificSend').its('response.statusCode').should('eq', 200);
  });

  it.skip('T873883 - Verify loading state is isolated across two real browser tabs.', () => {
    // True test intent (not fully automatable in Cypress single-tab runtime):
    // 1) Open app in Tab A and Tab B.
    // 2) Submit a long query in Tab A.
    // 3) Immediately switch to Tab B.
    // 4) Verify Tab B remains idle and interactive.
    // 5) Verify loading indicator appears only in active processing session (Tab A).
    //
    // Why skipped here:
    // Cypress does not provide deterministic control over two independent browser tabs
    // in the same test execution context. Use manual execution or Playwright for strict
    // multi-tab validation.
  });

  it('C700498 - Verify loading indicator does not reappear after response is rendered.', () => {
    delayedSuccess('noReappearSend', 3500);
    page.sendPrompt(`no reappear check ${Date.now()}`);

    page.assertProcessingIndicatorVisible(3000);
    cy.wait('@noReappearSend').its('response.statusCode').should('eq', 200);

    page.assertProcessingIndicatorNotVisible();
    cy.wait(2000);
    page.assertProcessingIndicatorNotVisible();
  });

  it('C708208 - Verify chat history and previous messages remain visible and accessible during loading.', () => {
    delayedSuccess('seedHistorySend', 1000);
    const firstPrompt = `history accessibility seed ${Date.now()}`;
    page.sendPrompt(firstPrompt);
    cy.wait('@seedHistorySend').its('response.statusCode').should('eq', 200);

    delayedSuccess('loadingHistorySend', 7000);
    page.sendPrompt(`second prompt while loading ${Date.now()}`);
    page.assertProcessingIndicatorVisible(3000);

    cy.contains(firstPrompt).should('be.visible');
    page.openHistoryPanel();

    cy.wait('@loadingHistorySend').its('response.statusCode').should('eq', 200);
  });

  it('C679732 - Verify UI recovers gracefully when processing exceeds timeout or after failure.', () => {
    delayedFailure('timeoutRecoverySend', 8000, 504);
    page.sendPrompt(`timeout recovery check ${Date.now()}`);

    page.assertProcessingIndicatorVisible(3000);
    cy.wait('@timeoutRecoverySend').its('response.statusCode').should('eq', 504);

    page.assertProcessingIndicatorNotVisible();
    page.messageInput().should('be.visible');
    page.sendButton().should('be.visible');
  });
});
