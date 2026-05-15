// Selectors for chat messages (for robust message targeting in assertions)
export const MESSAGE_SELECTORS = [
  '[data-testid*="message"]',
  '[data-testid*="chat-message"]',
  '[class*="message"]',
  '[class*="chat-bubble"]',
  '[role="article"]',
] as const;
export const MESSAGE_SELECTOR = MESSAGE_SELECTORS.join(', ');

// Selectors for chat titles (for robust chat title targeting in assertions)
export const CHAT_TITLE_SELECTORS = [
  '[data-testid="chat-title"]',
  '[data-testid*="title"]',
  'header h1',
  'header h2',
  'h1',
  'h2',
] as const;
export const CHAT_TITLE_SELECTOR = CHAT_TITLE_SELECTORS.join(', ');
/// <reference types="cypress" />

// Shared fallback selectors for the chat composer input used across page objects.
export const CHAT_INPUT_SELECTORS = [
  '#dbagent-textarea',
  'textarea.dbagent-textarea',
  'textarea[id="dbagent-textarea"]',
  '[data-testid="message-input"]',
  '[data-testid="chat-input"]',
  '[data-cy="chat-input"]',
  'textarea.chat-input',
  'textarea[placeholder*="Ask here" i]',
  '[role="textbox"][placeholder*="Ask here" i]',
  '[role="textbox"]',
  '[contenteditable="true"]',
  '.ProseMirror',
  '.ql-editor',
] as const;

export const CHAT_INPUT_SELECTOR = CHAT_INPUT_SELECTORS.join(', ');

export const SEND_BUTTON_SELECTORS = [
  '[data-cy="send-button"]',
  'button[aria-label="Send"][type="button"]',
  'button[aria-label*="Send"]',
] as const;

export const SEND_BUTTON_SELECTOR = SEND_BUTTON_SELECTORS.join(', ');

export const USER_MESSAGE_SELECTORS = [
  '[data-testid*="user-message"]',
  '[data-testid*="user-prompt"]',
  '[data-cy="user-message"]',
  '.user-message',
  '.user-prompt',
  '.chat-message.user',
  '.message.user',
  '.question',
  '.user-query',
] as const;

export const USER_MESSAGE_SELECTOR = USER_MESSAGE_SELECTORS.join(', ');