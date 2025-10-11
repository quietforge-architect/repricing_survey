# Exporting Safe Survey Data

This repo supports two export paths to produce safe, shareable JSON.

Outputs are written to `public/export/`:
- `survey_summary.json`: Aggregated metrics (no PII)
- `survey_responses.json`: Per-response objects with PII-like fields excluded

Routes
- From Local CSV (offline collector)
  - Start collector: `npm run collector:start`
  - Post submissions to `http://localhost:3000/submit`
  - Export JSON: `npm run export:safe`

- From SQLite (normalized v2 schema)
  - (Once) Migrate: `npm --prefix agents/logic/sqlite-service run migrate:v1-to-v2`
  - Export JSON: `npm run export:safe:db`

Viewing Results
- Open `docs/results.html` in a static server so it can fetch `public/export/survey_summary.json`, or use the built-in “Load JSON Manually” button.

Notes
- Excluded fields: `contact`, `email`, `phone`.
- Aggregates computed: experience mix, average satisfaction, glitch counts, top features (by frequency), and counts of key free-text fields.

