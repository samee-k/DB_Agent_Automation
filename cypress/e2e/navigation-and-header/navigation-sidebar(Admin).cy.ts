/// <reference types="cypress" />

import { loginBySession } from '../../support/commands';
import { NavigationPage } from '../../pages/NavigationPage';
import { MenuItem } from '../../support/types/testData';

const SELECTORS = {
  menu: '.menu',
  menuItemText: '.menu-item span.text',
  collapseBtn: '.collapse-sidebar',
  expandBtn: '[data-testid="expand-button"], .expand-btn, [aria-label*="expand" i], .icn-arrow-right-circle',
  navLink: (name: string): string => `a.menu-item:contains("${name}")`
};

describe('Navigation and Header - Navbar Expand/Collapse and Menu Navigation', () => {
  const navigationPage = new NavigationPage();
  const chatPath = Cypress.env('DBAGENT_CHAT_PATH') ?? '/dbagent/872/chat';

  beforeEach(() => {
    loginBySession();

    cy.visit(chatPath);
    navigationPage.waitForNavigation();
    cy.get(SELECTORS.menu, { timeout: 10000 }).should('exist');

    // Added JQuery<HTMLElement> type for the $body parameter
    cy.get('body').then(($body: JQuery<HTMLElement>) => {
      if ($body.find(SELECTORS.menuItemText).filter(':visible').length === 0) {
        cy.get(SELECTORS.expandBtn).first().click({ force: true });
      }
    });
    cy.get(SELECTORS.menuItemText).should('be.visible');
  });

  it('C788001, C788002, C788003 - Verify navbar expand, collapse, and restoration behavior', () => {
    cy.get(SELECTORS.menu).invoke('outerWidth').then((width) => {
      // Safely cast the initial width as a number for our assertions
      const initialWidth = width as number;
      
      // 1. Collapse Action
      cy.get(SELECTORS.collapseBtn).first().click({ force: true });
      cy.get(SELECTORS.menuItemText).should('not.be.visible'); 
      
      // Fix for ts(2345): Using .should() with a callback ensures retryability AND strict typing
      cy.get(SELECTORS.menu).should(($menu: JQuery<HTMLElement>) => {
        const currentWidth = $menu.outerWidth() as number;
        expect(currentWidth).to.be.lessThan(initialWidth);
      });

      // 2. Expand Action
      cy.get(SELECTORS.expandBtn).first().click({ force: true });
      cy.get(SELECTORS.menuItemText).should('be.visible'); 
      
      // Fix for ts(2345): Retryable Chai assertion for "closeTo"
      cy.get(SELECTORS.menu).should(($menu: JQuery<HTMLElement>) => {
        const currentWidth = $menu.outerWidth() as number;
        expect(currentWidth).to.be.closeTo(initialWidth, 2);
      });
    });
  });

  // Typed the array with the MenuItem interface
  const menuItems: MenuItem[] = [
    { id: 'C788004', name: 'Labs' },
    { id: 'C788005', name: 'Models' },
    { id: 'C788006', name: 'LLMs' },
    { id: 'C788007', name: 'Deployments' },
    { id: 'C788008', name: 'Users' }
  ];

  menuItems.forEach(({ id, name }: MenuItem) => {
    it(`${id} - Verify that clicking on "${name}" navigates to the ${name} section`, () => {
      cy.url().then((initialUrl) => {
        cy.get(SELECTORS.navLink(name)).first().click();
        cy.get(SELECTORS.navLink(name)).first().should('have.class', 'active');
        navigationPage.getSelectedMenuItemLabel().then((selectedLabel: string) => {
          expect(selectedLabel.trim()).to.contain(name);
        });
        cy.url().should('eq', initialUrl);
      });
    });
  });

  it('C788009 - Verify that the currently selected menu item is visually distinct', () => {
    cy.get('a.menu-item.active').invoke('text').should('include', 'Chat with DB Agent');

    cy.get(SELECTORS.navLink('Labs')).first().click();
    cy.get(SELECTORS.navLink('Labs')).first().should('have.class', 'active');
    cy.get(SELECTORS.navLink('Chat with DB Agent')).first().should('not.have.class', 'active');
  });
});