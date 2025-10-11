<#
pwsh_profile_snippet.ps1
Helper and instructions to add the recommended snippet to your PowerShell (pwsh) profile used by VS Code.

Goal: append the following snippet to your pwsh profile so VS Code's integrated terminal will source shell integration when available.

Snippet (PowerShell):

if ($env:TERM_PROGRAM -eq "vscode") { . "$(code --locate-shell-integration-path pwsh)" }

Instructions:
1) To edit your profile in VS Code interactively, run in pwsh:

   code $Profile

   - This opens your profile (creates it if missing). Paste the snippet above and save the file. Restart VS Code terminal.

2) To append the snippet to your profile automatically (safe, idempotent):

   # Creates profile directory if needed, then appends the snippet only if not already present
   $profileDir = Split-Path -Parent $Profile
   if (-not (Test-Path $profileDir)) { New-Item -ItemType Directory -Path $profileDir -Force }
   $snippet = 'if ($env:TERM_PROGRAM -eq "vscode") { . "$(code --locate-shell-integration-path pwsh)" }'
   if (-not (Get-Content $Profile -ErrorAction SilentlyContinue | Select-String -SimpleMatch $snippet)) { Add-Content -Path $Profile -Value "`n$snippet`n" ; Write-Host 'Snippet appended to $Profile' } else { Write-Host 'Snippet already present in $Profile' }

3) After editing or appending, restart VS Code or open a new integrated terminal to pick up the change.

Notes:
- `code --locate-shell-integration-path pwsh` requires VS Code 1.79+ (or the feature available in your Code build). If the command errors, the snippet will fail to source but won't break your shell.
- This is safe to add; it only sources a script when running inside VS Code's integrated terminal.
#>
