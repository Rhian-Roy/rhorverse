@AGENTS.md

# Claude Code notes

- Start non-trivial work in plan mode. Use `/plan-task` to get a plan with acceptance criteria.
- Before committing: `/review-diff`, then `just test && just lint`.
- `/defend` gives an interview-style walkthrough of today's changes. `/handover` updates `docs/HANDOVER.md` and `docs/BACKLOG.md`.
- `.claude/settings.json` denies reading `.env*` and `data/**`. Don't try workarounds (cat, grep, etc.).
