<#
setup-wsl-docker.ps1
Checks Windows features needed for WSL2/Docker Desktop and prints commands to enable them.
It can optionally enable features (requires Administrator) and attempt to install Docker Desktop via winget.

USAGE:
  - Run in an elevated PowerShell to allow enabling features:
      .\scripts\setup-wsl-docker.ps1 -EnableFeatures -InstallDocker
  - Or run without parameters to see diagnostic output and suggested commands.
#>
param(
    [switch]$EnableFeatures,
    [switch]$InstallDocker
)

function Test-IsAdmin {
    $current = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = New-Object Security.Principal.WindowsPrincipal($current)
    return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

Write-Host "== WSL / Docker prerequisite check =="

# Check virtualization
Write-Host "Checking CPU virtualization support (Hyper-V / VT-x)..."
try { $sys = systeminfo 2>&1 | Out-String } catch { $sys = "" }
if ($sys -match 'Virtualization Enabled In Firmware:\s+Yes') {
    Write-Host "Virtualization enabled in firmware: Yes"
} else {
    Write-Warning "Virtualization not enabled in firmware or can't detect. Enable VT-x/AMD-V in BIOS/UEFI first."
}

# Check WSL feature
$wslFeature = Get-WindowsOptionalFeature -Online -FeatureName Microsoft-Windows-Subsystem-Linux -ErrorAction SilentlyContinue
if ($wslFeature -and $wslFeature.State -eq 'Enabled') { Write-Host "WSL feature: Enabled" } else { Write-Warning "WSL feature: Disabled" }

# Check Virtual Machine Platform
$vmp = Get-WindowsOptionalFeature -Online -FeatureName VirtualMachinePlatform -ErrorAction SilentlyContinue
if ($vmp -and $vmp.State -eq 'Enabled') { Write-Host "VirtualMachinePlatform: Enabled" } else { Write-Warning "VirtualMachinePlatform: Disabled" }

# Check Hyper-V (optional)
$hv = Get-WindowsOptionalFeature -Online -FeatureName Microsoft-Hyper-V-All -ErrorAction SilentlyContinue
if ($hv -and $hv.State -eq 'Enabled') { Write-Host "Hyper-V: Enabled" } else { Write-Host "Hyper-V: Disabled (not required if using WSL2)" }

# WSL status
Write-Host "\nWSL status (wsl --status):"
try { wsl --status 2>&1 | Write-Host } catch { Write-Warning "wsl command not available or needs to be installed" }

# Suggest enabling features if missing
if ($EnableFeatures) {
    if (-not (Test-IsAdmin)) {
        Write-Error "Enabling Windows features requires running this script elevated (Administrator). Restart PowerShell as Administrator and re-run with -EnableFeatures."
        exit 2
    }
    Write-Host "Enabling WSL and VirtualMachinePlatform features (requires reboot)..."
    dism.exe /online /enable-feature /featurename:Microsoft-Windows-Subsystem-Linux /all /norestart
    dism.exe /online /enable-feature /featurename:VirtualMachinePlatform /all /norestart
    Write-Host "Features enabled (if they weren't already). Please reboot the machine to complete the setup."
}

# Try to install Docker Desktop via winget if requested
if ($InstallDocker) {
    Write-Host "Attempting to install Docker Desktop using winget..."
    try {
        winget --version 2>$null
        Write-Host "winget found — installing Docker Desktop (requires interactive approval)..."
        winget install --id Docker.DockerDesktop -e --source winget
        Write-Host "If the installer ran, start Docker Desktop from Start Menu and finish onboarding."
    } catch {
        Write-Warning "winget not available or install failed. Please download Docker Desktop manually: https://www.docker.com/get-started"
    }
}

Write-Host "\nNext steps summary:" 
Write-Host "- If you enabled features, reboot now."
Write-Host "- Install Docker Desktop (download or winget)."
Write-Host "- After Docker Desktop is running, open a new PowerShell and run: docker --version"
Write-Host "- If using WSL2 backend, install a Linux distro: wsl --install -d ubuntu"

Write-Host "== Done =="
