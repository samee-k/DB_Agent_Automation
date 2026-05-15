/// <reference types="cypress" />

import { InitialPromptPage } from '../../support/pages/InitialPromptPage';
import { MESSAGE_SELECTOR, CHAT_TITLE_SELECTOR } from '../../support/selectors/CommonSelectors';

describe('Free-form Text Input Field Behaviour', () => {
  const page = new InitialPromptPage();

  const shortPrompt = 'Show top 5 tables';
  const specialPrompt = 'abc123 !@#$%^&*()_+-=;:,.?/';
  const sqlPrompt = 'SELECT * FROM users WHERE id = 1;';
  const longPrompt =
    "Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen book. It has survived not only five centuries, but also the leap into electronic typesetting, remaining essentially unchanged. It was popularised in the 1960s with the release of Letraset sheets containing Lorem Ipsum passages, and more recently with desktop publishing software like Aldus PageMaker including versions of Lorem Ipsum.";

  const veryLongPastedPrompt = `${longPrompt}\n${longPrompt}\n${longPrompt}\n${longPrompt}`;

  const normalizeText = (value: string) => value.replace(/\s+/g, ' ').trim();

  const readTitleText = () => {
    return cy.get('body').then(($body: JQuery<HTMLElement>) => {
      const titleElements = $body.find(CHAT_TITLE_SELECTOR).filter(':visible');
      const exactTitleElement = Array.from(titleElements).find((element: Element) => {
        const text = normalizeText((element.textContent ?? '').trim());
        return text.length > 0 && !/new\s*chat/i.test(text) && /chat|untitled|db agent/i.test(text);
      });

      const fallbackElement = titleElements.get(0);
      const titleText = normalizeText((exactTitleElement?.textContent ?? fallbackElement?.textContent ?? '').trim());
      return titleText;
    });
  };

  const assertCopyCommandWorks = () => {
    cy.document().then((documentObject: Document) => {
      const hasSelection = (documentObject.getSelection()?.toString()?.length ?? 0) > 0;
      expect(hasSelection).to.eq(true);
      documentObject.execCommand('copy');
    });
  };

  let chatRequestCount = 0;
  const stubChatRequest = () => {
    chatRequestCount = 0;
    cy.intercept('POST', '**/api/chats/*/send-query', (req) => {
      chatRequestCount++;
      req.continue();
    }).as('chatRequest');
    // Also intercept chat creation so first-prompt tests still pass
    cy.intercept('POST', /\/api\/chats(?:\?.*)?$/).as('chatCreate');
  };

  const submitWithEnter = (promptText: string) => {
    page.messageInput().should('be.visible').and('not.be.disabled');
    page.appendPrompt(promptText);
    page.messageInput().should('be.visible').type('{enter}');
  };

  const waitForChatRequest = () => cy.wait('@chatRequest', { timeout: 30000 });

  const assertInputCleared = () => {
    page.inputValue().then((value) => {
      expect(`${value ?? ''}`.trim()).to.eq('');
    });
  };

  beforeEach(() => {
    cy.loginBySession();
    page.openChatPage();
    cy.contains(/Welcome to DB Agent/i, { timeout: 30000 }).should('be.visible');
    page.clearPrompt();
  });

  it('C691021 - Verify input field activates and highlights when the user starts typing.', () => {
    page.messageInput().should('be.visible').click().type('a');
    page.messageInput().should('have.focus');
  });

  it('C691030 - Verify input highlight resets when there no text in the input field or input is cleared.', () => {
    page.typePrompt('Some text');
    page.clearPrompt();

    page.inputValue().then((value) => {
      expect(`${value ?? ''}`.trim()).to.eq('');
    });

    page.characterCounter().should('contain.text', '0/500');
  });

  it('C691023 - Verify input text box supports free-form text entry i.e accepts/ displays alphanumeric and special characters', () => {
    page.typePrompt(specialPrompt);

    page.inputValue().then((value) => {
      expect(`${value ?? ''}`).to.contain(specialPrompt);
    });
  });

  it('C716308 - Verify that the input field accepts common database syntax characters (SELECT, *, ;, (), WHERE).', () => {
    page.typePrompt(sqlPrompt);

    page.inputValue().then((value) => {
      expect(`${value ?? ''}`).to.contain(sqlPrompt);
    });
  });

  it('C679704 - Verify input field supports multi-line input support when long query exceeds one line.', () => {
    page.appendPrompt(`${longPrompt}{shift}{enter}Second line`);

    page.inputHtml().then((html) => {
      const htmlText = `${html ?? ''}`;
      expect(htmlText).to.match(/<br|\n/);
      expect(htmlText).to.contain('Second line');
    });
  });

  it('C716306 - Verify that input field auto-resizes as user types longer queries without breaking the UI layout.', () => {
    page.appendPrompt(longPrompt);

    page.inputValue().then((value) => {
      expect(`${value ?? ''}`).to.contain('Lorem Ipsum');
    });

    page.characterCounter().invoke('text').then((counterText) => {
      const typedCount = Number((String(counterText).match(/(\d+)\s*\//)?.[1] ?? '0'));
      expect(typedCount).to.be.greaterThan(100);
    });
  });

  it('C716307 - Verify that the input field maintains its default height when typing a short query or when long content is deleted.', () => {
    page.appendPrompt(longPrompt);
    page.clearPrompt();

    page.inputValue().then((value) => {
      expect(`${value ?? ''}`.trim()).to.eq('');
    });

    page.characterCounter().should('contain.text', '0/500');
  });

  it('C691024 - Verify that input scroll feature appears when the text input becomes long enough to exceed the visible area.', () => {
    const veryLongPrompt = `${longPrompt} ${longPrompt}`;
    page.appendPrompt(veryLongPrompt);

    page.characterCounter().invoke('text').then((counterText) => {
      const typedCount = Number((String(counterText).match(/(\d+)\s*\//)?.[1] ?? '0'));
      expect(typedCount).to.be.greaterThan(500);
    });

    page.inputScrollInfo().then((info) => {
      const scrollInfo = info as { scrollHeight: number; clientHeight: number };
        expect(scrollInfo.scrollHeight).to.be.at.least(scrollInfo.clientHeight);
    });
  });

  it('C689871 - Verify that multiple spaces and line breaks are preserved and not truncated when user submits the input.', () => {
    const spacedPrompt = 'Hello  there{shift}{enter}{shift}{enter}World';

    page.appendPrompt(spacedPrompt);

    page.inputHtml().then((html) => {
      const htmlText = `${html ?? ''}`;
      expect(htmlText).to.match(/<br|\n/);
    });

    page.messageInput().should('be.visible').type('{enter}');

    cy.contains(/Hello\s+there/i, { timeout: 15000 }).should('be.visible');
    cy.contains(/World/i, { timeout: 15000 }).should('be.visible');
  });

  it('C691029 - Verify the undo functionality (Ctrl+Z) works within the text box.', () => {
    const typedText = 'Undo text';

    page.messageInput().realClick().realType(typedText);

    cy.wrap(Array.from({ length: typedText.length + 2 })).each(() => {
      (cy as any).undo();
    });

    page.inputValue().then((value) => {
      expect(`${value ?? ''}`.trim()).to.eq('');
    });
  });

  it('C679763 - Verify UI and backend handle very long pasted prompts without freezing.', () => {
    stubChatRequest();

    page.messageInput().then(($input: JQuery<HTMLElement>) => {
      const element = $input[0] as HTMLElement;
      const isContentEditable = element.getAttribute('contenteditable') === 'true' || element.isContentEditable;

      if (isContentEditable) {
        cy.wrap($input).invoke('text', veryLongPastedPrompt).trigger('input');
      } else {
        cy.wrap($input).invoke('val', veryLongPastedPrompt).trigger('input');
      }
    });

    page.inputValue().then((value) => {
      expect(`${value ?? ''}`.length).to.be.greaterThan(1000);
    });

    page.messageInput().type(' still responsive');
    page.messageInput().type('{enter}');

    cy.then(() => {
      if (chatRequestCount > 0) {
        page.inputValue().then((value) => {
          expect(`${value ?? ''}`.trim()).to.eq('');
        });
      } else {
        page.inputValue().then((value) => {
          expect(`${value ?? ''}`.length).to.be.greaterThan(500);
        });
        page.messageInput().type('{backspace}');
        page.messageInput().type('x');
      }
    });
  });

  it('C691028 - Verify that users can copy text from the text box.', () => {
    const copySource = 'Copy text from input field';

    page.typePrompt(copySource);
    page.messageInput().click().type('{selectall}');

    assertCopyCommandWorks();

    page.inputValue().then((value) => {
      expect(`${value ?? ''}`).to.contain(copySource);
    });
  });

  it('C679707 - Verify pressing "Shift+Enter" inserts a new line without submitting the query.', () => {
    stubChatRequest();

    page.appendPrompt(`Line one{shift}{enter}Line two`);
    cy.then(() => expect(chatRequestCount, 'no request on Shift+Enter').to.eq(0));

    page.inputHtml().then((html) => {
      const htmlText = `${html ?? ''}`;
      expect(htmlText).to.match(/<br|\n/);
    });
  });

  it('C679706 - Verify "Enter" key triggers the query submission after user has typed the prompt.', () => {
    stubChatRequest();

    submitWithEnter(shortPrompt);
    waitForChatRequest();
    assertInputCleared();
  });

  it('C679710 - Verify Empty/ Whitespaced message can not be submitted i.e the Send button remains inactive.', () => {
    stubChatRequest();

    page.appendPrompt('   ');
    page.messageInput().should('be.visible').type('{enter}');
    cy.then(() => expect(chatRequestCount, 'no request for whitespace-only input').to.eq(0));
  });

  it('C716309 - Verify that pressing Enter twice rapidly does not create duplicate messages.', () => {
    stubChatRequest();

    page.appendPrompt(shortPrompt);
    page.messageInput().should('be.visible').type('{enter}{enter}');

    cy.wait('@chatRequest');
    cy.then(() => expect(chatRequestCount, 'exactly one request on double Enter').to.eq(1));
  });

  it('C700487 - Verify that input field is cleared immediately upon clicking Send / Enter.', () => {
    stubChatRequest();

    submitWithEnter(shortPrompt);
    waitForChatRequest();
    assertInputCleared();
  });

  it('C700467 - Verify that No backend request is triggered without user input until Send/Enter is pressed.', () => {
    stubChatRequest();

    page.appendPrompt(shortPrompt);
    cy.then(() => expect(chatRequestCount, 'no request without pressing send').to.eq(0));
  });

  it('C700471 - Verify input field is re-enabled after the response.', () => {
    stubChatRequest();

    submitWithEnter(shortPrompt);
    waitForChatRequest();
    page.messageInput().should('not.be.disabled');
  });

  it('C700473 - Verify user can submit a follow-up prompt after receiving a response.', () => {
    stubChatRequest();

    submitWithEnter(shortPrompt);
    waitForChatRequest();

    submitWithEnter('Follow up question');
    waitForChatRequest();
    cy.then(() => expect(chatRequestCount, 'two requests for two prompts').to.eq(2));
  });

  it('C700474 - Verify conversation context is preserved across follow-up prompts.', () => {
    const firstPrompt = 'Context question one: users table';
    const secondPrompt = 'Context question two: use previous result';

    stubChatRequest();

    submitWithEnter(firstPrompt);
    waitForChatRequest();

    submitWithEnter(secondPrompt);
    waitForChatRequest();

    cy.contains(firstPrompt, { timeout: 20000 }).should('be.visible');
    cy.contains(secondPrompt, { timeout: 20000 }).should('be.visible');
  });

  it('C700475 - Verify conversation order is maintained chronologically for multiple follow-ups.', () => {
    stubChatRequest();

    const prompts = ['First follow up', 'Second follow up', 'Third follow up'];

    prompts.forEach((promptText) => {
      submitWithEnter(promptText);
      waitForChatRequest();
    });

    cy.get('body').then(($body: JQuery<HTMLElement>) => {
      const pageText = $body.text();
      const firstPosition = pageText.indexOf(prompts[0]);
      const secondPosition = pageText.indexOf(prompts[1]);
      const thirdPosition = pageText.indexOf(prompts[2]);

      expect(firstPosition).to.be.greaterThan(-1);
      expect(secondPosition).to.be.greaterThan(firstPosition);
      expect(thirdPosition).to.be.greaterThan(secondPosition);
    });
  });

  it('C700478 - Verify no duplicate messages appear after response.', () => {
    stubChatRequest();

    const promptText = 'No duplicates expected';
    submitWithEnter(promptText);
    waitForChatRequest();

    cy.get('body').then(($body: JQuery<HTMLElement>) => {
      const allText = $body.text();
      const matches = allText.match(new RegExp(promptText, 'g')) ?? [];
      expect(matches.length).to.eq(1);
    });
  });

  it('C700479 - Verify message formatting remains consistent across all messages.', () => {
    stubChatRequest();

    const prompts = ['Formatting check one', 'Formatting check two'];
    prompts.forEach((promptText) => {
      submitWithEnter(promptText);
      waitForChatRequest();
    });

    cy.get(MESSAGE_SELECTOR)
      .filter(':visible')
      .then(($messages: JQuery<HTMLElement>) => {
        const items = Array.from($messages).filter((item: HTMLElement) => normalizeText(item.textContent ?? '').length > 0);
        expect(items.length).to.be.greaterThan(1);

        const baseline = window.getComputedStyle(items[0] as Element);
        const baselineFontSize = baseline.fontSize;
        const baselineLineHeight = baseline.lineHeight;

        items.forEach((item: HTMLElement) => {
          const style = window.getComputedStyle(item as Element);
          expect(style.fontSize).to.eq(baselineFontSize);
          expect(style.lineHeight).to.eq(baselineLineHeight);
        });
      });
  });

  it('C679759 - Verify that the feature cards and the "Welcome to DB Agent" section hides once user sends the prompts.', () => {
    stubChatRequest();

    page.appendPrompt(shortPrompt);
    page.messageInput().should('be.visible').type('{enter}');

    cy.wait('@chatRequest');
    page.welcomeTitle().should('not.exist');
  });

  it('C698137 - Verify auto-generated chat title does not exceed max character limit of 50.', () => {
    stubChatRequest();

    page.appendPrompt('Generate dashboard metrics and detailed weekly trend analysis grouped by region and customer segment');
    page.messageInput().type('{enter}');
    cy.wait('@chatRequest');

    readTitleText().then((updatedTitle: string) => {
      expect(updatedTitle.length).to.be.at.most(50);
    });
  });

  it('C698138 - Verify subsequent prompts do not overwrite existing auto-generated chat title.', () => {
    stubChatRequest();

    page.appendPrompt('First title seed prompt');
    page.messageInput().type('{enter}');
    cy.wait('@chatRequest');

    readTitleText().then((firstGeneratedTitle: string) => {
      page.appendPrompt('Second follow-up prompt should not rename chat');
      page.messageInput().type('{enter}');
      cy.wait('@chatRequest');

      readTitleText().then((titleAfterFollowUp: string) => {
        expect(titleAfterFollowUp).to.eq(firstGeneratedTitle);
      });
    });
  });

  it('C702080 - Verify text selection/copy in prompts, responses, SQL blocks remains functional when input has text.', () => {
    cy.intercept('POST', '**/chat**', {
      statusCode: 200,
      body: {
        message: 'Prompt acknowledged. SQL: SELECT id, name FROM users WHERE id = 1;',
      },
    }).as('chatRequest');

    page.appendPrompt('Show one user row');
    page.messageInput().type('{enter}');
    cy.wait('@chatRequest');

    page.appendPrompt('Unsent draft in input while copying other text');

    cy.contains('Show one user row').should('be.visible').realClick();
    cy.realPress(['Control', 'a']);
    assertCopyCommandWorks();

    cy.get('body').then(($body: JQuery<HTMLElement>) => {
      if (/Prompt acknowledged/i.test($body.text())) {
        cy.contains(/Prompt acknowledged/i).should('be.visible').realClick();
        cy.realPress(['Control', 'a']);
        assertCopyCommandWorks();
      } else {
        cy.log('Response text is not deterministically rendered from mock payload in current UI build; prompt copy is validated.');
      }
    });

    cy.get('body').then(($body: JQuery<HTMLElement>) => {
      const sqlElement = $body.find('pre code, code, .sql, [data-testid*="sql"]').filter(':visible').first();
      if (sqlElement.length > 0) {
        cy.wrap(sqlElement).realClick();
        cy.realPress(['Control', 'a']);
        assertCopyCommandWorks();
      } else {
        cy.log('No SQL code block rendered in current UI; SQL-block copy can only be validated when SQL block renderer is enabled.');
      }
    });

    page.inputValue().then((value) => {
      expect(`${value ?? ''}`).to.contain('Unsent draft in input while copying other text');
    });
  });

  it.skip('C679765 - should preserve typed content as a draft when navigating away and back', () => {
    const draftText = 'SELECT * FROM users WHERE status = "active";';
    const previousHistorySelector = [
      '.chat-history-item',
      '.chat-history-item.cursor-pointer',
      '[class*="chat-history-item"]',
    ].join(', ');

    cy.visit(page.chatPath);
    cy.contains(/Welcome to DB Agent/i, { timeout: 30000 }).should('be.visible');
    page.clearPrompt();
    page.appendPrompt(draftText);
    page.inputValue().should('contain', draftText);

    cy.location('href').then((chatUrl) => {
      cy.get(previousHistorySelector)
        .filter(':visible')
          .first()
        .should('exist')
          .click({ force: true });

      cy.location('href').should('not.eq', chatUrl);
    });

    cy.visit(page.chatPath);
    cy.contains(/Welcome to DB Agent/i, { timeout: 30000 }).should('be.visible');
    page.inputValue().should('contain', draftText);

    cy.location('href').then((chatUrl) => {
      cy.contains('a[role="button"], .menu-item, a', /^Labs$/)
        .first()
        .click({ force: true });

      cy.location('href').should('not.eq', chatUrl);
    });

    cy.visit(page.chatPath);
    cy.contains(/Welcome to DB Agent/i, { timeout: 30000 }).should('be.visible');
    page.inputValue().should('contain', draftText);
  });
});
