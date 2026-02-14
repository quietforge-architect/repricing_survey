# Amazon Repricing Survey

A lightweight, privacy-conscious feedback survey designed for independent and full-time Amazon booksellers.  
The project delivers a 20-question, four-page experience with humor-forward copy, offline resilience, and multiple deployment targets (static hosting, GitHub Pages, or a hardened Python API).

---

## What’s Inside

- **Survey flow:** 20 prompts split across four themed pages (bookseller basics, workflow, experiments, wishlist).
- **Offline bundle:** `npm run build:offline` produces `dist/` with service worker, manifest, and a QR splash card. The QR code defaults to `https://quietforgedev.github.io/amazon-repricing-survey/` unless you override `SURVEY_URL`.
- **Local-first API:** Optional Flask/Express hybrid service (`agents/logic/sqlite-service`) stores submissions, redacts PII, and exposes admin-only summary endpoints.
- **Admin tooling:** Google Apps Script workflow with staging + approval, plus local Playwright runs for regression testing.
- **Spell-check alignment:** `cspell.json` separates Amazon domain terms from engineering jargon so editors stop flagging niche vocabulary.

---

## Repository Tour

| Path                               | Purpose                                                       |
|------------------------------------|---------------------------------------------------------------|
| `survey/`                          | Production HTML/CSS/JS (multi-page survey)                    |
| `tools/build-offline-survey.js`    | Offline bundle + QR generator (guards against localhost URLs) |
| `schema/survey_questions.yaml`     | Canonical question bank (source for generated schemas)        |
| `docs/field_reference.md`          | Human-readable field dictionary (kept in sync with the YAML)  |
| `agents/logic/sqlite-service/`     | Optional API (Flask + better-sqlite3)                         |
| `docs/legacy/`                     | Archived v1 question bank and references                      |
| `cspell.json`                      | Repository-wide dictionary configuration                      |

---

## Quick Start (Frontend)

```bash
git clone https://github.com/QuietForgeDev/amazon-repricing-survey.git
cd amazon-repricing-survey
npm ci
npm run preview
```

Open the logged URL (default `http://localhost:4173`) and edit files under `survey/`. The preview server auto-reloads HTML, CSS, JS, and manifest changes.

When you are ready to ship:

```bash
npm run build:offline
```

The command regenerates `dist/`, including the QR splash card, service worker, and manifest.  
The script refuses to build if `SURVEY_URL` still points at `localhost`, helping you avoid broken QR codes in production collateral.

---

## Survey Content at a Glance

| Page                              | Focus                                             | Example prompts                                                                    |
|-----------------------------------|---------------------------------------------------|-------------------------------------------------------------------------------------|
| Shelf Life & Seller Lore          | Bookseller background                             | Years selling, commitment level, weekly hours, sourcing habits                     |
| Daily Rituals & Tooling           | Day-to-day workflows                              | Listing cadence, repricing stack, signal menu, inventory anxiety                    |
| Risk, Glitches & Experiments      | Lessons learned + appetite for tinkering          | Risk posture, memorable glitches, safety nets, experimentation cadence              |
| Wishlist, Community & Follow-up   | Dream features, AI trust, community interest      | Genie wish, AI trust temperature, community appetite, privacy rating, contact opt-in|

The question copy – including “other” follow-up prompts – lives in `schema/survey_questions.yaml`.  
Run `npm run schema:generate` to refresh derived JSON once you modify the YAML.

---

## Tooling & QA

| Command                              | Description                                                             |
|--------------------------------------|-------------------------------------------------------------------------|
| `npm run preview`                    | Live development server (no service worker caching)                     |
| `npm run build:offline`              | Production bundle + QR splash card                                      |
| `npm run test:smoke`                 | Schema check, DB init, sample imports, sanitized export validation      |
| `npm run test:e2e`                   | Comprehensive Playwright suite (survey UI → API → sqlite summary)       |
| `npm run test:fill-survey`           | Headless Playwright form submission (local collector)                   |
| `npm run test:fill-survey:headful`   | Interactive Playwright run (useful for debugging page flow)             |
| `npx cspell --config cspell.json README.md` | Spot-check spelling using the repo dictionaries                 |

The spell-check configuration intentionally keeps Amazon vocabulary (ASIN, Keepa, BQool, etc.) separate from engineering terms (Nixpacks, gunicorn, networkidle) so VS Code’s Problems panel stays actionable.

---

## Deploying the Static Bundle

### GitHub Pages (PII-safe)

1. Run `npm run workflow -- --mode agent` to rebuild the offline bundle and sanitize exports.
2. Commit the updated `dist/` artifacts plus sanitized JSON in `public/export/`.
3. Push to `main`. `.github/workflows/deploy-survey.yml` runs `npm ci`, calls `npm run build:offline`, and publishes to GitHub Pages. The workflow injects `SURVEY_URL` with your Pages host so the QR card and manifest stay accurate.
4. Verify the URL printed by the workflow (e.g. `https://<owner>.github.io/<repo>/`).

### Netlify / Static Hosts

Drag the `dist/` folder (or `survey/` for a simpler static version) to your provider of choice.  
If you override `SURVEY_URL`, rebuild via:

```bash
SURVEY_URL="https://events.example.org/repricing" npm run build:offline
```

### Railway / Container Apps

- Backend image lives in `Dockerfile.api`.
- Required environment variables: `API_ADMIN_TOKEN`, `API_SUBMIT_TOKEN`, optional `COMPANY_ALLOWLIST`.
- `.nixpacks/config.toml` installs Python 3.12 and pip via `python -m pip install …`; deployments fail fast if tokens are blank or if `pip` is missing.

---

## Local API Service

The sqlite-backed API under `agents/logic/sqlite-service` is useful for demos, local-first workflows, or data-entry kiosks.

```powershell
cd agents\logic\sqlite-service
npm install
npm run init-db
npm start
```

Create `.env` (copy `.env.example`) and set:

```
DB_PATH=../../../db/survey.sqlite
PORT=3001
COMPANY_ALLOWLIST=Quiet Forge,Acme Inc
API_ADMIN_TOKEN=local-admin-secret
API_SUBMIT_TOKEN=local-submit-token
```

Endpoints:

| Method | Path                  | Notes                                                         |
|--------|-----------------------|---------------------------------------------------------------|
| POST   | `/submit`             | Accepts JSON or form data, requires `X-Submit-Token` header   |
| GET    | `/api/v2/responses`   | Admin-only, requires `X-Admin-Token`                          |
| GET    | `/api/v2/summary`     | Admin-only aggregate stats                                    |
| GET    | `/api/health`         | Simple health probe                                           |

The service redacts emails, phone numbers, and address-like content unless the value matches the configured company allow list. Contact information remains optional in the survey and is stored in a dedicated field for explicit outreach consent.

---

## Development Notes

- **Spell checking:** `cspell.json` provides shared dictionaries. Add Amazon-specific words to `words`, tooling jargon to `userWords`.
- **Docs:** The latest field dictionary lives in `docs/field_reference.md`. Legacy v1 content resides in `docs/legacy/`.
- **Redeploy trigger:** Touch `redeploy-trigger.txt` when you need to force a downstream redeploy (Railway/GitHub Pages).

---

## License

MIT License © 2025 Quiet Forge Development Studio.  
Contributions, forks, and remixing are encouraged—please keep PII out of committed artifacts.
