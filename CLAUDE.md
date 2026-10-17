# CLAUDE.md

See [AGENTS.md](AGENTS.md). The owner's working rules there apply in full:

- Fast-track: implement directly, report what changed.
- **Commit & push every meaningful/important change as soon as it's done** (clear message, push to `origin/main`) — don't wait to be asked; skip scratch noise.
- **No tests, builds, linters, or verification gates unless explicitly asked.**
- **After writing or fixing code, always remind the user that tests/debugging are available on request** (e.g. "Want me to run `npm test` or debug this in the browser?") — only run them if the user says yes.
- **Any image produced** (screenshots, captures, generated assets) must also be copied into `artifacts/` at the repo root — never only in the temp dir. `artifacts/*.png` is gitignored: keep captures **local-only**, don't commit them unless explicitly asked.
- When asked, the gate is `npm test`; browser harness scripts live in the `linkly-audit/` temp dir.
- **Versioned commits (strict):** every commit is numbered `X.Y.Z` (`2.0.10` ➔ `2.1.0` — the third number never exceeds `.10`), format `<version> - <short message>`; **one version number per agent response / request batch** — one owner request = one number, follow-up fixes fold into it, only a genuinely new request advances it. History before this rule is unversioned; numbering starts at `2.0.0`, logged in `COMMIT-HISTORY.md` (repo root). Full rules in [AGENTS.md](AGENTS.md).
