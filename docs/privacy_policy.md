# Privacy & Data Handling Policy (Survey)

Scope
- Applies to survey responses collected via the survey form, Apps Script collector, local collector, and SQLite store.

Collection
- We collect only the fields present in the public survey form.
- Contact fields are optional and are excluded from public exports.

Processing
- Apps Script appends raw submissions to a private Google Sheet under your account.
- The local collector writes CSV/JSONL to your machine only.
- The SQLite service stores sanitized payloads; approval is required to expose rows via the public endpoint.

Exports
- The safe exporters (CSV->JSON and DB->JSON) exclude likely PII fields such as `contact`, `email`, and `phone`.
- Aggregates are computed without exposing individual identities.

Retention
- Raw data lives in Google Sheets and/or local files until manually deleted.
- Public exports (`public/export/`) contain only safe aggregates and filtered responses.

Consent
- The survey copy should state that responses may be used anonymously to improve tools and research; opt-in for further contact is optional.

Security
- Keep Apps Script URLs private unless you intend public collection.
- Store `.env` secrets locally (never commit credentials).

Contact
- For questions or deletion requests related to this project’s data handling, contact the repository owner.

