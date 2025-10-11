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
