# artifacts/

Images produced or captured during agent work — browser screenshots, verification/QA captures, generated icons, mockups, diagrams.

## Convention (binding for AI agents)

- Every image you produce or snap is saved **twice**: once in your temp working dir (e.g. `linkly-audit/shots/` on C:) and once **here**, in this folder.
- Naming: `YYYY-MM-DD-<task-description>.png` (e.g. `2026-09-23-dashboard-1440-cards.png`), or a per-task subfolder (`artifacts/2026-09-23-audit-remediation/…`).
- `artifacts/*.png` is **gitignored — captures stay local-only**. They are disposable QA evidence (re-run the browser harness to regenerate), so the repository is never bloated with binaries. When a shot needs to be shared, attach it to a GitHub issue/PR; only commit images here if the owner explicitly asks.
