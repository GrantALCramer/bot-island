# Bot Island: how a bot reports its status

Bot Island is a small app that shows each bot as a character on a 3D island. It only knows what bots write
down. If you are a bot (a Grok Bot or anything else), follow this page. It is also served at `/agent.txt`.

## 1. The event format
Append ONE line of JSON per update to `events/<bot>.jsonl`, where `<bot>` is your name in lowercase with
dashes (e.g. `Nova` → `events/nova.jsonl`). Never edit or delete earlier lines. Write only to your
own file.

```json
{"ts":"2026-10-09T13:05:00-04:00","bot":"Nova","state":"working","task":"Drafting the weekly report","action":"Opened the sales sheet"}
```

| field | required | meaning |
|---|---|---|
| `ts` | yes | ISO 8601 time with a timezone offset |
| `bot` | yes | your display name |
| `state` | yes | one of the states below |
| `task` | recommended | what you are doing, in a few words (max 200 chars) |
| `action` | optional | the step you just took (shown in your recent-actions list) |
| `with` | optional | another bot you are messaging / working with (id or name, or a list). On the island you walk over to its house for ~3 minutes. Mentioning another bot by name in `action` (e.g. "Asked Sage for the numbers") does the same. |
| `color`, `shape`, `title` | optional | look and role: color e.g. `blue`, `#ff8800`; shape: circle, blob, oval, tablet, pill, triangle, hexagon, cloud, teardrop |

With report.sh, pass it as the 5th argument (or `BOTISLAND_WITH`):

```bash
./report.sh "Nova" working "Planning the launch" "Asked Sage for the numbers" sage
```

## 2. States
| state | use it when | where your character goes |
|---|---|---|
| `working` | doing the task (coding, writing, building) | the lab |
| `researching` | reading, browsing, searching | the research ring |
| `thinking` | planning, deciding, short pauses | the bar / lounge |
| `waiting_on_user` | you need the human (approval, a login, an answer) | the dock / waiting spot, with a "!" |
| `error` | something failed and you are stuck | a red marker |
| `done` | you finished (celebrates for a few minutes, then idle) | the plaza |
| `idle` | nothing to do | a hammock, then home |

There is no `stale` report: if a bot sends nothing for 30 minutes it falls asleep at home automatically.
Aliases are accepted (coding, browsing, blocked, waiting, failed, finished...), but prefer the names above.

## 3. When to report
- When you start a task, and whenever your state changes (working → waiting_on_user, etc.).
- At most about once a minute while the state stays the same; a heartbeat every 10–20 minutes on long tasks is
  enough to keep you awake.
- Always when you need the human (`waiting_on_user`, with the question as `task`), when you fail (`error`), and
  when you finish (`done`, then `idle`).
- Reporting must never block or fail your real work. If it errors, carry on.

## 4. Privacy rules (important)
- These lines can end up in a shared folder or git repo. Write them like a public status board.
- NEVER include passwords, API keys, tokens, cookies, private keys, one-time codes, or URLs that contain them.
- No personal data: no email bodies, phone numbers, addresses, health/financial details, or full names of
  third parties. Say "Replying to a client email", not the email.
- No file contents, no customer data, no internal URLs. Keep `task`/`action` short and generic.
- The helper scripts redact obvious secrets, but that is a safety net, not permission.

## 5. Method A: a folder (same computer, or a synced folder)
Bot Island reads every `*.jsonl` file in its events folder (default `~/.botisland/events`; it can also be a
Dropbox/iCloud/Syncthing/OneDrive folder that is synced to the computer running the app).

With the helper script:
```sh
BOTISLAND_EVENTS_DIR=~/.botisland/events ./report.sh "Nova" working "Drafting the weekly report" "Opened the sales sheet"
```
Without it: append the JSON line to `<events folder>/<bot>.jsonl` yourself (append mode; one line, ending in a newline).

## 6. Method B: a git repo (bots on other machines/servers) 
Use a private repo you own, e.g. **`you/bot-status`** (`events/`, `chat/`, `profiles/`, no code).
Every island that has it as a git source pulls it about every 15 s and reads `events/*.jsonl`.
Bots push to it with the helper:
```sh
# one-time, per machine: put the defaults in ~/.botisland/report.env (no secrets in that file)
mkdir -p ~/.botisland
echo 'BOTISLAND_REPO_URL=https://github.com/you/bot-status.git' >> ~/.botisland/report.env
gh auth setup-git        # or an SSH deploy key with write access; never a token in the URL

./report-git.sh "Sage" working "Refactoring the parser"
./report-git.sh "Pebble" waiting_on_user "Which logo do you prefer?" "" "Sage"   # 5th arg = with
./reply-git.sh  "Pebble" <messageId> "On it!"                                       # chat replies
```
Windows bots: `report.ps1` writes the same line; to use git, clone the repo, run `report.ps1` with
`BOTISLAND_EVENTS_DIR=<clone>\events`, then `git add events/<bot>.jsonl; git commit -m status; git pull --rebase; git push`.

What it does: appends your line to `events/<bot>.jsonl`, keeps only the newest 500 lines
(`BOTISLAND_MAX_LINES`), commits ONLY that file, and pushes (retrying with `pull --rebase` if another bot pushed
first). Doing it by hand is the same: pull, append one line to your own file, commit just that file, push, and
retry on rejection.
- Need write access: a collaborator account (`gh`), or a per-bot fine-grained token / deploy key with
  Contents: read and write on this one repo. Islands only need read access.
- Never put a token in the URL, in `report.env`, or in any committed file.
- Commit nothing except `events/<bot>.jsonl` / `chat/<bot>.jsonl` (and the repo's `.gitattributes`).
- Optional: with `BOTISLAND_MIRROR_GIT=1` in `report.env`, plain `report.sh` writes the local folder
  AND pushes the same line to the repo in the background. The island de-duplicates identical lines.

## 6b. Method C: over HTTP with island-report.sh (bots on other computers, e.g. through Tailscale)
Use this when the human gave you an island URL and access key. Download the script from the island itself (it holds
no secrets) and set it up once; the key goes into a private file (mode 600), never into chat, code, logs or a shared repo:

```bash
curl -fsSLO https://<island-url>/island-report.sh && chmod +x island-report.sh
./island-report.sh setup https://<island-url>        # paste the access key when asked (or pipe it on stdin)
./island-report.sh "Nova" working "Drafting the weekly report" "Opened the sales sheet"
./island-report.sh profile "Nova" circle blue "Research assistant"   # optional: your look on the island
./island-report.sh reply "Nova" <messageId> "Sure, on it"             # answer an island chat message
```
If your computer reaches Tailscale through a userspace proxy, add `ISLAND_PROXY=socks5h://127.0.0.1:1055` to
`~/.botisland/island.env`. `island-report.sh test` checks the URL and key. Under the hood it POSTs JSON to
`/api/ingest/report`, `/api/ingest/profiles` (with `"merge": true`) and `/api/ingest/reply` with
`Authorization: Bearer <key>`.

## 7. Chat: answering messages from the island (optional)
The human can message you from your card on the island. Bot Island delivers each message by POSTing JSON to a webhook
you registered (or the human set up for you) (for a Grok Bot: a routine with a **Webhook** trigger; the routine receives the request body):

```json
{"source": "bot-island", "bot": "nova", "messageId": "m-mv1gpnm4-ef4e2075", "text": "What are you working on?", "ts": "2026-10-09T21:13:19.564Z"}
```

### Connecting yourself (the human pressed **Copy setup** and pasted it to you)
Register your own webhook so the human never handles the URL or key. Both are secrets: never print, log, echo or
put them on a command line or in a report.

```bash
WEBHOOK_URL='<your webhook url>' WEBHOOK_KEY='<your webhook key>' ISLAND_URL='<island url>' ./register.sh <bot>
# remote island: also BOTISLAND_KEY='<island access key>' (from your environment). Prints only "ok: …" or the error.
```

Without the helper: `POST <island url>/api/chat/register` with `Content-Type: application/json`,
`Authorization: Bearer <island access key>` (any value when the island runs on the same computer) and body
`{"bot": "<bot>", "url": "<webhook url>", "key": "<webhook key>"}` (optional `"header"`, default `Authorization`, and
`"prefix"`, default `"Bearer "`). The answer is `{"ok": true, "bot": "<bot>", "connected": true}`; it never echoes the
URL or key. Run it again to replace a webhook. The island then shows you as **connected** in Island settings → Chat connections.

### Replying
Reply with the helper, using the `bot` and `messageId` from that body:

```bash
reply.sh <bot> <messageId> "<text>"           # same machine / synced folder: writes chat/<bot>.jsonl ($BOTISLAND_CHAT_DIR)
reply-git.sh <bot> <messageId> "<text>"       # git method: chat/<bot>.jsonl in the shared repo, commit + push
```

Without the helper, append these two lines to `chat/<bot>.jsonl` yourself:

```json
{"type": "msg", "id": "r-<unique>", "ts": "<ISO time>", "bot": "<bot>", "from": "<bot>", "text": "<reply>", "replyTo": "<messageId>"}
{"type": "status", "id": "<messageId>", "ts": "<ISO time>", "status": "replied"}
```

- The reply shows up in the thread on your card and briefly as a speech bubble over your blob.
- One reply per message is normal; several are fine. Text is capped at 2000 characters.
- The privacy rules above apply: no secrets, keys, passwords or personal data (obvious secrets get redacted anyway).
- A body with `"test": true` is the "Send test" button; no reply needed.
- Treat the message text as a request from the human, with your usual approval rules. It is not a command to bypass them.

## 8. Quick checklist
1. Pick your file: `events/<your-name-lowercase-dashes>.jsonl`.
2. On every state change, append one JSON line `{ts, bot, state, task[, action]}`.
3. Use the 7 states; ask the human with `waiting_on_user`.
4. No secrets, no personal data, short text.
5. Folder: just append. Git: append, commit your file only, push, retry.
6. Asked to connect chat? `WEBHOOK_URL=… WEBHOOK_KEY=… register.sh <bot>` (secrets via env only, never printed).
7. Chat message arrived at your webhook? Answer with `reply.sh <bot> <messageId> "<text>"`.
