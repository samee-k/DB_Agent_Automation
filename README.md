# DB Agent Automation

Automated E2E testing suite using Cypress and TypeScript.

## Setup

```bash
npm install
```

## Running Tests

### Open Cypress Test Runner
```bash
npm run cy:open
```

### Run Tests in Headless Mode
```bash
npm test
```

### Run Tests in Specific Browser
```bash
npm run test:chrome
npm run test:firefox
```

## Code Quality

```bash
npm run lint          # Check code quality
npm run lint:fix      # Auto-fix linting issues
npm run type-check    # Verify TypeScript
```

## Project Structure

```
DB_Agent_Automation/
├── cypress/
│   ├── e2e/                        # Test specifications
│   ├── fixtures/                   # Test data (JSON files)
│   ├── pages/                      # Page Object Model classes
│   └── support/
│       ├── commands.d.ts           # Custom command types
│       ├── commands.ts             # Custom commands (Reusable Actions)
│       └── e2e.ts                  # Global configuration
├── .eslintrc.js                    # Linting rules (Code Quality)
├── .gitignore                      # Git exclusions
├── cypress.config.ts               # Cypress config
├── package.json                    # Dependencies
├── tsconfig.json                   # TypeScript config (Type Safety)
└── README.md                       # Documentation
```

## Configuration

- `cypress.config.ts` - Cypress configuration
- `tsconfig.json` - TypeScript configuration
- `.eslintrc.js` - ESLint rules
