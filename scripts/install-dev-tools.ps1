<#
install-dev-tools.ps1

Idempotent bootstrap for the developer tooling used by this repository.

What this script covers:
- Verifies Node.js is available (installs via winget when possible)
- Installs npm dependencies for the repo
- Ensures Playwright browsers are downloaded
- Primes the Notion MCP server package via npx
- Optionally installs recommended VS Code extensions

Usage:
  pwsh -NoProfile -ExecutionPolicy Bypass -File scripts/install-dev-tools.ps1 [-InstallVSCodeExtensions]

Notes:
- Some steps (winget installs) require Administrator privileges. When not elevated the script will instruct you on next actions.
- The script prefers the Windows .cmd shims for npm/npx to avoid execution policy issues.
- Network connectivity is required for npm and npx operations.
#>
[CmdletBinding()]
param(
  [switch]$InstallVSCodeExtensions
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Test-Admin {
  $current = [Security.Principal.WindowsIdentity]::GetCurrent()
  $principal = New-Object Security.Principal.WindowsPrincipal($current)
  return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

function Get-CommandPath {
  param([Parameter(Mandatory = $true)][string]$Name)
  foreach ($candidate in @("$Name.cmd", "$Name.exe", $Name)) {
    $cmd = Get-Command $candidate -ErrorAction SilentlyContinue
    if ($cmd) { return $cmd.Source }
  }
  return $null
}

$scriptRoot = $PSScriptRoot
$repoRoot = Split-Path -Parent $scriptRoot
Push-Location $repoRoot
try {
  Write-Host "== Dev tools bootstrap ==" -ForegroundColor Cyan

  $haveWinget = $null -ne (Get-Command winget -ErrorAction SilentlyContinue)
  if ($haveWinget) {
    Write-Host "winget: available"
  } else {
    Write-Warning "winget CLI not found. Install Node.js manually or via scripts/install-node-nvm.ps1."
  }

  $nodeCmd = Get-Command node -ErrorAction SilentlyContinue
  if (-not $nodeCmd) {
    Write-Warning "Node.js not detected in PATH."
    if ($haveWinget) {
      if (Test-Admin) {
        Write-Host "Attempting to install Node.js LTS via winget..."
        try {
          winget install --id OpenJS.NodeJS.LTS -e --accept-source-agreements --accept-package-agreements --silent
          if ($LASTEXITCODE -eq 0) {
            Write-Host "winget Node.js install initiated. Complete any installer prompts then reopen your shell."
          } else {
            Write-Warning "winget returned exit code $LASTEXITCODE for Node.js install. Install manually if necessary."
          }
        } catch {
          Write-Warning "winget Node.js installation failed: $_. Install Node.js manually or via nvm-windows."
        }
      } else {
        Write-Warning "Re-run this script as Administrator to allow winget to install Node.js automatically."
      }
    }
  }

  $nodeCmd = Get-Command node -ErrorAction SilentlyContinue
  if (-not $nodeCmd) {
    throw "Node.js is required but not available. Install Node.js then rerun this script."
  }

  $nodeVersion = (& node -v)
  Write-Host "Node detected: $nodeVersion"

  $npmExe = Get-CommandPath -Name 'npm'
  if (-not $npmExe) { throw "npm executable not found in PATH." }
  $npxExe = Get-CommandPath -Name 'npx'
  if (-not $npxExe) { throw "npx executable not found in PATH." }

  Write-Host "Installing project npm dependencies..."
  & $npmExe 'install' '--no-audit' '--no-fund'
  if ($LASTEXITCODE -ne 0) { throw "npm install failed with exit code $LASTEXITCODE" }

  Write-Host "Ensuring Playwright browsers are installed (idempotent)..."
  & $npxExe 'playwright' 'install'
  if ($LASTEXITCODE -ne 0) {
    Write-Warning "Playwright browser install returned exit code $LASTEXITCODE. Run 'npx playwright install' manually when network is available."
  } else {
    Write-Host "Playwright browsers ready."
  }

  Write-Host "Priming Notion MCP server package (npx --help)..."
  & $npxExe '-y' '@notionhq/notion-mcp-server@latest' '--help' > $null 2>&1
  if ($LASTEXITCODE -eq 0) {
    Write-Host "Notion MCP package is accessible via npx."
  } else {
    Write-Warning "Unable to fetch Notion MCP package (exit code $LASTEXITCODE). Check your network before running MCP tasks."
  }

  Write-Host "markitdown MCP is provided via scripts/markitdown-mcp.js. Replace the local stub with the vendor CLI when available."

  if ($InstallVSCodeExtensions) {
    $codeCmd = Get-Command code -ErrorAction SilentlyContinue
    if ($codeCmd) {
      $extensions = @(
        'ms-vscode.vscode-typescript-next',
        'msjsdiag.debugger-for-chrome',
        'esbenp.prettier-vscode',
        'dbaeumer.vscode-eslint'
      )
      foreach ($ext in $extensions) {
        $installed = code --list-extensions | Where-Object { $_ -eq $ext }
        if ($installed) {
          Write-Host "VS Code extension already installed: $ext"
        } else {
          Write-Host "Installing VS Code extension: $ext"
          code --install-extension $ext --force
        }
      }
    } else {
      Write-Warning "VS Code 'code' CLI not found. Use the Command Palette -> 'Shell Command: Install 'code' command in PATH' to enable it."
    }
  }

  Write-Host "`nDev tooling bootstrap completed." -ForegroundColor Green
  Write-Host "Open a new terminal if you just installed Node.js or VS Code CLI to refresh PATH."
} finally {
  Pop-Location
}