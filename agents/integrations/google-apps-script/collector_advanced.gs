/**
 * Apps Script Web App Collector (Advanced)
 * - Auto-creates/extends headers
 * - Logs successes/errors to a Logs sheet
 * - Normalizes multi-select values and sanitizes inputs
 * - Returns JSON for easier debugging
 */

function doPost(e) {
  var start = new Date();
  var CONFIG = {
    sheetName: 'Responses',
    logsSheet: 'Logs',
    autoHeader: true,
    returnJson: true,
    required: [], // e.g., ['experience', 'sku_count']
    maxFieldLength: 5000,
    maxPayloadChars: 524288, // ~512 KB guardrail (characters, not exact bytes)
    // Optional mapping from incoming field names to canonical keys/column names
    // Example: { 'How_long': 'experience', 'features[]': 'features' }
    keyMap: {}
  };

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(CONFIG.sheetName) || ss.insertSheet(CONFIG.sheetName);
  var logs = ss.getSheetByName(CONFIG.logsSheet) || ss.insertSheet(CONFIG.logsSheet);

  ensureLogsHeader_(logs);

  try {
    if (!e) {
      return respond_(CONFIG, 400, { ok: false, error: 'No event payload' });
    }

    // Basic payload size guard (character length approximation)
    var raw = (e.postData && e.postData.contents) ? e.postData.contents : '';
    if (raw && raw.length > CONFIG.maxPayloadChars) {
      log_(logs, 'ERROR', 'Payload too large', { length: raw.length });
      return respond_(CONFIG, 413, { ok: false, error: 'Payload too large' });
    }

    // Use e.parameters to capture multi-value fields
    var paramMap = normalizeParams_(e.parameters, CONFIG);
    // Apply canonical key mapping if configured
    paramMap = mapParamKeys_(paramMap, CONFIG.keyMap);

    // Validate required fields
    var missing = CONFIG.required.filter(function (k) { return !(k in paramMap) || String(paramMap[k]).trim() === ''; });
    if (missing.length) {
      log_(logs, 'ERROR', 'Missing required fields', { missing: missing });
      return respond_(CONFIG, 400, { ok: false, error: 'Missing required fields', missing: missing });
    }

    // Headers handling
    var headers = getHeaders_(sheet);
    if (headers.length === 0 && CONFIG.autoHeader) {
      headers = bootstrapHeaders_(sheet, Object.keys(paramMap));
    }
    if (CONFIG.autoHeader) {
      headers = extendHeadersIfNeeded_(sheet, headers, Object.keys(paramMap));
    }

    // Build row in header order
    var row = buildRow_(headers, paramMap);
    sheet.appendRow(row);

    var durationMs = (new Date()).getTime() - start.getTime();
    log_(logs, 'OK', 'Appended row', { row: sheet.getLastRow(), keys: Object.keys(paramMap).length, ms: durationMs });
    return respond_(CONFIG, 200, { ok: true, appendedRow: sheet.getLastRow(), ms: durationMs });
  } catch (err) {
    log_(logs, 'ERROR', 'Unhandled exception', { message: String(err && err.message), stack: String(err && err.stack) });
    return respond_(CONFIG, 500, { ok: false, error: 'Server error' });
  }
}

function doGet() {
  // Simple health endpoint
  return ContentService.createTextOutput('OK');
}

// Helpers

function ensureLogsHeader_(logs) {
  if (logs.getLastRow() === 0) {
    logs.appendRow(['Timestamp', 'Status', 'Message', 'Meta']);
  }
}

function log_(logs, status, message, meta) {
  var metaStr = '';
  try {
    metaStr = meta ? JSON.stringify(meta) : '';
    if (metaStr.length > 50000) metaStr = metaStr.slice(0, 50000);
  } catch (_) { metaStr = ''; }
  logs.appendRow([new Date(), status, message, metaStr]);
}

function getHeaders_(sheet) {
  var lastCol = sheet.getLastColumn();
  if (lastCol < 1) return [];
  var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(String);
  // Normalize first column as Timestamp if empty
  if (headers.length && headers[0].trim() === '') {
    headers[0] = 'Timestamp';
    sheet.getRange(1, 1).setValue('Timestamp');
  }
  return headers;
}

function bootstrapHeaders_(sheet, keys) {
  var unique = dedupe_(keys);
  var headers = ['Timestamp'].concat(unique);
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  return headers;
}

function extendHeadersIfNeeded_(sheet, headers, keys) {
  var set = {};
  for (var i = 0; i < headers.length; i++) set[headers[i]] = true;
  var toAdd = [];
  for (var j = 0; j < keys.length; j++) {
    var k = keys[j];
    if (!set[k] && k !== 'Timestamp') toAdd.push(k);
  }
  if (toAdd.length) {
    var newHeaders = headers.concat(toAdd);
    sheet.getRange(1, 1, 1, newHeaders.length).setValues([newHeaders]);
    return newHeaders;
  }
  return headers;
}

function buildRow_(headers, paramMap) {
  var row = new Array(headers.length);
  for (var i = 0; i < headers.length; i++) {
    if (i === 0) {
      row[i] = new Date();
    } else {
      var h = headers[i];
      var v = paramMap.hasOwnProperty(h) ? String(paramMap[h]) : '';
      row[i] = sanitizeCell_(v);
    }
  }
  return row;
}

function sanitizeCell_(value) {
  // Prevent formula injection by prefixing a single quote when necessary
  var dangerous = /^(=|\+|-|@)/;
  if (dangerous.test(value)) {
    return "'" + value;
  }
  // Strip control characters except tab/newline/carriage return
  return value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '');
}

function normalizeParams_(parameters, CONFIG) {
  var out = {};
  if (!parameters) return out;
  var keys = Object.keys(parameters);
  for (var i = 0; i < keys.length; i++) {
    var key = keys[i];
    var val = parameters[key]; // array for multi-select
    var joined;
    if (Array.isArray(val)) {
      joined = val.join('; ');
    } else if (val && typeof val.map === 'function' && typeof val.join === 'function') {
      // GAS sometimes produces array-like objects
      joined = val.join('; ');
    } else {
      joined = String(val);
    }
    if (joined.length > CONFIG.maxFieldLength) {
      joined = joined.slice(0, CONFIG.maxFieldLength);
    }
    out[key] = joined;
  }
  return out;
}

function mapParamKeys_(paramMap, keyMap) {
  if (!keyMap) return paramMap;
  var out = {};
  var keys = Object.keys(paramMap);
  for (var i = 0; i < keys.length; i++) {
    var k = keys[i];
    var target = keyMap.hasOwnProperty(k) ? keyMap[k] : k;
    // Merge arrays when multiple fields map to the same target
    if (out.hasOwnProperty(target)) {
      var a = out[target];
      var b = paramMap[k];
      if (a && b) out[target] = [a, b].join('; ');
      else out[target] = a || b || '';
    } else {
      out[target] = paramMap[k];
    }
  }
  return out;
}

function dedupe_(arr) {
  var seen = {};
  var out = [];
  for (var i = 0; i < arr.length; i++) {
    var k = String(arr[i]);
    if (!seen[k]) { seen[k] = true; out.push(k); }
  }
  return out;
}

function respond_(CONFIG, code, obj) {
  var text = CONFIG.returnJson ? JSON.stringify(obj) : String(obj && obj.message || '');
  // ContentService cannot set HTTP status codes for Web Apps; embed code in JSON.
  return ContentService.createTextOutput(text).setMimeType(CONFIG.returnJson ? ContentService.MimeType.JSON : ContentService.MimeType.TEXT);
}
