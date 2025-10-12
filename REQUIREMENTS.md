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

  Tooling location:

  - The repository now includes a `tools/` folder for small helper wrappers and stubs (e.g. `tools/markitdown-mcp.js`).
  - Scripts will set `TOOL_HOME` to the repo `tools/` folder by default. To move these helpers to a machine-wide location (e.g. `C:\\Program Files\\dev-tools`), create the folder, copy the files, and set the system environment variable `TOOL_HOME` to that path (requires admin).

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

- `Dockerfile` provides a reproducible build image that runs the smoke suite and ships the static bundle via nginx.
- `.github/workflows/pages.yml` deploys the sanitized `dist/` bundle to GitHub Pages while refusing commits that contain contact data in `public/export/`.
- The included GitHub Actions workflow (see `.github/workflows/ci.yml`) installs Node, runs `npm ci`, and installs Playwright browsers.

## Security

- The project stores survey data privately and only publishes sanitized responses after admin approval. Keep your `ADMIN_KEY` and any Notion tokens or secrets out of source control; use Actions secrets or Script Properties.
