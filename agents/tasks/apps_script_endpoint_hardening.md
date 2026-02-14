Task: Harden Apps Script `/exec` Endpoint

Context: Make the public endpoint robust with validation, safe failures, and predictable responses.

10-point prompt:
1) Enforce POST-only; reject other verbs with 405 and guidance.
2) Check header row presence; create/extend headers when needed.
3) Sanitize inputs to prevent formula injection (prefix `'` if needed).
4) Limit max payload size and return 413 if exceeded.
5) Add per-field length caps with truncation and note in logs.
6) Normalize multi-value fields and strip control characters.
7) Use transactional-like flow: build row fully, then append once.
8) Return JSON with `ok`, `errors`, and `appendedRow` fields.
9) Emit structured logs with category and status codes.
10) Provide a simple client-side retry/backoff pattern in docs.

