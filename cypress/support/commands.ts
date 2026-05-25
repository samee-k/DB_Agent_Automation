/// <reference types="cypress" />

import { loginBySessionUi } from './api/auth.service';
import {
  clearChatsByProjectViaApiService,
  ensureChatsByProjectMinCountService,
  seedChatsByProjectViaApiIfEmptyService,
} from './api/chat.service';
import { CHAT_INPUT_SELECTOR, SEND_BUTTON_SELECTOR } from './selectors/CommonSelectors';

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
	return clearChatsByProjectViaApi();
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

type SendPromptOptions = { timeout?: number };

// Centralized send prompt command: types prompt and triggers send (click or Enter),
// then waits for common aliases if they exist (`createChat`, `sendQuery`, `chatRequest`).
Cypress.Commands.add('sendPrompt', (promptText: string, options?: SendPromptOptions) => {
	const timeout = options?.timeout ?? 120000;

	cy.get(CHAT_INPUT_SELECTOR, { timeout: 20000 }).filter(':visible').first().then(($input: JQuery<HTMLElement>) => {
		const inputEl = $input[0] as HTMLElement;
		const isContentEditable = inputEl.getAttribute('contenteditable') === 'true' || inputEl.isContentEditable;

		cy.wrap($input).click();
		if (!isContentEditable) cy.wrap($input).clear();
		cy.wrap($input).type(promptText, { delay: 0 });

		cy.get(SEND_BUTTON_SELECTOR).filter(':visible').then(($btn) => {
			if ($btn.length) {
				cy.wrap($btn).click();
			} else {
				cy.wrap($input).type('{enter}');
			}
		});
	}).then(() => {
		const aliases = ((Cypress as unknown) as { state: (k: string) => Record<string, unknown> | undefined }).state('aliases') || {};
		if ((aliases as any).createChat || (aliases as any)['@createChat']) cy.wait('@createChat', { timeout });
		if ((aliases as any).sendQuery || (aliases as any)['@sendQuery']) cy.wait('@sendQuery', { timeout });
		if ((aliases as any).chatRequest || (aliases as any)['@chatRequest']) cy.wait('@chatRequest', { timeout });
	});
});

export {};
