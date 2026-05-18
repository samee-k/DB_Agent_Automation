/// <reference types="cypress" />

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

interface UsersFixture {
  validUser: { email: string; password: string };
}

interface Credentials {
  email: string;
  password: string;
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

export function loginBySessionUi() {
  cy.session('login-session', () => {
    cy.visit('/login');
    cy.fixture('users').then((users: UsersFixture) => {
      const credentials = resolveValidCredentials(users);
      cy.get('#email').type(credentials.email);
      cy.get('#password').type(credentials.password);
      cy.get('button.btn.btn-primary.btn-lg > span').click();
      cy.url({ timeout: 30000 }).should('not.include', '/login');
    });
  }, { cacheAcrossSpecs: true });
}

export function loginByApiWithEnv() {
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
