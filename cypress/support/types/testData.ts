export interface User {
  email: string;
  password: string;
}

export interface UsersFixture {
  validUser: User;
  invalidUser: User;
  invalidEmailFormats: string[];
}

export interface MenuItem {
  id: string;
  name: string;
}

export interface ChatHistoryFixture {
  updatedTitle: string;
  specialCharTitle: string;
  maxLengthTitle: string;
  searchTerm: string;
  searchNoMatchTerm: string;
}

// ── Cypress reusable type aliases ─────────────────────────────────────────────
export type ChainableEl = Cypress.Chainable<JQuery<HTMLElement>>;
export type ChainableVoid = Cypress.Chainable<void>;

/** Shape returned by the chat API — covers all known envelope variants. */
export interface ChatApiBody {
  data?: ChatApiBodyData | Chat[];
  chats?: Chat[];
  items?: Chat[];
  records?: Chat[];
  totalrecords?: number;
  totalRecords?: number;
}

export interface ChatApiBodyData {
  chats?: Chat[];
  items?: Chat[];
  data?: Chat[];
  records?: Chat[];
  title?: string;
  totalrecords?: number;
  totalRecords?: number;
}

export interface Chat {
  id: string | number;
  title?: string;
  createdAt?: string;
}
