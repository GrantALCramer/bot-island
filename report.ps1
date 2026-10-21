# Report a bot's status to Bot Island (Windows / PowerShell). Same event format and secret redaction as report.sh.
# usage: .\report.ps1 <bot> <state> "<task>" ["<action note>"] ["<with: other bot(s), comma-separated>"]
#   states: working | researching | thinking | waiting_on_user | error | done | idle | stale
#   writes to $env:BOTISLAND_EVENTS_DIR, else %APPDATA%\BotIsland\events (the app's default folder)
param([Parameter(Mandatory = $true)][string]$Bot, [Parameter(Mandatory = $true)][string]$State, [string]$Task = '', [string]$Action = '', [string]$With = $env:BOTISLAND_WITH)
$ErrorActionPreference = 'Stop'
$dir = if ($env:BOTISLAND_EVENTS_DIR) { $env:BOTISLAND_EVENTS_DIR } elseif ($env:APPDATA) { Join-Path $env:APPDATA 'BotIsland\events' } else { Join-Path $HOME '.botisland/events' }
New-Item -ItemType Directory -Force -Path $dir | Out-Null
$slug = ($Bot.ToLower() -replace '[^a-z0-9]+', '-').Trim('-')
$secret = '(sk-[A-Za-z0-9_-]{16,}|gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|xox[abpr]-[A-Za-z0-9-]{10,}|AKIA[0-9A-Z]{16}|AIza[0-9A-Za-z_-]{30,}|eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}|-----BEGIN [A-Z ]*PRIVATE KEY-----|(?i:(?:password|passwd|secret|token|api[_-]?key)\s*[:=]\s*\S+))'
function Clean([string]$t) { $c = [regex]::Replace($t, $secret, '[redacted]'); if ($c.Length -gt 200) { $c.Substring(0, 200) } else { $c } }
$e = [ordered]@{ ts = (Get-Date).ToString('yyyy-MM-ddTHH:mm:sszzz'); bot = $Bot.Substring(0, [Math]::Min(60, $Bot.Length)); state = $State; task = (Clean $Task) }
if ($Action) { $e.action = (Clean $Action) }
$w = @($With -split ',' | ForEach-Object { $_.Trim() } | Where-Object { $_ } | Select-Object -First 4)
if ($w.Count -eq 1) { $e.with = $w[0] } elseif ($w.Count -gt 1) { $e.with = $w }
$line = ($e | ConvertTo-Json -Compress)
[IO.File]::AppendAllText((Join-Path $dir "$slug.jsonl"), $line + "`n", (New-Object Text.UTF8Encoding $false))
Write-Output $line
