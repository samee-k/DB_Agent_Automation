import 'dotenv/config';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { defineConfig } from 'cypress';
import { onBeforeRun, onAfterSpec, onAfterRun } from './cypress/plugins/testrail-reporter';

const LLM_HEALTH_CACHE_PATH = path.join(os.tmpdir(), 'cypress-db-agent-llm-health.json');

interface LlmHealthCachePayload {
  healthy: boolean;
  timestamp: number;
}

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
        'llmHealth:read'(): LlmHealthCachePayload | null {
          try {
            if (!fs.existsSync(LLM_HEALTH_CACHE_PATH)) return null;
            const raw = fs.readFileSync(LLM_HEALTH_CACHE_PATH, 'utf8');
            const parsed = JSON.parse(raw) as LlmHealthCachePayload;
            if (typeof parsed?.healthy !== 'boolean') return null;
            return parsed;
          } catch {
            return null;
          }
        },
        'llmHealth:write'(payload: LlmHealthCachePayload): null {
          try {
            fs.writeFileSync(LLM_HEALTH_CACHE_PATH, JSON.stringify(payload), 'utf8');
          } catch {
            // Caching is best-effort — probe will simply re-run next spec.
          }
          return null;
        },
      });

      on('before:run', async (details) => {
        // Invalidate the cached LLM verdict so each `cypress run` re-probes
        // (deployments come and go between runs).
        try {
          fs.unlinkSync(LLM_HEALTH_CACHE_PATH);
        } catch {
          // No cache yet — nothing to clean up.
        }
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
