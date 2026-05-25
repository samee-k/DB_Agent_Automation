/// <reference types="cypress" />

import { loginBySessionUi } from './api/auth.service';
import {
  clearChatsByProjectViaApiService,
  ensureChatsByProjectMinCountService,
  seedChatsByProjectViaApiIfEmptyService,
} from './api/chat.service';

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

export {};
