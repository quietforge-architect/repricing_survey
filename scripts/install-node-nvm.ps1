<#
install-node-nvm.ps1
Guides the user to install Node.js using nvm-windows and set a recommended version.
This script will not download or run installers by itself; it prints commands and links.
USAGE: run in an elevated or normal PowerShell and follow printed instructions.
#>
param(
    [string]$NodeVersion = "22.20.0"
)

Write-Host "== Node / nvm-windows setup helper =="
Write-Host "Recommended Node version: $NodeVersion"
Write-Host "If you already have nvm-windows installed, run: nvm install $NodeVersion; nvm use $NodeVersion"

Write-Host "\nIf you don't have nvm-windows, follow these steps:"
Write-Host "1) Download nvm-windows from https://github.com/coreybutler/nvm-windows/releases"
Write-Host "   - Get the latest nvm-setup.zip and run the installer."
Write-Host "2) Open a new PowerShell, then run:"
Write-Host "   nvm install $NodeVersion"
Write-Host "   nvm use $NodeVersion"
Write-Host "3) Verify with: node -v ; npm -v"

Write-Host "\nIf you prefer choco or direct installer, use those instead."
Write-Host "== Done =="
