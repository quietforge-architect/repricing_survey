<#
setup-local-sqlite-service.ps1
Helper to install dependencies for the local sqlite-service and run init steps.
This script will only run npm commands in the project's sqlite-service folder. Requires Node/npm available in PATH.
USAGE:
  .\scripts\setup-local-sqlite-service.ps1
#>
$servicePath = Join-Path $PSScriptRoot '..' | Join-Path -ChildPath 'agents\logic\sqlite-service'
Write-Host "Using service path: $servicePath"

if (-not (Test-Path $servicePath)) { Write-Error "Service path not found: $servicePath"; exit 1 }

# Check node
try { & node -v > $null 2>&1 } catch { Write-Error "node not found in PATH. Install Node and re-run. Use scripts\install-node-nvm.ps1 for guidance."; exit 2 }

Write-Host "Installing npm packages in sqlite-service..."
Push-Location $servicePath
npm install
if ($LASTEXITCODE -ne 0) { Write-Error "npm install failed with exit code $LASTEXITCODE"; Pop-Location; exit 3 }

Write-Host "Running init-db..."
npm run init-db
if ($LASTEXITCODE -ne 0) { Write-Warning "init-db may have failed. Check output." }

Write-Host "Starting sqlite-service (foreground). Press Ctrl+C to stop."
npm start
if ($LASTEXITCODE -ne 0) { Write-Error "npm install failed with exit code $LASTEXITCODE"; Pop-Location; exit 3 }

Write-Host "Running init-db..."
npm run init-db
if ($LASTEXITCODE -ne 0) { Write-Warning "init-db may have failed. Check output." }

Write-Host "Starting sqlite-service (foreground). Press Ctrl+C to stop."
npm start
Pop-Location
