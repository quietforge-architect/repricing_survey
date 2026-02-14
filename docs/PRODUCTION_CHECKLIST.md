# Production Hardening Checklist

- Data
  - [ ] Ensure DB backups are scheduled (db_manager.py backup or external)
  - [ ] Verify schema v2 tables exist and FKs enabled (PRAGMA foreign_keys=ON)
  - [ ] Confirm no PII appears in public/export/*.json (contact/email/phone excluded)
- Apps Script
  - [ ] Use a dedicated account/project; review access (Anyone vs domain-only)
  - [ ] Monitor Logs sheet for errors and payload sizes
  - [ ] Set quotas/alerts for unusual submission spikes
- Service
  - [ ] Enforce POST-only, size limits, and content-type checks
  - [ ] Add reverse-proxy rate limiting if public
  - [ ] Health endpoint monitored (/api/health)
- CI/CD
  - [ ] Validate schema & exports on every PR (spec_validate.js, validate-exports.js)
  - [ ] Upload artifacts; publish Pages (docs + optional exports) with manual toggle
- Operations
  - [ ] Runbooks for: Apps Script 403/404, quota exceeded, DB locked, JSON corruption
  - [ ] Rollback steps for Pages and schema changes
  - [ ] Periodic audit of headers and schema drift

