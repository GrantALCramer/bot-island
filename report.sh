#!/usr/bin/env bash
# Report a bot's status to Bot Island.
# usage: report.sh <bot> <state> "<task>" ["<action note>"] ["<with: other bot(s), comma-separated>"]
#   (or set BOTISLAND_WITH=sage). `with` = you are talking to / working with that bot: on the island you walk over to visit its house.
# states: working | researching | thinking | waiting_on_user | error | done | idle | stale
#   (aliases ok: coding, writing, browsing, blocked, waiting, failed, finished, sleeping, break ...)
set -euo pipefail
if [ $# -lt 2 ]; then echo 'usage: report.sh <bot> <state> "<task>" ["<action note>"]' >&2; exit 1; fi
# where to write: $BOTISLAND_EVENTS_DIR (or legacy $BOTSIM_EVENTS_DIR), else the events/ folder next to this script
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# optional per-machine defaults (e.g. BOTISLAND_REPO_URL) live in ~/.botisland/report.env (shell syntax; never put tokens there)
[ -f "${BOTISLAND_ENV_FILE:-$HOME/.botisland/report.env}" ] && . "${BOTISLAND_ENV_FILE:-$HOME/.botisland/report.env}"
DIR="${BOTISLAND_EVENTS_DIR:-${BOTSIM_EVENTS_DIR:-$HERE/events}}"
mkdir -p "$DIR"
BOT="$1"; STATE="$2"; TASK="${3:-}"; ACTION="${4:-}"; WITH="${5:-${BOTISLAND_WITH:-}}"
SLUG=$(printf '%s' "$BOT" | tr '[:upper:]' '[:lower:]' | sed -E 's/[^a-z0-9]+/-/g; s/^-|-$//g')
python3 - "$DIR/$SLUG.jsonl" "$BOT" "$STATE" "$TASK" "$ACTION" "$WITH" <<'PY'
import json, sys, datetime
f, bot, state, task, action, with_ = sys.argv[1:7]
import re
# privacy guard: never write things that look like secrets; keep it short
SECRET = re.compile(r"(sk-[A-Za-z0-9_-]{16,}|gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|xox[abpr]-[A-Za-z0-9-]{10,}|AKIA[0-9A-Z]{16}|AIza[0-9A-Za-z_-]{30,}|eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}|-----BEGIN [A-Z ]*PRIVATE KEY-----|(?i:(?:password|passwd|secret|token|api[_-]?key)\s*[:=]\s*\S+))")
clean = lambda t: SECRET.sub("[redacted]", t)[:200]
e = {"ts": datetime.datetime.now().astimezone().isoformat(timespec="seconds"), "bot": bot[:60], "state": state[:40], "task": clean(task)}
if action: e["action"] = clean(action)
w = [x.strip()[:60] for x in with_.split(",") if x.strip()][:4]
if w: e["with"] = w if len(w) > 1 else w[0]
with open(f, "a") as fh: fh.write(json.dumps(e) + "\n")
print(json.dumps(e))
PY
# transition helper: BOTISLAND_MIRROR_GIT=1 (e.g. in report.env) also pushes the same report to the shared git repo, in the
# background so the local report never waits on the network. Output goes to ~/.botisland/report-git.log.
if [ -n "${BOTISLAND_MIRROR_GIT:-}" ] && [ -z "${BOTISLAND_NO_MIRROR:-}" ]; then
  mkdir -p "$HOME/.botisland"; ( "$HERE/report-git.sh" "$@" >> "$HOME/.botisland/report-git.log" 2>&1 & ) || true
fi
