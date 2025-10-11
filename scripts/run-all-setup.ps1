<#
run-all-setup.ps1
Wires common project setup scripts together so a single command can bootstrap the environment.
Usage:
  .\scripts\run-all-setup.ps1 [-InstallVSCodeExtensions] [-IncludeShellIntegration] [-IncludeDockerSetup] [-IncludeSqliteSetup] [-ForceVenv]
#>
[CmdletBinding()]
param(
  [switch]$InstallVSCodeExtensions,
  [switch]$IncludeShellIntegration,
  [switch]$IncludeDockerSetup,
  [switch]$IncludeSqliteSetup,
  [switch]$ForceVenv
)

$ErrorActionPreference = "Stop"
$scriptRoot = $PSScriptRoot
$repoRoot = Split-Path -Parent $scriptRoot
Push-Location $repoRoot

function Invoke-SetupStep {
  param(
    [string]$Name,
    [string]$ScriptPath,
    [object[]]$Arguments = @()
  )

  if (-not (Test-Path $ScriptPath)) {
    Write-Warning "Skipping step '$Name' because the script was not found at $ScriptPath"
    return
  }

  Write-Host "== Running: $Name ==" -ForegroundColor Cyan
  try {
    if ($Arguments -and ($Arguments | Measure-Object).Count -gt 0) {
      & $ScriptPath @Arguments
    } else {
      & $ScriptPath
    }
    if ($null -ne $LASTEXITCODE -and $LASTEXITCODE -ne 0) {
      throw "Exited with code $LASTEXITCODE"
    }
  } catch {
    Write-Error "Step '$Name' failed: $_"
    throw
  }
}

try {
function Test-PythonAvailable {
  foreach ($candidate in @('python', 'python3', 'py')) {
    if (Get-Command $candidate -ErrorAction SilentlyContinue) { return $true }
  }
  return $false
}

$steps = @()
if (Test-PythonAvailable) {
  $steps += [pscustomobject]@{
    Name = 'Create Python venv'
    Script = Join-Path $scriptRoot 'create-python-venv.ps1'
    Args = if ($ForceVenv) { @('-Force') } else { @() }
  }
} else {
  Write-Warning "Python 3 not detected; skipping virtual environment creation. Install Python and re-run with -ForceVenv if needed."
}

$installArgs = if ($InstallVSCodeExtensions) { @('-InstallVSCodeExtensions') } else { @() }
$steps += [pscustomobject]@{
  Name = 'Install developer tooling'
  Script = Join-Path $scriptRoot 'install-dev-tools.ps1'
  Args = $installArgs
}

if ($IncludeShellIntegration) {
  $steps += [pscustomobject]@{
    Name = 'Enable VS Code shell integration'
    Script = Join-Path $scriptRoot 'enable-shell-integration.ps1'
    Args = @()
  }
}

if ($IncludeDockerSetup) {
  $steps += [pscustomobject]@{
    Name = 'Prepare WSL and Docker Desktop'
    Script = Join-Path $scriptRoot 'setup-wsl-docker.ps1'
    Args = @()
  }
}

if ($IncludeSqliteSetup) {
  Write-Host "Note: sqlite-service setup stays running once npm start launches." -ForegroundColor Yellow
  $steps += [pscustomobject]@{
    Name = 'Install and start sqlite-service'
    Script = Join-Path $scriptRoot 'setup-local-sqlite-service.ps1'
    Args = @()
  }
}

foreach ($step in $steps) {
  Invoke-SetupStep -Name $step.Name -ScriptPath $step.Script -Arguments $step.Args
}

Write-Host "All requested setup steps completed." -ForegroundColor Green
} finally {
  Pop-Location
}
