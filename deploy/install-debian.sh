#!/usr/bin/env bash
# Bot Island installer for a fresh Debian 12 / Ubuntu 22.04+ LXC container or VM (e.g. on Proxmox). Run as root:
#   bash deploy/install-debian.sh [--tailscale] [--lan]
#   --tailscale  install Tailscale and publish the island over HTTPS on your tailnet (tailscale serve)
#   --lan        listen on 0.0.0.0:8797 (key still required) instead of 127.0.0.1
set -euo pipefail
TS=0; BIND=127.0.0.1
for a in "$@"; do case "$a" in --tailscale) TS=1;; --lan) BIND=0.0.0.0;; *) echo "unknown option $a"; exit 1;; esac; done
[ "$(id -u)" = 0 ] || { echo "run as root"; exit 1; }
SRC="$(cd "$(dirname "$0")/.." && pwd)"
apt-get update
apt-get install -y curl ca-certificates git gnupg rsync
if ! command -v node >/dev/null || [ "$(node -p 'process.versions.node.split(".")[0]')" -lt 18 ]; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
fi
id botisland >/dev/null 2>&1 || useradd --system --home /var/lib/botisland --shell /usr/sbin/nologin botisland
mkdir -p /opt/botisland /var/lib/botisland
rsync -a --delete --exclude node_modules --exclude .git --exclude android --exclude desktop --exclude data "$SRC"/ /opt/botisland/
cd /opt/botisland
npm ci && npx vite build && npm prune --omit=dev
chown -R botisland:botisland /var/lib/botisland
install -m 644 deploy/botisland.service /etc/systemd/system/botisland.service
sed -i "s/^Environment=BOTISLAND_REMOTE_BIND=.*/Environment=BOTISLAND_REMOTE_BIND=$BIND/" /etc/systemd/system/botisland.service
systemctl daemon-reload
systemctl enable --now botisland
for i in $(seq 20); do [ -s /var/lib/botisland/access-key ] && break; sleep 0.5; done
if [ "$TS" = 1 ]; then
  command -v tailscale >/dev/null || curl -fsSL https://tailscale.com/install.sh | sh
  tailscale status >/dev/null 2>&1 || tailscale up
  tailscale serve --bg 8797
  echo "Tailscale URL:"; tailscale serve status | grep -o 'https://[^ ]*' | head -1
fi
echo
echo "Bot Island is running (systemctl status botisland)."
echo "Endpoint: http://$BIND:8797  (or your Tailscale/proxy URL)"
echo "Access key: $(cat /var/lib/botisland/access-key 2>/dev/null || echo 'see journalctl -u botisland')"
echo "Open:  <url>/?key=<access key>   (the key is remembered as a cookie)"
