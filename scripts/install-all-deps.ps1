<#
install-all-deps.ps1

Idempotent script to install npm dependencies for the repo and nested projects, install Playwright browsers,
and print a dependency report. This script uses TOOL_HOME (defaults to ./tools) for local helpers.
#>
[CmdletBinding()]
param()

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot
if (-not $env:TOOL_HOME) { $env:TOOL_HOME = Join-Path $repoRoot 'tools' }

function Install-NpmDependencies {
  param([string]$path)
  Write-Host "Installing npm dependencies in $path..."
  Push-Location $path
  try {
    & npm install --no-audit --no-fund
    if ($LASTEXITCODE -ne 0) { throw "npm install failed in $path with exit code $LASTEXITCODE" }
  } finally { Pop-Location }
}

# Install root deps
Install-NpmDependencies -path $repoRoot

# Install subproject deps (sqlite-service)
$sqlitePath = Join-Path $repoRoot 'agents\logic\sqlite-service'
if (Test-Path $sqlitePath) { Install-NpmDependencies -path $sqlitePath }

# Ensure Playwright browsers
Write-Host "Ensuring Playwright browsers are installed..."
& npx playwright install --with-deps
if ($LASTEXITCODE -ne 0) { Write-Warning "Playwright install returned exit code $LASTEXITCODE" }

# Generate simple dependency report
 $report = Join-Path $repoRoot 'dependency-report.txt'
 Write-Host "Generating dependency report at $report"
 "Dependency report generated on $(Get-Date -Format o)" | Out-File -FilePath $report -Encoding utf8


Write-Host "Done. Review dependency-report.txt and REQUIREMENTS.md for guidance on system prerequisites."
