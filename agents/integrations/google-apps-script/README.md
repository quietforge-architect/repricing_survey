Google Apps Script Collector (Advanced)

Files
- collector_advanced.gs: Web App script to receive POSTs and append to a Google Sheet.
- host_form_example.html: Minimal example form to host within Apps Script or externally.

Deploy Steps
1) In Google Sheets: Extensions → Apps Script → New project.
2) Create a script file and paste `collector_advanced.gs` contents.
3) Rename sheet tab to `Responses` (or update CONFIG.sheetName in code).
4) File → Save. Then Deploy → New deployment → Web app.
   - Execute as: Me
   - Who has access: Anyone with the link (or your choice)
5) Copy the Web App URL ending with `/exec`.
6) In your HTML form, set `action="<that /exec URL>"` and `method="POST"`.

Notes
- The script auto-creates headers and a `Logs` sheet. New fields extend columns on the fly.
- Multi-selects are joined with `; ` and long text is truncated at ~5000 chars.
- Responses return JSON: `{ ok: true, appendedRow: N }` for easier debugging.

Troubleshooting
- If rows do not appear: check the `Logs` sheet for errors and confirm `/exec` URL matches your deployment.
- If you change sheet tab names, update CONFIG at the top of the script.

