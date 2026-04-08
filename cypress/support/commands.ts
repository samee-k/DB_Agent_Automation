/// <reference types="cypress" />

export function loginBySession() {
	cy.session('login-session', () => {
		cy.visit('/login');
		cy.fixture('users').then((users: any) => {
			cy.get('#email').type(users.validUser.email);
			cy.get('#password').type(users.validUser.password);
			cy.get('button.btn.btn-primary.btn-lg > span').click();
			cy.url({ timeout: 30000 }).should('not.include', '/login');
		});
	});
}

Cypress.Commands.add('undo' as any, () => {
	const isMac = Cypress.platform === 'darwin';
	const undoKey = isMac ? 'Meta' : 'Control';

	cy.window().then((windowObject: Window) => {
		windowObject.focus();
	});

	cy.realPress([undoKey, 'z']);
});

Cypress.Commands.add('undoJS' as any, ((selector: string) => {
	cy.get(selector).then(($element: JQuery<HTMLElement>) => {
		const target = $element[0] as HTMLElement;
		target.focus();

		cy.document().then((documentObject: Document) => {
			documentObject.execCommand('undo', false, '');
		});
	});
}) as any);

export {};
