Task: Apps Script Collector (Meta-Tagged Fields)

Context: Wire the form to Sheets using `data-key` as canonical column names; align columns to meta schema.

10-point prompt:
1) Parse `e.parameter` and build a normalized map keyed by form field names.
2) Maintain a header list matching the meta `data-key` order when possible.
3) On first run, create headers from the meta schema if the sheet is empty.
4) Insert `Timestamp` as the first column followed by meta-ordered fields.
5) For multi-select inputs, join values using a safe delimiter (e.g., `; `).
6) Coerce numeric/ordinal fields to string for consistent storage; avoid form crashes.
7) Append rows atomically and handle empty/missing keys gracefully.
8) Return JSON or text success responses for easier client debugging.
9) Document how to evolve the meta schema without breaking historical rows.
10) Provide a sample submission payload and an expected row example.

