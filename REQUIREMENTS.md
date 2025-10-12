# System Requirements

- Windows 10/11 (WSL2 optional but recommended for Docker Desktop)
- 8 GB RAM minimum, virtualization enabled in BIOS/UEFI

## Core Tooling

| Tool        | Installation Notes                                                                                                   |
|-------------|------------------------------------------------------------------------------------------------------------------------|
| Node.js LTS | Install with `winget install --id OpenJS.NodeJS.LTS -e` or via [nvm-windows](https://github.com/coreybutler/nvm-windows) |
| npm         | Bundled with Node                                                                                                     |
| PowerShell  | All helper scripts assume PowerShell (`pwsh`)                                                                         |
| Docker      | Optional. Required only if you plan to run the nginx bundle or Railway-style deployments                              |

After installing Node, fetch project dependencies with:

```powershell
npm ci
```

## Recommended Dev Packages

- **Playwright** (browser automation)

  ```bash
  npm i -D playwright
  npx playwright install
  ```

- **markitdown MCP helper**

  ```bash
  npx -y markitdown-mcp
  ```

- **Notion MCP server**

  ```bash
  npx -y @notionhq/notion-mcp-server@latest
  ```

## Spell Checking

Custom dictionaries live in `cspell.json`. Run spot checks with:

```powershell
npx cspell --config cspell.json README.md
```

Add Amazon terminology to `"words"` and engineering jargon to `"userWords"` so editors stop flagging expected vocabulary.

## Local sqlite-service (optional API)

```powershell
cd agents\logic\sqlite-service
npm install
npm run init-db
npm start
```

Create `.env` from `.env.example` to configure `DB_PATH`, `PORT`, `API_ADMIN_TOKEN`, `API_SUBMIT_TOKEN`, and `COMPANY_ALLOWLIST`.

## CI and Deploy

- `Dockerfile.api` packages the Flask service, installs requirements, and runs under gunicorn.
- `.github/workflows/deploy-survey.yml` builds the offline bundle and publishes to GitHub Pages, automatically setting `SURVEY_URL`.
- `.nixpacks/config.toml` ensures `python -m pip install …` is available during Railway builds.

## Security Notes

- Never commit raw submissions, SQLite databases, or exports containing contact information.
- Keep `API_ADMIN_TOKEN`, `API_SUBMIT_TOKEN`, Notion credentials, and Apps Script `ADMIN_KEY` values in private secret stores (GitHub Secrets, Railway variables, Script Properties, etc.).
