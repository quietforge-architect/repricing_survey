# -----------------------------------------------------
# Script: Install-NodePackages.ps1
# Purpose: Elevates privileges, ensures Node.js is present,
#          then installs selected global npm packages
# -----------------------------------------------------

# Function: Re-run the script as administrator if not already
Function Elevate-Admin {
    If (-NOT ([Security.Principal.WindowsPrincipal] `
        [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole(`
        [Security.Principal.WindowsBuiltInRole]::Administrator)) {
        
        Write-Host "Not running as admin. Restarting with elevated privileges..." -ForegroundColor Yellow
        Start-Process powershell.exe "-ExecutionPolicy Bypass -File `"$PSCommandPath`"" -Verb RunAs
        Exit
    } else {
        Write-Host "Running as Administrator." -ForegroundColor Green
    }
}

# Step 1: Ensure admin
Elevate-Admin

# Step 2: Check for Node.js and npm
Write-Host "`nChecking for Node.js and npm..." -ForegroundColor Cyan
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "Node.js is not installed. Please install it first from https://nodejs.org/" -ForegroundColor Red
    Exit 1
} else {
    Write-Host "Node.js is installed. Version: $(node -v)" -ForegroundColor Green
    Write-Host "npm is installed. Version: $(npm -v)" -ForegroundColor Green
}

# Step 3: Configure execution policy for this session and shared Playwright cache
try { Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass -Force } catch {}
if (-not $env:PLAYWRIGHT_BROWSERS_PATH) { $env:PLAYWRIGHT_BROWSERS_PATH = 'C:\\ProgramData\\ms-playwright' }
if (-not (Test-Path $env:PLAYWRIGHT_BROWSERS_PATH)) { New-Item -ItemType Directory -Path $env:PLAYWRIGHT_BROWSERS_PATH -Force | Out-Null }

# Step 4: Install the desired npm packages globally
$packages = @("playwright", "markitdown", "@notionhq/notion-mcp-server")

foreach ($pkg in $packages) {
    Write-Host "`nInstalling package: $pkg..." -ForegroundColor Cyan
    npm install -g $pkg
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Successfully installed: $pkg" -ForegroundColor Green
    } else {
        Write-Host "Failed to install: $pkg. Check your npm configuration or spelling." -ForegroundColor Red
    }
}

Write-Host "`nAll tasks complete." -ForegroundColor Green
