@echo off
rem Bot Island for Windows: double-click to start. Runs on http://127.0.0.1:8787 only (no account, no VPN).
rem Needs Node.js 18+ (https://nodejs.org). First run installs dependencies if needed and asks where bots report.
setlocal
cd /d "%~dp0"
title Bot Island
where node >nul 2>nul
if errorlevel 1 (
  echo Bot Island needs Node.js 18 or newer. Opening https://nodejs.org ... install the LTS version, then run this again.
  start "" "https://nodejs.org/en/download"
  pause
  exit /b 1
)
for /f "tokens=1 delims=." %%v in ('node -p "process.versions.node"') do set NODEMAJOR=%%v
if %NODEMAJOR% LSS 18 (
  echo Your Node.js is too old ^(need 18+^). Please update from https://nodejs.org
  pause
  exit /b 1
)
if not exist "node_modules\ws\package.json" (
  echo First run: installing dependencies ^(one time^)...
  if exist "dist\index.html" (call npm install --omit=dev --no-audit --no-fund) else (call npm install --no-audit --no-fund)
  if errorlevel 1 ( echo npm install failed. & pause & exit /b 1 )
)
echo Starting Bot Island... ^(close this window or press Ctrl+C to quit^)
node cli.mjs %*
if errorlevel 1 pause
endlocal
