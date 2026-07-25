# Agent Development Rules

## 1. Empirical Verification Before Fix Declaration
- **Always** run `npx tsc --noEmit` before saying a TypeScript bug is fixed.
- **Always** run/test API scripts against live endpoints before declaring them working.
- Do not ask the user to commit until verification passes.
- Do not make assumptions — inspect full log traces and actual endpoint responses.

## 2. Environment Variable Handling
- Auto-format Google Apps Script deployment URLs to handle raw deployment IDs cleanly.
- Example: `https://script.google.com/macros/s/{DEPLOYMENT_ID}/exec` — never hardcode IDs in source.
- Validate env var presence at runtime; fail fast with clear error messages.

## 3. Cache Invalidation
- Whenever the database data baseline changes, **bump `CACHE_VERSION`** in `src/hooks/useSiteContent.ts`.
- This invalidates stale `localStorage` snapshots and prevents stale data bugs.

## 4. Security & Key Management (CRITICAL)
- **Never** leak, expose, or delete API keys, tokens, or secrets.
- Always run security checks before committing or sharing code.
- If a key is found in logs, comments, or temp files, flag it immediately — do not proceed until sanitized.
- Keys stay in `.env` / environment only. No exceptions.

## 5. Change Validation Protocol
- **Always** validate proposed changes with the user before applying them.
- Do not auto-apply refactors, dependency updates, or structural changes without explicit user confirmation.
- Present a summary of what will change and why before execution.

## 6. Commit Policy
- **Never** auto-commit.
- The user controls `git add`, `git commit`, and `git push` at all times.
- Suggest commit messages, but let the user execute.

## 7. Diagnostic Protocol
- Inspect full log traces — not just the last line or summary.
- Check live endpoint responses (status, headers, body) before diagnosing API issues.
- Reproduce the bug empirically before proposing a fix.

## 8. Change Summary Transparency
- **Always** explicitly tell the user what specific changes were made when providing a summary of modifications, updates, or edits.
- Do not present a summary without listing the exact items changed, added, or removed.
- Be specific: file names, line numbers (where relevant), function names, and the nature of each change.

## 9. Proactive Update Suggestions
- **Always** flag outdated items proactively — do not wait for the user to ask.
- Examples: expired API keys, deprecated npm dependencies, stale configs, old tokens, outdated documentation, deprecated API endpoints.
- When flagging, **explicitly tell the user what needs updating** with clear, actionable items.
- Include: what is outdated, why it matters, and the recommended fix or replacement.

## 10. Commit ID Traceability (NEW)
- **Always** include the relevant git commit ID (or short SHA) when summarizing changes or fixes.
- Reference the exact commit so the user can track what was done in version history.
- Example: "Fixed proxy auth bug in `vote.js` — see commit `a1b2c3d`."
