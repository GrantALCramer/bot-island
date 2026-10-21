#!/usr/bin/env bash
# Bot Island one-click updater (root). Triggered by botisland-update.path when the server writes
# /var/lib/botisland/update-request.json {"version":"X.Y.Z"}. Installs ONLY that official release from GitHub:
# download botisland-server-X.Y.Z.tar.gz + SHA256SUMS, verify, keep /opt/botisland.prev, swap, restart,
# health-check /api/info for the new version, and roll back automatically if it doesn't come up.
# Optional /etc/botisland/update.env: GITHUB_TOKEN=... (private repo), BOTISLAND_UPDATE_REPO=owner/repo.
set -uo pipefail
DATA=${BOTISLAND_DATA:-/var/lib/botisland}; APP=${BOTISLAND_APP:-/opt/botisland}; REQ=$DATA/update-request.json; STATUS=$DATA/update-status.json
[ -f /etc/botisland/update.env ] && . /etc/botisland/update.env
PORT="${BOTISLAND_PORT:-8787}"; GH="${BOTISLAND_UPDATE_BASE:-https://github.com}"  # BASE: tests only
SYSTEMCTL="${BOTISLAND_SYSTEMCTL:-systemctl}"
say() { printf '{"state":"%s","version":"%s","message":"%s","at":"%s"}\n' "$1" "${VER:-}" "$2" "$(date -Is)" > "$STATUS"; chown botisland: "$STATUS" 2>/dev/null; echo "[update] $1: $2"; }
[ -f "$REQ" ] || exit 0
VER=$(node -e 'try{const v=JSON.parse(require("fs").readFileSync(process.argv[1],"utf8")).version;if(/^\d+\.\d+\.\d+$/.test(v))console.log(v)}catch{}' "$REQ")
rm -f "$REQ"
[ -n "$VER" ] || { say failed "bad update request"; exit 1; }
REPO="${BOTISLAND_UPDATE_REPO:-$(node -p 'require(process.argv[1]+"/package.json").botisland?.updateRepo||""' "$APP")}"
[[ "$REPO" =~ ^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$ ]] || { say failed "no update repo configured"; exit 1; }
CUR=$(node -p 'require(process.argv[1]+"/package.json").version' "$APP")
say downloading "updating $CUR to $VER"
TMP=$(mktemp -d); trap 'rm -rf "$TMP"' EXIT
fetch() { # <asset name> <out>
  if [ -n "${GITHUB_TOKEN:-}" ]; then
    local id; id=$(curl -fsSL -H "Authorization: Bearer $GITHUB_TOKEN" -H 'Accept: application/vnd.github+json' "https://api.github.com/repos/$REPO/releases/tags/v$VER" |
      node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const a=(JSON.parse(s).assets||[]).find(x=>x.name===process.argv[1]);if(a)console.log(a.id)})' "$1")
    [ -n "$id" ] && curl -fsSL -H "Authorization: Bearer $GITHUB_TOKEN" -H 'Accept: application/octet-stream' "https://api.github.com/repos/$REPO/releases/assets/$id" -o "$2"
  else curl -fsSL "$GH/$REPO/releases/download/v$VER/$1" -o "$2"; fi; }
PKG=botisland-server-$VER.tar.gz
fetch "$PKG" "$TMP/$PKG" && fetch SHA256SUMS "$TMP/SHA256SUMS" || { say failed "download failed"; exit 1; }
WANT=$(awk -v f="$PKG" '$2==f || $2=="*"f {print $1}' "$TMP/SHA256SUMS"); GOT=$(sha256sum "$TMP/$PKG" | cut -d' ' -f1)
[ -n "$WANT" ] && [ "$WANT" = "$GOT" ] || { say failed "checksum mismatch, nothing changed"; exit 1; }
mkdir "$TMP/new" && tar -xzf "$TMP/$PKG" -C "$TMP/new" --strip-components=1 --no-same-owner || { say failed "bad package"; exit 1; }
[ "$(node -p "require('$TMP/new/package.json').version" 2>/dev/null)" = "$VER" ] && [ -f "$TMP/new/server.js" ] || { say failed "package version mismatch"; exit 1; }
say installing "installing $VER (previous kept in $APP.prev)"
rm -rf "$APP.prev"; mv "$APP" "$APP.prev" && mv "$TMP/new" "$APP" || { [ -d "$APP" ] || mv "$APP.prev" "$APP"; say failed "could not swap folders"; exit 1; }
[ -z "${BOTISLAND_APP:-}" ] && install -m 755 "$APP/deploy/update.sh" /usr/local/lib/botisland-update.sh 2>/dev/null || true
$SYSTEMCTL restart botisland
for i in $(seq 30); do sleep 1
  [ "$(curl -fsS -m 3 "http://127.0.0.1:$PORT/api/info" 2>/dev/null | node -p 'JSON.parse(require("fs").readFileSync(0,"utf8")).version' 2>/dev/null)" = "$VER" ] && { say done "updated to $VER"; exit 0; }
done
rm -rf "$APP.failed"; mv "$APP" "$APP.failed"; mv "$APP.prev" "$APP"; $SYSTEMCTL restart botisland
VER=$CUR say rolled_back "$VER did not start, so $CUR was restored (failed copy in $APP.failed)"
exit 1
