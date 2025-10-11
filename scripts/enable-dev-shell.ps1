<#
Enable-Dev-Shell.ps1

Unified setup script to:
- Elevate to Administrator
- Set safe execution policy
- Optionally patch a broken $PROFILE that references VS Code CLI when it's not installed
- Ensure Node.js/npm/npx and Python are available
- Configure a shared Playwright browsers cache for all users (C:\ProgramData\ms-playwright)
- Optionally configure a machine-wide npm prefix (C:\ProgramData\npm) and add it to PATH
- Install global CLI tools: playwright, markitdown, @notionhq/notion-mcp-server
- Fetch Playwright browsers once for the shared cache

Usage (Run as normal user; it will self-elevate):
  pwsh -NoProfile -ExecutionPolicy Bypass -File scripts/enable-dev-shell.ps1 [-MachineWide]

#>
[CmdletBinding()]
param(
  [switch]$MachineWide
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Ensure-Admin {
  $id = [Security.Principal.WindowsIdentity]::GetCurrent()
  $principal = New-Object Security.Principal.WindowsPrincipal($id)
  if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Write-Host 'Not running as Administrator. Relaunching elevated...' -ForegroundColor Yellow
    $args = @('-NoProfile','-ExecutionPolicy','Bypass','-File',"$PSCommandPath")
    if ($MachineWide) { $args += '-MachineWide' }
    Start-Process -FilePath powershell.exe -ArgumentList $args -Verb RunAs | Out-Null
    exit
  } else {
    Write-Host 'Running with Administrator privileges.' -ForegroundColor Green
  }
}

function Set-ExecutionPolicies {
  Write-Host 'Setting execution policies (CurrentUser: RemoteSigned, Process: Bypass)...' -ForegroundColor Cyan
  try { Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned -Force } catch {}
  try { Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass -Force } catch {}
}

function Fix-ProfileIfBroken {
  # Some profiles reference `code --locate-shell-integration-path pwsh` and error if VS Code CLI isn't available
  $codeCmd = Get-Command code -ErrorAction SilentlyContinue
  if ($null -ne $codeCmd) { return }
  $profilePath = $PROFILE.CurrentUserAllHosts
  if (-not (Test-Path $profilePath)) { return }
  try {
    $content = Get-Content -Path $profilePath -Raw
    $pattern = '\$\(code\s+--locate-shell-integration-path\s+pwsh\)'
    if ($content -match $pattern) {
      Write-Host "Patching profile to disable VS Code shell-integration call: $profilePath" -ForegroundColor Yellow
      $patched = $content -replace '(?m)^(.+\$\(code\s+--locate-shell-integration-path\s+pwsh\).*)$','# [disabled by enable-dev-shell] `$1'
      $backup = "$profilePath.bak"
      Set-Content -Path $backup -Value $content -Encoding UTF8
      Set-Content -Path $profilePath -Value $patched -Encoding UTF8
    }
  } catch {
    Write-Warning "Unable to patch profile: $_"
  }
}

function Get-CommandPath {
  param([Parameter(Mandatory=$true)][string]$Name)
  foreach ($candidate in @("$Name.cmd","$Name.exe",$Name)) {
    $cmd = Get-Command $candidate -ErrorAction SilentlyContinue
    if ($cmd) { return $cmd.Source }
  }
  return $null
}

function Ensure-Node {
  Write-Host 'Checking Node.js/npm/npx...' -ForegroundColor Cyan
  $node = Get-Command node -ErrorAction SilentlyContinue
  if (-not $node) {
    Write-Warning 'Node.js not found in PATH.'
    $winget = Get-Command winget -ErrorAction SilentlyContinue
    if ($winget) {
      Write-Host 'Installing Node.js LTS via winget...' -ForegroundColor Yellow
      winget install --id OpenJS.NodeJS.LTS -e --accept-source-agreements --accept-package-agreements --silent
      if ($LASTEXITCODE -ne 0) { Write-Warning "winget Node.js install exit code: $LASTEXITCODE" }
    } else {
      Write-Warning 'winget not found; install Node.js manually from https://nodejs.org'
    }
  }
  $node = Get-Command node -ErrorAction SilentlyContinue
  if (-not $node) { throw 'Node.js still not available after attempted install.' }
  $npm = Get-CommandPath -Name 'npm'
  $npx = Get-CommandPath -Name 'npx'
  if (-not $npm -or -not $npx) { throw 'npm/npx not found after Node.js install.' }
  $npmVersion = & $npm -v
  $npxVersion = & $npx -v
  Write-Host "Node: $(node -v) | npm: $npmVersion | npx: $npxVersion" -ForegroundColor Green
  if ($MachineWide) {
    # Optional: set a machine-wide npm prefix and PATH for all users
    $prefix = 'C:\\ProgramData\\npm'
    if (-not (Test-Path $prefix)) { New-Item -ItemType Directory -Path $prefix -Force | Out-Null }
    & $npm 'config' 'set' 'prefix' $prefix | Out-Null
    [Environment]::SetEnvironmentVariable('PATH', ([Environment]::GetEnvironmentVariable('PATH','Machine') + ";$prefix"), 'Machine')
    Write-Host "Configured npm prefix to $prefix and added to Machine PATH." -ForegroundColor Green
  }
}

function Ensure-Python {
  Write-Host 'Checking Python (for node-gyp native builds)...' -ForegroundColor Cyan
  $py = Get-Command python -ErrorAction SilentlyContinue
  if (-not $py) {
    $winget = Get-Command winget -ErrorAction SilentlyContinue
    if ($winget) {
      Write-Host 'Installing Python 3.12 via winget...' -ForegroundColor Yellow
      winget install --id Python.Python.3.12 -e --accept-source-agreements --accept-package-agreements --silent
      if ($LASTEXITCODE -ne 0) { Write-Warning "winget Python install exit code: $LASTEXITCODE" }
    } else {
      Write-Warning 'winget not found; install Python manually from https://www.python.org/downloads/windows/'
    }
  }
  $py = Get-Command python -ErrorAction SilentlyContinue
  if ($py) { Write-Host "Python: $(python --version)" -ForegroundColor Green }
}

function Configure-Shared-Playwright {
  Write-Host 'Configuring shared Playwright browsers directory at C:\\ProgramData\\ms-playwright...' -ForegroundColor Cyan
  $shared = 'C:\\ProgramData\\ms-playwright'
  if (-not (Test-Path $shared)) { New-Item -ItemType Directory -Path $shared -Force | Out-Null }
  try { icacls $shared /grant 'Users:(OI)(CI)(M)' | Out-Null } catch {}
  [Environment]::SetEnvironmentVariable('PLAYWRIGHT_BROWSERS_PATH', $shared, 'Machine')
  $env:PLAYWRIGHT_BROWSERS_PATH = $shared
  Write-Host "PLAYWRIGHT_BROWSERS_PATH set to $shared (Machine)." -ForegroundColor Green
}

function Install-Global-Packages {
  $npm = Get-CommandPath -Name 'npm'
  if (-not $npm) { throw 'npm not found' }
  $toInstall = @('playwright','markitdown','@notionhq/notion-mcp-server')
  foreach ($pkg in $toInstall) {
    Write-Host "Installing global npm package: $pkg" -ForegroundColor Cyan
    & $npm 'install' '-g' $pkg
    if ($LASTEXITCODE -ne 0) { Write-Warning "Failed to install $pkg (exit $LASTEXITCODE)" } else { Write-Host "Installed: $pkg" -ForegroundColor Green }
  }

  # Fetch Playwright browsers into the shared cache using cmd to avoid PowerShell profile issues
  $playwrightCmd = Get-Command 'playwright.cmd' -ErrorAction SilentlyContinue
  if ($playwrightCmd) {
    Write-Host 'Installing Playwright browsers (shared cache)...' -ForegroundColor Cyan
    cmd.exe /c "\"$($playwrightCmd.Source)\" install --with-deps"
  } else {
    $npx = Get-CommandPath -Name 'npx'
    if ($npx) {
      Write-Host 'Installing Playwright browsers via npx (shared cache)...' -ForegroundColor Cyan
      cmd.exe /c ('"' + $npx + '" playwright install --with-deps')
    }
  }
}

function Summary {
  Write-Host ''
  Write-Host '== Summary ==' -ForegroundColor Cyan
  Write-Host "Node: $(node -v)"
  try { Write-Host "npm: $(npm -v)" } catch {}
  try { Write-Host "npx: $(npx -v)" } catch {}
  try { Write-Host "Python: $(python --version)" } catch {}
  Write-Host "PLAYWRIGHT_BROWSERS_PATH: $env:PLAYWRIGHT_BROWSERS_PATH"
  Write-Host 'Global packages:'
  try { npm list -g --depth=0 | Out-String | Write-Host } catch {}
  Write-Host 'Done.' -ForegroundColor Green
}

# Orchestration
Ensure-Admin
Set-ExecutionPolicies
Fix-ProfileIfBroken
Ensure-Node
Ensure-Python
Configure-Shared-Playwright
Install-Global-Packages
Summary
