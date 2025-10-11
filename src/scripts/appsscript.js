/**
 * Hardened Apps Script with staging + admin approval for public responses.
 * Flow:
 *  - Full raw responses -> PRIVATE_SHEET_NAME (Sheet1)
 *  - Sanitized candidate -> PUBLIC_STAGING_NAME with status 'pending'
 *  - Admin approves -> moves to PUBLIC_SHEET_NAME
 *
 * Admin actions require an ADMIN_KEY set in Script Properties (ScriptProperties).
 */

const PRIVATE_SHEET_NAME = 'Sheet1';
const PUBLIC_STAGING_NAME = 'PublicStaging';
const PUBLIC_SHEET_NAME = 'PublicResponses';

const PII_FIELDS = ['name', 'full_name', 'first_name', 'last_name', 'email', 'phone', 'phone_number', 'mobile', 'address', 'street', 'city', 'state', 'zip', 'zipcode', 'postal'];

function getAdminKey() {
  return PropertiesService.getScriptProperties().getProperty('ADMIN_KEY') || '';
}

function getCompanyAllowList() {
  const raw = PropertiesService.getScriptProperties().getProperty('COMPANY_ALLOWLIST') || '';
  return raw.split(',').map(s => s.trim()).filter(Boolean);
}

function ensureSheet(ss, name) {
  let sh = ss.getSheetByName(name);
  if (!sh) sh = ss.insertSheet(name);
  return sh;
}

function sanitizeValue(v) {
  if (!v) return '';
  v = String(v).trim();
  // redact emails and phones
  v = v.replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/ig, '<REDACTED>');
  v = v.replace(/\+?\d[\d\-\s\(\)]{6,}\d/g, '<REDACTED>');

  // redact PO Box and common street address patterns
  v = v.replace(/\b(PO Box|P\.O\. Box)\s*\d+\b/ig, '<REDACTED>');
  v = v.replace(/\b\d{1,5}\s+([A-Za-z0-9\.]{2,}\s?){1,6}\b(?:St(?:reet)?|Ave(?:nue)?|Blvd|Rd|Road|Lane|Ln|Drive|Dr|Court|Ct|Way|Terrace|Pl|Place)\b/ig, '<REDACTED>');

  // Company allow-list: if the value contains a trusted company token, keep it (but emails/phones already redacted)
  const allowList = getCompanyAllowList();
  for (let name of allowList) {
    if (!name) continue;
    const re = new RegExp('\\b' + escapeRegExp(name) + '\\b', 'i');
    if (re.test(v)) return v; // preserve value (phones/emails already redacted)
  }

  // Personal name heuristic (two capitalized words). Redact if likely personal name.
  v = v.replace(/\b([A-Z][a-z'`-]{1,30})\s+([A-Z][a-z'`-]{1,30})(?:\s+([A-Z][a-z'`-]{1,30}))?\b/g, function(m){
    if (m.length < 60) return '<REDACTED>';
    return m;
  });

  return v;
}

function escapeRegExp(s){
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function doPost(e) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const privateSh = ensureSheet(ss, PRIVATE_SHEET_NAME);
  const stagingSh = ensureSheet(ss, PUBLIC_STAGING_NAME);
  const params = e.parameter || {};

  // Ensure private headers exist. If sheet is empty, create headers from params.
  if (privateSh.getLastRow() < 1) {
    const headers = ['Timestamp'].concat(Object.keys(params));
    privateSh.appendRow(headers);
  }

  const privateHeaders = privateSh.getRange(1, 1, 1, privateSh.getLastColumn()).getValues()[0];
  const privateRow = [new Date()];
  // align values to headers
  privateHeaders.slice(1).forEach(h => privateRow.push(params[h] || ''));
  privateSh.appendRow(privateRow);

  // Build sanitized public candidate row (staging). Keep a stable header list
  const pubHeaders = ['pubId'].concat(privateHeaders.slice(1).filter(h => PII_FIELDS.indexOf(h.toLowerCase()) === -1));
  if (stagingSh.getLastRow() < 1) stagingSh.appendRow(pubHeaders.concat(['status','submittedAt']));

  const pubId = 'pub_' + Date.now();
  const publicRow = [pubId];
  privateHeaders.slice(1).forEach(h => {
    const lower = (h || '').toLowerCase();
    if (PII_FIELDS.indexOf(lower) !== -1) return; // skip PII fields entirely
    const raw = params[h] || '';
    publicRow.push(sanitizeValue(String(raw)));
  });
  publicRow.push('pending');
  publicRow.push(new Date());

  stagingSh.appendRow(publicRow);

  // Return JSON with pubId and pending=true
  const out = { success: true, pubId: pubId, pending: true };
  return ContentService.createTextOutput(JSON.stringify(out)).setMimeType(ContentService.MimeType.JSON);
}

function doGet(e) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const publicSh = ensureSheet(ss, PUBLIC_SHEET_NAME);
  const stagingSh = ensureSheet(ss, PUBLIC_STAGING_NAME);
  const params = e.parameter || {};

  // Admin actions (require ADMIN_KEY)
  const adminKey = getAdminKey();
  if (params.adminKey && adminKey && params.adminKey === adminKey) {
    const action = params.action || 'list';
    if (action === 'list') {
      // List pending staging entries with approve/reject links
      const data = stagingSh.getDataRange().getValues();
      const headers = data[0] || [];
      let html = '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Admin - Pending Public Responses</title><style>body{font-family:system-ui,Segoe UI,Arial;padding:1rem}table{width:100%;border-collapse:collapse}th,td{border:1px solid #ddd;padding:8px;text-align:left}</style></head><body>';
      html += '<h1>Pending public responses</h1>';
      html += '<table><thead><tr>' + headers.map(h => '<th>' + escapeHtml(h) + '</th>').join('') + '<th>actions</th></tr></thead><tbody>';
      for (let i = 1; i < data.length; i++) {
        const row = data[i];
        html += '<tr>' + row.map(c => '<td>' + escapeHtml(String(c).slice(0,200)) + '</td>').join('');
        const id = encodeURIComponent(row[0]);
        const approveLink = '?adminKey=' + encodeURIComponent(adminKey) + '&action=approve&pubId=' + id;
        const rejectLink = '?adminKey=' + encodeURIComponent(adminKey) + '&action=reject&pubId=' + id;
        html += '<td><a href="' + approveLink + '">Approve</a> | <a href="' + rejectLink + '">Reject</a></td></tr>';
      }
      html += '</tbody></table>';
      html += '<p><small>Approving will move the sanitized row to the public responses sheet.</small></p>';
      html += '</body></html>';
      return HtmlService.createHtmlOutput(html);
    }

    if (action === 'approve' && params.pubId) {
      const pubId = params.pubId;
      const moved = moveFromStagingToPublic(stagingSh, publicSh, pubId, { approvedBy: 'admin', approvedAt: new Date() });
      if (moved) return HtmlService.createHtmlOutput('<p>Approved and published: ' + escapeHtml(pubId) + '</p>');
      return HtmlService.createHtmlOutput('<p>Not found: ' + escapeHtml(pubId) + '</p>');
    }

    if (action === 'reject' && params.pubId) {
      const pubId = params.pubId;
      const removed = removeFromStaging(stagingSh, pubId);
      if (removed) return HtmlService.createHtmlOutput('<p>Rejected and removed: ' + escapeHtml(pubId) + '</p>');
      return HtmlService.createHtmlOutput('<p>Not found: ' + escapeHtml(pubId) + '</p>');
    }
  }

  // Public view: show a single public response if pubId provided, otherwise list recent public responses
  if (params.pubId) {
    const pubId = params.pubId;
    const data = publicSh.getDataRange().getValues();
    const headers = data[0] || [];
    let found = null;
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][0]) === pubId) { found = data[i]; break; }
    }
    if (!found) {
      return HtmlService.createHtmlOutput('<!doctype html><html><body><h2>Response not found</h2><p>The public response ID was not found or may have been removed.</p></body></html>');
    }
    let html = '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Public Response</title><style>body{font-family:system-ui,Segoe UI,Arial;padding:1rem;background:#f7f8fb}article{max-width:720px;margin:0 auto;background:#fff;padding:1rem;border-radius:8px;box-shadow:0 1px 6px rgba(0,0,0,0.06)}</style></head><body><article>';
    html += '<h1>Public response</h1>';
    html += '<dl>';
    for (let i = 0; i < headers.length; i++) {
      const k = headers[i];
      const v = found[i] || '';
      html += '<dt style="font-weight:700;margin-top:0.75rem">' + escapeHtml(k) + '</dt>';
      html += '<dd style="margin:0 0 0.75rem 0">' + escapeHtml(String(v)) + '</dd>';
    }
    html += '</dl>';
    html += '<p><small>This page shows an approved, sanitized copy of the submitted response. PII has been removed or redacted.</small></p>';
    html += '</article></body></html>';
    return HtmlService.createHtmlOutput(html);
  }

  // List recent public responses
  const data = publicSh.getDataRange().getValues();
  let html = '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Public responses</title><style>body{font-family:system-ui,Segoe UI,Arial;padding:1rem;background:#f7f8fb}article{max-width:840px;margin:0 auto;background:#fff;padding:1rem;border-radius:8px;box-shadow:0 1px 6px rgba(0,0,0,0.06)}</style></head><body><article>';
  html += '<h1>Recent public responses</h1>';
  html += '<ul>';
  for (let i = Math.max(1, data.length - 10); i < data.length; i++) {
    const row = data[i];
    const id = row[0];
    const summary = row[1] || row.slice(1,3).join(' - ');
    html += '<li><a href="?pubId=' + encodeURIComponent(id) + '">' + escapeHtml(String(summary).slice(0,80)) + '</a></li>';
  }
  html += '</ul>';
  html += '<p><small>Each item links to an approved, sanitized copy of the submission.</small></p>';
  html += '</article></body></html>';
  return HtmlService.createHtmlOutput(html);
}

function moveFromStagingToPublic(stagingSh, publicSh, pubId, meta) {
  const data = stagingSh.getDataRange().getValues();
  const headers = data[0] || [];
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === pubId) {
      const row = data[i].slice();
      // remove status and submittedAt if present (assume last two columns)
      const trimmed = row.slice(0, publicSh.getLastColumn() > 0 ? publicSh.getLastColumn() : row.length - 2);
      // Ensure public sheet has headers
      if (publicSh.getLastRow() < 1) publicSh.appendRow(headers.slice(0, trimmed.length));
      publicSh.appendRow(trimmed);
      // remove staging row
      stagingSh.deleteRow(i+0);
      return true;
    }
  }
  return false;
}

function removeFromStaging(stagingSh, pubId) {
  const data = stagingSh.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === pubId) { stagingSh.deleteRow(i+0); return true; }
  }
  return false;
}

function escapeHtml(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
