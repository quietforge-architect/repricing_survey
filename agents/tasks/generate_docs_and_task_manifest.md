Task: Generate /docs And agents/tasks/task_manifest.json

Context: Materialize documentation and a tasks manifest to track and discover task prompts.

10-point prompt:
1) Create `/docs/` with an index and links to major components.
2) Define `agents/tasks/task_manifest.json` listing each task file and title.
3) Include tags/categories (e.g., apps-script, db, docs) for discovery.
4) Store created/updated timestamps and brief descriptions.
5) Add a simple script to regenerate the manifest automatically.
6) Cross-link from README to the tasks manifest.
7) Ensure file paths are workspace-relative and clickable.
8) Validate JSON format in CI and pre-commit if used.
9) Provide a short guide on adding a new task file.
10) Keep descriptions concise (<= 200 chars per task).

