Task: Safe-Public Pipeline vs Privacy Documentation

Context: Choose between building automation for safe public data exports or drafting formal privacy/disclaimer docs.

10-point prompt:
1) Define the safe-public export scope (aggregate only; no PII).
2) Implement/export script to generate public JSON safely.
3) Add config to toggle fields/categories included in exports.
4) Include unit tests verifying redaction/aggregation rules.
5) Draft `docs/privacy_policy.md` aligning with data handling.
6) Draft a short data-sharing disclaimer for the survey.
7) Link policy/disclaimer from form footer and README.
8) Provide a manual review checklist before publishing data.
9) Add CI validation for export output schema.
10) Document rollback steps for removing public data quickly.

