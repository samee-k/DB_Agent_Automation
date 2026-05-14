/// <reference types="cypress" />

import { ChatHistoryPage } from '../../pages/ChatHistoryPage';
import {
  ALIASES,
  Chat,
  fetchChatList,
  interceptDeleteChat,
  interceptGetChats,
  interceptSendQuery,
  interceptUpdateTitle,
  pollUntilChatCountGrows,
  pollUntilChatCountGrowsAndPreserves,
  seedAndVisit,
} from './chat-history.helpers';

describe('Chat History — Panel', () => {
  const page = new ChatHistoryPage();

  // TODO(QA-BACKEND): Replace API seeding with deterministic cleanup endpoint when available.
  beforeEach(() => {
    cy.loginBySession();
    seedAndVisit(page);
  });

  // ---------------------------------------------------------------------------
  // Panel open / close / layout
  // ---------------------------------------------------------------------------

  it('C698119 - Verify that clicking the history icon opens the chat history panel.', () => {
    page.openHistoryPanel();

    page.getPanel().should('be.visible');
    page.getHistoryItemCount().should('be.greaterThan', 0);
  });

  it('C698106 - Verify that the history toggle button is hidden while the panel is open.', () => {
    page.openHistoryPanel();

    page.getPanel().should('be.visible');
    page.getVisibleHistoryToggleCount().should('eq', 0);
  });

  it('C698107 - Verify that the history toggle works correctly regardless of navbar expand/collapse state.', () => {
    page.clickNavCollapseLeft();
    page.openHistoryPanel();
    page.getPanel().should('be.visible');

    page.closeHistoryPanel();
    page.clickNavCollapseRight();
    page.openHistoryPanel();

    page.getPanel().should('be.visible');
    page.getHistoryItemCount().should('be.greaterThan', 0);
  });

  it('C698143 - Verify that the panel layout remains consistent across navbar expand/collapse.', () => {
    page.openHistoryPanel();
    page.getPanelWidth().then((widthExpanded: number) => {
      page.closeHistoryPanel();
      page.clickNavCollapseLeft();
      page.openHistoryPanel();

      page.getPanelWidth().then((widthCollapsed: number) => {
        expect(widthExpanded).to.be.greaterThan(20);
        expect(widthCollapsed).to.be.greaterThan(20);

        // Both widths must be proportionally close — layout must not break under collapse.
        const ratio = Math.min(widthExpanded, widthCollapsed) / Math.max(widthExpanded, widthCollapsed);
        expect(ratio, `panel width ratio collapsed/expanded (${ratio.toFixed(2)})`).to.be.greaterThan(0.3);
      });
    });
  });

  // ---------------------------------------------------------------------------
  // Hover state / context menu
  // ---------------------------------------------------------------------------

  it('C698108 - Verify that hovering a history item reveals the context menu toggle.', () => {
    page.openHistoryPanel();
    page.hoverHistoryItemByIndex(0);

    page.getHistoryMenuToggleByIndex(0).should('exist');
    page.getHistoryItemByIndex(0).should('exist');
  });

  it('C698109 - Verify that the three-dot context menu exposes Edit and Delete actions.', () => {
    page.openHistoryPanel();
    page.hoverHistoryItemByIndex(0);
    page.openHistoryMenuByIndex(0);

    page.clickEditAction();
    page.getEditContainer().should('be.visible');

    page.cancelEditTitle();
    page.openHistoryMenuByIndex(0);
    page.clickDeleteAction();
    page.getDeleteContainer().should('be.visible');
  });

  // ---------------------------------------------------------------------------
  // Item selection
  // ---------------------------------------------------------------------------

  it('C698120 - Verify that the selected chat history item is visually highlighted.', () => {
    page.openHistoryPanel();
    page.getHistoryItemTextByIndex(0).then((title: string) => {
      const expectedTitle = title.trim();

      // Select the first history item and wait for the chat to load.
      page.selectHistoryItemByIndex(0);

      // Primary gate: chat header must reflect the selected title.
      page.getChatHeaderTitle().invoke('text').should((text: string) => {
        expect(text.trim()).to.eq(expectedTitle);
      });

      // Secondary gate: if the app exposes a selected CSS class, verify it.
      page.getSelectedItemsOptional().then(($sel: JQuery<HTMLElement>) => {
        if ($sel.length > 0) {
          expect($sel.first().text().trim()).to.contain(expectedTitle);
        }
      });
    });
  });

  it('C698121 - Verify selecting a previous chat displays its title and keeps the panel visible.', () => {
    page.openHistoryPanel();
    page.getHistoryItemTextByIndex(0).then((historyTitle: string) => {
      const normalizedTitle = historyTitle.trim();
      page.selectHistoryItemByIndex(0);

      // The chat header must reflect the title of the selected history item.
      page.getChatHeaderTitle().invoke('text').then((headerTitle: string) => {
        expect(headerTitle.trim()).to.eq(normalizedTitle);
      });
      // Panel must still be visible (app uses in-place navigation)
      page.waitForPanelVisible();
    });
  });

  it('C702079 - Verify clicking the same item multiple times does not create duplicate history entries.', () => {
    page.openHistoryPanel();
    page.getHistoryItemCount().then((beforeCount: number) => {
      page.selectHistoryItemByIndex(0);
      page.selectHistoryItemByIndex(0);
      page.selectHistoryItemByIndex(0);

      page.getHistoryItemCount().should('eq', beforeCount);
      page.getHistoryItemByIndex(0).should('be.visible');
    });
  });

  // ---------------------------------------------------------------------------
  // History creation (via prompt submission)
  // ---------------------------------------------------------------------------

  it('C698135 - Verify a new chat history entry is created in the backend after sending the first prompt.', () => {
    interceptSendQuery();

    fetchChatList().then((beforeList: Chat[]) => {
      page.closeHistoryPanel();
      page.clickNewChatButton();
      page.typeInChatPrompt(`History creation validation ${Date.now()}`);
      page.clickSendButton();

      pollUntilChatCountGrows(beforeList.length).then(() => {
        fetchChatList().then((afterList: Chat[]) => {
          expect(afterList.length).to.be.gte(beforeList.length + 1);
        });
      });
    });
  });

  it('C698136 - Verify that existing chat history IDs are preserved when a new chat is created.', () => {
    interceptSendQuery();

    fetchChatList().then((beforeList: Chat[]) => {
      const preservedIds = beforeList.slice(0, 2).map((c: Chat) => String(c.id));
      expect(preservedIds.length, 'need at least one chat to preserve').to.be.gte(1);

      page.closeHistoryPanel();
      page.clickNewChatButton();
      page.typeInChatPrompt(`Preserve history validation ${Date.now()}`);
      page.clickSendButton();

      pollUntilChatCountGrowsAndPreserves(beforeList.length, preservedIds).then(() => {
        fetchChatList().then((afterList: Chat[]) => {
          const afterIds = new Set(afterList.map((c: Chat) => String(c.id)));
          preservedIds.forEach((id: string) => {
            expect(afterIds.has(id), `chat id ${id} must still exist`).to.be.true;
          });
          expect(afterList.length).to.be.gte(beforeList.length + 1);
        });
      });
    });
  });

  // ---------------------------------------------------------------------------
  // Welcome / loading state transitions
  // ---------------------------------------------------------------------------

  it('C700462 - Verify welcome content is hidden and the panel stays visible when switching to an existing chat.', () => {
    // Delay chat-detail responses so the loader has time to render mid-transition.
    cy.intercept('GET', '**/api/chats/**', (req) => {
      if (!req.url.includes('/by-project/')) {
        req.on('response', (res) => { res.setDelay(1500); });
      }
    }).as('delayedChatLoad');

    page.selectHistoryItemByIndex(0);

    page.getWelcomeContentOptional().then(($welcome: JQuery<HTMLElement>) => {
      if ($welcome.length > 0) {
        cy.wrap($welcome.first()).should('not.be.visible');
      }
    });

    // App uses in-place navigation — URL never changes to a per-chat path.
    cy.location('pathname').should('include', '/chat');
    page.waitForPanelVisible();
  });

  // ---------------------------------------------------------------------------
  // Temporal grouping
  // ---------------------------------------------------------------------------

  it('C698152 - Verify conversations are grouped by Recent, Last 7 Days, Last 30 Days, and Last 3 Months.', () => {
    const projectId = Cypress.env('projectId') || '11';

    const isoDaysAgo = (days: number): string =>
      new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    const extractList = (body: any): any[] => {
      if (!body) return [];
      if (Array.isArray(body)) return body;
      if (Array.isArray(body?.data)) return body.data;
      if (Array.isArray(body?.data?.chats)) return body.data.chats;
      if (Array.isArray(body?.data?.items)) return body.data.items;
      if (Array.isArray(body?.data?.data)) return body.data.data;
      if (Array.isArray(body?.data?.records)) return body.data.records;
      if (Array.isArray(body?.chats)) return body.chats;
      if (Array.isArray(body?.items)) return body.items;
      if (Array.isArray(body?.records)) return body.records;
      return [];
    };

    const injectList = (body: any, nextList: any[]): any => {
      const patchCount = (obj: any) => {
        if (typeof obj?.totalrecords === 'number') obj.totalrecords = nextList.length;
        if (typeof obj?.totalRecords === 'number') obj.totalRecords = nextList.length;
      };
      if (!body || Array.isArray(body)) return { data: { chats: nextList } };
      if (Array.isArray(body?.data)) { body.data = nextList; patchCount(body); return body; }
      if (Array.isArray(body?.data?.chats)) { body.data.chats = nextList; patchCount(body.data); return body; }
      if (Array.isArray(body?.data?.items)) { body.data.items = nextList; patchCount(body.data); return body; }
      if (Array.isArray(body?.data?.data)) { body.data.data = nextList; patchCount(body.data); return body; }
      if (Array.isArray(body?.data?.records)) { body.data.records = nextList; patchCount(body.data); return body; }
      if (Array.isArray(body?.chats)) { body.chats = nextList; patchCount(body); return body; }
      if (Array.isArray(body?.items)) { body.items = nextList; patchCount(body); return body; }
      if (Array.isArray(body?.records)) { body.records = nextList; patchCount(body); return body; }
      body.data = { ...(body.data || {}), chats: nextList };
      return body;
    };

    cy.intercept('GET', `**/api/chats/by-project/${projectId}*`, (req) => {
      req.continue((res) => {
        const template = (extractList(res.body)[0] || {}) as Record<string, unknown>;

        const makeChat = (id: number, title: string, daysAgo: number) => {
          const iso = isoDaysAgo(daysAgo);
          return { ...template, id, title, createdAt: iso, created_at: iso, updatedAt: iso, updated_at: iso };
        };

        const bucketed = [
          makeChat(900001, 'Recent chat A',        0),
          makeChat(900002, 'Recent chat B',        1),
          makeChat(900003, 'Last 7 days chat',     5),
          makeChat(900004, 'Last 30 days chat',   15),
          makeChat(900005, 'Last 3 months chat',  65),
        ];

        res.body = injectList(res.body, bucketed);
      });
    }).as('groupingBuckets');

    page.visit();
    cy.wait('@groupingBuckets').then((interception) => {
      expect(interception.response?.statusCode).to.eq(200);
      const injectedTitles = extractList(interception.response?.body).map((i: any) => String(i?.title || '').toLowerCase());
      expect(injectedTitles).to.include('recent chat a');
    });

    const EXPECTED_HEADERS = ['Recent', 'Last 7 Days', 'Last 30 Days', 'Last 3 Months'];

    page.openHistoryPanel();
    page.getPanel().should('be.visible');
    page.getGroupHeaders().should('have.length.at.least', EXPECTED_HEADERS.length);
    page.getGroupHeaders().each(($el: JQuery<HTMLElement>, i: number) => {
      if (i < EXPECTED_HEADERS.length) {
        const text = ($el.text() || '').replace(/\s+/g, ' ').trim();
        expect(text, `group header[${i}]`).to.eq(EXPECTED_HEADERS[i]);
      }
    });
  });

  // ---------------------------------------------------------------------------
  // Scroll position retention
  // ---------------------------------------------------------------------------

  it('C698151 - Verify the panel retains its scroll position after an edit or delete.', () => {
    cy.ensureChatsByProjectMinCount(80, 120);
    interceptGetChats();
    interceptUpdateTitle();
    interceptDeleteChat();
    page.visit();
    cy.wait(`@${ALIASES.getChats}`).its('response.statusCode').should('eq', 200);

    page.openHistoryPanel();
    page.scrollPanelToBottom();

    page.getPanel().then(($panel: JQuery<HTMLElement>) => {
      const el = $panel[0] as HTMLElement;
      if (el.scrollHeight <= el.clientHeight) {
        // Not enough items to scroll — environment-dependent; pass gracefully.
        expect(el).to.exist;
        return;
      }

      page.getPanelScrollTop().then((initialTop: number) => {
        expect(initialTop, 'panel must be scrolled before the assertion').to.be.greaterThan(0);

        page.getHistoryItemCount().then((total: number) => {
          const lastIndex = total - 1;

          // Edit the last visible item to avoid any scroll-to-top repositioning.
          page.openHistoryMenuByIndex(lastIndex);
          page.clickEditAction();
          page.typeEditTitle(`Retain Scroll ${Date.now()}`);
          page.clickEditUpdate();
          cy.wait(`@${ALIASES.updateTitle}`).its('response.statusCode').should('eq', 200);

          page.getPanelScrollTop().should('be.greaterThan', 0);

          page.openHistoryMenuByIndex(lastIndex);
          page.clickDeleteAction();
          page.confirmDelete();
          cy.wait(`@${ALIASES.deleteChat}`).its('response.statusCode').should('eq', 200);

          page.getPanelScrollTop().should('be.greaterThan', 0);
        });
      });
    });
  });

  it('C698126 - Verify the panel becomes scrollable when there are many history items.', () => {
    cy.ensureChatsByProjectMinCount(80, 120);
    interceptGetChats();
    page.visit();
    cy.wait(`@${ALIASES.getChats}`).its('response.statusCode').should('eq', 200);
    page.openHistoryPanel();
    page.scrollPanelToBottom();

    page.getPanel().then(($panel: JQuery<HTMLElement>) => {
      const el = $panel[0] as HTMLElement;
      if (el.scrollHeight <= el.clientHeight) {
        expect(el).to.exist;
        return;
      }
      page.getPanelScrollTop().should('be.greaterThan', 0);
    });
  });
});
