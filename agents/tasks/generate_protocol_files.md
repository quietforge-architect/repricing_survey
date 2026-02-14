Task: Generate Protocol Files (JSON/YAML/Logic)

Context: Convert the described protocol into concrete machine-readable files and minimal glue code.

10-point prompt:
1) Identify protocol domains (survey schema, pipelines, exporters) to formalize.
2) Create JSON/YAML specs for schemas and pipeline steps.
3) Provide reference examples with minimal valid content.
4) Add a small loader/validator to check specs for errors.
5) Document versioning and backward-compat rules in comments.
6) Include a test that validates all specs in the repo.
7) Cross-reference docs where these specs are consumed.
8) Keep files human-readable and diff-friendly.
9) Expose a simple CLI to print/validate the protocol (optional).
10) Add upgrade notes for future phases (e.g., CI integration hooks).

