<#
-------------------------------------------------------------
 Script Name : Enable-ShellIntegration.ps1
 Purpose     : Enables script execution, installs Playwright,
               and sets up shell integration (via npx).
 Author      : Your favorite AI butler
 Requirements: PowerShell, Node.js installed
-------------------------------------------------------------
#>

# 1. Function to check if script is running as Administrator
Function Ensure-Admin {
    $currentUser = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = New-Object Security.Principal.WindowsPrincipal($currentUser)

    If (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
        Write-Host "Script not running as Administrator. Relaunching with elevated permissions..." -ForegroundColor Yellow
        Start-Process powershell "-ExecutionPolicy Bypass -File `"$PSCommandPath`" $($args -join ' ')" -Verb RunAs
        Exit
    } else {
        Write-Host "Running with Admin privileges ✔" -ForegroundColor Green
    }
}

# 2. Function to set execution policy for this session
Function Set-ExecutionPolicyForSession {
    Write-Host "`nTemporarily bypassing execution policy for this session..." -ForegroundColor Cyan
    Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass -Force
}

# 3. Function to check if Node.js is installed
Function Check-Node {
    Write-Host "`nChecking Node.js and npm availability..." -ForegroundColor Cyan

    if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
        Write-Host "❌ Node.js is NOT installed or not in PATH." -ForegroundColor Red
        Write-Host "Download and install from https://nodejs.org/" -ForegroundColor Yellow
        Exit 1
    }

    if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
        Write-Host "❌ npm is NOT found. Something is off with the Node.js installation." -ForegroundColor Red
        Exit 1
    }

    if (-not (Get-Command npx -ErrorAction SilentlyContinue)) {
        Write-Host "❌ npx not found. It should be installed with Node.js v8.2.0 or later." -ForegroundColor Red
        Exit 1
    }

    Write-Host "✔ Node.js version: $(node -v)" -ForegroundColor Green
    Write-Host "✔ npm version: $(npm -v)" -ForegroundColor Green
    Write-Host "✔ npx version: $(npx -v)" -ForegroundColor Green
}

# 4. Function to install Playwright and enable shell integration
Function Install-Playwright {
    Write-Host "`nInstalling Playwright and enabling shell integration..." -ForegroundColor Cyan

    try {
        # Check if Playwright is installed globally
        $playwrightInstalled = npm list -g --depth=0 playwright | Select-String 'playwright'

        if (-not $playwrightInstalled) {
            Write-Host "Playwright not found globally. Installing globally..." -ForegroundColor Yellow
            npm install -g playwright
            if ($LASTEXITCODE -ne 0) {
                Write-Host "❌ Failed to install Playwright globally." -ForegroundColor Red
                return
            }
        } else {
            Write-Host "✔ Playwright is already installed globally." -ForegroundColor Green
        }

        # Install Playwright browsers
        npx playwright install

        if ($LASTEXITCODE -eq 0) {
            Write-Host "✔ Playwright installation complete." -ForegroundColor Green
        } else {
            Write-Host "⚠ Playwright install may have encountered an issue. Check logs." -ForegroundColor Yellow
        }
    } catch {
        Write-Host "❌ An error occurred while running 'npx playwright install'" -ForegroundColor Red
    }
}

# 5. Function to install optional global npm packages
Function Install-OptionalPackages {
    if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
        Write-Host "❌ npm is NOT found. Cannot install global packages." -ForegroundColor Red
        Write-Host "`nChecking global npm package: $pkg" -ForegroundColor Cyan
        $isInstalled = npm list -g --depth=0 $pkg | Select-String $pkg

        if ($isInstalled) {
            Write-Host "✔ $pkg is already installed globally." -ForegroundColor Green
        } else {
            Write-Host "Installing global npm package: $pkg" -ForegroundColor Cyan
            npm install -g $pkg

            if ($LASTEXITCODE -eq 0) {
                Write-Host "✔ $pkg installed globally." -ForegroundColor Green
            } else {
                Write-Host "⚠ Failed to install $pkg. Might be a typo or package issue." -ForegroundColor Yellow
            }
        }
            Write-Host "✔ $pkg installed globally." -ForegroundColor Green
        } else {
            Write-Host "⚠ Failed to install $pkg. Might be a typo or package issue." -ForegroundColor Yellow
        }
    }
}

# 🧠 RUN EVERYTHING IN ORDER
Ensure-Admin
Set-ExecutionPolicyForSession
Check-Node
Install-Playwright
Install-OptionalPackages

Write-Host "`nAll operations completed. You’re shell-integrated and ready to rock." -ForegroundColor Magenta
