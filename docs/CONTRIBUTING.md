# Contributing

- Branching: feature branches off `main`; open a PR with a clear title and concise description.
- Commit style: short imperative subject, scoped when helpful (e.g., `apps-script: add auto headers`).
- Code style: keep deps minimal, prefer stdlib; align with existing file patterns.
- Secrets: never commit credentials or PII. Use `.env` locally.
- Tests/validation: run `npm run validate:exports` after generating exports. If adding specs, include a validator.
- DB: changes to schema should update `db/schema_v2.sql` and related scripts; include a migration.
- Docs: update relevant docs under `docs/` when changing flows or endpoints.

## Quickstart
- Init DB: `npm run db:init`
- Start sqlite-service: `npm --prefix agents/logic/sqlite-service run start`
- Post sample: `npm run post:sample -- http://localhost:3001/submit`
- Export JSON: `npm run export:safe:db`
- View: open `docs/results.html`

## Ownership
- Apps Script collector: `agents/integrations/google-apps-script/`
- Local collectors/exporters: `agents/logic/local-collector/`, `tools/`
- DB schema/migration: `db/`, `agents/logic/sqlite-service/`
- Docs/Pages: `docs/`, `.github/workflows/pages.yml`

