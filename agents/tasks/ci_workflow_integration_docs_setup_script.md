Task: CI Workflow + Integration Doc + Setup Script

Context: Add CI to validate artifacts and a script to bootstrap environment, with a doc explaining usage.

10-point prompt:
1) Create a GitHub Actions workflow to lint/validate JSON/YAML/SQL.
2) Add a step to run unit tests for exporters/loaders if present.
3) Cache dependencies to speed up CI (Node/Python as applicable).
4) Create `docs/integration.md` summarizing repos, secrets, and triggers.
5) Provide a `scripts/bootstrap_env.(ps1|sh)` to set up local dev quickly.
6) Document required secrets (if any) and where to store them.
7) Add status badges to README for CI results.
8) Include a CI artifact upload step for generated reports (optional).
9) Keep the workflow minimal and fast (<5 minutes typical).
10) Provide rollback instructions for disabling CI if needed.

