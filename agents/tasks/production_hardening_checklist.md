Task: Production Hardening Checklist

Context: Summarize action items to stabilize, secure, and observe the system in production-like use.

10-point prompt:
1) Document backup/restore procedures for Sheets and SQLite dbs.
2) Add logging/alerting thresholds for failed submissions.
3) Enforce versioning for schema and exporters; tag releases.
4) Validate privacy posture; confirm no PII leaks in exports.
5) Add rate limiting/backoff guidance for clients.
6) Define recovery steps for Apps Script outages or quota hits.
7) Provide a stress test plan for large submission bursts.
8) Review dependency footprint; pin versions where applicable.
9) Add a periodic audit task to re-verify headers and schema drift.
10) Include a final sign-off checklist before public demos.

