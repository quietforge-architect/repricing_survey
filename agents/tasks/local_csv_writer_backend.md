Task: Local CSV Writer Backend (No External Services)

Context: Capture survey submissions locally (offline) by posting to a lightweight local server that appends to CSV/JSON files.

10-point prompt:
1) Scaffold a minimal local server (Node/Express or Python/Flask) listening on `/submit`.
2) Accept `application/x-www-form-urlencoded` and `application/json` bodies.
3) Normalize keys to match the form `name` attributes and meta `data-key` where available.
4) On first run, create a CSV with headers from a provided header list or request keys.
5) Append each submission as a new row; ensure consistent column order.
6) Also store a JSON lines file (`.jsonl`) for lossless raw archiving.
7) Add basic input validation and a 400 response on malformed payloads.
8) Return a simple success message compatible with HTML `<form action>` posting.
9) Provide a script to start/stop the server and a README snippet for usage.
10) Include a quick test plan: send a sample POST and verify CSV/JSON append.

