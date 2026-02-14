Task: Polished Apps Script Collector (Auto-Headers, Errors, Logs)

Context: Ship a best-practice collector script with header sync, error handling, and a `Logs` tab.

10-point prompt:
1) Implement header bootstrap and extension when new fields appear.
2) Validate method and content type; return clear errors on mismatch.
3) Wrap critical operations in try/catch; capture error message and stack.
4) Create/find `Logs` sheet; append entries with timestamp, status, and summary.
5) Normalize multi-selects and long text; guard against formula injection.
6) Enforce a maximum field length to protect Sheets performance (truncate safely).
7) Append rows in header order with UTC timestamp.
8) Return JSON success and include appended row index for diagnostics.
9) Add inline deployment instructions and permission reminders.
10) Include a brief test checklist and rollback note in comments.

