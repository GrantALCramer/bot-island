#!/usr/bin/env bash
# A bot connects its own chat webhook to Bot Island, so the user never has to copy the URL or key by hand.
# usage: WEBHOOK_URL='https://…' WEBHOOK_KEY='…' [ISLAND_URL=http://127.0.0.1:8787] [BOTISLAND_KEY=…] register.sh <bot>
#   optional: WEBHOOK_HEADER (default Authorization), WEBHOOK_PREFIX (default "Bearer ")
# The URL and keys are read from the environment (never argv, so they don't show in `ps`) and are never printed.
# BOTISLAND_KEY = the island's remote access key; only needed when the island is not on this computer.
# Calls POST $ISLAND_URL/api/chat/register (Authorization: Bearer $BOTISLAND_KEY). Prints only ok / the error.
set -euo pipefail
if [ $# -lt 1 ]; then echo 'usage: WEBHOOK_URL=… WEBHOOK_KEY=… register.sh <bot>' >&2; exit 1; fi
[ -f "${BOTISLAND_ENV_FILE:-$HOME/.botisland/report.env}" ] && . "${BOTISLAND_ENV_FILE:-$HOME/.botisland/report.env}"
: "${WEBHOOK_URL:?set WEBHOOK_URL (your webhook trigger URL)}"
SLUG=$(printf '%s' "$1" | tr '[:upper:]' '[:lower:]' | sed -E 's/[^a-z0-9]+/-/g; s/^-|-$//g')
[ -n "$SLUG" ] || { echo "bad bot name" >&2; exit 1; }
BOT="$SLUG" python3 - <<'PY'
import json, os, sys, urllib.request, urllib.error
base = os.environ.get("ISLAND_URL", "http://127.0.0.1:8787").rstrip("/")
body = {"bot": os.environ["BOT"], "url": os.environ["WEBHOOK_URL"].strip(), "key": os.environ.get("WEBHOOK_KEY", "").strip()}
if os.environ.get("WEBHOOK_HEADER"): body["header"] = os.environ["WEBHOOK_HEADER"]
if "WEBHOOK_PREFIX" in os.environ: body["prefix"] = os.environ["WEBHOOK_PREFIX"]
req = urllib.request.Request(base + "/api/chat/register", data=json.dumps(body).encode(), method="POST", headers={"content-type": "application/json", "authorization": "Bearer " + (os.environ.get("BOTISLAND_KEY") or "local")})
try:
    with urllib.request.urlopen(req, timeout=15) as r: out = json.loads(r.read() or b"{}")
    print("ok: %s is connected to Bot Island chat" % out.get("bot", body["bot"]) if out.get("ok") else "error: %s" % out.get("error", "unknown"))
except urllib.error.HTTPError as e:
    try: msg = json.loads(e.read()).get("error", "")
    except Exception: msg = ""
    sys.exit("error: HTTP %d %s" % (e.code, msg or ("wrong or missing BOTISLAND_KEY" if e.code in (401, 429) else "")))
except Exception as e:
    sys.exit("error: could not reach %s (%s)" % (base, type(e).__name__))
PY
