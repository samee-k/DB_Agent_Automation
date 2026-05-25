// ---------------------------------------------------------------------------
// Centralized timeouts
//
// Replaces scattered literals (90000, 120000, 30000, 20000 ...) across specs.
// Tweak here, not in 30 spec files.
//
// Guideline for picking the right bucket:
//   - UI render / DOM appearance     → ui
//   - Fast REST calls (chat CRUD)    → apiFast
//   - Auto-generated chat list/load  → apiSlow
//   - Real LLM send-query response   → llmResponse
//   - Stubbed send-query response    → llmStub
// ---------------------------------------------------------------------------

export const TIMEOUTS = {
  /** DOM render / element visibility / short interactions. */
  ui: 20000,
  /** Welcome screen / initial page load assertions. */
  pageLoad: 30000,
  /** Fast REST endpoints (POST /chats, DELETE /chats/:id, etc.). */
  apiFast: 30000,
  /** Chat list / panel rendering after seed. */
  apiSlow: 60000,
  /** Real LLM send-query response. Deployments vary widely; keep generous. */
  llmResponse: 180000,
  /** Stubbed send-query response (synthetic 200 from llm-stubs). */
  llmStub: 5000,
} as const;

export type TimeoutKey = keyof typeof TIMEOUTS;
