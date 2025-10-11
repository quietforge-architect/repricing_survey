Task: Integration Map Blueprint (Mermaid Diagram)

Context: Document end-to-end wiring (Form → Apps Script → Sheets → Agents → CI/CD) with a diagram and brief text.

10-point prompt:
1) Create `docs/integration_map.md` with a high-level overview paragraph.
2) Include a Mermaid diagram showing all components and data flows.
3) Label trust boundaries and where credentials/config reside.
4) Note where logs and metrics are captured (Logs sheet, CI output).
5) Indicate optional branches (Drive sync, dashboard, LLM analysis).
6) Document key URLs (form host, `/exec` endpoint, GitHub repo).
7) Add a numbered flow describing the typical submission path.
8) Include a “What breaks most often” callout with fixes.
9) Keep the doc short and skimmable; link to deeper docs.
10) Validate diagram renders in common Markdown viewers.

