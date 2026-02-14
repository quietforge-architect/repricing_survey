<#
verify-node-docker.ps1
Checks that Docker is available, pulls node:22-alpine, and prints node/npm versions.
#>

try {
    Write-Host "Checking for docker..."
    $dockerPath = (Get-Command docker -ErrorAction Stop).Source
} catch {
    Write-Error "Docker CLI not found. Install Docker Desktop for Windows and try again: https://www.docker.com/get-started"
    exit 2
}

Write-Host "Docker found at: $dockerPath"

Write-Host "Pulling node:22-alpine (this may take a minute)..."
$pull = docker pull node:22-alpine 2>&1
Write-Host $pull

Write-Host "Running non-interactive checks..."
$nodeVersion = docker run --rm node:22-alpine node -v 2>&1
$npmVersion = docker run --rm node:22-alpine npm -v 2>&1

Write-Host "node version inside container: $nodeVersion"
Write-Host "npm  version inside container: $npmVersion"

# Save results to file
$resultsDir = Join-Path -Path $PSScriptRoot -ChildPath '..\.reports'
if (-not (Test-Path $resultsDir)) { New-Item -ItemType Directory -Path $resultsDir | Out-Null }
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$outFile = Join-Path $resultsDir "verify-node-docker-$timestamp.txt"
@"
Docker pull output:
$pull

node version: $nodeVersion
npm  version: $npmVersion
"@ | Out-File -FilePath $outFile -Encoding UTF8

Write-Host "Results saved to $outFile"
exit 0
# Verify docker cli
docker --version

# Pull Node 22 Alpine image
docker pull node:22-alpine# Verify docker cli
docker --version

# Pull Node 22 Alpine image
docker pull node:22-alpine# Verify docker cli
docker --version

# Pull Node 22 Alpine image
docker pull node:22-alpine# Can PowerShell find the docker command?
Get-Command docker -ErrorAction SilentlyContinue

# or fallback using where.exe
where.exe docker

# If either returns a path, note it. If empty, docker CLI is not on PATH.