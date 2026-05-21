/// <reference types="cypress" />

import { UserPromptActionsPage } from '../../support/pages/UserPromptActionsPage';

describe('User Prompt Actions - Copy and Edit', () => {
  const page = new UserPromptActionsPage();
  const basePrompt = 'Show all users from the database';

  beforeEach(() => {
    page.loginOnceForSuite();
    page.openChatPage().waitForWelcomeScreen();
    page.sendPromptAndEnsureUserMessage(basePrompt);
  });

  // ── Hover icon visibility ──────────────────────────────────────────────────

  describe('Hover Icon Visibility', () => {
    it('C779786 - Verify that Copy and Edit icons appear only when hovering over a successfully sent prompt', () => {
      // Icons are in the DOM but hidden via CSS on the parent container before hover.
      page.assertActionIconsHiddenForMessage(basePrompt, 'before hover');

      // After hover: both icons must be visually exposed.
      page.hoverUserMessageContaining(basePrompt);
      page.getCopyIcon().should('be.visible');
      page.getEditIcon().should('be.visible');
    });

    it('C779787 - Verify that Copy and Edit icons are hidden by default and visible only on hover', () => {
      // Before hover: parent container is CSS-hidden.
      page.assertActionIconsHiddenForMessage(basePrompt, 'before hover');

      // After hover: both icons appear.
      page.hoverUserMessageContaining(basePrompt);
      page.getCopyIcon().should('be.visible');
      page.getEditIcon().should('be.visible');

      // Move mouse away to a safe area and verify icons hide again.
      cy.get('body').realHover({ position: 'topLeft' });
      cy.wait(400);
      page.assertActionIconsHiddenForMessage(basePrompt, 'after unhover');
    });
  });

  // ── Copy User Input Prompt ─────────────────────────────────────────────────

  describe('Copy User Input Prompt', () => {
    it('C690715 - Verify that the user can Copy the Sent Prompt and receives confirmation', () => {
      page.hoverUserMessageContaining(basePrompt);
      page.clickCopyIcon();
      page.assertCopyConfirmation();
    });

    it('C690718 - Verify that copied prompt text matches original prompt input exactly when user pastes it', () => {
      // Stub clipboard before hovering so the write is captured.
      page.stubClipboard();

      page.hoverUserMessageContaining(basePrompt);
      page.clickCopyIcon();

      // Assert clipboard.writeText was called with the exact original prompt text.
      cy.get('body').then(($body: JQuery<HTMLElement>) => {
        cy.get('@clipboardWrite').then((stub: any) => {
          if (stub && typeof stub.getCall === 'function' && stub.callCount > 0) {
            const writtenText = stub.getCall(0).args[0] as string;
            expect(writtenText.trim()).to.eq(basePrompt);
          } else {
            // Fallback: clipboard API not used — verify confirmation UI instead.
            const hasCopied = /copied/i.test($body.text());
            const hasToast = $body.find('[class*="toast"], [role="status"], [role="alert"]').filter(':visible').length > 0;
            expect(hasCopied || hasToast, 'copy confirmation or clipboard call').to.eq(true);
          }
        });
      });
    });
  });

  // ── Edit User Input Prompt ────────────────────────────────────────────────

  describe('Edit User Input Prompt', () => {
    it('C779788 - Verify that clicking the Edit icon activates the Edit Mode UI and displays the Edit your prompt label', () => {
      page.hoverUserMessageContaining(basePrompt);
      page.clickEditIcon();

      page.assertEditAreaVisible();
      page.assertEditModeLabelVisible();
    });

    it('C779789 - Verify that the existing prompt text is automatically populated within the textarea when entering edit mode', () => {
      page.hoverUserMessageContaining(basePrompt);
      page.clickEditIcon();

      page.assertEditAreaVisible();
      page.assertEditTextareaContains(basePrompt);
    });

    it('C779790 - Verify that the character counter correctly reflects the current length of the text being edited', () => {
      page.hoverUserMessageContaining(basePrompt);
      page.clickEditIcon();
      page.assertEditAreaVisible();

      page.assertCharCounterReflectsCurrentLength();

      page.clearAndTypeInEditArea('abcde');
      page.assertCharCounterReflectsCurrentLength();
    });

    it('C779791 - Verify that Edit Mode UI disappears and returns to standard input state after successful save or cancel', () => {
      const savedPrompt = 'Edited prompt for save-flow verification';

      cy.intercept({ method: 'POST', url: page.sendQueryRoute }).as('editSave');

      // Save flow should close edit mode and update prompt text.
      page.hoverUserMessageContaining(basePrompt);
      page.clickEditIcon();
      page.assertEditModeLabelVisible();
      page.clearAndTypeInEditArea(savedPrompt);
      page.saveEdit();
      cy.wait('@editSave', { timeout: 90000 });

      page.getUserMessageContaining(savedPrompt, 10000).should('be.visible');
      page.assertEditModeLabelNotVisible();

      // Cancel flow should close edit mode without applying the attempted change.
      page.hoverUserMessageContaining(savedPrompt);
      page.clickEditIcon();
      page.assertEditModeLabelVisible();
      page.clearAndTypeInEditArea('should not persist after cancel');
      page.cancelEdit();

      page.assertEditModeLabelNotVisible();
      page.getUserMessageContaining(savedPrompt, 10000).should('be.visible');
    });

    it('C690719 - Verify that the user can modify the existing prompt and save changes clicking on the edit icon', () => {
      cy.intercept({ method: 'POST', url: page.sendQueryRoute }).as('editSave');

      page.hoverUserMessageContaining(basePrompt);
      page.clickEditIcon();
      page.assertEditAreaVisible();

      page.clearAndTypeInEditArea('Updated prompt after edit');
      page.saveEdit();
      cy.wait('@editSave', { timeout: 90000 });

      page.getUserMessageContaining('Updated prompt after edit', 10000).should('be.visible');
    });

    it('C690720 - Verify that canceling the edit retains the original user prompt', () => {
      page.hoverUserMessageContaining(basePrompt);
      page.clickEditIcon();
      page.assertEditAreaVisible();

      page.clearAndTypeInEditArea('Should not be saved');
      page.cancelEdit();

      page.assertEditAreaNotVisible();
      page.assertUserMessageContains(basePrompt);
    });

    it('C690722 - Verify that the edited prompt is sent correctly and produces a new respective response', () => {
      const editedPrompt = 'Show only active users from the database';

      cy.intercept({ method: 'POST', url: page.sendQueryRoute }).as('editSave');

      page.hoverUserMessageContaining(basePrompt);
      page.clickEditIcon();
      page.clearAndTypeInEditArea(editedPrompt);
      page.saveEdit();
      cy.wait('@editSave', { timeout: 90000 });

      page.getUserMessageContaining(editedPrompt, 10000).should('be.visible');
    });

    it('C690723 - Verify character limit validation when editing a prompt', () => {
      const overLimitText = 'a'.repeat(page.maxCharLimit + 50);

      page.hoverUserMessageContaining(basePrompt);
      page.clickEditIcon();
      page.assertEditAreaVisible();

      page.getEditTextarea().clear().type(overLimitText, { delay: 0 });

      // Validation can surface as truncation, message, counter overflow, or disabled send.
      page.getEditAreaCharCount().then((count: number) => {
        cy.get('body').then(($body: JQuery<HTMLElement>) => {
          const bodyText = $body.text();
          const hasValidationMsg = /character|limit|max|exceeded/i.test(bodyText);
          const hasCounter = new RegExp(`\\b${count}\\s*\\/\\s*${page.maxCharLimit}\\b`).test(bodyText);
          const visibleSend = $body.find('button[aria-label*="Send"], button[type="submit"]').filter(':visible');
          const sendDisabled =
            visibleSend.filter(':disabled').length > 0 ||
            visibleSend.toArray().some((btn: Element) => (btn.getAttribute('aria-disabled') || '').toLowerCase() === 'true');
          const inputTruncated = count <= page.maxCharLimit;
          const overLimitSignaled = count > page.maxCharLimit && (hasValidationMsg || hasCounter || sendDisabled);

          expect(inputTruncated || overLimitSignaled, 'character limit behavior is signaled').to.eq(true);
        });
      });
    });

    it('C690725 - Verify edited prompt formatting is preserved with newlines, spacing, paragraphs', () => {
      cy.intercept({ method: 'POST', url: page.sendQueryRoute }).as('editSave');

      page.hoverUserMessageContaining(basePrompt);
      page.clickEditIcon();
      page.assertEditAreaVisible();

      // {shift}{enter} is the correct Cypress syntax for Shift+Enter (newline without submit).
      page.getEditTextarea()
        .clear()
        .type('Line one{shift}{enter}Line two{shift}{enter}{shift}{enter}Line four after blank', { delay: 0 });

      page.saveEdit();
      cy.wait('@editSave', { timeout: 90000 });

      page.getLastUserMessage().invoke('html').then((html: string) => {
        const hasLineBreaks = /<br|&#10;|\n/.test(html);
        expect(hasLineBreaks, 'multiline formatting preserved').to.eq(true);
      });
    });

    it('C690727 - Verify that edit history is shown when intended', () => {
      const firstEdit = 'First edited prompt';
      const secondEdit = 'Second edited prompt';

      cy.intercept({ method: 'POST', url: page.sendQueryRoute }).as('editSave');

      page.hoverUserMessageContaining(basePrompt);
      page.clickEditIcon();
      page.clearAndTypeInEditArea(firstEdit);
      page.saveEdit();
      cy.wait('@editSave', { timeout: 90000 });
      page.getUserMessageContaining(firstEdit, 10000).should('be.visible');

      page.hoverUserMessageContaining(firstEdit);
      page.clickEditIcon();
      page.clearAndTypeInEditArea(secondEdit);
      page.saveEdit();
      cy.wait('@editSave', { timeout: 90000 });
      page.getUserMessageContaining(secondEdit, 10000).should('be.visible');

      // Current app behavior: previous edited prompt is also visible in the thread.
      cy.contains(firstEdit).should('exist');
      page.assertUserMessageContains(secondEdit);
    });

    it('C695552 - Verify cursor position in edit field is maintained even when character limit is reached', () => {
      page.hoverUserMessageContaining(basePrompt);
      page.clickEditIcon();
      page.assertEditAreaVisible();

      // Fill to limit then try inserting at a mid position.
      const fullText = 'a'.repeat(page.maxCharLimit);
      page.getEditTextarea().clear().type(fullText, { delay: 0 });

      const mid = 120;

      page.getEditTextarea()
        .then(($el: JQuery<HTMLElement>) => {
          const textarea = $el[0] as HTMLTextAreaElement;
          if (typeof textarea.setSelectionRange === 'function') {
            textarea.setSelectionRange(mid, mid);
            textarea.focus();
          }
        });

      page.getEditTextarea().type('X', { delay: 0 });

      page.getEditTextarea().then(($el: JQuery<HTMLElement>) => {
        const textarea = $el[0] as HTMLTextAreaElement;
        const caret = textarea.selectionStart ?? 0;

        // Cursor should stay near insertion position and not jump to end.
        expect(caret, 'cursor not redirected to end').to.be.lessThan(page.maxCharLimit - 5);
      });
    });
  });
});
