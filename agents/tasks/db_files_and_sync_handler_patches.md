Task: DB Layer Files + sync_handler Patches

Context: Add SQLite schema and handler updates to persist submissions and support exports.

10-point prompt:
1) Define base schema SQL (responses, respondents, response_values, surveys, questions).
2) Add a migration script to create missing tables/indexes idempotently.
3) Implement `sync_handler.py` changes to write normalized rows.
4) Add safe upserts and foreign key enforcement.
5) Provide bulk import utilities for historical CSV/JSON.
6) Implement an export view or query for analysis dashboards.
7) Add minimal unit tests for FK integrity and basic CRUD.
8) Provide a README for schema and common queries.
9) Ensure no PII is stored; use hashes for respondent correlation.
10) Include a sample dataset and a smoke test script.

