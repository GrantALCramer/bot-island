# Bot Island: developer reference

# Bot Island: a 3D blob island for watching Grok Bots

A tropical island where each bot is a little blob that walks to a spot based on what it's doing: holo screens in
the lab, the research ring, the tiki bar, or the end of the dock when it needs you. Each bot has its own over-water
bungalow and sleeps in its own bed. The world is driven by a **theme** (see "Themes" below). Eight are fully built:
`tropical` (default), `antarctica` (igloos, ice-cave lab, cocoa hut, icebreaker, aurora), `atlantis` (glass domes,
biolum lab, clam lounge, submarine dock, kelp, god rays), `jungle` (treehouses with rope bridges, temple lab,
waterfall, river canoe), `moon` (base pods with bunks, hab dome lab, dish array, mess module, landing pad + lander,
Earth in the sky, earthlight nights, floaty low-gravity hops), `heaven` (marble gazebos with cloud beds, marble temple,
floating book ring, nectar fountain, pearly gates, halos + wings), `hell` (obsidian cabins with ember beds, forge,
rune ring of flames, lava hot spring, Styx ferry, volcanoes, tiny horns) and `sakura` (old-school Japan: minka houses
with shoji walls and futons in the bot's color, wooden dojo lab with paper-lantern holo screens, floating-scroll library,
tea house with tatami and tea cups, vermilion torii pier with a sampan, stone-lantern garden plaza, cherry trees shedding
petals, maples, bamboo, koi pond with a red arched bridge, zen sand garden, five-story pagoda, Mt. Fuji, straw hats). Every theme also has a **Surroundings**
setting: Water (its sea) or Land (terrain to the horizon); see "Surroundings". The island **resizes itself to the number of bots** (see "Dynamic scaling").

Bot Island is a **local app**: each person runs it on their own computer. No account, no VPN, no cloud service.
It serves on `127.0.0.1` only, opens your browser, and stops when you quit. Bots write their status to a place the
app can read: a folder (local or synced) or a git repo they push to. Phone access is optional and off by default.

## Run it on your own computer
Needs Node.js 18+ and git (git only for the git source).
1. Get the code and install: `git clone <this repo> botisland && cd botisland && npm install`
2. Start it: `npm start` (same as `node cli.mjs`). The first run asks one question: where do your bots report?
   - **1) a folder on this computer** (default `~/.botisland/events`): bots on the same machine write there.
   - **2) another folder**: e.g. a Dropbox / iCloud / OneDrive / Syncthing folder that bots on other machines write to.
   - **3) a git repo**: a private repo (GitHub etc.) the bots push to; the app pulls it every 30 s.
   It builds the frontend the first time, starts on http://127.0.0.1:8787 and opens your browser. **Ctrl+C quits.**
3. Tell your bots how to report: give them [`AGENT_REPORTING.md`](AGENT_REPORTING.md) (also served at
   http://127.0.0.1:8787/agent.txt). Folder bots run `report.sh`; remote bots run `report-git.sh` (or just append
   one JSON line to their own `events/<bot>.jsonl`).
4. Until a real bot reports, a few demo bots play on the island (marked DEMO).

Change your answers with `npm run setup`, or edit `~/.botisland/botisland.config.json`
(see `botisland.config.example.json`). Everything Bot Island stores lives in `~/.botisland/`
(`%APPDATA%\BotIsland` on Windows; override with `BOTISLAND_HOME`).

### Configuration
Precedence: built-in defaults < config file < environment < command line.

| setting (config file) | env | CLI | default |
|---|---|---|---|
| `port` | `BOTISLAND_PORT` | `--port` | 8787 (always bound to 127.0.0.1) |
| `openBrowser` | `BOTISLAND_OPEN=0/1` | `--no-open` / `--open` | true (launcher only; `node server.js` never opens one) |
| `eventsDir` | `BOTISLAND_EVENTS_DIR` | `--events-dir` | `~/.botisland/events` |
| `sources` | | | `[{type:"folder", path: eventsDir}]` |
| `agentsDir` | `BOTISLAND_AGENTS_DIR` | `--agents-dir` | none (optional `<id>/profile.json` folder for names/looks) |
| `staleMinutes`, `doneMinutes` | `BOTISLAND_STALE_MIN` | | 30, 3 |
| `demo` | `BOTISLAND_DEMO` | `--demo auto/on/off` | auto |
| `remote.enabled/port/keyFile/tunnel/cloudflared` | `BOTISLAND_REMOTE=1` | `--remote`, `--tunnel` | off, 8797, `~/.botisland/access-key`, off |

Config file: `--config <file>`, else `$BOTISLAND_CONFIG`, else `~/.botisland/botisland.config.json`. Relative paths
in a config file are relative to that file. Older short env names (`PORT`, `EVENTS_DIR`, `AGENTS_DIR`, `DEMO`,
`PUBLIC_PORT`) still work for the dev scripts.

### Sources
- **Folder:** `{ "type": "folder", "path": "~/Dropbox/bot-status/events" }`. The app watches it, and also re-reads every 10 s.
- **Git:** `{ "type": "git", "url": "git@github.com:you/bot-status.git", "branch": "main", "subdir": "events", "pollSeconds": 30 }`.
  The app keeps its own cache clone in `~/.botisland/cache/` and runs `git fetch` + `reset --hard origin/<branch>`
  on it. It never commits or pushes. Use SSH keys or a credential helper; don't put tokens in the URL (if you do,
  it only lives in your local config, and logs/UI show it as `***`). Errors show in Island settings → "Bots report to".
- Several sources can be combined; events are merged by time.

Bots on the git method use `report-git.sh` (`BOTISLAND_REPO_URL`, `BOTISLAND_REPO_DIR`, `BOTISLAND_BRANCH`,
`BOTISLAND_MAX_LINES`=500). Each bot appends to and commits only `events/<bot>.jsonl`, the repo gets
`*.jsonl merge=union` in `.gitattributes`, and pushes retry with `pull --rebase` (5 tries, backoff). Both helpers
redact obvious secrets (API keys, tokens, `password=`...). Test: `npm run test:git` (bare repo in /tmp, two
simulated machines pushing concurrently plus the same bot from both, app polling every 5 s).

### Phone access (optional, off by default)
`--remote` (or `"remote": {"enabled": true}`) adds a second listener on 127.0.0.1:8797 where **every** request needs
the access key (generated into `~/.botisland/access-key`, mode 600). `--tunnel` / `"tunnel": true` also starts a
Cloudflare quick tunnel to it (needs the `cloudflared` binary, no account) and prints the private phone link
`https://<random>.trycloudflare.com/?key=...`. Opening it once sets a long-lived HttpOnly cookie and drops the key from the address bar.
Quick-tunnel URLs change every time it restarts. The main port never accepts the key from the network: only direct
loopback requests with a 127.0.0.1/localhost Host header and no proxy headers get in without it (this also blocks
DNS-rebinding pages). Failed key attempts are rate limited, and `/api/demo/reset` is local-only.

### Packaging later (not built yet)
- **Single binary:** `bun build --compile` or Node SEA / `pkg`, with `dist/` embedded. This gives a one-file download
  per OS without needing Node installed.
- **Desktop app:** Tauri (small) or Electron (bigger, simplest) wrapping `startServer()` from `server.js`, with a tray icon
  and start-at-login. That replaces the browser tab with a window and makes "quit" obvious.
- **npm:** `npx botisland` works once published (`bin` → `cli.mjs`). Ship a prebuilt `dist/` so users don't need the
  Vite dev dependencies.

## How it works
```
bots ──report.sh──────▶ events folder (local/synced) ─fs.watch─┐
bots ──report-git.sh──▶ git repo ──app pulls every 30 s──▶ cache ┴▶ server.js (fold) ──WebSocket /ws──▶ React Three Fiber island
optional agentsDir/*/profile.json ──▶ names, avatarShape, avatarColor (read-only)
```
- `GET /api/state` returns the current snapshot. `/ws` pushes a snapshot on every change, plus every 15 seconds.
- **Demo mode:** `demo: "auto"` (the default) runs fake bots while no source contains any `*.jsonl` events. As soon as a real event file exists, demo turns off: only real bots plus profile bots are shown. `DEMO=on` and `DEMO=off` force it either way. `GET /api/demo/reset` restarts the demo.
- **Bots from `profile.json`** in `agentsDir` always appear. In demo mode they're driven by demo events. In real mode they show "no reports yet" (asleep at home) until they report.

## Where blobs go (tropical theme)
| state | where | look |
|---|---|---|
| `working` | Holo Lab deck: its own floating cyan screen (code, graphs, radar) | typing hands, bob, sparks; its screen brightens |
| `researching` | Research Ring: a rotating ring of holo panels | floating book, ring spins faster |
| `thinking` | Tiki Bar stool | coconut drink + sway |
| `waiting_on_user` | End of the dock | red "!" + pulsing ring; the dock flag runs up the pole |
| `error` | Holo Lab | shake + smoke puff |
| `done` | Campfire circle (beach plaza) | jumping + confetti |
| `idle` | Hammock between palms for the first 45 s (if one is free), then its own bed | lying down, awake |
| `stale` | Its own bed in its bungalow | tucked in, eyes closed, Zzz |

At night the campfire, tiki torches, dock lantern and bungalow lanterns light up and fireflies come out.
Selecting a bot or zooming the camera close to a bungalow fades its roof so you can see inside.

Aliases accepted: coding/writing/building → working · browsing/reading/research → researching · planning/break/cafe → thinking · waiting/blocked/needs_you → waiting_on_user · failed → error · finished/complete → done · sleeping/asleep → stale.
Automatic changes: no report for `STALE_MIN` minutes (default 30) turns a bot to stale. `done` turns to idle after `DONE_MIN` minutes (default 3).

## Dynamic scaling
`src/world/layout.js` `buildLayout(theme, nBots, room)` is theme-agnostic and rebuilds the world whenever the bot count changes:
- **Fixed-size pieces, variable count.** Structures and blobs never scale. `CAPACITY` turns the bot count into the number of
  shared slots per zone (work ≈ n/1.5, research n/3, social n/2.5, waiting n/3, lounge n/5, plaza n/2.5, with minimums). Each
  zone type (`ZONE_TYPES`) has a fixed footprint and slots per instance, so more bots means more holo decks, bars, docks, hammocks.
  Every bot gets exactly one home (`HOME_TYPES`); homes are added and removed automatically.
- **Search for the smallest island.** Starting at `terrain.minR`, R grows in 0.5 steps until everything fits: homes go in one
  or two rows around the shore inside the theme's `homes.arc`, which can widen up to `maxArc` and skips the dock corridors. Zone instances are packed
  in their sector (`angle`, `frac`, `span`; the span widens ×1.6 / ×2.4 if needed) between the plaza and the outer walking ring,
  with no overlaps (homes, home spokes and dock corridors are blockers).
- **Everything else follows R / extent:** terrain profile (`terrain.rel` is relative to R), beach, grass, shoreline, ocean
  wave suppression, vegetation bands (avoiding paths, zones and the camera view), clouds, rain/snow volume, stars, fog
  (`fog` values are multiples of the camera distance) and the camera (`camDist = 1.85 × extent`, eased when the layout changes).
- **Island size setting:** Auto (smallest fit) or M / L / XL / slider (`room` 0–1, also `?room=0.45`): adds that fraction of extra radius.
- Rough sizes (R in world units): tropical 11.5 for 1–9 bots, 16.5 for 20 and 19.5 for 40 (two rows of bungalows). Antarctica/Atlantis are about 12.5 / 14.5 / 20.5 / 29 for 3 / 9 / 20 / 40 bots, and jungle is 13 / 15.5 / 23 / 33.

## Event format (one JSON object per line, in `events/<bot-slug>.jsonl`)
```json
{"ts":"2026-10-08T22:01:05-04:00","bot":"Nova","state":"working","task":"Building Bot Island v1","action":"Wrote server.js"}
```
| field | required | meaning |
|---|---|---|
| `bot` | yes (or file name) | Bot name. It's slugified (`Nova` → `nova`) and matched to `profile.json` names. |
| `state` | recommended | One of the states above (or an alias). |
| `task` | optional | The current task, shown in the speech bubble and card. |
| `action` | optional | A line for the "recent actions" list. Defaults to `state: task`. |
| `ts` | optional | ISO time. Defaults to now. |
| `name`, `title`/`role`, `shape`, `color` | optional | Override the display name, role, avatar shape, or color (named color or `#hex`). |

## Helpers for bots
The full bot-facing spec (states, when to report, privacy rules) is [`AGENT_REPORTING.md`](AGENT_REPORTING.md), served at `/agent.txt`.
```bash
./report.sh <bot> <state> "<task>" ["<action note>"]          # folder: $BOTISLAND_EVENTS_DIR, else ./events next to the script
./report.sh "Nova" working "Drafting the weekly report"
./report-git.sh Sage waiting_on_user "Approve the email draft?"  # git: $BOTISLAND_REPO_DIR / $BOTISLAND_REPO_URL
```
`BOTSIM_EVENTS_DIR` (old name) still works.

## Chat with a bot
Open a bot's card: under the task there is a chat thread and an input box (Enter sends, Shift+Enter is a new line).
- **Sending:** the server stores the message in `chat/<bot>.jsonl` (config `chatDir`; default `~/.botisland/chat`) and POSTs `{"source":"bot-island","bot","messageId","text","ts"}` to that bot's webhook.
  Status shows under each message: sending → delivered (2xx) / failed (with the HTTP code) → replied.
- **Connecting a bot:** Island settings → **Bot chat connections** → the bot → paste the webhook URL and sender key → Save → **Send test**
  (shows the HTTP status; for a Grok Bot routine a test starts a real run). For a Grok Bot: open the bot → View conversation details →
  Routines → add a routine with a **Webhook** trigger, save it, then copy its *POST to* URL and *key*. Give the routine an instruction like:
  *"The body is a Bot Island chat message from the user. Answer it, then run `<install dir>/reply.sh <bot> <messageId> "<your reply>"`
  with the bot and messageId from the body."*
- **Header:** Grok Bot routine webhooks take the key as `Authorization: Bearer <key>` (the default). Other receivers: change the header
  name and value prefix under "Header options".
- **Secrets:** URLs and keys are stored only in `chatWebhooksFile` (default `~/.botisland/chat-webhooks.json`, chmod 600, outside the repo).
  The browser only ever sees "key saved" and a masked URL; the server never logs them. https only (plain http only to 127.0.0.1),
  redirects are refused so the key can't be forwarded.
- **Replies:** the bot runs `./reply.sh <bot> <messageId> "<text>"` (writes `$BOTISLAND_CHAT_DIR`, else `chat/` next to the script) or
  `./reply-git.sh ...` (git source: `chat/<bot>.jsonl` in the shared repo). The reply is pushed over the WebSocket into the thread, shows
  as a speech bubble for a few seconds, and adds an unread badge on the roster row, the blob's name tag and the card until you look.
  Replies are secret-redacted and capped at 2000 characters, like `report.sh`.
- **Safety:** chat endpoints sit behind the same key/cookie as everything else. Sends are rate limited (10/min, 120/h per client). Writes
  are POST only, need a JSON body and a same-origin request (Origin/Sec-Fetch-Site checked), so other websites can't post for you.
- **Test:** `tools/test-chat.mjs` drives a headless browser against a test server and a fake webhook receiver (see the file header).

## UI
- Drag to orbit and scroll to zoom. Click a blob, its bungalow, or a roster row to open its card (role, state, task, last 10 actions in ET); the camera follows it.
- **Island settings** (bottom left): theme, surroundings (Water / Land), island size (Auto / M / L / XL / slider), time of day (🕒 Auto follows Eastern time, 🎚 Slider, or 🎲 Random: its own world clock that starts at a random hour and runs at 1 world hour per 1/3/5/10 real minutes, default 3), weather (the options depend on the theme; tropical has Clear / Cloudy / Rain / Thunderstorm / Fog; 🎲 Random picks one every 10 to 30 minutes, mostly clear, and blends over about 10 s), speech bubbles, and glow (bloom). Settings are saved in localStorage.
- **URL overrides** (not saved): `?hour=22&weather=rain&theme=tropical&glow=0&room=0.45&surround=land`, `?time=random&h0=17.5&rate=1&weather=random`, `?select=sage`, `?settings=1`, `?ui=0`, `?cam=x,y,z,tx,ty,tz`.
- Turn **Glow** off if the page feels slow on a weak GPU. Bloom is the most expensive effect.

## Surroundings (Water / Land)
Island settings → Surroundings, saved with the other settings; URL override `?surround=land` / `?surround=water`.
`src/world/surround.js` applies it *after* `buildLayout`, so positions, scaling and slots are identical in both modes;
only the ground beyond the island and the water change. Each theme has a `surround: { water: {...}, land: {...} }` block:
`label`, optional `water` overrides, and for land `colors` (plain colors), `hills` ([near, far] amplitude), `craters`,
`pond` (keep a ring of water/lava between island and plain so docks/bungalows/ferries still make sense) and `scatter`
(`[[kind, count, size]]` from `SCATTER` in `src/world/Surround.jsx`).

| theme | Water | Land |
|---|---|---|
| tropical | Ocean | Dunes + lagoon (pond ring, palms, dune grass, rocks) |
| antarctica | Icy sea | Snowfield + ice lead (pond ring, drifts, ice rocks) |
| atlantis | Abyss drop-off (seafloor falls away into dark water) | Seafloor plain (no pond; sub dock sits on sand) |
| jungle | River lake | Jungle floor + pond |
| moon | Frozen ice sea (ice sheet) | Regolith plains (craters, boulders; landing pad on the ground) |
| heaven | Cloud sea | Cloud bank (cloud puffs, ruins, golden trees; gates on the ground) |
| hell | Lava sea | Basalt plains + lava moat (Styx ferry stays on the moat) |
| sakura | Lake | Rolling hills + rice paddies (pond ring keeps the torii pier on water; paddies, tea rows, cherry trees, pines) |

## Themes
A theme is a plain JS config in `src/themes/<id>.js`. It names world pieces, and `src/world/registry.js` maps those names to components.
Bot and status logic never reads theme files. It only receives *slots* (position, facing, pose, approach path) that `src/world/layout.js` builds from the theme's zones.

| key | what it controls |
|---|---|
| `terrain` | `component` (e.g. `BeachTerrain`), radial height `profile` `[[radius, height]...]`, `grassR`, ground `colors` (grass, sand, wet sand, path, rock) |
| `water` | `component` (`Ocean`), `level`, `shallow`/`mid`/`deep`/`foam` colors, `waveAmp`. Set it to `null` for no water. |
| `sky` | Keyframes `[hour, zenith, horizon, sunColor]`. These drive the sky dome, fog color, lights and water reflections. |
| `sun` | `riseHour`, `setHour`, `setAzimuth` (where the sun sets, relative to the camera). |
| `weathers`, `defaultWeather` | Which presets from `src/world/Sky.jsx` `WEATHER` are offered (e.g. clear, cloudy, rain, storm, snow, fog; moon: clear/meteors/duststorm/flare; heaven: clear/golden/rainbow/haze; hell: clear/ashfall/embers/eruption/smoke; sakura: clear/petals (petal storm)/springrain/mist/lightsnow). |
| `skyFx` | Sky extras: `clouds:false`, `stars:'always'`, `earth:true`, `moon:false`, `nightLight:[color, mult]`, `ambient`, `cloud`/`cloudDark` colors. |
| `surround` | Water/Land variants (see "Surroundings"). |
| `accessory` | Blob decoration: `'halo'` (halo + wings), `'horns'` or `'kasa'` (straw hat). |
| `vegetation`, `ambient` | Lists of registry names, e.g. `['PalmGrove','TropicalPlants']` and `['Fireflies']`. |
| `terrain.minR`, `terrain.rel`, `grassInset` | Smallest land radius, and the falloff profile relative to the auto radius R. |
| `zones` | `work`, `research`, `social`, `waiting`, `plaza`, `lounge`: each has a `type` (a `ZONE_TYPES` entry + registry component), `style` (component variant), sector `angle`/`angles`, `frac`, `span`, `label`. |
| `homes` | `type` (`Bungalow`, `Igloo`, `Treehouse`, `GlassDome`, `MoonPod`, `Gazebo`, `Cabin`), arc `center`/`arc`/`maxArc`, optional `bridges`. Each bot gets one home with a bed slot. |
| `lights.torch`, `gait`, `waterfall` | Torch style (tiki / ice / orb), blob walk (hop / waddle / swim / float), jungle waterfall angle. |
| `stateZones` | Bot state → zone key (e.g. `thinking: 'social'`). `home` = the bot's own bed. |
| `stateLabels`, `props` | Optional theme wording for states, and blob props (`thinking: 'coconut'`). |
| `idleLoungeSeconds`, `camera`, `fog` | Lounge time before bed, camera direction/fov, clear-weather fog range (× camera distance). |

**How to add a theme**
1. Copy `src/themes/tropical.js` to `src/themes/<id>.js`, or spread it (`{ ...tropical, id, name, ... }`) like `jungle.js` does. Change the colors, sky keys, weathers and vegetation.
2. Register it in `src/themes/index.js`. It then appears in the settings theme picker (any `status` other than `'ready'` shows a "preview" badge).
3. For new pieces (e.g. igloos), add a component to `src/world/Structures.jsx` (or a new file) and register it in `src/world/registry.js`. If it is a zone or home, also add an entry with the same name to `ZONE_TYPES` / `HOME_TYPES` in `src/world/layout.js` (fixed footprint, slots per instance, slot generator).
4. Run `npx vite build`, then open `/?theme=<id>`.

## Files
- `cli.mjs`: launcher (setup, build, start, open browser, Ctrl+C). `server.js`: event fold, auth, HTTP and WebSocket (`startServer(config)`); runs standalone too.
- `lib/config.js` (defaults/config/env/CLI), `lib/sources.js` (folder + git sources). `lib/chat.js` (chat store, webhook delivery, secrets file). `report.sh`, `report-git.sh`, `reply.sh`, `reply-git.sh`: bot helpers. `src/Chat.jsx`: chat thread, unread, connection settings. `src/random.js`: random world clock + weather. `AGENT_REPORTING.md`: bot spec.
- `config/server.config.example.json`: example server config (copy to `config/server.config.json`, used by `start.sh`). `tunnel.sh`: optional Cloudflare quick-tunnel supervisor. `tools/test-git-source.sh`: git e2e test.
- `src/App.jsx`: data, settings, camera and UI panels. `src/Blob.jsx`: characters, poses (stand/lie/hammock), walking along approach paths, effects.
- `src/themes/*`: theme configs. `src/world/`: `env.js` (theme context, sky sampling, holo shader), `layout.js` (zones → slots, bot → slot assignment), `World.jsx` (renders a theme through `registry.js`), `Ground.jsx` (terrain + ocean shader), `Sky.jsx` (sky dome, lights, weather), `Vegetation.jsx`, `Structures.jsx` (bungalow, holo lab/ring, bars, docks, plaza fires, hammocks, torches, with per-theme styles), `Themed.jsx` (igloo, treehouse + bridges, glass dome, ice floes, penguins, aurora, fish, god rays, plankton), `Waterfall.jsx` (jungle waterfall: cliff with ledges, moss + vines, two-tier layered water sheets, foam pool, mist + spray, rainbow), `Realms.jsx` (moon pod, gazebo, cabin homes; moon/heaven/hell decor, dust, sparkles, light rays, embers, volcanoes), `Sakura.jsx` (minka home, cherry trees, maples, bamboo, koi pond + bridge, zen garden, pagoda, petals), `Fuji.jsx` (Mt. Fuji: displaced stratovolcano, streaky snowcap, foothills, far lake/plain, mist, shader aerial perspective), `surround.js` + `Surround.jsx` (Water/Land surroundings, distant scatter), `parts.js` (merged vertex-colored geometry helpers), `Ambient.jsx` (fireflies, bubbles).
- `tools/scene.py`: writes a deterministic test scene. `shoot.mjs`: headless screenshots plus a virtual-time 15 s video (`BASE=http://127.0.0.1:8788 node shoot.mjs [name|video]`, run against a scene server). `probe.mjs`: one-off screenshot. `batch.mjs`: screenshot list runner (`node batch.mjs list.json`; logs fps, R, draw calls). `video.mjs`: seven-theme demo video (`node video.mjs [resumeSegment]`). Test servers: `DEMO=on DEMO_COUNT=40 AGENTS_DIR=/tmp/noagents EVENTS_DIR=/tmp/empty PORT=8788 node server.js` (`DEMO_COUNT` pads or trims the demo roster).

## Idle activities
Every few minutes (Settings → Idle activities: Rare / Normal / Often, toggle to disable), idle bots walk together to a landmark for 30–90 s: drinks at the bar/tea house (cup or coconut, sipping), the plaza fire (mostly at night), a chat huddle (moves under the bar roof in rain/snow), a stroll down the dock (day, dry), stargazing on the dock (clear nights, always on the moon) and hanami (sakura, daytime). A lone idle bot sometimes grabs a drink alone. A bot that gets busy leaves at once; stale (asleep) bots stay in bed. Force one for screenshots with `?activity=<name>` (drinks, campfire, huddle, stroll, stargaze, hanami, hottub, icebath, bubblevent, trampoline, volleyball, vineswing, snowball, seahorse, harp, marshmallow, lanternwalk) or `window.__botsim.activity('campfire')` in the console.

Theme activity structures (`fun` in each theme file; fixed size, placed by the layout engine like any zone, so the island grows if they don't fit):
| Theme | Structures / activities |
|---|---|
| Tropical | wooden hot tub, beach volleyball court |
| Jungle | mossy wooden hot tub, vine swing |
| Antarctica | heated tub, snow fort (snowball fight) |
| Atlantis | bubble vent (float in the bubble column), seahorse carousel |
| Heaven | cloud jacuzzi, harp stage |
| Hell | ice bath (bots shiver), lava pit (marshmallow roasting) |
| Moon | low-G trampoline (high bounces, flips, spins) |
| Sakura | onsen, night lantern walk to the torii pier |

## Shared status repo (git source)
Bots can report into a private git repo you own (e.g. `you/bot-status`); every island pulls it read-only every 15 s
(`git fetch`; plain git traffic, not the REST API, so far below GitHub's limits). How bots push:
`AGENT_REPORTING.md` §6. An island can read both a local `events/` folder and the repo (duplicates collapse).

**Windows app / PC (read access)**
1. Install Git for Windows (https://git-scm.com/download/win), default options. The app runs `git` to pull.
2. Make a read-only token: GitHub → Settings → Developer settings → Fine-grained tokens → Generate new token.
   Resource owner: your account; Repository access: *Only select repositories* → `bot-island-status`;
   Permissions → Repository → **Contents: Read-only** (Metadata: Read-only is added automatically). Pick an expiry.
3. Open Bot Island → ⚙ Settings → **▸ Shared git repo**. URL `https://github.com/you/bot-status.git`,
   branch `main`, paste the token, **Save**. You should see ✓ within ~15 s and the bots appear.
   The token is stored in `%APPDATA%\BotIsland\git-token` (your user profile only), used as an HTTP header for
   `git fetch`, and never sent to the page; the settings only show "token saved". *Forget token* deletes it.
   Alternative without a token: if `gh auth login` + `gh auth setup-git` (or Git Credential Manager) is set up on
   the PC, leave the token empty.
4. Phone: open the PC island's remote link as before; it shows whatever the PC island reads. No setup on the phone.

## Third-party assets

- `public/textures/earth_day_2048.jpg` and `public/textures/earth_clouds_1024.jpg` (Moon theme Earth): NASA Visible Earth "Blue Marble" (land_shallow_topo_2048, cloud_combined_2048, downscaled), NASA Goddard Space Flight Center / Reto Stöckli. NASA imagery is public domain (not copyrighted in the US); source: https://visibleearth.nasa.gov/collection/1484/blue-marble

## Windows (one click)
Bot Island runs the same on Windows: local, `127.0.0.1` only, no account, no VPN.
1. Install **Node.js 18+** (LTS from https://nodejs.org). The launcher checks this and opens the download page if it's missing.
2. Double-click **`start-botisland.bat`** (or right-click `start-botisland.ps1` → *Run with PowerShell*). The first run
   installs dependencies (skipped in the portable zip, which already includes them), asks where bots report, starts the
   server and opens your browser. Close the window or press Ctrl+C to quit. Settings and data live in `%APPDATA%\BotIsland`.
3. Bots on Windows report with **`report.ps1`** (same format and secret redaction as `report.sh`):
   `powershell -ExecutionPolicy Bypass -File report.ps1 "Nova" working "Drafting the report" "Opened the sheet"`
   It writes to `%BOTISLAND_EVENTS_DIR%`, else `%APPDATA%\BotIsland\events` (the app's default folder).
   An optional 5th argument (or `BOTISLAND_WITH`) names another bot you're talking to: you'll walk over to visit it.

**Portable zip:** `BotIsland-win-portable.zip` contains the prebuilt app (`dist/`), the server, the launchers, the
reporting scripts and the one runtime dependency (`ws`). Unzip anywhere and double-click `start-botisland.bat`; no
`npm install` or internet needed (only the optional Live weather uses the network). Electron is not used: the app is a
tiny local server plus your normal browser.

## Windows desktop app (Electron)
`desktop/` wraps the same app in a window you can pin to the taskbar. No separate Node install: Electron's own Node
runs the Bot Island server in-process on `127.0.0.1` (8787, or the next free port), the window has no browser chrome,
and closing it stops the server. Single instance (opening it again focuses the window); tray icon with Show / Open in
browser / Quit. First run needs no questions: it writes a default config that reads the local folder
`%APPDATA%\BotIsland\events`; change the folder later in **Island settings → Bots report to** (saved to the config,
applied live). All data stays in `%APPDATA%\BotIsland`, so it survives reinstalls and uninstalls.
- Build (Linux needs `wine` for the exe resources/NSIS; Windows needs nothing extra):
  `cd desktop && npm install && npm run dist:win` → `desktop/out/BotIsland-Setup-<version>.exe` (NSIS installer:
  Start menu + desktop shortcuts, per-user, choosable folder) and `BotIsland-Portable-<version>.exe`.
- Try it locally without packaging: `cd desktop && npm start`.
- The version shows at the bottom of Island settings (`/api/info`).
- **Auto-update (not built yet):** would need `electron-updater` in `main.cjs`, a `publish` target in
  `desktop/package.json` (e.g. GitHub Releases or any static URL serving `latest.yml` + the installer), and ideally a
  Windows code-signing certificate (unsigned updates still work but SmartScreen warns on each new download).
