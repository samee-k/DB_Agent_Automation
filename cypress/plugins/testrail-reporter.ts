/**
 * TestRail Reporter — posts Cypress results to TestRail as each spec finishes.
 *
 * Flow:
 *   before:run  → create the TestRail run (once), store the run ID
 *   after:spec  → post results for that spec immediately
 *   after:run   → close the run (if TESTRAIL_CLOSE_RUN=true)
 *
 * Required env vars:
 *   TESTRAIL_ENABLED      Must be "true" — all other vars are ignored otherwise
 *   TESTRAIL_HOST         e.g. https://yourorg.testrail.io
 *   TESTRAIL_USERNAME     TestRail account email
 *   TESTRAIL_API_KEY      TestRail API key (My Settings → API Keys)
 *   TESTRAIL_PROJECT_ID   Numeric TestRail project ID
 *
 * Optional env vars:
 *   TESTRAIL_SUITE_ID     Numeric suite ID (required for multi-suite projects)
 *   TESTRAIL_RUN_NAME     Custom run name (defaults to "Cypress Run – <timestamp> UTC")
 *   TESTRAIL_CLOSE_RUN    Set to "true" to close the run when all specs finish
 *   TESTRAIL_RUN_ID       Existing run ID — skips run creation and posts into this run instead
 *
 * Test titles must embed TestRail case IDs using the C<number> convention, e.g.:
 *   it('C679727 - Verify loading indicator appears…', …)
 *   it('C669522 + C669523 + C669524 - Verify login form controls…', …)
 *   it('C788001, C788002, C788003 - Verify navbar expand…', …)
 */

import * as fs from 'fs';

// ─── Cypress spec-result shape ───────────────────────────────────────────────
interface CypressTestAttempt {
  duration?: number;
}

interface CypressTest {
  title: string[];
  state: 'passed' | 'failed' | 'pending' | 'skipped';
  displayError: string | null;
  attempts: CypressTestAttempt[];
}

export interface CypressSpecResult {
  tests: CypressTest[];
}

// ─── TestRail types ──────────────────────────────────────────────────────────
const STATUS: Record<string, number> = {
  passed:  1,
  failed:  5,
  pending: 2,
  skipped: 2,
};

interface TestRailResult {
  case_id:   number;
  status_id: number;
  comment:   string;
  elapsed:   string;
}

interface TestRailRun {
  id:   number;
}

// ─── Module-level state (shared across hook calls within one Cypress process) ─
let runId: number | null = null;
let runUrl = '';
let cfg: {
  host: string;
  username: string;
  apiKey: string;
  projectId: string;
  suiteId: string | undefined;
  closeRun: boolean;
  runName: string;
} | null = null;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isEnabled(): boolean {
  return process.env.TESTRAIL_ENABLED === 'true';
}

function loadCfg(): typeof cfg {
  const host      = process.env.TESTRAIL_HOST;
  const username  = process.env.TESTRAIL_USERNAME;
  const apiKey    = process.env.TESTRAIL_API_KEY;
  const projectId = process.env.TESTRAIL_PROJECT_ID;

  if (!host || !username || !apiKey || !projectId) {
    console.log(
      '[TestRail] Skipping — set TESTRAIL_HOST, TESTRAIL_USERNAME, ' +
      'TESTRAIL_API_KEY, and TESTRAIL_PROJECT_ID to enable reporting.'
    );
    return null;
  }

  return {
    host,
    username,
    apiKey,
    projectId,
    suiteId:  process.env.TESTRAIL_SUITE_ID,
    closeRun: process.env.TESTRAIL_CLOSE_RUN === 'true',
    runName:  `${process.env.TESTRAIL_RUN_NAME?.trim() || 'Cypress Run'} – ${new Date().toLocaleString('en-GB', { timeZone: 'Asia/Kathmandu', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).replace(',', '')} NPT`,
  };
}

function extractCaseIds(title: string): number[] {
  return (title.match(/\bC(\d+)\b/g) ?? []).map((m) => parseInt(m.slice(1), 10));
}

function formatScreenshotComment(screenshots: CypressCommandLine.RunResult['screenshots']): string {
  const paths = Array.from(new Set((screenshots ?? []).map((screenshot) => screenshot.path).filter(Boolean)));

  if (paths.length === 0) {
    return '';
  }

  return `\n\nScreenshot${paths.length > 1 ? 's' : ''}:\n${paths.map((path) => `- ${path}`).join('\n')}`;
}

async function apiRequest<T>(method: 'GET' | 'POST', endpoint: string, body?: object): Promise<T> {
  if (!cfg) throw new Error('[TestRail] config not initialised');
  const credentials = Buffer.from(`${cfg.username}:${cfg.apiKey}`).toString('base64');
  const url = `${cfg.host.replace(/\/$/, '')}/index.php?/api/v2/${endpoint}`;
  const response = await fetch(url, {
    method,
    headers: { Authorization: `Basic ${credentials}`, 'Content-Type': 'application/json' },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`TestRail API [${response.status}] ${endpoint}: ${text}`);
  }
  return response.json() as Promise<T>;
}

function buildResults(tests: CypressTest[], screenshots: CypressCommandLine.RunResult['screenshots']): TestRailResult[] {
  const results: TestRailResult[] = [];
  const screenshotComment = formatScreenshotComment(screenshots);

  for (const test of tests) {
    const caseIds = extractCaseIds(test.title.join(' '));
    if (caseIds.length === 0) continue;
    const statusId = STATUS[test.state] ?? STATUS.failed;
    const elapsed  = `${Math.max(1, Math.ceil((test.attempts?.[0]?.duration ?? 0) / 1000))}s`;
    const comment  =
      test.state === 'failed' && test.displayError
        ? `FAILED\n\n${test.displayError}${screenshotComment}`
        : `Cypress automated test – ${test.state}`;
    for (const caseId of caseIds) {
      results.push({ case_id: caseId, status_id: statusId, comment, elapsed });
    }
  }
  return results;
}

// ─── Exported hook handlers ───────────────────────────────────────────────────

/** Scan spec files on disk and collect all C<id> case IDs. */
function collectCaseIdsFromSpecs(specPaths: string[]): number[] {
  const ids = new Set<number>();
  for (const specPath of specPaths) {
    try {
      const content = fs.readFileSync(specPath, 'utf8') as string;
      const matches = content.match(/\bC(\d+)\b/g) ?? [];
      matches.forEach((m: string) => ids.add(parseInt(m.slice(1), 10)));
    } catch {
      // skip unreadable files
    }
  }
  return Array.from(ids);
}

/** Call from `before:run`. Creates the TestRail run and stores the run ID, or reuses TESTRAIL_RUN_ID if provided. */
export async function onBeforeRun(details?: { specs?: Array<{ absolute: string }> }): Promise<void> {
  if (!isEnabled()) {
    console.log('[TestRail] Skipping — set TESTRAIL_ENABLED=true to post results.');
    return;
  }

  cfg = loadCfg();
  if (!cfg) return;

  // If an existing run ID is provided, reuse it instead of creating a new one
  const existingRunId = process.env.TESTRAIL_RUN_ID ? parseInt(process.env.TESTRAIL_RUN_ID, 10) : null;
  if (existingRunId) {
    runId  = existingRunId;
    runUrl = `${cfg.host.replace(/\/$/, '')}/index.php?/runs/view/${runId}`;
    console.log(`[TestRail] Reusing existing Run #${runId} → ${runUrl}`);
    return;
  }

  const specPaths = (details?.specs ?? []).map((s) => s.absolute).filter(Boolean);
  const caseIds   = specPaths.length > 0 ? collectCaseIdsFromSpecs(specPaths) : [];

  const runPayload: Record<string, unknown> = {
    name: cfg.runName,
    ...(caseIds.length > 0
      ? { include_all: false, case_ids: caseIds }
      : { include_all: true }),
  };
  if (cfg.suiteId) {
    runPayload.suite_id = parseInt(cfg.suiteId, 10);
  }

  try {
    const created = await apiRequest<TestRailRun>('POST', `add_run/${cfg.projectId}`, runPayload);
    runId  = created.id;
    runUrl = `${cfg.host.replace(/\/$/, '')}/index.php?/runs/view/${runId}`;
    console.log(`[TestRail] Run #${runId} created with ${caseIds.length} cases → ${runUrl}`);
  } catch (err) {
    console.error('[TestRail] Failed to create run:', (err as Error).message);
  }
}

/** Call from `after:spec`. Posts results for the just-finished spec immediately. */
export async function onAfterSpec(
  spec: { relative: string },
  results: CypressCommandLine.RunResult,
): Promise<void> {
  if (!isEnabled() || !cfg || runId === null) return;

  const tests = (results.tests ?? []) as CypressTest[];
  const specResults = buildResults(tests, results.screenshots ?? []);

  if (specResults.length === 0) {
    console.log(`[TestRail] ${spec.relative} — no C<id> case IDs, skipping.`);
    return;
  }

  const passCount = specResults.filter((r) => r.status_id === 1).length;
  const failCount = specResults.filter((r) => r.status_id === 5).length;

  try {
    await apiRequest('POST', `add_results_for_cases/${runId}`, { results: specResults });
    console.log(
      `[TestRail] ✓ ${spec.relative} → ${specResults.length} results posted ` +
      `(passed: ${passCount}, failed: ${failCount}) → Run #${runId}`
    );
  } catch (err) {
    console.error(`[TestRail] Failed to post results for ${spec.relative}:`, (err as Error).message);
  }
}

/** Call from `after:run`. Closes the run if TESTRAIL_CLOSE_RUN=true. */
export async function onAfterRun(): Promise<void> {
  if (!isEnabled() || !cfg || runId === null) return;

  if (cfg.closeRun) {
    try {
      await apiRequest('POST', `close_run/${runId}`);
      console.log(`[TestRail] Run #${runId} closed → ${runUrl}`);
    } catch (err) {
      console.error('[TestRail] Failed to close run:', (err as Error).message);
    }
  } else {
    console.log(`[TestRail] All specs done → ${runUrl}`);
  }

  // Reset for safety
  runId = null;
  cfg   = null;
}
