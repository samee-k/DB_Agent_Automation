import 'dotenv/config';
import * as fs from 'fs';
import * as path from 'path';
import { defineConfig } from 'cypress';
import { onBeforeRun, onAfterSpec, onAfterRun } from './cypress/plugins/testrail-reporter';

export default defineConfig({
  projectId: 'dskfo2',
  e2e: {
    baseUrl: process.env.CYPRESS_BASE_URL || 'https://devstudio.fuse.ai',
    specPattern: 'cypress/e2e/{auth,agent-response,chat-history,navigation,smoke,user-input}/**/*.cy.{js,jsx,ts,tsx}',
    supportFile: 'cypress/support/e2e.ts',
    videosFolder: 'cypress/videos',
    screenshotsFolder: 'cypress/screenshots',
    video: true,
    screenshotOnRunFailure: true,
    viewportWidth: 1280,
    viewportHeight: 720,
    defaultCommandTimeout: 20000,
    requestTimeout: 30000,
    responseTimeout: 120000,
    env: {
      USER_EMAIL: process.env.CYPRESS_USER_EMAIL || process.env.USER_EMAIL || '',
      USER_PASSWORD: process.env.CYPRESS_USER_PASSWORD || process.env.USER_PASSWORD || '',
      appUrl: process.env.CYPRESS_APP_URL || process.env.CYPRESS_BASE_URL || 'https://devstudio.fuse.ai',
      apiUrl: process.env.CYPRESS_API_URL || `${process.env.CYPRESS_BASE_URL || 'https://devstudio.fuse.ai'}/api`,
      projectId: process.env.CYPRESS_PROJECT_ID || '810',
      chatPath: process.env.CYPRESS_CHAT_PATH || '/dbagent/810/chat',
    },
    setupNodeEvents(on, config) {
      // Ensure video subdirectories exist before specs run (prevents ffmpeg errors)
      const videosRoot = path.resolve(__dirname, 'cypress/videos');
      const specDirs = ['agent-response', 'auth', 'chat-history', 'navigation', 'regression', 'smoke', 'user-input'];
      specDirs.forEach((dir) => fs.mkdirSync(path.join(videosRoot, dir), { recursive: true }));

      on('task', {
        log(message: string) {
          console.log(message);
          return null;
        },
      });

      on('before:run', async (details) => {
        await onBeforeRun(details);
      });

      on('after:spec', async (spec, results) => {
        await onAfterSpec(spec, results);
      });

      on('after:run', async () => {
        await onAfterRun();
      });

      return config;
    }
  },
});
