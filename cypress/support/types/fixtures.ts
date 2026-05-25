/** Test fixture data shapes — mirror the JSON files under cypress/fixtures/. */

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

export interface PromptsFixture {
  shortPrompt: string;
  specialPrompt: string;
  sqlPrompt: string;
  longPrompt: string;
  veryLongPastedPrompt: string | null;
  historyBottom: string;
  historyTop: string;
}
