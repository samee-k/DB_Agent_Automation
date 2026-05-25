// Centralized test prompts (synchronous import to avoid cy.fixture async)
import type { PromptsFixture } from './types';

export const PROMPTS: PromptsFixture = {
  shortPrompt: 'Hi',
  specialPrompt: 'abc123 !@#$%^&*()_+-=;:,.?/',
  sqlPrompt: 'SELECT * FROM users WHERE id = 1;',
  longPrompt:
    "Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen book. It has survived not only five centuries, but also the leap into electronic typesetting, remaining essentially unchanged. It was popularised in the 1960s with the release of Letraset sheets containing Lorem Ipsum passages, and more recently with desktop publishing software like Aldus PageMaker including versions of Lorem Ipsum.",
  veryLongPastedPrompt: null,
  historyBottom: 'HI',
  historyTop: 'HELLO',
};

// compute veryLongPastedPrompt lazily to avoid duplication
if (!PROMPTS.veryLongPastedPrompt) {
  PROMPTS.veryLongPastedPrompt = `${PROMPTS.longPrompt}\n${PROMPTS.longPrompt}\n${PROMPTS.longPrompt}\n${PROMPTS.longPrompt}`;
}

export default PROMPTS;
