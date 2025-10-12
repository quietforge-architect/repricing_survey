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
  - Aggregates: totalResponses, byExperience, avgSatisfaction, glitchCounts, topFeatures, freeTextCounts.
  - Requires v2 schema; returns 503 if missing (run init-db).
  - Response: { generatedAt, totalResponses, ... }

Notes
- v1 submissions are deprecated and no longer used for new writes.
- Ensure db/survey.sqlite exists (npm run db:init) and .env points DB_PATH to it.
- /public endpoint is deprecated; use /api/v2/*.
