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
cypress/
├── e2e/              # Test specifications
├── fixtures/         # Test data
└── support/          # Custom commands and configuration
```

## Configuration

- `cypress.config.ts` - Cypress configuration
- `tsconfig.json` - TypeScript configuration
- `.eslintrc.js` - ESLint rules
