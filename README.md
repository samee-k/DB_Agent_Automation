# DB Agent Automation

Automated E2E testing suite for [DB Agent] using Cypress 15 and TypeScript 5.

## Project Overview

This project provides automated end-to-end tests for the **DB Agent** application, an AI-powered database assistant within the AI Studio platform. The suite covers:

- **Authentication** — login/logout flows, credential validation, session management
- **Chat interaction** — sending prompts, receiving agent responses, processing indicators
- **Chat history** — CRUD operations (create, edit, delete), search, panel behavior
- **Navigation** — sidebar expand/collapse, menu item routing
- **User input** — character limits, autocomplete suggestions, prompt actions (copy/edit)

Tests follow the Page Object Model pattern with centralized TypeScript types and integrate with TestRail for result reporting.

## Prerequisites

- Node.js >= 18
- npm >= 9

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env` # fill in your credentials
   ```bash
   cp .env.example .env
   ```

### Required Environment Variables

| Variable | Description |
|---|---|
| `CYPRESS_BASE_URL` | App URL (example: `https://devstudio.fuse.ai`) |
| `CYPRESS_API_URL` | API base URL (example: `<BASE_URL>/api`) |
| `CYPRESS_USER_EMAIL` | Test user email |
| `CYPRESS_USER_PASSWORD` | Test user password |
| `CYPRESS_PROJECT_ID` | Project ID for API routes |
| `CYPRESS_CHAT_PATH` | Chat page path (e.g. `/dbagent/11/chat`) |

**TestRail** is optional.

| Variable | Description |
|---|---|
| `TESTRAIL_ENABLED` | Set to `"true"` to activate result reporting |
| `TESTRAIL_HOST` | e.g. `https://yourorg.testrail.io` |
| `TESTRAIL_USERNAME` | TestRail account email |
| `TESTRAIL_API_KEY` | TestRail API key (My Settings → API Keys) |
| `TESTRAIL_PROJECT_ID` | Numeric TestRail project ID |
| `TESTRAIL_SUITE_ID` | Suite ID (required for multi-suite projects) |
| `TESTRAIL_RUN_NAME` | Custom run name (defaults to `Cypress Run – <timestamp> NTP`) |
| `TESTRAIL_CLOSE_RUN` | Set to `"true"` to close the run after all specs finish |
| `TESTRAIL_RUN_ID` | Post results into an existing run instead of creating a new one |


## Running Tests

```bash
# Interactive
npm run cy:open

# Headless
npm test                                                          # default browser
npm run test:chrome                                               # Chrome
npm run test:firefox                                              # Firefox

# Specific spec
npm run cy:run:spec --spec "cypress/e2e/auth/login.cy.ts"

# Regression suite
npm run test:regression

# With TestRail reporting
npm run test:testrail
npm run test:testrail:spec --spec "cypress/e2e/regression/regression.cy.ts"

```

## Code Quality

```bash
npm run lint          # ESLint check
npm run lint:fix      # Auto-fix linting issues
npm run type-check    # Verify TypeScript
```

## Project Structure

```
DB_Agent_Automation/
├── cypress/
│   ├── e2e/                        # Test specifications
│   │   ├── agent-response/         # Agent response & loading indicator tests
│   │   ├── auth/                   # Login / logout tests
│   │   ├── chat-history/           # Chat history CRUD & search tests
│   │   ├── navigation/             # Sidebar & new chat navigation tests
│   │   ├── regression/             # Full regression suite
│   │   ├── smoke/                  # Happy-path smoke tests
│   │   └── user-input/             # Input field, suggestions & prompt tests
│   ├── fixtures/                   # Test data (JSON files)
│   ├── plugins/
│   │   └── testrail-reporter.ts    # Custom TestRail reporter plugin
│   └── support/
│       ├── api/                    # API service helpers (auth, chat)
│       ├── helpers/                # Reusable test helpers
│       ├── pages/                  # Page Object Model classes
│       ├── selectors/              # Shared element selectors
│       ├── types/                  # TypeScript type definitions
│       ├── commands.ts             # Custom Cypress commands
│       └── e2e.ts                  # Global test configuration
├── cypress.config.ts               # Cypress configuration
├── package.json                    # Dependencies & scripts
├── tsconfig.json                   # TypeScript configuration
└── .eslintrc.js                    # ESLint rules
```