Task: Host Form HTML in Apps Script

Context: Serve the survey directly from Apps Script (no external hosting) using `HtmlService`.

10-point prompt:
1) Create `index.html` in Apps Script with the finalized survey HTML and meta tags.
2) Replace hardcoded `action` with script-relative POST (to `/exec`).
3) Use `HtmlService.createHtmlOutputFromFile('index')` in `doGet`.
4) Include lightweight client validation and a visible success banner.
5) Load CSS inline or as separate HTML file include.
6) Add a footer with the deployment version and contact option.
7) Verify CORS is not required when hosted from Apps Script.
8) Document how to publish a new version and update the deployed URL.
9) Provide a rollback note: retain prior deployment version IDs.
10) Smoke test form submission end-to-end to confirm sheet append.

