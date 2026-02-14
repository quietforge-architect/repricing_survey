Task: Apps Script Collector (Advanced: Auto-Headers + Error Handling)

Context: Harden the collector with automatic header synchronization and robust request handling.

10-point prompt:
1) Detect an empty sheet and auto-create headers from `Object.keys(e.parameter)`.
2) If headers exist, ensure new keys are added as new trailing columns.
3) Validate method = POST; reject others with a clear 405 response.
4) Validate required fields (if any) and return 400 with a helpful message.
5) Add try/catch around parsing/append operations; log stack traces.
6) Implement a `Logs` sheet with timestamp, status, and error details.
7) Sanitize excessively long input to prevent sheet performance issues.
8) Ensure consistent column order using the current header row as truth.
9) Return structured JSON: `{ ok: true, appendedRow: N }` on success.
10) Document deployment settings and minimal rollback guidance in comments.

