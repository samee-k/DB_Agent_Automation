/// <reference types="cypress" />

import { loginByApiWithEnv, loginBySessionUi } from '../services/api/auth.service';
import {
  clearChatsByProjectViaApiService,
  ensureChatsByProjectMinCountService,
  seedChatsByProjectViaApiIfEmptyService,
} from '../services/api/chat.service';

export function loginBySession() {
	loginBySessionUi();
}

export function loginByApi() {
	loginByApiWithEnv();
}

export function clearChatsByProjectViaApi() {
	clearChatsByProjectViaApiService();
}

export function seedChatsByProjectViaApiIfEmpty(targetCount = 5, upperLimit = 20) {
	seedChatsByProjectViaApiIfEmptyService(targetCount, upperLimit);
}

export function ensureChatsByProjectMinCount(minCount = 10, upperLimit = 50) {
	ensureChatsByProjectMinCountService(minCount, upperLimit);
}

// @types/cypress@0.1.x does not include the modern Commands.add overloads;
// cast command names to satisfy the older type signature while keeping implementations typed.
type CommandName = keyof Cypress.Chainable<void>;

Cypress.Commands.add('loginBySession' as CommandName, () => {
	loginBySession();
});

Cypress.Commands.add('loginByApi' as CommandName, () => {
	loginByApi();
});

Cypress.Commands.add('loginByApiSession' as CommandName, () => {
	cy.session('api-login-session', () => {
		loginByApi();
	}, {
		validate() {
			cy.window().then((windowObject: Window) => {
				const token = windowObject.localStorage.getItem('access_token');
				expect(token, 'access_token in localStorage').to.be.a('string').and.not.be.empty;
			});
		},
	});
});

Cypress.Commands.add('clearChatsByProjectViaApi' as CommandName, () => {
	clearChatsByProjectViaApi();
});

Cypress.Commands.add('seedChatsByProjectViaApiIfEmpty' as CommandName, ((targetCount?: number, upperLimit?: number) => {
	seedChatsByProjectViaApiIfEmpty(targetCount ?? 5, upperLimit ?? 20);
}) as Cypress.CommandFn<CommandName>);

Cypress.Commands.add('ensureChatsByProjectMinCount' as CommandName, ((minCount?: number, upperLimit?: number) => {
	ensureChatsByProjectMinCount(minCount ?? 10, upperLimit ?? 50);
}) as Cypress.CommandFn<CommandName>);

Cypress.Commands.add('clearSessionStorage' as CommandName, () => {
	cy.window().then((windowObject: Window) => {
		windowObject.sessionStorage.clear();
	});
});

Cypress.Commands.add('undo' as CommandName, () => {
	const isMac = Cypress.platform === 'darwin';
	const undoKey = isMac ? 'Meta' : 'Control';

	cy.window().then((windowObject: Window) => {
		windowObject.focus();
	});

	cy.realPress([undoKey, 'z']);
});

Cypress.Commands.add('undoJS' as CommandName, ((selector: string) => {
	cy.get(selector).then(($element: JQuery<HTMLElement>) => {
		const target = $element[0] as HTMLElement;
		target.focus();

		cy.document().then((documentObject: Document) => {
			documentObject.execCommand('undo', false, '');
		});
	});
}) as Cypress.CommandFn<CommandName>);

Cypress.Commands.add('getAccessToken', () => {
  return cy.window().then((win) => {
    const token = win.localStorage.getItem('access_token');
    if (!token) throw new Error('No access token found');
    return token;
  });
});

export {};
