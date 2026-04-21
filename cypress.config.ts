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
      appUrl: process.env.CYPRESS_APP_URL || process.env.CYPRESS_BASE_URL || 'https://devstudio.fuse.ai',
      apiUrl: process.env.CYPRESS_API_URL || 'https://devstudio.fuse.ai/api',
      projectId: process.env.CYPRESS_PROJECT_ID || '11',
      chatPath: process.env.CYPRESS_CHAT_PATH || '/dbagent/11/chat',
    },
    setupNodeEvents(on, config) {
      return config;
    },
  },
});
