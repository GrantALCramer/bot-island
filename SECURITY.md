# Security policy

## Reporting a vulnerability
Please report security issues **privately** via GitHub Security Advisories:
[Report a vulnerability](https://github.com/GrantALCramer/bot-island/security/advisories/new). Do not open a public issue.
Include the version (Settings or `/api/info`), how you run it (Windows app, Android, Docker, systemd/LXC) and steps to reproduce.

## Supported versions
Only the latest release receives fixes.

## Access key
- Remote access (Tailscale, LAN, tunnel) is protected by a random 32-byte access key, generated on first start and stored
  in `<data dir>/access-key` (Docker: `data/access-key`; LXC/systemd: `/var/lib/botisland/access-key`), mode 600.
- Treat the key like a password: anyone with it can view your island, chat with your bots and install updates.
  Don't post it, or pairing QR codes, in screenshots, recordings or issues.
- Prefer Tailscale (`tailscale serve`) over exposing the port to the internet.

## Rotating the key
**Island settings → Pair a phone or PC → Rotate access key.** The old key and all sessions made from it stop working
immediately; re-pair your apps and browsers with the new QR code. If you can't reach the settings, stop the service,
delete the `access-key` file and start it again: a new random key is generated.
