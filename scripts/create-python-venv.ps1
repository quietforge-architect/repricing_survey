<#
create-python-venv.ps1
Ensures a Python virtual environment exists at repo-root\.venv (or custom path).
Usage:
  .\scripts\create-python-venv.ps1 [-Path relative/path] [-Force]
#>
[CmdletBinding()]
param(
  [string]$Path = ".venv",
  [switch]$Force
)

$ErrorActionPreference = "Stop"
$repoRoot = Split-Path -Parent $PSScriptRoot
$resolved = Resolve-Path -LiteralPath (Join-Path $repoRoot $Path) -ErrorAction SilentlyContinue
$venvPath = if ($resolved) { $resolved.ProviderPath } else { Join-Path $repoRoot $Path }

if (Test-Path $venvPath) {
  if (-not $Force) {
    Write-Host "Python venv already present at $venvPath"
    return
  }
  Write-Host "Removing existing venv at $venvPath"
  Remove-Item -Recurse -Force $venvPath
}

function Get-PythonCommand {
  $candidates = @('python', 'python3')
  foreach ($candidate in $candidates) {
    $cmd = Get-Command $candidate -ErrorAction SilentlyContinue
    if ($cmd) { return $cmd.Source }
  }
  $pyLauncher = Get-Command py -ErrorAction SilentlyContinue
  if ($pyLauncher) { return "$($pyLauncher.Source) -3" }
  return $null
}

$pythonCommand = Get-PythonCommand
if (-not $pythonCommand) {
  throw "Python is required to create a virtual environment. Install Python 3.x and re-run this script."
}

$pythonArgs = @()
$pythonExe = $pythonCommand
if ($pythonCommand -match '\\s-3$') {
  $pythonExe = ($pythonCommand -replace '\\s-3$','')
  $pythonArgs += '-3'
}
$pythonArgs += '-m'
$pythonArgs += 'venv'
$pythonArgs += $venvPath

Write-Host "Creating Python venv at $venvPath"
& $pythonExe @pythonArgs
if ($LASTEXITCODE -ne 0) {
  throw "python -m venv failed with exit code $LASTEXITCODE"
}

Write-Host "Virtual environment ready. Activate with:`n  $((Join-Path $venvPath 'Scripts\Activate.ps1'))"
