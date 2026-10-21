#!/usr/bin/env bash
# Server launcher: build (if needed) and start Bot Island in the background with config/server.config.json.
# (On your own computer use `npm start` / cli.mjs instead.)
#   local:  http://127.0.0.1:8787  (loopback without proxy headers needs no key)
#   tunnel endpoint: http://127.0.0.1:8797  (key/cookie always required)
# Usage: ./start.sh [--tunnel]   (or TUNNEL=1 ./start.sh) also starts the Cloudflare quick tunnel via tunnel.sh
cd "$(dirname "$0")"
[ -d node_modules ] || npm install
[ -f dist/index.html ] || npx vite build
[ -f server.pid ] && kill "$(cat server.pid)" 2>/dev/null
# also stop whatever Bot Island process still holds 8787/8797 (stale pid file); only node server.js / cli.mjs processes
for p in $(ss -ltnp 2>/dev/null | grep -E '127\.0\.0\.1:(8787|8797) ' | grep -o 'pid=[0-9]*' | cut -d= -f2 | sort -u); do
  grep -qaE 'server\.js|cli\.mjs' /proc/$p/cmdline 2>/dev/null && kill "$p"
done
for i in $(seq 20); do ss -ltn 2>/dev/null | grep -q '127.0.0.1:8787 ' || break; sleep 0.25; done
nohup node server.js --config config/server.config.json > server.log 2>&1 &  # dev-box config: events/, profiles, remote port 8797
echo $! > server.pid
sleep 1; cat server.log
if [ "$1" = "--tunnel" ] || [ "${TUNNEL:-0}" = "1" ]; then ./tunnel.sh start; fi
