#!/usr/bin/env bash
# End-to-end test of the git source: a bare repo in /tmp as the "remote", two simulated machines pushing with
# report-git.sh (concurrently, plus the same bot from both), and a throwaway app on port 8795 polling every 5 s.
set -euo pipefail
S="$(cd "$(dirname "$0")/.." && pwd)"; W=/tmp/bi-e2e; PORT=${PORT:-8795}
rm -rf "$W"; mkdir -p "$W/home"; git init -q --bare -b main "$W/remote.git"
export BOTISLAND_REPO_URL="$W/remote.git"
cat > "$W/app.config.json" <<JSON
{ "port": $PORT, "openBrowser": false, "demo": "off",
  "sources": [ { "type": "folder", "path": "./local-events" }, { "type": "git", "url": "$W/remote.git", "pollSeconds": 5 } ] }
JSON
BOTISLAND_REPO_DIR="$W/A" "$S/report-git.sh" Alpha working "first" >/dev/null 2>&1
BOTISLAND_HOME="$W/home" node "$S/server.js" --config "$W/app.config.json" > "$W/app.log" 2>&1 & APP=$!
trap 'kill $APP 2>/dev/null' EXIT; sleep 3
for i in 1 2 3 4; do
  BOTISLAND_REPO_DIR="$W/A" "$S/report-git.sh" Alpha researching "Round $i A" >/dev/null & P1=$!
  BOTISLAND_REPO_DIR="$W/B" "$S/report-git.sh" Beta waiting_on_user "Round $i B" >/dev/null & P2=$!; wait $P1 $P2
done
BOTISLAND_REPO_DIR="$W/A" "$S/report-git.sh" Gamma done "From A" >/dev/null & P1=$!
BOTISLAND_REPO_DIR="$W/B" "$S/report-git.sh" Gamma done "From B" >/dev/null & P2=$!; wait $P1 $P2
echo "commits on remote: $(git --git-dir="$W/remote.git" rev-list --count main) (expected 11)"
python3 - "$PORT" <<'PY'
import json, sys, time, urllib.request
t = time.time()
while time.time() - t < 20:
    b = {x['id']: x for x in json.load(urllib.request.urlopen(f'http://127.0.0.1:{sys.argv[1]}/api/state'))['bots']}
    if b.get('alpha', {}).get('task') == 'Round 4 A' and b.get('beta', {}).get('task') == 'Round 4 B' and len(b.get('gamma', {}).get('actions', [])) == 2:
        print(f'PASS: app saw both bots + merged same-bot reports after {time.time() - t:.1f}s'); sys.exit(0)
    time.sleep(0.5)
print('FAIL', b); sys.exit(1)
PY
