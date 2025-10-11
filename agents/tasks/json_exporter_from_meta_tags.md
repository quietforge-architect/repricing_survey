Task: JSON Exporter From Meta-Tagged Form Data

Context: Build a script that reads stored submissions and emits normalized JSON using `data-*` meta keys.

10-point prompt:
1) Define a canonical field map sourced from the form meta schema (`data-key`).
2) Load raw submissions (CSV, Sheet API, or DB) into memory safely.
3) Normalize keys: prefer `data-key` names over display labels.
4) Coerce types for `numeric`, `ordinal`, and `multiselect` fields.
5) Strip control characters and trim whitespace consistently.
6) Produce per-response JSON and aggregate summaries in separate files.
7) Include a schema version and export timestamp in outputs.
8) Add a CLI with options: input source, output dir, fields include/exclude.
9) Validate output against a JSON Schema and fail fast on mismatches.
10) Provide sample outputs and a quick test to verify round-trip correctness.

