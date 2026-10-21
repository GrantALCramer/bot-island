# Bot Island for Windows (PowerShell): right-click > Run with PowerShell, or: powershell -ExecutionPolicy Bypass -File start-botisland.ps1
# Serves on http://127.0.0.1:8787 only. Needs Node.js 18+ (https://nodejs.org).
$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
$node = Get-Command node -ErrorAction SilentlyContinue
if (-not $node) {
  Write-Host 'Bot Island needs Node.js 18 or newer. Opening https://nodejs.org ... install the LTS version, then run this again.'
  Start-Process 'https://nodejs.org/en/download'; Read-Host 'Press Enter to close'; exit 1
}
$major = [int]((& node -p 'process.versions.node').Split('.')[0])
if ($major -lt 18) { Write-Host "Your Node.js ($major) is too old, need 18+. Update from https://nodejs.org"; Read-Host 'Press Enter to close'; exit 1 }
if (-not (Test-Path 'node_modules\ws\package.json')) {
  Write-Host 'First run: installing dependencies (one time)...'
  if (Test-Path 'dist\index.html') { & npm install --omit=dev --no-audit --no-fund } else { & npm install --no-audit --no-fund }
  if ($LASTEXITCODE -ne 0) { Read-Host 'npm install failed. Press Enter to close'; exit 1 }
}
Write-Host 'Starting Bot Island... (close this window or press Ctrl+C to quit)'
& node cli.mjs @args
if ($LASTEXITCODE -ne 0) { Read-Host 'Press Enter to close' }
