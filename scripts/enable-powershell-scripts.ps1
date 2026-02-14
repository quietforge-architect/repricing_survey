<#
 enable-powershell-scripts.ps1

 Sets the PowerShell execution policy for the current user to RemoteSigned so that local project scripts can run without using -ExecutionPolicy Bypass.
 Requires running in a PowerShell session with sufficient rights.
#>
[CmdletBinding()]
param()

try {
  $currentPolicy = Get-ExecutionPolicy -Scope CurrentUser -ErrorAction SilentlyContinue
  if ($currentPolicy -eq 'RemoteSigned') {
    Write-Host 'Execution policy already set to RemoteSigned for CurrentUser.'
    return
  }

  Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser -Force
  Write-Host 'Execution policy for CurrentUser set to RemoteSigned. Restart PowerShell terminals to apply.'
} catch {
  Write-Error "Failed to update execution policy: $_"
  throw
}
