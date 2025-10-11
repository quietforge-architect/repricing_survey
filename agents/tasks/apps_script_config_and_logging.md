Task: Apps Script Config Section + Logging Tab

Context: Externalize settings and improve observability without editing core logic frequently.

10-point prompt:
1) Add a `CONFIG` object at top-level (sheet name, log sheet, required fields).
2) Read sheet names from `CONFIG` to avoid hardcoding.
3) Add a feature flag to enable/disable auto-header creation.
4) Add a feature flag for JSON vs text responses.
5) Validate required fields from `CONFIG.required` and return 400 if missing.
6) Initialize/create the `Logs` sheet based on `CONFIG.logsSheet`.
7) Implement a `log(status, message, meta)` helper to append logs.
8) Log both successes and failures with request size and key count.
9) Document how to change config safely post-deployment.
10) Include examples of typical `CONFIG` variants in comments.

