# repricing_survey
# 🦖 Amazon Repricing Feedback Survey

A lightweight, privacy-friendly feedback form designed for Amazon sellers to share insights on repricing tools and Keepa usage.  
Built for local-first data collection and easy integration with Google Sheets — no backend server required.

---

## 📦 Overview

This project is a **static HTML survey** that sends form responses directly to a **Google Sheets endpoint** via **Google Apps Script**.  
It’s perfect for gathering structured, anonymized seller feedback to inform repricer or data-model development.

---

## 🧩 Architecture

```plaintext
survey.html (frontend form)
     ↓  POST request
Google Apps Script (doPost handler)
     ↓
Google Sheet (data storage)
```

- **Frontend:** Pure HTML, CSS, JavaScript (mobile-optimized)
- **Backend:** Google Apps Script (public Web App endpoint)
- **Storage:** Google Sheets (auto-logging, timestamped entries)
- **Persistence:** Client-side localStorage (users don’t lose progress)

---

## 🚀 Quick Start

### 1️⃣ Clone or Download
```bash
git clone https://github.com/QuietForgeDev/amazon-repricing-survey.git
cd amazon-repricing-survey
```

or simply download `survey.html` if you’re not using Git.

---

### 2️⃣ Create the Google Sheet

1. In Google Drive → **New → Google Sheets**
2. Name it `Amazon_Repricing_Feedback_Responses`
3. Paste this into the first row (A1):
   ```text
   Timestamp	experience	sku_count	model	repricer	keepa	satisfaction	painpoint	glitch	glitch_details	ai_used	ai_improvement	trust_ai	trust_ai_reason	missing_data	trust_features	local_tool	privacy	anon_data	feature_request	monitoring	contact
   ```
   *(Each word separated by tabs — it will auto-expand into columns.)*

---

### 3️⃣ Set Up Google Apps Script

#### a. Open Script Editor
**Extensions → Apps Script**

#### b. Paste This Code
```javascript
function doPost(e) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Sheet1");
  const params = e.parameter;
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const row = [new Date()];
  headers.slice(1).forEach(h => row.push(params[h] || ""));
  sheet.appendRow(row);
  return ContentService.createTextOutput("✅ Success").setMimeType(ContentService.MimeType.TEXT);
}
```

#### c. Save & Deploy
- **Deploy → New deployment → Web app**
  - **Execute as:** Me (your account)
  - **Who has access:** Anyone with the link
- Copy your **Web App URL** (should end in `/exec`).

---

### 4️⃣ Connect Your HTML Form

In `survey.html`, update the form action:

```html
<form id="surveyForm" action="https://script.google.com/macros/s/AKfycbYourUniqueID/exec" method="POST">
```

Save the file.

---

### 5️⃣ Host the Form

#### 🪶 Option A — Netlify (recommended)
1. Visit [https://app.netlify.com/drop](https://app.netlify.com/drop)
2. Drag and drop `survey.html`
3. You’ll instantly get a live URL like `https://your-survey.netlify.app`

#### 💾 Option B — GitHub Pages
1. Commit `survey.html` to a repo  
2. Go to **Settings → Pages → Branch = main → Save**  
3. Get your public URL: `https://username.github.io/repo-name/`

#### 🧠 Option C — Google Hosting
If you want everything inside Google:
1. Create a new Apps Script project
2. Add:
   ```javascript
   function doGet() {
     return HtmlService.createHtmlOutputFromFile('Index');
   }
   ```
3. Create `Index.html` (paste survey HTML)
4. Deploy → Web app → Anyone with link

---

## 💡 Features

| Feature | Description |
|----------|-------------|
| **Offline resilience** | Form progress autosaves to `localStorage` |
| **Direct-to-Sheet pipeline** | No middleware required |
| **Mobile-friendly UI** | Designed for quick use at events |
| **Anonymous-friendly** | No login or cookies |
| **Expandable schema** | Add new fields easily (just add matching column headers) |

---

## 🧰 Config & Maintenance

### ⚙️ Apps Script Settings
| Setting | Recommended |
|----------|--------------|
| Execute as | *Me (your account)* |
| Access | *Anyone with the link* |
| Sheet name | “Sheet1” or your tab name |
| Endpoint | Always use `/exec` (not `/dev`) |

### 🧼 Re-deploying After Edits
If you change your script:
> **Deploy → Manage deployments → Edit (pencil icon) → Update version**

This keeps your `/exec` link active and updated.

---

## 🧠 Developer Notes

- The form saves progress on every keystroke; throttling prevents lag.  
- Scripts use ARIA live regions for accessibility and mobile usability.  
- The Sheet automatically timestamps new entries in column A.

---

## 🧱 Future Enhancements

- [ ] Add automatic header creation in Apps Script  
- [ ] Add optional logging sheet for debugging  
- [ ] Integrate visualization dashboard via Looker Studio  
- [ ] Add multilingual support  

---

## 🧩 Quick Troubleshooting

| Error / Symptom | Likely Cause | Solution |
|------------------|--------------|-----------|
| **404: URL not found** | You’re using the `/dev` endpoint instead of `/exec`. | Re-deploy → use the URL ending in `/exec` |
| **403: Access denied** | “Who has access” not set to “Anyone.” | Redeploy with **Anyone with the link** access |
| **No rows appear in Sheet** | Incorrect tab name (e.g., not “Sheet1”). | Update your script’s `getSheetByName("YourTabName")` |

## Docker / Local verification (optional)

If you want to verify Node in a clean container or on your local machine, this repo includes two helper PowerShell scripts in `scripts/`:

- `scripts/verify-node-docker.ps1` — uses Docker to pull `node:22-alpine` and prints `node -v` and `npm -v` from inside the container. Requires Docker Desktop (Windows).
- `scripts/verify-node-local.ps1` — checks `node -v` and `npm -v` on your local machine and writes a small report to `.reports/`.

Run these in PowerShell (from the repo root):

```powershell
# Docker-based check (requires Docker Desktop)
.\scripts\verify-node-docker.ps1

# Local check (requires node in PATH)
.\scripts\verify-node-local.ps1
```

If `docker` is not recognized, install Docker Desktop for Windows and follow the post-install steps to enable the CLI and WSL2 integration: https://www.docker.com/get-started

If you prefer not to use Docker, install Node with nvm-windows: https://github.com/coreybutler/nvm-windows

## Developer setup (Windows)

This repository includes a unified PowerShell setup that configures your shell, installs global CLIs, and shares Playwright browser binaries across users.

- Machine-wide (admin):

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\enable-dev-shell.ps1 -MachineWide
```

- User-only:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\enable-dev-shell.ps1
```

- Install repo dependencies and Playwright browsers (idempotent):

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\install-all-deps.ps1
```

Helpers live under `tools/`:

- `tools/markitdown-mcp.js` – MCP wrapper for Markitdown (falls back to stub)
- `tools/markitdown-mcp-stub.js` – local stub
- `tools/playwright-check.js` – headless Chromium sanity check

The shared Playwright browsers path is set to `C:\\ProgramData\\ms-playwright` so all repos/users reuse the same downloads.

If you encounter PowerShell errors referencing `code --locate-shell-integration-path`, your `$PROFILE` is trying to call the VS Code CLI. The unified script will comment out that line when `code` isn’t in PATH.

## 🧪 Quick tests

- Playwright headless sanity:

```powershell
node .\tools\playwright-check.js
```

- MCP helpers:

```powershell
npm run mcp:playwright
npm run mcp:notion -- --help
npm run mcp:markitdown -- --help
```

## Admin & public publishing (hardened workflow)

This project includes an admin approval workflow to safely publish sanitized responses. Setup steps:

1. Open the Apps Script editor for the deployed project (Extensions → Apps Script).
2. Go to **Project Settings → Script properties** and add the following keys:
   - `ADMIN_KEY` — a random secret string used to access admin actions.
   - `COMPANY_ALLOWLIST` — optional comma-separated company names to preserve (e.g. `Quiet Forge,Acme Inc`).
3. Deploy as Web App (Execute as: Me; Access: Anyone with the link).

Admin interface usage:

- List pending staging entries:
  - Visit: `https://script.google.com/macros/s/AKfycbYourUniqueID/exec?adminKey=YOUR_ADMIN_KEY`
- Approve an entry:
  - Visit: `https://script.google.com/macros/s/AKfycbYourUniqueID/exec?adminKey=YOUR_ADMIN_KEY&action=approve&pubId=pub_...`
- Reject an entry:
  - Visit: `https://script.google.com/macros/s/AKfycbYourUniqueID/exec?adminKey=YOUR_ADMIN_KEY&action=reject&pubId=pub_...`

When approved, the sanitized row moves from `PublicStaging` to `PublicResponses` and becomes visible to the public view.

## Local SQLite service (optional)

If you prefer a local-first workflow or want to run a lightweight local server for development, a small Express + SQLite service is included at `agents/logic/sqlite-service`.

Quick start (from the repo root):

```powershell
# Install dependencies for the sqlite service
cd agents/logic/sqlite-service
npm install express better-sqlite3 body-parser dotenv

# Initialize the DB
npm run init-db

# Start the service
npm start

# (Alternatively from repo root if you prefer) 
cd ../../../
npm run sqlite-service:start
```

Configuration:
- Copy `.env.example` to `.env` inside `agents/logic/sqlite-service` and edit `DB_PATH`, `PORT`, and `COMPANY_ALLOWLIST` as needed.
- Point `SURVEY_ENDPOINT` in `survey.html` to `http://localhost:3001/submit` for local testing.

The service exposes:
- `POST /submit` — accept submissions (saves raw + sanitized payload, status "pending").
- `GET /public` — list approved sanitized entries (JSON).
- `GET /approve/:id` — mark submission as approved (manual step for now).

| **“Authorization required” popup** | Script not yet authorized. | Open the script → Run any function → Grant permissions |
| **Duplicate submissions** | User refreshed after submission. | Add `form.reset()` and success alert (included in code) |
| **Data mismatched to columns** | Sheet headers don’t match HTML `name=` fields. | Adjust headers or HTML names for exact match |
| **“CORS” error (rare)** | Some browsers block POST from `file://` URLs. | Host on Netlify or GitHub Pages — not opened from disk |
| **Old data persisting** | localStorage not cleared after submission. | Confirm `localStorage.removeItem('surveyFormData')` in code |
| **Still no data?** | Wrong endpoint or unapproved permissions. | Check **Apps Script → Executions** for error logs |

---

## 🪪 License
MIT License — free to use, modify, and share.  
Copyright © 2025  
**Quiet Forge Development Studio**
