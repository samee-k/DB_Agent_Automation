/// <reference types="cypress" />

import { loginBySessionUi } from './api/auth.service';
import {
  clearChatsByProjectViaApiService,
  ensureChatsByProjectMinCountService,
  seedChatsByProjectViaApiIfEmptyService,
} from './api/chat.service';
import { CHAT_INPUT_SELECTOR, SEND_BUTTON_SELECTOR } from './selectors/CommonSelectors';
import { typeIntoComposer } from './helpers/composer';
import { TIMEOUTS } from './constants';
import type { SendPromptOptions } from './commands.d';

export function loginBySession() {
	loginBySessionUi();
}

export function clearChatsByProjectViaApi() {
	return clearChatsByProjectViaApiService();
}

export function seedChatsByProjectViaApiIfEmpty(targetCount = 5, upperLimit = 20) {
	seedChatsByProjectViaApiIfEmptyService(targetCount, upperLimit);
}

export function ensureChatsByProjectMinCount(minCount = 10, upperLimit = 50) {
	ensureChatsByProjectMinCountService(minCount, upperLimit);
}

Cypress.Commands.add('loginBySession', () => {
	loginBySession();
});

Cypress.Commands.add('clearChatsByProjectViaApi', () => {
	clearChatsByProjectViaApi();
});

Cypress.Commands.add('seedChatsByProjectViaApiIfEmpty', (targetCount?: number, upperLimit?: number) => {
	seedChatsByProjectViaApiIfEmpty(targetCount ?? 5, upperLimit ?? 20);
});

Cypress.Commands.add('ensureChatsByProjectMinCount', (minCount?: number, upperLimit?: number) => {
	ensureChatsByProjectMinCount(minCount ?? 10, upperLimit ?? 50);
});

Cypress.Commands.add('clearSessionStorage', () => {
	cy.window().then((windowObject: Window) => {
		windowObject.sessionStorage.clear();
	});
});

Cypress.Commands.add('undo', () => {
	const isMac = Cypress.platform === 'darwin';
	const undoKey = isMac ? 'Meta' : 'Control';

	cy.window().then((windowObject: Window) => {
		windowObject.focus();
	});

	cy.realPress([undoKey, 'z']);
});

Cypress.Commands.add('undoJS', (selector: string) => {
	cy.get(selector).then(($element: JQuery<HTMLElement>) => {
		const target = $element[0] as HTMLElement;
		target.focus();

		cy.document().then((documentObject: Document) => {
			documentObject.execCommand('undo', false, '');
		});
	});
});

Cypress.Commands.add('getAccessToken', () => {
  return cy.window().then((win) => {
    const token = win.localStorage.getItem('access_token');
    if (!token) throw new Error('No access token found');
    return token;
  });
});

// Centralized send prompt command: types prompt and triggers send (click or Enter).
// Pass `waitFor` to wait on one or more `cy.intercept` aliases set up by the caller.
Cypress.Commands.add('sendPrompt', (promptText: string, options?: SendPromptOptions) => {
	const timeout = options?.timeout ?? TIMEOUTS.llmResponse;
	const waitFor = options?.waitFor;
	const aliases = !waitFor ? [] : Array.isArray(waitFor) ? waitFor : [waitFor];

	cy.get(CHAT_INPUT_SELECTOR, { timeout: TIMEOUTS.ui }).filter(':visible').first().then(($input: JQuery<HTMLElement>) => {
		typeIntoComposer($input, promptText);

		cy.get(SEND_BUTTON_SELECTOR).filter(':visible').then(($btn) => {
			if ($btn.length) {
				cy.wrap($btn).click();
			} else {
				cy.wrap($input).type('{enter}');
			}
		});
	});

	// Queue waits at command-body level so they run sequentially after the
	// typing chain above. Cypress's command queue handles ordering without
	// wrapping in a redundant .then() that swallows the chain's subject.
	aliases.forEach((alias) => {
		const tag = alias.startsWith('@') ? alias : `@${alias}`;
		cy.wait(tag, { timeout });
	});
});

export {};
