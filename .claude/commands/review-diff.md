---
description: Self-review the current diff against the project checklist
---
Run `git diff` (staged and unstaged) and review it against this checklist. Report each item as ✅ / ❌ with file:line:

- [ ] Follows AGENTS.md hard rules (locked stack, tokens-only colours, no torch in runtime deps, no secrets)
- [ ] No Tailwind default colour classes or raw hex in `className`
- [ ] TS strict-clean, no `any`; types mirror `schemas.py` where relevant
- [ ] New logic has tests; `just test` and `just lint` pass
- [ ] Outbound HTTP goes through `ingest/http.py` (rate limit, cache, UA)
- [ ] Attribution shown where provider data is displayed
- [ ] Keyboard/TV focus works for new interactive UI
- [ ] Migrations are new files, not edits to applied ones
- [ ] Commit message would be conventional and scoped

Then list concrete fixes, most important first. Don't apply them unless I ask.
