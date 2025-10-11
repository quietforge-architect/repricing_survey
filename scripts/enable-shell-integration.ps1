<#
enable-shell-integration.ps1

Idempotent script to append VS Code shell integration snippet to user's pwsh profile.

Usage:
  Run from PowerShell (pwsh):
    .\scripts\enable-shell-integration.ps1

What it does:
 - Ensures the profile directory exists
 - Appends the snippet only if not already present
 - Does NOT restart VS Code or modify system-wide settings
#>

$snippet = 'if ($env:TERM_PROGRAM -eq "vscode") { . "$(code --locate-shell-integration-path pwsh)" }'

$profileDir = Split-Path -Parent $Profile
if (-not (Test-Path $profileDir)) {
    New-Item -ItemType Directory -Path $profileDir -Force | Out-Null
}

try {
    $existing = Get-Content $Profile -ErrorAction SilentlyContinue
} catch {
    $existing = @()
}

if ($existing -and ($existing -join "`n") -match [regex]::Escape($snippet)) {
    Write-Host "Snippet already present in $Profile"
} else {
    Add-Content -Path $Profile -Value "`n$snippet`n"
    Write-Host "Snippet appended to $Profile"
}

Write-Host "To activate the change, open a new VS Code integrated terminal or restart VS Code."
