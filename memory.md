# Project & Workflow Guidelines (Memory)

## Core Instructions & Rules

1. **Thorough Verification Before Claiming Resolution:**
   - **NEVER** claim a issue is fixed or ask the user to commit until you have **personally run tests and verified the actual runtime output** (both local dev server and API responses).
   - Inspect un-truncated error logs, network responses, and database snapshots directly before making diagnostics.

2. **Testing Workflow:**
   - Always run `npx tsc --noEmit` to verify TypeScript builds without errors.
   - Always test API endpoints with active test scripts or curl requests to confirm live response payloads (`200 OK`, expected fields).
   - Only present changes to the user after local and serverless execution have been verified cleanly.

3. **Git & Commit Directives:**
   - Never commit or push without explicit user approval.
   - Present clean, concise diff summaries when requesting commit confirmation.

4. **Environment Variables & Secrets:**
   - Always auto-format Google Apps Script deployment URLs (`https://script.google.com/macros/s/{ID}/exec`) so raw IDs never break URL parsers.
   - Keep `.env.example` sanitized with dummy placeholders while ensuring live `.env` and Vercel secrets match project credentials.

5. **Cache Management:**
   - Bump `CACHE_VERSION` in `src/hooks/useSiteContent.ts` whenever database baselines or schema structures change to purge stale browser `localStorage` snapshots immediately across all user devices.
