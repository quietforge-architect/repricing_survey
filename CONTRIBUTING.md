# Contributing to Amazon Repricing Survey

## Getting Started
- Fork and clone the repo.
- All code and docs should follow the folder structure in README.md.
- Use feature branches for changes; submit PRs to main.

## Testing
- Open `src/html/survey.html` locally or host via Netlify/GitHub Pages.
- Confirm form submits to your Apps Script endpoint and logs to Google Sheets.
- Validate new fields by updating both the HTML and `docs/field_reference.md`.

## Deployment
- After updating `appsscript.js`, re-deploy as a Web App and update the `/exec` URL in `survey.html`.
- Use the troubleshooting section in README.md for common errors.

## Documentation
- Update `docs/architecture.md` and `docs/field_reference.md` for any schema changes.
- Add meeting notes to `agents/chat/conversation_logs.md`.

## Code Style
- Use clear, semantic HTML and modular JS.
- Comment config and logic sections for agent compatibility.

## Contact
- Open issues for bugs or feature requests.
