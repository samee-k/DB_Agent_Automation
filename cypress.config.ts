import 'dotenv/config';
import { defineConfig } from 'cypress';

export default defineConfig({
  projectId: 'dskfo2',
  e2e: {
    baseUrl: process.env.CYPRESS_BASE_URL || 'https://devstudio.fuse.ai',
    specPattern: 'cypress/e2e/**/*.cy.{js,jsx,ts,tsx}',
    supportFile: 'cypress/support/e2e.ts',
    videosFolder: 'cypress/videos',
    screenshotsFolder: 'cypress/screenshots',
    video: true,
    screenshotOnRunFailure: true,
    viewportWidth: 1280,
    viewportHeight: 720,
    defaultCommandTimeout: 10000,
    requestTimeout: 10000,
    responseTimeout: 30000,
    env: {
      USER_EMAIL: process.env.CYPRESS_USER_EMAIL || process.env.USER_EMAIL || '',
      USER_PASSWORD: process.env.CYPRESS_USER_PASSWORD || process.env.USER_PASSWORD || '',
      appUrl: process.env.CYPRESS_APP_URL || process.env.CYPRESS_BASE_URL || 'https://devstudio.fuse.ai',
      apiUrl: process.env.CYPRESS_API_URL || 'https://datahub.fuse.ai/api',
      projectId: process.env.CYPRESS_PROJECT_ID || '810',
      chatPath: process.env.CYPRESS_CHAT_PATH || '/dbagent/810/chat',
    },
    setupNodeEvents(on, config) {
      return config;
    },
  },
});
