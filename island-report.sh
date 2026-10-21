#!/usr/bin/env bash
# island-report.sh: report a bot's status to a Bot Island over HTTP (e.g. through Tailscale). No hand-rolled curl needed.
#
#   island-report.sh setup <island-url>          # then paste the access key when asked (or pipe it on stdin)
#   island-report.sh <bot> <state> ["task"] ["action note"] ["with bot"]
#   island-report.sh reply <bot> <messageId> "text"     # answer an island chat message
#   island-report.sh profile <bot> [avatarShape] [avatarColor] ["title"]
#   island-report.sh test                         # checks the URL + key without reporting anything
#
# States: working researching thinking waiting_on_user error done idle
# Config (mode 600): ~/.botisland/island.env  (override with BOTISLAND_ISLAND_ENV)
#   ISLAND_URL=https://my-pc.my-tailnet.ts.net   ISLAND_KEY=<access key>
#   ISLAND_PROXY=socks5h://127.0.0.1:1055         # optional, e.g. userspace tailscaled; omit for direct
# The key is passed to curl through stdin, never on the command line, and is never printed.
# Needs bash, curl and python3 (or node).
set -uo pipefail
ENV="${BOTISLAND_ISLAND_ENV:-$HOME/.botisland/island.env}"
die() { echo "island-report: $*" >&2; exit 1; }
tojson() { # key=value pairs -> JSON object (values as strings; empty values dropped)
  if command -v python3 >/dev/null; then python3 -c 'import json,sys; print(json.dumps({k:v for k,v in (a.split("=",1) for a in sys.argv[1:]) if v}))' "$@"
  else node -e 'const o={};for(const a of process.argv.slice(1)){const i=a.indexOf("=");if(a.slice(i+1))o[a.slice(0,i)]=a.slice(i+1)}console.log(JSON.stringify(o))' "$@"; fi; }
if [ "${1:-}" = setup ]; then
  url="${2:-}"; [[ "$url" =~ ^https?://[^[:space:]]+$ ]] || die "usage: island-report.sh setup <https://island-url>"
  url="${url%/}"; url="${url%%\?*}"
  if [ -t 0 ]; then read -rsp "Access key: " key; echo; else read -r key; fi
  [ ${#key} -ge 16 ] || die "that key looks too short"
  mkdir -p "$(dirname "$ENV")"; umask 077
  { echo "ISLAND_URL=$url"; echo "ISLAND_KEY=$key"; [ -n "${ISLAND_PROXY:-}" ] && echo "ISLAND_PROXY=$ISLAND_PROXY"; } > "$ENV"; chmod 600 "$ENV"
  echo "saved $ENV"; exec "$0" test
fi
[ -r "$ENV" ] || die "no config: run  island-report.sh setup <island-url>  first"
ISLAND_PROXY_ENV="${ISLAND_PROXY:-}"; set -a; . "$ENV"; set +a; ISLAND_PROXY="${ISLAND_PROXY_ENV:-${ISLAND_PROXY:-}}"
[ -n "${ISLAND_URL:-}" ] && [ -n "${ISLAND_KEY:-}" ] || die "ISLAND_URL / ISLAND_KEY missing in $ENV"
PX=(); [ -n "$ISLAND_PROXY" ] && [ "$ISLAND_PROXY" != none ] && PX=(-x "$ISLAND_PROXY")
post() { # <path> <json> -> prints HTTP code
  printf 'header = "Authorization: Bearer %s"\n' "$ISLAND_KEY" | curl -s -o /dev/null -w '%{http_code}' --connect-timeout 5 -m 15 "${PX[@]}" \
    -K - -H 'content-type: application/json' --data-binary "$2" "$ISLAND_URL$1" 2>/dev/null || true; }
result() { case "$1" in 200) echo ok;; 401) die "the island rejected the key (HTTP 401); check ISLAND_KEY";; 429) die "too many bad attempts; wait 15 minutes";;
  ""|000) die "can't reach $ISLAND_URL (is Tailscale up on this computer?)";; *) die "island answered HTTP $1";; esac; }
case "${1:-}" in
  ""|-h|--help) sed -n '2,15p' "$0"; exit 0;;
  test) code=$(post /api/ingest/nothing '{}'); [ "$code" = 404 ] && { echo "ok: reached the island and the key works"; exit 0; }; result "$code";;
  reply) [ $# -ge 4 ] || die "usage: reply <bot> <messageId> \"text\""; result "$(post /api/ingest/reply "$(tojson "bot=$2" "messageId=$3" "text=$4")")";;
  profile) [ $# -ge 2 ] || die "usage: profile <bot> [shape] [color] [title]"
    result "$(post /api/ingest/profiles "$(python3 -c 'import json,sys; a=sys.argv[1:]+[""]*4; print(json.dumps({"merge":True,"profiles":[{"name":a[0],"avatarShape":a[1] or None,"avatarColor":a[2] or None,"title":a[3]}]}))' "${@:2}")")";;
  *) [ $# -ge 2 ] || die "usage: <bot> <state> [task] [action] [with]"; result "$(post /api/ingest/report "$(tojson "bot=$1" "state=$2" "task=${3:-}" "action=${4:-}" "with=${5:-}")")";;
esac
