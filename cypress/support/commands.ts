/// <reference types="cypress" />

// ── Typed API contracts ─────────────────────────────────────────────────────

interface AuthData {
  access_token: string;
  refresh_token: string;
  userInfo?: Record<string, unknown>;
}

interface ApiResponse<T> {
  data: T;
}

interface LoginResponse {
  body: ApiResponse<AuthData>;
  status: number;
}

interface Chat {
  id: string | number;
  title?: string;
  createdAt?: string;
}

interface ChatListResponse {
  body: ApiResponse<Chat[] | { chats: Chat[] }>;
  status: number;
}

interface UsersFixture {
  validUser: { email: string; password: string };
}

interface Credentials {
	email: string;
	password: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function extractChatList(body: ApiResponse<Chat[] | { chats: Chat[] }> | any): Chat[] {
  if (!body) return [];
  if (Array.isArray(body)) return body as Chat[];
  const data = (body as any)?.data;
  if (!data) return [];
  if (Array.isArray(data)) return data as Chat[];
  if (Array.isArray((data as any)?.chats)) return (data as any).chats as Chat[];
  // handle { data: { data: [...] } } and { data: { items: [...] } }
  if (Array.isArray((data as any)?.data)) return (data as any).data as Chat[];
  if (Array.isArray((data as any)?.items)) return (data as any).items as Chat[];
  return [];
}

function isPlaceholderCredential(value: string): boolean {
	return value.includes('__SET_VIA_CYPRESS_');
}

function resolveValidCredentials(users: UsersFixture): Credentials {
	const email = String(Cypress.env('USER_EMAIL') || users.validUser.email || '').trim();
	const password = String(Cypress.env('USER_PASSWORD') || users.validUser.password || '').trim();

	if (!email || !password || isPlaceholderCredential(email) || isPlaceholderCredential(password)) {
		throw new Error(
			'Valid credentials not resolved. Set CYPRESS_USER_EMAIL and CYPRESS_USER_PASSWORD in the same terminal before running Cypress.',
		);
	}

	return { email, password };
}

export function loginBySession() {
	cy.session('login-session', () => {
		cy.visit('/login');
		cy.fixture('users').then((users: UsersFixture) => {
			const credentials = resolveValidCredentials(users);
			cy.get('#email').type(credentials.email);
			cy.get('#password').type(credentials.password);
			cy.get('button.btn.btn-primary.btn-lg > span').click();
			cy.url({ timeout: 30000 }).should('not.include', '/login');
		});
	});
}

export function loginByApi() {
	const email = Cypress.env('USER_EMAIL');
	const password = Cypress.env('USER_PASSWORD');

	if (!email || !password) {
		throw new Error(
			'loginByApi: CYPRESS_USER_EMAIL and CYPRESS_USER_PASSWORD env vars must be set. ' +
			'Do not rely on the fixture; provide credentials through CI secrets.',
		);
	}

	cy.request('POST', '/api/auth/login', { email, password }).then((res: LoginResponse) => {
		expect(res.status).to.eq(200);
		expect(res.body?.data?.access_token).to.be.a('string');
		expect(res.body?.data?.refresh_token).to.be.a('string');

		cy.window().then((windowObject: Window) => {
			windowObject.localStorage.setItem('access_token', res.body.data.access_token);
			windowObject.localStorage.setItem('refresh_token', res.body.data.refresh_token);
			windowObject.localStorage.setItem('userData', JSON.stringify(res.body.data.userInfo ?? {}));
		});
	});
}

export function clearChatsByProjectViaApi() {
	const projectId = Cypress.env('projectId') || '11';

	cy.window().then((windowObject: Window) => {
		const accessToken = windowObject.localStorage.getItem('access_token') || '';
		expect(accessToken, 'access_token for cleanup').to.be.a('string').and.not.be.empty;

		cy.request({
			method: 'GET',
			url: `/api/chats/by-project/${projectId}`,
			headers: {
				Authorization: `Bearer ${accessToken}`,
			},
		}).then((res: ChatListResponse) => {
			expect(res.status).to.eq(200);

			const chatList = extractChatList(res.body);

			cy.wrap(chatList).each((chat: Chat) => {
				const chatId = chat?.id;
				if (!chatId) {
					return;
				}

				cy.request({
					method: 'DELETE',
					url: `/api/chats/${chatId}`,
					headers: {
						Authorization: `Bearer ${accessToken}`,
					},
				}).its('status').should('eq', 200);
			});
		});
	});
}

export function seedChatsByProjectViaApiIfEmpty(targetCount = 5, upperLimit = 20) {
	const projectId = Number(Cypress.env('projectId') || '11');

	cy.window().then((windowObject: Window) => {
		const accessToken = windowObject.localStorage.getItem('access_token') || '';
		expect(accessToken, 'access_token for seeding').to.be.a('string').and.not.be.empty;

		cy.request({
			method: 'GET',
			url: `/api/chats/by-project/${projectId}`,
			headers: {
				Authorization: `Bearer ${accessToken}`,
			},
		}).then((listRes: ChatListResponse) => {
			expect(listRes.status).to.eq(200);

			const chatList = extractChatList(listRes.body);

			const existingCount = chatList.length;

			if (existingCount > upperLimit) {
				return;
			}

			if (existingCount > 0) {
				return;
			}

			const payloads = Array.from({ length: targetCount }, () => ({ projectId }));

			cy.wrap(payloads).each((payload: { projectId: number }) => {
				cy.request({
					method: 'POST',
					url: '/api/chats',
					headers: {
						Authorization: `Bearer ${accessToken}`,
					},
					body: payload,
				}).its('status').should('eq', 201);
			});
		});
	});
}

export function ensureChatsByProjectMinCount(minCount = 10, upperLimit = 50) {
	const projectId = Number(Cypress.env('projectId') || '11');

	cy.window().then((windowObject: Window) => {
		const accessToken = windowObject.localStorage.getItem('access_token') || '';
		expect(accessToken, 'access_token for min-count seeding').to.be.a('string').and.not.be.empty;

		cy.request({
			method: 'GET',
			url: `/api/chats/by-project/${projectId}`,
			headers: {
				Authorization: `Bearer ${accessToken}`,
			},
		}).then((listRes: ChatListResponse) => {
			expect(listRes.status).to.eq(200);

			const chatList = extractChatList(listRes.body);

			const existingCount = chatList.length;
			if (existingCount >= minCount || existingCount >= upperLimit) {
				return;
			}

			const toCreate = Math.min(minCount - existingCount, upperLimit - existingCount);
			const payloads = Array.from({ length: Math.max(toCreate, 0) }, () => ({ projectId }));

			cy.wrap(payloads).each((payload: { projectId: number }) => {
				cy.request({
					method: 'POST',
					url: '/api/chats',
					headers: {
						Authorization: `Bearer ${accessToken}`,
					},
					body: payload,
				}).its('status').should('eq', 201);
			});
		});
	});
}

// @types/cypress@0.1.x does not include the modern Commands.add overloads;
// cast command names to satisfy the older type signature while keeping implementations typed.
type CommandName = keyof Cypress.Chainable<void>;

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
