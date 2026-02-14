Task: Google Sheets Apps Script Collector (Basic)

Context: Connect the HTML survey form to a Google Apps Script endpoint that appends submissions to a Google Sheet.

10-point prompt:
1) Create a new Google Apps Script bound to the target Sheet and name it clearly.
2) Implement `doPost(e)` to read `e.parameter` and map fields to headers.
3) Ensure the first column is `Timestamp` and append the current time in ISO/local format.
4) Fetch headers from row 1 and build the row in that exact order.
5) If a field is missing in the request, insert an empty string to keep alignment.
6) Append the row to the first sheet (e.g., `Sheet1`) using `appendRow`.
7) Return a plain-text success response for quick browser testing.
8) Document the exact Web App deployment steps and permission settings.
9) Provide the final `/exec` URL to paste into the form `action` attribute.
10) Add brief test instructions to verify a row appears after submitting the form.

