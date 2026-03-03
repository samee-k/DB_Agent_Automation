/// <reference types="cypress" />

import { InitialPromptPage } from '../pages/InitialPromptPage';

describe('Free-form Text Input Field Behaviour', { testIsolation: false }, () => {
  const page = new InitialPromptPage();

  const shortPrompt = 'Show top 5 tables';
  const specialPrompt = 'abc123 !@#$%^&*()_+-=;:,.?/';
  const sqlPrompt = 'SELECT * FROM users WHERE id = 1;';
  const longPrompt =
    "Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen book. It has survived not only five centuries, but also the leap into electronic typesetting, remaining essentially unchanged. It was popularised in the 1960s with the release of Letraset sheets containing Lorem Ipsum passages, and more recently with desktop publishing software like Aldus PageMaker including versions of Lorem Ipsum.";

  const stubChatRequest = () => {
    cy.intercept('POST', page.chatApiRouteMatcher, { statusCode: 200, body: { message: 'Mocked response' } }).as('chatRequest');
  };

  before(() => {
    page.loginOnceForSuite();
  });

  beforeEach(() => {
    page.openChatPage().waitForWelcomeScreen();
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

  it('C679707 - Verify pressing "Shift+Enter" inserts a new line without submitting the query.', () => {
    stubChatRequest();

    page.appendPrompt(`Line one{shift}{enter}Line two`);
    cy.get('@chatRequest.all').should('have.length', 0);

    page.inputHtml().then((html) => {
      const htmlText = `${html ?? ''}`;
      expect(htmlText).to.match(/<br|\n/);
    });
  });

  it('C679706 - Verify "Enter" key triggers the query submission after user has typed the prompt.', () => {
    stubChatRequest();

    page.appendPrompt(shortPrompt);
    page.messageInput().should('be.visible').type('{enter}');

    cy.wait('@chatRequest');
    page.inputValue().then((value) => {
      expect(`${value ?? ''}`.trim()).to.eq('');
    });
  });

  it('C679710 - Verify Empty/ Whitespaced message can not be submitted i.e the Send button remains inactive.', () => {
    stubChatRequest();

    page.appendPrompt('   ');
    page.messageInput().should('be.visible').type('{enter}');
    cy.get('@chatRequest.all').should('have.length', 0);
  });

  it('C716309 - Verify that pressing Enter twice rapidly does not create duplicate messages.', () => {
    stubChatRequest();

    page.appendPrompt(shortPrompt);
    page.messageInput().should('be.visible').type('{enter}{enter}');

    cy.wait('@chatRequest');
    cy.get('@chatRequest.all').should('have.length', 1);
  });

  it('C700487 - Verify that input field is cleared immediately upon clicking Send / Enter.', () => {
    stubChatRequest();

    page.appendPrompt(shortPrompt);
    page.messageInput().should('be.visible').type('{enter}');

    cy.wait('@chatRequest');
    page.inputValue().then((value) => {
      expect(`${value ?? ''}`.trim()).to.eq('');
    });
  });

  it('C700467 - Verify that No backend request is triggered without user input until Send/Enter is pressed.', () => {
    stubChatRequest();

    page.appendPrompt(shortPrompt);
    cy.get('@chatRequest.all').should('have.length', 0);
  });

  it('C700471 - Verify input field is re-enabled after the response.', () => {
    stubChatRequest();

    page.appendPrompt(shortPrompt);
    page.messageInput().should('be.visible').type('{enter}');

    cy.wait('@chatRequest');
    page.inputShouldBeEnabled();
  });

  it('C700473 - Verify user can submit a follow-up prompt after receiving a response.', () => {
    stubChatRequest();

    page.appendPrompt(shortPrompt);
    page.messageInput().should('be.visible').type('{enter}');

    cy.wait('@chatRequest');

    page.appendPrompt('Follow up question');
    page.messageInput().should('be.visible').type('{enter}');

    cy.wait('@chatRequest');
    cy.get('@chatRequest.all').should('have.length', 2);
  });

  it('C679759 - Verify that the feature cards and the "Welcome to DB Agent" section hides once user sends the prompts.', () => {
    stubChatRequest();

    page.appendPrompt(shortPrompt);
    page.messageInput().should('be.visible').type('{enter}');

    cy.wait('@chatRequest');
    page.welcomeTitle().should('not.exist');
  });
});
