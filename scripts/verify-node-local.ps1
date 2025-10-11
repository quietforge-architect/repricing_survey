<#
verify-node-local.ps1
Checks node and npm versions on the local machine (no Docker required).
#>

try {
    $node = (Get-Command node -ErrorAction Stop).Source
} catch {
    Write-Error "Node not found in PATH. Consider installing Node (nvm-windows is recommended): https://github.com/coreybutler/nvm-windows"
    exit 2
}

Write-Host "Node CLI found at: $node"

$nodeV = node -v 2>&1
$npmV = npm -v 2>&1

Write-Host "node -v => $nodeV"
Write-Host "npm  -v => $npmV"

# Save results
$resultsDir = Join-Path -Path $PSScriptRoot -ChildPath '..\.reports'
if (-not (Test-Path $resultsDir)) { New-Item -ItemType Directory -Path $resultsDir | Out-Null }
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$outFile = Join-Path $resultsDir "verify-node-local-$timestamp.txt"
@"
node version: $nodeV
npm  version: $npmV
"@ | Out-File -FilePath $outFile -Encoding UTF8

Write-Host "Results saved to $outFile"
exit 0
