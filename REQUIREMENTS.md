Project requirements and quick install

# System prerequisites

- Windows 10/11 (with WSL2 if you plan to use Docker Desktop WSL backend)
- Recommended: 8+ GB RAM, virtualization enabled in BIOS/UEFI

## Tooling (local dev)

- Node.js LTS (22.x or 24.x) — install via winget or nvm-windows

  - winget:

    ```powershell
    winget install --id OpenJS.NodeJS.LTS -e
    ```

  - nvm-windows: https://github.com/coreybutler/nvm-windows/releases

- npm (bundled with Node)

- Docker Desktop (optional, for containerized runs) — https://www.docker.com/get-started

- PowerShell (pwsh) — for provided helper scripts

## Dev packages (repo-level)

- Playwright (for browser automation and audits)

  - Install via npm:

    ```bash
    npm i -D playwright
    ```

  - Install browsers:

    ```bash
    npx playwright install
    ```

- markitdown (CLI) — available via `uvx markitdown-mcp` or via `npx`

- Notion MCP server (for integration testing) — available via:

  ```bash
  npx -y @notionhq/notion-mcp-server@latest
  ```

## How to set up local sqlite-service

1) Install Node/npm
2) From repo root:

```powershell
cd agents\logic\sqlite-service
npm install
npm run init-db
npm start
```

## CI notes

- The included GitHub Actions workflow (see `.github/workflows/ci.yml`) installs Node, runs `npm ci`, and installs Playwright browsers.

## Security

- The project stores survey data privately and only publishes sanitized responses after admin approval. Keep your `ADMIN_KEY` and any Notion tokens or secrets out of source control; use Actions secrets or Script Properties.
