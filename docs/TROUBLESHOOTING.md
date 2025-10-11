# Quick Troubleshooting

- 404 or HTML shows an error: Recheck the Apps Script deployment URL and permissions. Ensure you used the `/exec` URL.
- Authorization required: Open the Web App URL in a browser, authorize once, then retry submission.
- No rows appearing: Check the `Logs` sheet; ensure sheet tab name matches `CONFIG.sheetName`.
- Header mismatches: The advanced collector auto-creates/extends headers. If you changed columns manually, redeploy and retry.
- CORS errors (external hosting): Post directly to Apps Script `/exec` or proxy via your own server; Apps Script JSON responses are simple text.
- Payload too large: Reduce long textarea content or split submissions; the script truncates fields by default.
- Rate/quota limits: Avoid burst testing; Apps Script quotas apply per account and script.
- Redeploy fixes: Deploy → Manage deployments → Edit → Save new version, then copy the updated `/exec` URL.

