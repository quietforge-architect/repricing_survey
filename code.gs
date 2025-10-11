// === Google Apps Script: Webhook Collector ===
// -- repricer_survey_script.js --
// Logs each POST submission from the HTML form to the linked Sheet

function doPost(e) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("repricer_survey_responses"); // Change if your sheet tab has a different name
  const params = e.parameter;
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];

  // Build row data with a timestamp in the first column
  const row = [new Date()];

  // Fill in each column according to headers
  headers.slice(1).forEach(h => {
    row.push(params[h] || "");
  });

  // Append row to the sheet
  sheet.appendRow(row);

  // Respond to browser
  return ContentService
    .createTextOutput("✅ Success — data received and logged.")
    .setMimeType(ContentService.MimeType.TEXT);
}
