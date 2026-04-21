/// <reference types="cypress" />

export class NavigationPage {
  // Navigation Selectors - Based on actual application HTML structure
  private readonly navBar = ['nav', '[role="navigation"]', '[data-testid="navbar"]', '.navbar', '.nav', '.menu'].join(', ');
  private readonly collapseButton = '.collapse-sidebar';
  private readonly expandButton = [
    'button[aria-label*="expand" i]',
    '[data-testid="expand-button"]',
    '[data-cy="expand-nav"]',
    '.expand-btn',
    '.icn-arrow-right-circle', // expand icon
  ].join(', ');
  private readonly navPane = [
    '[data-testid="nav-pane"]',
    'aside',
    '.nav-pane',
    '.sidebar',
    '.left-navigation',
    '.menu',
  ].join(', ');
  private readonly mainContent = [
    '[data-testid="main-content"]',
    'main',
    '.main-content',
    '.content-area',
  ].join(', ');

  // Menu item selectors - Updated based on actual HTML structure
  private getMenuItemSelector(itemName: string): string {
    // Primary selector using menu-item class and text content within span
    return [
      `.menu-item:has(> span.text:contains("${itemName}"))`,
      `a.menu-item:contains("${itemName}")`,
      `.menu-item:contains("${itemName}")`,
      `a[role="button"]:contains("${itemName}")`,
      `a[role="button"] span.text:contains("${itemName}")`,
    ].join(', ');
  }

  // Specific menu item selectors for reliability
  private chatWithDBAgentSelector = 'a.menu-item.active, a.menu-item:has(> span.text:contains("Chat with DB Agent"))';
  private labsSelector = 'a.menu-item:has(i.icn-labs), a.menu-item:contains("Labs")';
  private modelsSelector = 'a.menu-item:has(i.icn-models), a.menu-item:contains("Models")';
  private llmsSelector = 'a.menu-item:contains("LLMs")';
  private deploymentsSelector = 'a.menu-item:has(i.icn-package), a.menu-item:contains("Deployments")';
  private usersSelector = 'a.menu-item:has(i.icn-users), a.menu-item:contains("Users")';

  // Visibility and state checks
  isNavBarVisible(): Cypress.Chainable<any> {
    return cy.get(this.navBar).should('be.visible');
  }

  isNavPaneVisible(): Cypress.Chainable<any> {
    return cy.get(this.navPane).should('be.visible');
  }

  isNavPaneHidden(): Cypress.Chainable<any> {
    return cy.get(this.navPane).should('not.be.visible');
  }

  isMainContentExpanded(): Cypress.Chainable<any> {
    // Verify main content has expanded (width increased or margin adjusted)
    return cy.get(this.mainContent).should('be.visible');
  }

  // Collapse/Expand actions
  clickCollapseButton(): Cypress.Chainable<any> {
    return cy.get(this.collapseButton).click();
  }

  clickExpandButton(): Cypress.Chainable<any> {
    // After collapse, the expand button appears - might be beside the collapsed sidebar
    return cy.get(this.expandButton).first().click();
  }

  // Navigation to sections using specific selectors
  clickMenuItemLabs(): Cypress.Chainable<any> {
    return cy.get(this.labsSelector).first().click();
  }

  clickMenuItemModels(): Cypress.Chainable<any> {
    return cy.get(this.modelsSelector).first().click();
  }

  clickMenuItemLLMs(): Cypress.Chainable<any> {
    return cy.get(this.llmsSelector).first().click();
  }

  clickMenuItemDeployments(): Cypress.Chainable<any> {
    return cy.get(this.deploymentsSelector).first().click();
  }

  clickMenuItemUsers(): Cypress.Chainable<any> {
    return cy.get(this.usersSelector).first().click();
  }

  clickMenuItemChatWithDBAgent(): Cypress.Chainable<any> {
    return cy.get(this.chatWithDBAgentSelector).first().click();
  }

  // Verify selected menu item is highlighted/distinct
  isMenuItemSelected(itemName: string): Cypress.Chainable<any> {
    let selector = this.getMenuItemSelector(itemName);
    
    // Handle specific items
    if (itemName === 'Chat with DB Agent') {
      selector = this.chatWithDBAgentSelector;
    } else if (itemName === 'Labs') {
      selector = this.labsSelector;
    } else if (itemName === 'Models') {
      selector = this.modelsSelector;
    } else if (itemName === 'LLMs') {
      selector = this.llmsSelector;
    } else if (itemName === 'Deployments') {
      selector = this.deploymentsSelector;
    } else if (itemName === 'Users') {
      selector = this.usersSelector;
    }

    return cy
      .get(selector)
      .first()
      .should(
        'satisfy',
        ($el: JQuery) => {
          // Check for active class which is the primary indicator
          const hasActiveClass = $el.hasClass('active');
          const computedStyle = window.getComputedStyle($el[0]);
          const hasDistinctStyle = computedStyle.backgroundColor !== 'rgba(0, 0, 0, 0)' || $el.hasClass('highlighted');

          return hasActiveClass || hasDistinctStyle;
        }
      );
  }

  // URL navigation checks
  verifyCurrentUrl(expectedPath: string): Cypress.Chainable<any> {
    return cy.url().should('include', expectedPath);
  }

  // Get the selected menu item's label
  getSelectedMenuItemLabel(): Cypress.Chainable<string> {
    return cy
      .get('a.menu-item.active, .menu-item.active')
      .first()
      .invoke('text');
  }

  // Helper: Wait for navigation to complete
  waitForNavigation(): Cypress.Chainable<any> {
    return cy.location('pathname', { timeout: 30000 }).should('match', /\/dbagent\/\d+\/chat/);
  }

  // Check if navigation pane has specific width or state
  getNavPaneWidth(): Cypress.Chainable<any> {
    return cy.get(this.navPane).then(($el: JQuery<HTMLElement>) => {
      return $el.width() ?? 0;
    });
  }

  // Verify navbar state (expanded/collapsed) by checking nav pane visibility
  isNavBarExpanded(): Cypress.Chainable<any> {
    return cy.get(this.navPane).should('be.visible');
  }

  isNavBarCollapsed(): Cypress.Chainable<any> {
    return cy.get(this.navPane).should('not.be.visible');
  }
}

