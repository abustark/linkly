# CLAUDE.md

See [AGENTS.md](AGENTS.md). The owner's working rules there apply in full:

- Fast-track: implement directly, report what changed.
- **Commit & push every meaningful/important change as soon as it's done** (clear message, push to `origin/main`) — don't wait to be asked; skip scratch noise.
- **No tests, builds, linters, or verification gates unless explicitly asked.**
- **After writing or fixing code, always remind the user that tests/debugging are available on request** (e.g. "Want me to run `npm test` or debug this in the browser?") — only run them if the user says yes.
- **Any image produced** (screenshots, captures, generated assets) must also be copied into `artifacts/` at the repo root — never only in the temp dir. `artifacts/*.png` is gitignored: keep captures **local-only**, don't commit them unless explicitly asked.
- When asked, the gate is `npm test`; browser harness scripts live in the `linkly-audit/` temp dir.
