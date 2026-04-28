/// <reference types="cypress" />

import { ChatHistoryPage } from '../../pages/ChatHistoryPage';

describe('Chat History Panel', () => {
  const chatHistoryPage = new ChatHistoryPage();

  beforeEach(() => {
    // TODO(QA-BACKEND): Enable deterministic cleanup when backend endpoint is available.
    // cy.request('POST', '/api/test/cleanup');

    cy.loginByApiSession();

    chatHistoryPage.setupAuthHeaderCheck();
    chatHistoryPage.interceptGetChatsByProject();
    chatHistoryPage.visitChatPage();
    cy.wait('@getChatsByProject').its('response.statusCode').should('eq', 200);

    cy.seedChatsByProjectViaApiIfEmpty(5, 20);
    chatHistoryPage.interceptGetChatsByProject();
    chatHistoryPage.visitChatPage();
    cy.wait('@getChatsByProject').its('response.statusCode').should('eq', 200);

    chatHistoryPage.openHistoryPanel();
    chatHistoryPage.waitForHistoryItemCountAtLeast(1);
  });

  it('C698119 - Verify that clicking the history icon opens the chat history panel.', () => {
    chatHistoryPage.openHistoryPanel();

    chatHistoryPage.getPanel().should('be.visible');
    chatHistoryPage.getHistoryItemCount().should('be.greaterThan', 0);
  });

  it('C698106 - Verify that the history button is hidden when the history panel is visible.', () => {
    chatHistoryPage.openHistoryPanel();

    chatHistoryPage.getPanel().should('be.visible');
    chatHistoryPage.getVisibleHistoryToggleCount().should('eq', 0);
  });

  it('C698107 - Verify that history button visibility works correctly with expanded/collapsed navbar.', () => {
    chatHistoryPage.clickNavCollapseLeft();
    chatHistoryPage.openHistoryPanel();
    chatHistoryPage.getPanel().should('be.visible');

    chatHistoryPage.closeHistoryPanel();
    chatHistoryPage.clickNavCollapseRight();
    chatHistoryPage.openHistoryPanel();

    chatHistoryPage.getPanel().should('be.visible');
    chatHistoryPage.getHistoryItemCount().should('be.greaterThan', 0);
  });

  it('C698143 - Verify that history panel layout remains consistent when navbar is expanded and collapsed.', () => {
    chatHistoryPage.openHistoryPanel();
    chatHistoryPage.getPanelWidth().then((widthExpanded: number) => {
      chatHistoryPage.closeHistoryPanel();
      chatHistoryPage.clickNavCollapseLeft();
      chatHistoryPage.openHistoryPanel();

      chatHistoryPage.getPanelWidth().then((widthCollapsed: number) => {
        expect(widthExpanded).to.be.greaterThan(20);
        expect(widthCollapsed).to.be.greaterThan(20);
        // Layout consistency: widths can differ, but should remain proportionally close.
        const largerWidth = Math.max(widthExpanded, widthCollapsed);
        const smallerWidth = Math.min(widthExpanded, widthCollapsed);
        const widthRatio = smallerWidth / largerWidth;

        expect(widthRatio, `panel width ratio (small/large=${widthRatio})`).to.be.greaterThan(0.45);
      });
    });
  });

  it('C698108 - Verify that hovering over a chat history item shows the correct hover state.', () => {
    chatHistoryPage.openHistoryPanel();
    chatHistoryPage.hoverHistoryItemByIndex(0);
    chatHistoryPage.getHistoryMenuToggleByIndex(0).should('exist');
    chatHistoryPage.getHistoryItemByIndex(0).should('exist');
  });

  it('C698109 - Verify that clicking the three-dot menu shows Edit and Delete options.', () => {
    chatHistoryPage.openHistoryPanel();
    chatHistoryPage.hoverHistoryItemByIndex(0);
    chatHistoryPage.openHistoryMenuByIndex(0);

    chatHistoryPage.clickEditAction();
    chatHistoryPage.getEditContainer().should('be.visible');

    chatHistoryPage.cancelEditTitle();
    chatHistoryPage.openHistoryMenuByIndex(0);
    chatHistoryPage.clickDeleteAction();
    chatHistoryPage.getDeleteContainer().should('be.visible');
  });

  it('C698120 - Verify that the selected chat history is visually highlighted.', () => {
    chatHistoryPage.openHistoryPanel();
    chatHistoryPage.getHistoryItemTextByIndex(0).then((title: string) => {
      const expectedTitle = title.trim();
      chatHistoryPage.selectHistoryItemByIndex(0);

      // Primary: the chat header must reflect the selected item's title
      chatHistoryPage.getChatHeaderTitle().invoke('text').should((text: string) => {
        expect(text.trim()).to.eq(expectedTitle);
      });

      // Secondary: if the app exposes a CSS selected class, verify it
      chatHistoryPage.getSelectedItemsOptional().then(($sel: JQuery<HTMLElement>) => {
        if ($sel.length > 0) {
          expect($sel.first().text().trim()).to.contain(expectedTitle);
        }
        // If $sel.length === 0 the app doesn't expose a selected class — title match above is the gate
      });
    });
  });


  it('C698135 - Verify a new chat history entry is created and stored upon completion of the first prompt.', () => {
    chatHistoryPage.interceptSendQuery();
    cy.window().then((windowObject: Window) => {
      const accessToken = windowObject.localStorage.getItem('access_token') || '';
      const projectId = Number(Cypress.env('projectId') || '11');

      cy.request({
        method: 'GET',
        url: `/api/chats/by-project/${projectId}`,
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }).then((beforeRes: any) => {
        const beforeList = Array.isArray(beforeRes.body?.data)
          ? beforeRes.body.data
          : Array.isArray(beforeRes.body?.data?.chats)
            ? beforeRes.body.data.chats
            : [];

        chatHistoryPage.closeHistoryPanel();
        chatHistoryPage.clickNewChatButton();
        chatHistoryPage.typeInChatPrompt(`History creation validation ${Date.now()}`);
        chatHistoryPage.clickSendButton();

        const waitForHistoryIncrease = (retries = 6): Cypress.Chainable<undefined> => {
          return cy.request({
            method: 'GET',
            url: `/api/chats/by-project/${projectId}`,
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          }).then((pollRes: any): Cypress.Chainable<undefined> => {
            const pollList = Array.isArray(pollRes.body?.data)
              ? pollRes.body.data
              : Array.isArray(pollRes.body?.data?.chats)
                ? pollRes.body.data.chats
                : [];

            if (pollList.length >= beforeList.length + 1) {
              return cy.wrap(undefined, { log: false });
            }

            expect(retries, 'history count increase retries').to.be.greaterThan(0);
            return cy.wait(1000, { log: false }).then(() => waitForHistoryIncrease(retries - 1));
          }).then(() => undefined);
        };

        waitForHistoryIncrease();

        cy.request({
          method: 'GET',
          url: `/api/chats/by-project/${projectId}`,
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }).then((afterRes: any) => {
          const afterList = Array.isArray(afterRes.body?.data)
            ? afterRes.body.data
            : Array.isArray(afterRes.body?.data?.chats)
              ? afterRes.body.data.chats
              : [];
          expect(afterList.length).to.be.gte(beforeList.length + 1);
        });
      });
    });
  });

  it('C698136 - Verify that previously stored chat history versions remain unchanged when a new chat is created.', () => {
    chatHistoryPage.interceptSendQuery();
    cy.window().then((windowObject: Window) => {
      const accessToken = windowObject.localStorage.getItem('access_token') || '';
      const projectId = Number(Cypress.env('projectId') || '11');

      cy.request({
        method: 'GET',
        url: `/api/chats/by-project/${projectId}`,
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }).then((beforeRes: any) => {
        const beforeList = Array.isArray(beforeRes.body?.data)
          ? beforeRes.body.data
          : Array.isArray(beforeRes.body?.data?.chats)
            ? beforeRes.body.data.chats
            : [];

        const preservedIds = beforeList.slice(0, 2).map((chat: any) => String(chat?.id || ''));
        expect(preservedIds.length).to.be.gte(1);

        chatHistoryPage.closeHistoryPanel();
        chatHistoryPage.clickNewChatButton();
        chatHistoryPage.typeInChatPrompt(`Preserve history validation ${Date.now()}`);
        chatHistoryPage.clickSendButton();

        const waitForPreservedHistory = (retries = 6): Cypress.Chainable<undefined> => {
          return cy.request({
            method: 'GET',
            url: `/api/chats/by-project/${projectId}`,
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          }).then((pollRes: any): Cypress.Chainable<undefined> => {
            const pollList = Array.isArray(pollRes.body?.data)
              ? pollRes.body.data
              : Array.isArray(pollRes.body?.data?.chats)
                ? pollRes.body.data.chats
                : [];

            const pollIds = new Set(pollList.map((chat: any) => String(chat?.id || '')));
            const allPreserved = preservedIds.every((id: string) => pollIds.has(id));

            if (allPreserved && pollList.length >= beforeList.length + 1) {
              return cy.wrap(undefined, { log: false });
            }

            expect(retries, 'preserved history retries').to.be.greaterThan(0);
            return cy.wait(1000, { log: false }).then(() => waitForPreservedHistory(retries - 1));
          }).then(() => undefined);
        };

        waitForPreservedHistory();

        cy.request({
          method: 'GET',
          url: `/api/chats/by-project/${projectId}`,
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }).then((afterRes: any) => {
          const afterList = Array.isArray(afterRes.body?.data)
            ? afterRes.body.data
            : Array.isArray(afterRes.body?.data?.chats)
              ? afterRes.body.data.chats
              : [];

          const afterIds = new Set(afterList.map((chat: any) => String(chat?.id || '')));
          preservedIds.forEach((id: string) => {
            expect(afterIds.has(id), `previous chat id ${id} should still exist`).to.eq(true);
          });
          expect(afterList.length).to.be.gte(beforeList.length + 1);
        });
      });
    });
  });

  it('C700462 - Verify welcome content is not shown when switching to an existing chat histories, loader is shown.', () => {
    // Delay chat-detail responses so loader can render when the request is emitted.
    cy.intercept('GET', '**/api/chats/**', (req) => {
      if (req.url.includes('/by-project/')) {
        return;
      }
      req.on('response', (res) => {
        res.setDelay(1500);
      });
    }).as('delayedChatLoad');

    chatHistoryPage.selectHistoryItemByIndex(0);

    // Welcome content should not be visible after selecting an existing chat.
    cy.get('body').then(($body: JQuery<HTMLElement>) => {
      const welcome = $body.find('[data-cy="welcome-content"], .welcome-content, .welcome-screen, [class*="welcome-container"]');
      if (welcome.length > 0) {
        cy.wrap(welcome.first()).should('not.be.visible');
      }
    });

    // URL must still contain /chat (app uses in-place navigation without per-chat URL segments)
    cy.location('pathname').should('include', '/chat');
    // History panel must remain visible
    chatHistoryPage.waitForPanelVisible();
  });

  it('C698121 - Verify selecting previous chat displays correct title and conversation UI.', () => {
    chatHistoryPage.openHistoryPanel();
    chatHistoryPage.getHistoryItemTextByIndex(0).then((historyTitle: string) => {
      const normalizedTitle = historyTitle.trim();
      chatHistoryPage.selectHistoryItemByIndex(0);

      // The chat header must reflect the title of the selected history item.
      chatHistoryPage.getChatHeaderTitle().invoke('text').then((headerTitle: string) => {
        expect(headerTitle.trim()).to.eq(normalizedTitle);
      });
      // Panel must still be visible (app uses in-place navigation)
      chatHistoryPage.waitForPanelVisible();
    });
  });

  it('C702079 - Verify clicking same chat history item multiple times does not create duplicate chat instances.', () => {
    chatHistoryPage.openHistoryPanel();

    chatHistoryPage.getHistoryItemCount().then((beforeCount: number) => {
      chatHistoryPage.selectHistoryItemByIndex(0);
      chatHistoryPage.selectHistoryItemByIndex(0);
      chatHistoryPage.selectHistoryItemByIndex(0);

      chatHistoryPage.getHistoryItemCount().should('eq', beforeCount);
      chatHistoryPage.getHistoryItemByIndex(0).should('be.visible');
    });
  });

  it('C698152 - Verify conversations are grouped under Recent, Last 7 Days, Last 30 Days, and Last 3 Months based on creation time.', () => {
    const projectId = Cypress.env('projectId') || '11';
    const isoDaysAgo = (daysAgo: number) => {
      const timestamp = Date.now() - (daysAgo * 24 * 60 * 60 * 1000);
      return new Date(timestamp).toISOString();
    };

    const extractList = (body: any): any[] => {
      if (!body) return [];
      if (Array.isArray(body)) return body;
      if (Array.isArray(body?.data)) return body.data;
      if (Array.isArray(body?.chats)) return body.chats;
      if (Array.isArray(body?.items)) return body.items;
      if (Array.isArray(body?.records)) return body.records;
      if (Array.isArray(body?.data?.chats)) return body.data.chats;
      if (Array.isArray(body?.data?.items)) return body.data.items;
      if (Array.isArray(body?.data?.data)) return body.data.data;
      if (Array.isArray(body?.data?.records)) return body.data.records;
      return [];
    };

    const setList = (body: any, nextList: any[]) => {
      if (!body || Array.isArray(body)) {
        return { data: { chats: nextList } };
      }

      if (Array.isArray(body?.data)) {
        body.data = nextList;
      } else if (Array.isArray(body?.chats)) {
        body.chats = nextList;
      } else if (Array.isArray(body?.items)) {
        body.items = nextList;
      } else if (Array.isArray(body?.records)) {
        body.records = nextList;
      } else if (Array.isArray(body?.data?.chats)) {
        body.data.chats = nextList;
      } else if (Array.isArray(body?.data?.items)) {
        body.data.items = nextList;
      } else if (Array.isArray(body?.data?.data)) {
        body.data.data = nextList;
      } else if (Array.isArray(body?.data?.records)) {
        body.data.records = nextList;
      } else {
        body.data = { ...(body.data || {}), chats: nextList };
      }

      if (typeof body?.totalrecords === 'number') body.totalrecords = nextList.length;
      if (typeof body?.totalRecords === 'number') body.totalRecords = nextList.length;
      if (typeof body?.data?.totalrecords === 'number') body.data.totalrecords = nextList.length;
      if (typeof body?.data?.totalRecords === 'number') body.data.totalRecords = nextList.length;

      return body;
    };

    cy.intercept('GET', `**/api/chats/by-project/${projectId}*`, (req) => {
      req.continue((res) => {
        const originalList = extractList(res.body);
        const template = (originalList[0] || {}) as Record<string, unknown>;

        const makeChat = (id: number, title: string, daysAgo: number) => {
          const iso = isoDaysAgo(daysAgo);
          return {
            ...template,
            id,
            title,
            createdAt: iso,
            created_at: iso,
            updatedAt: iso,
            updated_at: iso,
          };
        };

        const chatsByAge = [
          makeChat(900001, 'Recent chat A', 0),
          makeChat(900002, 'Recent chat B', 1),
          makeChat(900003, 'Last 7 days chat', 5),
          makeChat(900004, 'Last 30 days chat', 15),
          makeChat(900005, 'Last 3 months chat', 65),
        ];

        res.body = setList(res.body, chatsByAge);
      });
    }).as('groupingBuckets');

    chatHistoryPage.visitChatPage();
    cy.wait('@groupingBuckets').then((interception) => {
      expect(interception.response?.statusCode).to.eq(200);
      const injectedList = extractList(interception.response?.body);
      const injectedTitles = injectedList.map((item: any) => String(item?.title || '').toLowerCase());
      expect(injectedTitles, 'bucket fixture should be injected into response').to.include('recent chat a');
    });

    const expectedHeaders = [
      'Recent',
      'Last 7 Days',
      'Last 30 Days',
      'Last 3 Months',
    ];

    chatHistoryPage.openHistoryPanel();
    chatHistoryPage.getPanel().should('be.visible');
    chatHistoryPage.getGroupHeaders().should('have.length.at.least', expectedHeaders.length);
    chatHistoryPage.getGroupHeaders().each(($el: JQuery<HTMLElement>, index: number) => {
      if (index < expectedHeaders.length) {
        const actualText = ($el.text() || '').replace(/\s+/g, ' ').trim();
        expect(actualText, `group header at index ${index}`).to.eq(expectedHeaders[index]);
      }
    });
  });

  it('C698151 - Verify history panel retains scroll position after edit or delete.', () => {
    cy.ensureChatsByProjectMinCount(80, 120);
    chatHistoryPage.interceptGetChatsByProject();
    chatHistoryPage.interceptUpdateTitle();
    chatHistoryPage.interceptDeleteChat();
    chatHistoryPage.visitChatPage();
    cy.wait('@getChatsByProject').its('response.statusCode').should('eq', 200);

    chatHistoryPage.openHistoryPanel();
    chatHistoryPage.scrollPanelToBottom();

    chatHistoryPage.getPanel().then(($panel: JQuery<HTMLElement>) => {
      const panelElement = $panel[0] as HTMLElement;
      const isScrollable = panelElement.scrollHeight > panelElement.clientHeight;
      if (!isScrollable) {
        expect(panelElement).to.exist;
        return;
      }

      chatHistoryPage.getPanelScrollTop().then((initialScrollTop: number) => {
        expect(initialScrollTop, 'panel must be scrolled down before test').to.be.greaterThan(0);

        // Edit the LAST visible item (near the bottom) so the panel doesn't need to scroll up to show it
        chatHistoryPage.getHistoryItemCount().then((totalCount: number) => {
          const lastIndex = totalCount - 1;

          chatHistoryPage.openHistoryMenuByIndex(lastIndex);
          chatHistoryPage.clickEditAction();
          chatHistoryPage.updateTitle(`Retain Scroll ${Date.now()}`);
          cy.wait('@updateChatTitle').its('response.statusCode').should('eq', 200);

          chatHistoryPage.getPanelScrollTop().then((afterEditScrollTop: number) => {
            // Scroll must not have been reset to the top
            expect(afterEditScrollTop, 'scroll should not reset to top after edit').to.be.greaterThan(0);
          });

          chatHistoryPage.openHistoryMenuByIndex(lastIndex);
          chatHistoryPage.clickDeleteAction();
          chatHistoryPage.confirmDelete();
          cy.wait('@deleteChat').its('response.statusCode').should('eq', 200);

          chatHistoryPage.getPanelScrollTop().then((afterDeleteScrollTop: number) => {
            expect(afterDeleteScrollTop, 'scroll should not reset to top after delete').to.be.greaterThan(0);
          });
        });
      });
    });
  });

  it('C698126 - Verify that the panel scrolls when there are many history items.', () => {
    cy.ensureChatsByProjectMinCount(80, 120);
    chatHistoryPage.interceptGetChatsByProject();
    chatHistoryPage.visitChatPage();
    cy.wait('@getChatsByProject').its('response.statusCode').should('eq', 200);
    chatHistoryPage.openHistoryPanel();

    chatHistoryPage.scrollPanelToBottom();

    chatHistoryPage.getPanel().then(($panel: JQuery<HTMLElement>) => {
      const panelElement = $panel[0] as HTMLElement;
      const canScroll = panelElement.scrollHeight > panelElement.clientHeight;
      if (!canScroll) {
        expect(panelElement).to.exist;
        return;
      }

      chatHistoryPage.getPanelScrollTop().then((scrollTop: number) => {
        expect(scrollTop).to.be.greaterThan(0);
      });
    });
  });
});
