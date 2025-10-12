/**
 * Web App host for the survey (GET serves HTML; POST handled by collector).
 * If used in the same project as the collector, actionUrl will point to this /exec.
 */
function doGet(e) {
  var t = HtmlService.createTemplateFromFile('Index');
  t.actionUrl = ScriptApp.getService().getUrl();
  return t.evaluate()
    .setTitle('Amazon Repricing Feedback Survey')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

