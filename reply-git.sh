#!/usr/bin/env bash
# A bot replies to a Bot Island chat message through the shared git repo the app pulls (git-source version of reply.sh).
# usage: reply-git.sh <bot> <messageId> "<text>"
#
# Settings (environment):
#   BOTISLAND_REPO_DIR   local clone used for reporting   (default: ~/.botisland/report-repo)
#   BOTISLAND_REPO_URL   clone this if the dir doesn't exist yet (ssh or https; use a credential helper or deploy key,
#                        never put a token in the URL)
#   BOTISLAND_BRANCH     branch (default: main)
#   BOTISLAND_MAX_LINES  keep only the newest N lines per bot file (default: 500; 0 = never trim)
#
# Appends to chat/<bot>.jsonl in the clone (same lines as reply.sh: the reply + a "replied" status), commits only that
# file and pushes with retry. The app reads chat/ from its git cache on every pull (bot replies only). Secrets are
# redacted and text capped by reply.sh.
set -euo pipefail
if [ $# -lt 3 ]; then echo 'usage: reply-git.sh <bot> <messageId> "<text>"' >&2; exit 1; fi
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# optional per-machine defaults (e.g. BOTISLAND_REPO_URL) live in ~/.botisland/report.env (shell syntax; never put tokens there)
[ -f "${BOTISLAND_ENV_FILE:-$HOME/.botisland/report.env}" ] && . "${BOTISLAND_ENV_FILE:-$HOME/.botisland/report.env}"
REPO="${BOTISLAND_REPO_DIR:-$HOME/.botisland/report-repo}"
BRANCH="${BOTISLAND_BRANCH:-main}"
MAX="${BOTISLAND_MAX_LINES:-500}"
export GIT_TERMINAL_PROMPT=0
SLUG=$(printf '%s' "$1" | tr '[:upper:]' '[:lower:]' | sed -E 's/[^a-z0-9]+/-/g; s/^-|-$//g')
[ -n "$SLUG" ] || { echo "bad bot name" >&2; exit 1; }
FILE="chat/$SLUG.jsonl"; MID="$2"

# 1. build the reply lines with reply.sh (same format + redaction), in a temp dir
TMP=$(mktemp -d); trap 'rm -rf "$TMP"' EXIT
LINE=$(BOTISLAND_CHAT_DIR="$TMP" "$HERE/reply.sh" "$@")

# 2. one reporter at a time per clone (portable mkdir lock; stale after 120 s)
LOCK="$REPO.lock"
for i in $(seq 120); do
  mkdir "$LOCK" 2>/dev/null && break
  if [ -n "$(find "$LOCK" -maxdepth 0 -mmin +2 2>/dev/null)" ]; then rmdir "$LOCK" 2>/dev/null || true; fi
  sleep 0.5
done
[ -d "$LOCK" ] || { echo "could not lock $LOCK" >&2; exit 1; }
trap 'rm -rf "$TMP"; rmdir "$LOCK" 2>/dev/null || true' EXIT

# 3. clone if needed
if [ ! -d "$REPO/.git" ]; then
  [ -n "${BOTISLAND_REPO_URL:-}" ] || { echo "no clone at $REPO; set BOTISLAND_REPO_URL" >&2; exit 1; }
  mkdir -p "$(dirname "$REPO")"
  git clone --quiet "$BOTISLAND_REPO_URL" "$REPO"
fi
cd "$REPO"
G() { git -c user.name="${GIT_AUTHOR_NAME:-$SLUG}" -c user.email="${GIT_AUTHOR_EMAIL:-$SLUG@botisland.local}" "$@"; }
# empty remote: start the branch locally
git rev-parse --verify -q HEAD >/dev/null || git checkout -q -B "$BRANCH"
git fetch -q origin "$BRANCH" 2>/dev/null && { git rebase -q "origin/$BRANCH" 2>/dev/null || { git rebase --abort 2>/dev/null; git reset -q --hard "origin/$BRANCH"; }; } || true

append_and_commit() {
  mkdir -p chat
  if [ ! -f .gitattributes ] || ! grep -q 'merge=union' .gitattributes; then echo '*.jsonl merge=union' >> .gitattributes; G add -- .gitattributes; fi
  printf '%s\n' "$LINE" >> "$FILE"
  if [ "$MAX" -gt 0 ] && [ "$(wc -l < "$FILE")" -gt "$MAX" ]; then tail -n "$MAX" "$FILE" > "$FILE.tmp" && mv "$FILE.tmp" "$FILE"; fi
  G add -- "$FILE"
  # commit ONLY the bot's file (+ .gitattributes); nothing else in the clone is ever committed
  G commit -q -m "chat: $SLUG reply to $MID" -- "$FILE" $(git diff --cached --name-only -- .gitattributes)
}
append_and_commit

# 4. push with retry
for try in 1 2 3 4 5; do
  if git push -q origin "HEAD:$BRANCH" 2>"$TMP/push.err"; then echo "$LINE"; exit 0; fi
  sleep $((try * try))
  git fetch -q origin "$BRANCH" || continue
  if ! G rebase -q "origin/$BRANCH" 2>/dev/null; then
    # should not happen thanks to merge=union; fall back to re-applying our line on top of the remote
    git rebase --abort 2>/dev/null || true; git reset -q --hard "origin/$BRANCH"; append_and_commit
  fi
done
echo "push failed after 5 tries: $(tail -2 "$TMP/push.err")" >&2
echo "(the event is committed locally in $REPO and will go out with the next successful report)" >&2
exit 2
