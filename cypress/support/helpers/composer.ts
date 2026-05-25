/// <reference types="cypress" />

// ---------------------------------------------------------------------------
// Composer (chat input) helpers
//
// The chat input renders as either a <textarea> or a contenteditable element
// depending on the app version. Every page object used to inline the same
// "is this contenteditable?" branch — this file is the single source of truth.
//
// Use these from page objects' messageInput().then(($input) => …) blocks.
// ---------------------------------------------------------------------------

export function isContentEditableInput($input: JQuery<HTMLElement>): boolean {
  const el = $input[0] as HTMLElement;
  return el.getAttribute('contenteditable') === 'true' || el.isContentEditable;
}

/** Click → (clear if textarea) → type. The canonical "type a fresh prompt" action. */
export function typeIntoComposer($input: JQuery<HTMLElement>, text: string): void {
  const isCE = isContentEditableInput($input);
  cy.wrap($input).click();
  if (!isCE) cy.wrap($input).clear();
  cy.wrap($input).type(text, { delay: 0 });
}

/** Click → type (no clear). Use when appending to existing content. */
export function appendIntoComposer($input: JQuery<HTMLElement>, text: string): void {
  cy.wrap($input).click();
  cy.wrap($input).type(text, { delay: 0 });
}

/** Clear contents in a mode-aware way. */
export function clearComposer($input: JQuery<HTMLElement>): void {
  const isCE = isContentEditableInput($input);
  cy.wrap($input).click();
  if (isCE) {
    cy.wrap($input).type('{selectall}{backspace}');
  } else {
    cy.wrap($input).clear();
  }
}

/** Read the composer's current text. text() for contenteditable, val() for textarea. */
export function readComposerValue($input: JQuery<HTMLElement>): string {
  if (isContentEditableInput($input)) {
    return ($input.text() ?? '').toString();
  }
  const raw = $input.val();
  if (Array.isArray(raw)) return raw.join(' ');
  return raw == null ? '' : String(raw);
}
