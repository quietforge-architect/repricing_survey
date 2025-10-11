<#
install-dev-tools.ps1

Comprehensive, idempotent bootstrap for developer tooling used by this repo.

What it does (when run as Administrator or normal user where possible):
- Ensures Node.js is installed (tries winget or suggests nvm-windows)
- Ensures WSL/VirtualMachinePlatform features are present (prompts admin to enable)
- Installs Playwright (devDependency) and downloads browsers
- Installs uvx (markitdown) globally if possible (or uses npx fallback)
- Pulls Notion MCP server via npx (no global install)
- Optionally installs recommended VS Code extensions (if `code` CLI available)

Usage:
  Run from repo root in pwsh. The script is idempotent and safe; it will only install missing items.

  .\scripts\install-dev-tools.ps1 [-InstallVSCodeExtensions]

Notes:
 - Some steps require Administrator privileges (enabling Windows features, using winget install). The script will detect and print instructions when elevation is required.
 - The script attempts to be non-interactive where possible but will surface platform prompts (winget/MSI) when needed.
#>

param(
  [switch]$InstallVSCodeExtensions
)

function Test-Admin {
  $current = [Security.Principal.WindowsIdentity]::GetCurrent()
  $principal = New-Object Security.Principal.WindowsPrincipal($current)
  return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

Write-Host "== Dev tools bootstrap: checking environment =="

# Check for winget
$haveWinget = (Get-Command winget -ErrorAction SilentlyContinue) -ne $null
if ($haveWinget) { Write-Host "winget: available" } else { Write-Host "winget: not found" }

# Check Node
$nodeCmd = Get-Command node -ErrorAction SilentlyContinue
if ($nodeCmd) {
  Write-Host "node already installed: $(& node -v)"
} else {
  Write-Host "node not found. Attempting to install Node.js LTS via winget (if available)."
  if ($haveWinget) {
    if (-not (Test-Admin)) { Write-Warning "Installing system packages with winget requires Administrator. Re-run this script as Administrator to allow winget to install Node.js." }
    try {
      winget install --id OpenJS.NodeJS.LTS -e --accept-source-agreements --accept-package-agreements --silent
      if ($LASTEXITCODE -eq 0) {
        Write-Host "winget installation requested. If an installer UI appeared, finish prompts and reopen a new shell."
        # Verify Node installation
        $nodeCheck = Get-Command node -ErrorAction SilentlyContinue
        if ($nodeCheck) {
          Write-Host "Node.js installed successfully via winget."
        } else {
          Write-Warning "Node.js installation via winget did not complete successfully. Please check for errors or install manually."
        }
      } else {
        Write-Warning "winget Node install failed with exit code $LASTEXITCODE. Consider installing nvm-windows or running the installer manually. See scripts/install-node-nvm.ps1"
      }
    } catch {
      Write-Warning "winget Node install failed: $_. Consider installing nvm-windows or running the installer manually. See scripts/install-node-nvm.ps1"
    }
  } else {
    Write-Warning "winget not available. Recommend installing nvm-windows (see scripts/install-node-nvm.ps1) and then 'nvm install 22.20.0; nvm use 22.20.0'"
  }
}

# Re-check Node availability
$nodeCmd = Get-Command node -ErrorAction SilentlyContinue
if (-not $nodeCmd) {
  Write-Warning "Node is still not available in this shell. Please restart your terminal or run the Node installer manually, then re-run this script. Exiting."
  exit 1
}

Write-Host "Node detected: $(& node -v)"

  Write-Host "Adding Playwright as devDependency and installing..."
  try {
    $npmPing = Invoke-WebRequest -Uri "https://registry.npmjs.org/" -UseBasicParsing -TimeoutSec 10
    if ($npmPing.StatusCode -eq 200) {
      npm install --save-dev playwright
      if ($global:LASTEXITCODE -ne 0) { Write-Error "npm install failed with exit code $global:LASTEXITCODE"; exit 3 }
    } else {
      Write-Error "Unable to reach npm registry (status code $($npmPing.StatusCode)). Check your network connection."
      exit 2
    }
  } catch {
    Write-Error "Network check for npm registry failed: $_. Check your internet connection and try again."
    exit 2
  }
} catch {
  Write-Warning "package.json not found or invalid. Playwright will be installed locally in node_modules if possible."
  $pkg = $null
}

$hasPlaywright = $false
if ($pkg -and $pkg.devDependencies -and $pkg.devDependencies.playwright) { $hasPlaywright = $true }
if (-not $hasPlaywright) {
# Install uvx (markitdown) globally if missing
if ((Get-Command uvx -ErrorAction SilentlyContinue) -eq $null) {
  Write-Host "uvx (markitdown) not found. Attempting to install via npm (global)."
  if (-not (Test-Admin)) {
    Write-Warning "Global install of uvx may require Administrator privileges. Re-run this script as Administrator for global install, or use 'npx uvx' as a fallback."
    Write-Host "You can still use markitdown via: npx uvx ..."
  } else {
    try {
      npm install -g uvx
      if ($LASTEXITCODE -eq 0) {
        Write-Host "uvx installed globally."
      } else {
        Write-Warning "Global install of uvx failed with exit code $LASTEXITCODE. You can use 'npx uvx' as a fallback."
      }
    } catch {
      Write-Warning "Global install of uvx failed: $_. You can use 'npx uvx' as a fallback."
    }
  }
} else { Write-Host "uvx already available" }

# Install uvx (markitdown) globally if missing
if ((Get-Command uvx -ErrorAction SilentlyContinue) -eq $null) {
  Write-Host "uvx (markitdown) not found. Attempting to install via npm (global)."
  try {
npx -y @notionhq/notion-mcp-server@latest --help
if ($global:LASTEXITCODE -eq 0) { Write-Host "Notion MCP package callable via npx" } else { Write-Warning "Notion MCP may require network to fetch via npx when first used" }
  } catch {
    Write-Warning "Global install of uvx failed or requires elevation. You'll still be able to invoke markitdown via npx."
  }
} else { Write-Host "uvx already available" }

# Notion MCP server: we don't need a global install; npx will fetch it on run. Optionally pull it now.
Write-Host "Pulling Notion MCP package via npx (dry-run --help)"
npx -y @notionhq/notion-mcp-server@latest --help > $null 2>&1
if ($LASTEXITCODE -eq 0) { Write-Host "Notion MCP package callable via npx" } else { Write-Warning "Notion MCP may require network to fetch via npx when first used" }

# Optional: install recommended VS Code extensions
if ($InstallVSCodeExtensions) {
  if ((Get-Command code -ErrorAction SilentlyContinue) -ne $null) {
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
Write-Host "`nBootstrap completed. If Node.js or any MSI-based installer was used, you may need to restart your terminal before continuing with remaining steps."
    Write-Warning "VS Code 'code' CLI not found. To install extensions automatically, ensure 'code' is available in PATH ("Install 'code' command in PATH" from the Command Palette)."
  }
}

Write-Host "\nBootstrap completed. If any install required a shell restart (Node/MSI), open a new terminal and re-run this script to continue remaining steps."