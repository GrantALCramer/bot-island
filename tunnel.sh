#!/usr/bin/env bash
# Cloudflare quick tunnel (no account) for Bot Island, with a restart-on-exit supervisor.
#   ./tunnel.sh start    start the supervisor in the background (no-op if running)
#   ./tunnel.sh stop     stop the supervisor and cloudflared
#   ./tunnel.sh status   show pids + current URL
#   ./tunnel.sh url      print the private link (public URL + ?key=...)
# The tunnel points at the server's PUBLIC_PORT (default 8797), where a key/cookie is ALWAYS required.
# Quick-tunnel URLs change every time cloudflared restarts; the current one is always in .tunnel-url.
cd "$(dirname "$0")"
DIR=$PWD; BIN="$DIR/bin/cloudflared"; PORT="${PUBLIC_PORT:-8797}"
PIDF="$DIR/tunnel.pid"; LOG="$DIR/tunnel.log"; URLF="$DIR/.tunnel-url"

supervise() {
  trap 'kill $CF 2>/dev/null; rm -f "$PIDF"; exit 0' TERM INT
  while true; do
    : > "$LOG.cf"
    "$BIN" tunnel --no-autoupdate --url "http://127.0.0.1:$PORT" > "$LOG.cf" 2>&1 &
    CF=$!; echo "$(date '+%F %T %Z') cloudflared started pid=$CF" >> "$LOG"
    for i in $(seq 60); do
      U=$(grep -o 'https://[a-z0-9-]*\.trycloudflare\.com' "$LOG.cf" | head -1)
      # only publish the URL once cloudflared has actually connected to the Cloudflare edge (needs outbound port 7844)
      if [ -n "$U" ] && grep -q 'Registered tunnel connection' "$LOG.cf"; then echo "$U" > "$URLF"; chmod 600 "$URLF"; echo "$(date '+%F %T %Z') url $U" >> "$LOG"; break; fi
      [ "$i" = 60 ] && echo "$(date '+%F %T %Z') not connected after 60s (is outbound port 7844 blocked?); see $LOG.cf" >> "$LOG"
      kill -0 $CF 2>/dev/null || break; sleep 1
    done
    wait $CF; echo "$(date '+%F %T %Z') cloudflared exited ($?); restarting in 5s" >> "$LOG"
    tail -5 "$LOG.cf" >> "$LOG"; rm -f "$URLF"; sleep 5
  done
}

case "${1:-start}" in
  start)
    if [ -f "$PIDF" ] && kill -0 "$(cat "$PIDF")" 2>/dev/null; then echo "tunnel already running (pid $(cat "$PIDF"))"; else
      [ -x "$BIN" ] || { echo "missing $BIN (download cloudflared-linux-amd64 from github.com/cloudflare/cloudflared/releases)"; exit 1; }
      nohup "$0" _run >/dev/null 2>&1 & echo $! > "$PIDF"; echo "tunnel supervisor started (pid $!)"
      for i in $(seq 45); do [ -s "$URLF" ] && break; sleep 1; done
    fi
    "$0" url ;;
  _run) supervise ;;
  stop) [ -f "$PIDF" ] && kill "$(cat "$PIDF")" 2>/dev/null; pkill -f "$BIN tunnel" 2>/dev/null; rm -f "$PIDF" "$URLF"; echo stopped ;;
  status) [ -f "$PIDF" ] && kill -0 "$(cat "$PIDF")" 2>/dev/null && echo "supervisor pid $(cat "$PIDF")" || echo "supervisor not running"; pgrep -af "$BIN tunnel" || true; cat "$URLF" 2>/dev/null || echo "no url yet" ;;
  url) [ -s "$URLF" ] && echo "$(cat "$URLF")/?key=$(cat "$DIR/.access-key")" || { echo "no tunnel URL yet (see tunnel.log)"; exit 1; } ;;
  *) echo "usage: $0 start|stop|status|url"; exit 1 ;;
esac
