#!/usr/bin/env bash
# A bot replies to a Bot Island chat message (the message arrived at the bot's webhook as
# {"source":"bot-island","bot":"<bot>","messageId":"<id>","text":"...","ts":"..."}).
# usage: reply.sh <bot> <messageId> "<text>"
# Appends the reply to chat/<bot>.jsonl and marks the message replied; the running app pushes it to the island.
# Where: $BOTISLAND_CHAT_DIR, else the chat/ folder next to this script. Secrets are redacted, text capped at 2000 chars.
set -euo pipefail
if [ $# -lt 3 ]; then echo 'usage: reply.sh <bot> <messageId> "<text>"' >&2; exit 1; fi
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DIR="${BOTISLAND_CHAT_DIR:-$HERE/chat}"
mkdir -p "$DIR"
SLUG=$(printf '%s' "$1" | tr '[:upper:]' '[:lower:]' | sed -E 's/[^a-z0-9]+/-/g; s/^-|-$//g')
[ -n "$SLUG" ] || { echo "bad bot name" >&2; exit 1; }
python3 - "$DIR/$SLUG.jsonl" "$SLUG" "$2" "$3" <<'PY'
import json, sys, datetime, re, secrets, os
f, bot, mid, text = sys.argv[1:5]
if not re.fullmatch(r"[A-Za-z0-9._-]{1,80}", mid): sys.exit("bad messageId (copy it from the webhook body)")
SECRET = re.compile(r"(sk-[A-Za-z0-9_-]{16,}|gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|xox[abpr]-[A-Za-z0-9-]{10,}|AKIA[0-9A-Z]{16}|AIza[0-9A-Za-z_-]{30,}|crsr_[A-Za-z0-9_-]{10,}|eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}|-----BEGIN [A-Z ]*PRIVATE KEY-----|(?i:(?:password|passwd|secret|token|api[_-]?key)\s*[:=]\s*\S+))")
text = SECRET.sub("[redacted]", text).replace("\r\n", "\n").strip()[:2000]
if not text: sys.exit("empty reply")
ts = datetime.datetime.now(datetime.timezone.utc).isoformat(timespec="milliseconds").replace("+00:00", "Z")
rid = "r-" + format(int(datetime.datetime.now().timestamp() * 1000), "x") + "-" + secrets.token_hex(3)
lines = [{"type": "msg", "id": rid, "ts": ts, "bot": bot, "from": bot, "text": text, "replyTo": mid},
         {"type": "status", "id": mid, "ts": ts, "status": "replied"}]
out = "".join(json.dumps(l) + "\n" for l in lines)
with open(f, "a") as fh: fh.write(out)
sys.stdout.write(out)
PY
