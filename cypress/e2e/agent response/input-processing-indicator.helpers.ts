/// <reference types="cypress" />

import { InputProcessingIndicatorPage } from '../../pages/InputProcessingIndicatorPage';

export const DELAYS = {
  quick: 1200,
  normal: 2200,
  long: 4000,
  cycle: 5000,
} as const;

export const TIMEOUTS = {
  indicator: 2500,
  network: 30000,
} as const;

export interface RequestCountRef {
  count: number;
}

export const interceptDelayedSuccess = (
  page: InputProcessingIndicatorPage,
  alias: string,
  delay: number = DELAYS.normal,
): void => {
  cy.intercept({ method: 'POST', url: page.sendQueryRoute, times: 1 }, (req) => {
    req.continue((res) => {
      res.setDelay(delay);
    });
  }).as(alias);
};

export const interceptDelayedFailure = (
  page: InputProcessingIndicatorPage,
  alias: string,
  delay: number = DELAYS.normal,
  statusCode = 500,
): void => {
  cy.intercept({ method: 'POST', url: page.sendQueryRoute, times: 1 }, (req) => {
    req.reply({ statusCode, delay, body: { message: 'Mocked failure' } });
  }).as(alias);
};

export const interceptCounting = (
  page: InputProcessingIndicatorPage,
  alias: string,
  delay: number,
): RequestCountRef => {
  const ref: RequestCountRef = { count: 0 };
  cy.intercept({ method: 'POST', url: page.sendQueryRoute }, (req) => {
    ref.count += 1;
    req.continue((res) => {
      res.setDelay(delay);
    });
  }).as(alias);
  return ref;
};

export const waitFor = (alias: string, timeout = TIMEOUTS.network): void => {
  cy.wait(`@${alias}`, { timeout });
};

export const assertIndicatorVisible = (
  page: InputProcessingIndicatorPage,
  timeout = TIMEOUTS.indicator,
): void => {
  cy.get('body', { timeout }).should(($body: JQuery<HTMLElement>) => {
    const visible = $body
      .find('*')
      .filter(':visible')
      .toArray()
      .some((el: Element) => page.processingStateRegex.test((el.textContent || '').trim()));
    expect(visible, 'processing indicator should be visible').to.eq(true);
  });
};

export const assertIndicatorNotVisible = (page: InputProcessingIndicatorPage): void => {
  cy.get('body', { timeout: 15000 }).should(($body: JQuery<HTMLElement>) => {
    const hasText = $body
      .find('*')
      .filter(':visible')
      .toArray()
      .some((el: Element) => page.processingStateRegex.test((el.textContent || '').trim()));
    const $input = $body.find(page.promptInputSelector).filter(':visible').first();
    const $send = $body.find(page.sendButtonSelector).filter(':visible').first();
    const inputDisabled =
      $input.length > 0 &&
      ($input.is(':disabled') ||
        String($input.attr('readonly') || '').toLowerCase() === 'readonly' ||
        String($input.attr('aria-disabled') || '').toLowerCase() === 'true');
    const sendDisabled =
      $send.length > 0 &&
      ($send.is(':disabled') ||
        String($send.attr('aria-disabled') || '').toLowerCase() === 'true');
    expect(
      hasText && (inputDisabled || sendDisabled),
      'processing indicator should not be actively blocking',
    ).to.eq(false);
  });
};

export const assertInputLockedOrSendDisabled = (page: InputProcessingIndicatorPage): void => {
  cy.get('body').then(($body: JQuery<HTMLElement>) => {
    const $input = $body.find(page.promptInputSelector).filter(':visible').first();
    const $send = $body.find(page.sendButtonSelector).filter(':visible').first();
    const inputLocked =
      $input.is(':disabled') ||
      String($input.attr('readonly') || '').toLowerCase() === 'readonly' ||
      String($input.attr('aria-disabled') || '').toLowerCase() === 'true';
    const sendLocked =
      $send.is(':disabled') ||
      String($send.attr('aria-disabled') || '').toLowerCase() === 'true';
    expect(inputLocked || sendLocked, 'input locked or send disabled during processing').to.eq(true);
  });
};

export const assertEditSafelyHandled = (page: InputProcessingIndicatorPage): void => {
  cy.get('body').then(($body: JQuery<HTMLElement>) => {
    const editModeVisible = $body
      .find('*')
      .filter(':visible')
      .toArray()
      .some((el: Element) => page.editModeLabelRegex.test((el.textContent || '').trim()));
    const $input = $body.find(page.promptInputSelector).filter(':visible').first();
    const $send = $body.find(page.sendButtonSelector).filter(':visible').first();
    const inputDisabled =
      $input.length > 0 &&
      ($input.is(':disabled') ||
        String($input.attr('readonly') || '').toLowerCase() === 'readonly' ||
        String($input.attr('aria-disabled') || '').toLowerCase() === 'true');
    const sendDisabled =
      $send.length > 0 &&
      ($send.is(':disabled') ||
        String($send.attr('aria-disabled') || '').toLowerCase() === 'true');
    expect(!editModeVisible || inputDisabled || sendDisabled, 'edit action safely handled while processing').to.eq(true);
  });
};

export const assertSuggestionsHidden = (page: InputProcessingIndicatorPage): void => {
  cy.get('body').then(($body: JQuery<HTMLElement>) => {
    const visible = $body.find(page.suggestionItemSelector).filter(':visible').length;
    expect(visible, 'suggestions should be hidden during loading').to.eq(0);
  });
};

export const startLoading = (
  page: InputProcessingIndicatorPage,
  alias: string,
  prompt: string,
  delay: number = DELAYS.long,
): void => {
  interceptDelayedSuccess(page, alias, delay);
  page.sendPrompt(prompt);
  assertIndicatorVisible(page, TIMEOUTS.indicator);
};
