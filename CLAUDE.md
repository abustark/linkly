# CLAUDE.md

See [AGENTS.md](AGENTS.md). The owner's working rules there apply in full:

- Fast-track: implement directly, report what changed.
- **No tests, builds, linters, or verification gates unless explicitly asked.**
- **After writing or fixing code, always remind the user that tests/debugging are available on request** (e.g. "Want me to run `npm test` or debug this in the browser?") — only run them if the user says yes.
- When asked, the gate is `npm test`; browser harness scripts live in the `linkly-audit/` temp dir.
