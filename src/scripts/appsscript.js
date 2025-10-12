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

function adminSessionCache() {
  return CacheService.getScriptCache();
}

function adminCacheKey(token) {
  return 'admin_session_' + token;
}

function createAdminSession() {
  const token = Utilities.getUuid();
  adminSessionCache().put(adminCacheKey(token), '1', 600);
  return token;
}

function validateAdminSession(token) {
  if (!token) return false;
  const cache = adminSessionCache();
  const key = adminCacheKey(token);
  const value = cache.get(key);
  if (value) {
    cache.put(key, '1', 600);
    return true;
  }
  return false;
}

function destroyAdminSession(token) {
  if (!token) return;
  adminSessionCache().remove(adminCacheKey(token));
}

function renderAdminLogin(message) {
  let html = '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">';
  html += '<title>Admin Sign-In</title><style>body{font-family:system-ui,Segoe UI,Arial;background:#f4f6fb;margin:0;padding:2rem;color:#1f2933}main{max-width:480px;margin:0 auto;background:#fff;padding:2rem;border-radius:12px;box-shadow:0 1px 8px rgba(15,23,42,0.12)}label{display:block;margin-top:1.5rem;font-weight:600}input[type=password]{width:100%;padding:0.75rem;border:1px solid #cbd2d9;border-radius:8px;font-size:1rem;margin-top:0.5rem}button{margin-top:1.5rem;background:#2563eb;color:#fff;border:none;border-radius:8px;padding:0.8rem 1.5rem;font-size:1rem;cursor:pointer}button:hover{background:#1d4ed8}.flash{background:#fee2e2;color:#b91c1c;padding:0.75rem 1rem;border-radius:8px;margin-top:1rem}p.note{color:#52606d;font-size:0.9rem;margin-top:1rem}</style></head><body><main>';
  html += '<h1 style="margin-top:0;">Admin Sign-In</h1>';
  if (message) {
    html += '<div class="flash">' + escapeHtml(message) + '</div>';
  }
  html += '<form method="post"><input type="hidden" name="adminAction" value="login">';
  html += '<label for="adminKey">Admin key<input id="adminKey" name="adminKey" type="password" required autocomplete="current-password"></label>';
  html += '<button type="submit">Sign in</button></form>';
  html += '<p class="note">Enter the ADMIN_KEY stored in Script Properties to review pending public responses.</p>';
  html += '</main></body></html>';
  return HtmlService.createHtmlOutput(html);
}

function renderAdminList(stagingSh, sessionToken, message) {
  const data = stagingSh.getDataRange().getValues();
  const headers = data[0] || [];
  let html = '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">';
  html += '<title>Pending Public Responses</title><style>body{font-family:system-ui,Segoe UI,Arial;background:#eef2f7;margin:0;padding:2rem;color:#1f2937}main{max-width:960px;margin:0 auto;background:#fff;padding:2rem;border-radius:14px;box-shadow:0 1px 12px rgba(15,23,42,0.12)}table{width:100%;border-collapse:collapse;margin-top:1.5rem}th,td{border:1px solid #e2e8f0;padding:0.65rem;text-align:left;font-size:0.95rem}th{background:#f8fafc;font-weight:600}td.actions form{display:inline-block;margin-right:0.5rem}td.actions button{background:#2563eb;color:#fff;border:none;border-radius:6px;padding:0.4rem 0.9rem;font-size:0.9rem;cursor:pointer}td.actions button.reject{background:#ef4444}td.actions button:hover{opacity:0.9}.toolbar{display:flex;gap:0.75rem;flex-wrap:wrap;margin-top:1rem}.toolbar form{display:inline}.toolbar button{background:#475569;color:#fff;border:none;border-radius:8px;padding:0.55rem 1.1rem;font-size:0.9rem;cursor:pointer}.toolbar button.logout{background:#0f172a}.empty{padding:1.5rem;background:#f8fafc;border-radius:10px;margin-top:1.5rem;color:#475569}.flash{background:#dcfce7;color:#166534;padding:0.75rem 1rem;border-radius:8px;margin-top:1rem}</style></head><body><main>';
  html += '<h1 style="margin-top:0;">Pending public responses</h1>';
  if (message) {
    html += '<div class="flash">' + escapeHtml(message) + '</div>';
  }
  html += '<div class="toolbar">';
  html += '<form method="post"><input type="hidden" name="adminAction" value="list"><input type="hidden" name="sessionToken" value="' + escapeHtml(sessionToken) + '"><button type="submit">Refresh</button></form>';
  html += '<form method="post"><input type="hidden" name="adminAction" value="logout"><input type="hidden" name="sessionToken" value="' + escapeHtml(sessionToken) + '"><button class="logout" type="submit">Sign out</button></form>';
  html += '</div>';
  if (data.length <= 1) {
    html += '<div class="empty">No responses are waiting for approval.</div>';
  } else {
    html += '<table><thead><tr>';
    headers.forEach(function(h){ html += '<th>' + escapeHtml(String(h || '')) + '</th>'; });
    html += '<th>Actions</th></tr></thead><tbody>';
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      html += '<tr>';
      headers.forEach(function(_, idx){
        const value = row[idx] == null ? '' : String(row[idx]);
        html += '<td>' + escapeHtml(value) + '</td>';
      });
      const pubId = String(row[0] || '');
      html += '<td class="actions">';
      html += '<form method="post"><input type="hidden" name="adminAction" value="approve"><input type="hidden" name="sessionToken" value="' + escapeHtml(sessionToken) + '"><input type="hidden" name="pubId" value="' + escapeHtml(pubId) + '"><button type="submit">Approve</button></form>';
      html += '<form method="post"><input type="hidden" name="adminAction" value="reject"><input type="hidden" name="sessionToken" value="' + escapeHtml(sessionToken) + '"><input type="hidden" name="pubId" value="' + escapeHtml(pubId) + '"><button class="reject" type="submit">Reject</button></form>';
      html += '</td></tr>';
    }
    html += '</tbody></table>';
  }
  html += '<p style="margin-top:2rem;font-size:0.9rem;color:#475569">Session expires after 10 minutes of inactivity. Sign in again to refresh access.</p>';
  html += '</main></body></html>';
  return HtmlService.createHtmlOutput(html);
}

function doPost(e) {
  const params = (e && e.parameter) || {};
  if (params.adminAction) {
    return handleAdminPost(e);
  }
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const privateSh = ensureSheet(ss, PRIVATE_SHEET_NAME);
  const stagingSh = ensureSheet(ss, PUBLIC_STAGING_NAME);

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

function handleAdminPost(e) {
  const params = e.parameter || {};
  const action = String(params.adminAction || '').toLowerCase();
  const adminKey = getAdminKey();
  if (!adminKey) {
    return renderAdminLogin('Admin key not configured. Set ADMIN_KEY in Script Properties.');
  }
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const stagingSh = ensureSheet(ss, PUBLIC_STAGING_NAME);
  const publicSh = ensureSheet(ss, PUBLIC_SHEET_NAME);

  if (action === 'logout') {
    destroyAdminSession(params.sessionToken || '');
    return renderAdminLogin('Signed out.');
  }

  if (action === 'login') {
    if (params.adminKey && params.adminKey === adminKey) {
      const sessionToken = createAdminSession();
      return renderAdminList(stagingSh, sessionToken, 'Signed in successfully.');
    }
    return renderAdminLogin('Invalid admin key.');
  }

  if (action === 'list') {
    const sessionToken = params.sessionToken || '';
    if (sessionToken && validateAdminSession(sessionToken)) {
      return renderAdminList(stagingSh, sessionToken);
    }
    if (params.adminKey && params.adminKey === adminKey) {
      const sessionTokenFresh = createAdminSession();
      return renderAdminList(stagingSh, sessionTokenFresh);
    }
    return renderAdminLogin('Session expired. Please sign in again.');
  }

  if (action === 'approve' && params.pubId) {
    const sessionToken = params.sessionToken || '';
    if (!validateAdminSession(sessionToken)) {
      return renderAdminLogin('Session expired. Please sign in again.');
    }
    const pubId = params.pubId;
    const moved = moveFromStagingToPublic(stagingSh, publicSh, pubId, { approvedBy: 'admin', approvedAt: new Date() });
    const message = moved ? 'Approved and published: ' + pubId : 'Not found: ' + pubId;
    return renderAdminList(stagingSh, sessionToken, message);
  }

  if (action === 'reject' && params.pubId) {
    const sessionToken = params.sessionToken || '';
    if (!validateAdminSession(sessionToken)) {
      return renderAdminLogin('Session expired. Please sign in again.');
    }
    const pubId = params.pubId;
    const removed = removeFromStaging(stagingSh, pubId);
    const message = removed ? 'Rejected and removed: ' + pubId : 'Not found: ' + pubId;
    return renderAdminList(stagingSh, sessionToken, message);
  }

  const sessionToken = params.sessionToken || '';
  if (sessionToken && validateAdminSession(sessionToken)) {
    return renderAdminList(stagingSh, sessionToken);
  }
  return renderAdminLogin();
}

function doGet(e) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const publicSh = ensureSheet(ss, PUBLIC_SHEET_NAME);
  const stagingSh = ensureSheet(ss, PUBLIC_STAGING_NAME);
  const params = e.parameter || {};

  if ((params.view || '').toLowerCase() === 'admin' || params.admin === '1') {
    return renderAdminLogin();
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
