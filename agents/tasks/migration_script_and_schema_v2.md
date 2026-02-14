Task: Migration Script + Schema v2 (Normalized)

Context: Move from a denormalized cache to a relational model with response values and strong FKs.

10-point prompt:
1) Write `schema_v2.sql` with respondents, responses, response_values, surveys, questions.
2) Add indices for common joins (response_id, question_id, respondent_hash).
3) Create `migrate_v1_to_v2.py` to read legacy tables and populate v2.
4) Generate respondent hashes (no PII) to correlate responses safely.
5) Preserve original timestamps and any source metadata.
6) Validate counts match before/after; log migration summary.
7) Back up the database before migration; provide rollback notes.
8) Add unit tests for a small fixture DB migration.
9) Update exporters to read from v2 views/tables.
10) Document the rationale and how to extend new question types.

