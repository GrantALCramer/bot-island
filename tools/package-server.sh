#!/usr/bin/env bash
# Build the server release package: release/botisland-server-<version>.tar.gz (what one-click updates install).
# Contents: built web app (dist/), server, scripts, deploy files and the only runtime dependency (ws).
set -euo pipefail
cd "$(dirname "$0")/.."
V=$(node -p 'require("./package.json").version'); OUT="${1:-release}"; N=botisland-server-$V
[ -f dist/index.html ] || npx vite build
T=$(mktemp -d); trap 'rm -rf "$T"' EXIT; mkdir -p "$T/$N/node_modules" "$OUT"
cp -r server.js cli.mjs lib dist deploy package.json AGENT_REPORTING.md README.md LICENSE \
  report.sh report-git.sh reply.sh reply-git.sh register.sh island-report.sh report.ps1 start.sh "$T/$N/"
[ -d config ] && mkdir -p "$T/$N/config" && cp config/*.example.json "$T/$N/config/" 2>/dev/null || true
cp -r node_modules/ws "$T/$N/node_modules/"
tar -czf "$OUT/$N.tar.gz" -C "$T" --owner=0 --group=0 "$N"
echo "$OUT/$N.tar.gz"
