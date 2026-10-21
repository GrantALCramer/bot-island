#!/usr/bin/env python3
"""Write a deterministic test scene of bot events (for screenshots / videos).
usage: tools/scene.py <events_dir>            -> fresh scene
       tools/scene.py <events_dir> <bot> <state> "<task>"   -> append one event now
Run a throwaway server on it:  EVENTS_DIR=<dir> DEMO=off PORT=8788 node server.js"""
import json, sys, os, datetime, glob
d = sys.argv[1]; os.makedirs(d, exist_ok=True)
now = datetime.datetime.now().astimezone()
def ev(bot, state, task, mins_ago=0, actions=()):
    f = open(os.path.join(d, bot.lower().replace(' ', '-') + '.jsonl'), 'a')
    for i, a in enumerate(actions):
        t = now - datetime.timedelta(minutes=mins_ago + len(actions) - i)
        f.write(json.dumps({"ts": t.isoformat(timespec='seconds'), "bot": bot, "state": "working", "task": task, "action": a}) + "\n")
    t = now - datetime.timedelta(minutes=mins_ago)
    f.write(json.dumps({"ts": t.isoformat(timespec='seconds'), "bot": bot, "state": state, "task": task}) + "\n")
if len(sys.argv) > 2:
    ev(sys.argv[2], sys.argv[3], sys.argv[4] if len(sys.argv) > 4 else ''); sys.exit()
for f in glob.glob(os.path.join(d, '*.jsonl')): os.remove(f)
ev("Pixel", "working", "Refactoring the landing page", 1, ["Opened repo", "Read hero component", "Split CSS into modules"])
ev("Bolt", "working", "Wiring the price tracker API", 2, ["Created fetch client", "Added retry logic"])
ev("Quill", "researching", "Summarizing 12 papers on agent UIs", 1, ["Searched arXiv", "Downloaded 12 PDFs"])
ev("Sage", "thinking", "Planning tomorrow's content calendar", 3, ["Reviewed analytics"])
ev("Nova", "waiting_on_user", "OK to post this reply on X?", 2, ["Drafted reply", "Checked tone", "Asked the user for approval"])
ev("Scout", "idle", "", 6, ["Finished inbox sweep"])
ev("Pebble", "stale", "Nightly backup", 50, ["Started backup"])
ev("Nova", "done", "Shipped the weekly report", 0, ["Compiled metrics", "Rendered charts", "Sent report"])
ev("Kai", "idle", "", 0, ["Closed ticket #42"])
