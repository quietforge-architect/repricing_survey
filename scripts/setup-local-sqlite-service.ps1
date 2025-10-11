<#
setup-local-sqlite-service.ps1

Installs dependencies for the local sqlite-service, initializes the database, and starts the service in the foreground.
Requires Node.js/npm in PATH.

Usage:
  .\scripts\setup-local-sqlite-service.ps1
#>
[CmdletBinding()]
param()

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Get-CommandPath {
  param([Parameter(Mandatory = $true)][string]$Name)
  foreach ($candidate in @("$Name.cmd", "$Name.exe", $Name)) {
    $cmd = Get-Command $candidate -ErrorAction SilentlyContinue
    if ($cmd) { return $cmd.Source }
  }
  return $null
}

$repoRoot = Split-Path -Parent $PSScriptRoot
$servicePath = Join-Path $repoRoot 'agents\logic\sqlite-service'
Write-Host "Using service path: $servicePath"

if (-not (Test-Path $servicePath)) { throw "Service path not found: $servicePath" }

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  throw "Node.js not detected. Install Node.js and rerun this script."
}

$npmExe = Get-CommandPath -Name 'npm'
if (-not $npmExe) { throw "npm executable not found in PATH." }

Push-Location $servicePath
try {
  Write-Host "Installing sqlite-service npm dependencies..."
  & $npmExe 'install'
  if ($LASTEXITCODE -ne 0) { throw "npm install failed with exit code $LASTEXITCODE" }

  Write-Host "Running init-db..."
  & $npmExe 'run' 'init-db'
  if ($LASTEXITCODE -ne 0) { Write-Warning "init-db reported exit code $LASTEXITCODE. Check the output for details." }

  Write-Host "Starting sqlite-service (Ctrl+C to stop)..."
  & $npmExe 'start'
  if ($LASTEXITCODE -ne 0) { Write-Warning "sqlite-service exited with code $LASTEXITCODE" }
} finally {
  Pop-Location
}
