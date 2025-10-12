API (sqlite-service)

Base URL
- Default: http://localhost:3001

Endpoints
- GET /api/health
  - Returns { ok: true, db: true } if DB is reachable.

- GET /api/v2/responses?limit=100&offset=0
  - Returns latest denormalized responses from v2 tables.
  - Requires v2 schema; returns 503 if missing (run init-db).
  - Response: { items: [ { Timestamp, ...fields } ], count, limit, offset }

- GET /api/v2/summary
  - Aggregates: overall totals, categorical breakdowns (years_selling, selling_commitment, risk_posture, and more), numeric averages (weekly_hours, privacy_rating, inventory_anxiety), top multi-select choices (signal_menu, sourcing_style, safety_nets, learning_sources), plus counts of long-form responses.
  - Requires v2 schema; returns 503 if missing (run init-db).
  - Response: { generatedAt, totalResponses, ... }

Notes
- v1 submissions are deprecated and no longer used for new writes.
- Ensure db/survey.sqlite exists (npm run db:init) and .env points DB_PATH to it.
- /public endpoint is deprecated; use /api/v2/*.
