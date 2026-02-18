import { defineConfig } from 'cypress';

export default defineConfig({
  e2e: {
    baseUrl: 'https://talktodbdev.flo.io/login',
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
    setupNodeEvents(on, config) {
      return config;
    },
  },
});
