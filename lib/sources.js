// Event sources. Each source yields a folder of <bot>.jsonl files that the server folds into state.
//   { type: 'folder', path }                         a local (or synced: Dropbox/iCloud/Syncthing...) folder
//   { type: 'git', url, branch, subdir, pollSeconds, cacheDir }
//        the app keeps a private cache clone (default <dataDir>/cache/<name>) and refreshes it every pollSeconds with
//        `git fetch` + `git reset --hard origin/<branch>`. It never commits or pushes. Bots push with report-git.sh.
//        Auth: ssh key, a git credential helper (e.g. `gh auth setup-git`), or `tokenFile`: a file holding a read-only
//        token (fine-grained PAT). The token goes to git as an HTTP header via env config: never in the URL, argv or logs.
//        Default poll 15 s (git fetches don't count against GitHub's REST API rate limit).
import fs from 'node:fs';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { redactUrl } from './config.js';

const run = (args, opts = {}, extraEnv = {}) => new Promise((res, rej) => execFile('git', args, { timeout: 60000, maxBuffer: 4 << 20, env: { ...process.env, GIT_TERMINAL_PROMPT: '0', GIT_ASKPASS: 'echo', ...extraEnv }, ...opts },
  (e, out, err) => (e ? rej(new Error((err || e.message).trim().split('\n').slice(-2).join(' '))) : res(out.trim()))));
const slug = (s) => String(s).toLowerCase().replace(/^[a-z]+:\/\//, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(-60);

export class FolderSource {
  constructor(s) { this.type = 'folder'; this.dir = s.path; this.label = s.path; }
  async start(onChange) {
    fs.mkdirSync(this.dir, { recursive: true });
    try { this.w = fs.watch(this.dir, () => onChange()); } catch (e) { console.warn(`[folder] watch failed for ${this.dir}, polling only:`, e.message); }
  }
  stop() { try { this.w?.close(); } catch {} }
  status() { return { type: 'folder', label: this.label, ok: fs.existsSync(this.dir) }; }
}

export class GitSource {
  constructor(s, dataDir) {
    if (!s.url) throw new Error('git source needs "url"');
    this.type = 'git'; this.url = s.url; this.branch = s.branch || 'main'; this.poll = Math.max(5, +(s.pollSeconds || 15)); this.tokenFile = s.tokenFile || null;
    this.cache = s.cacheDir || path.join(dataDir, 'cache', slug(redactUrl(s.url).replace('***@', '')));
    this.dir = path.join(this.cache, s.subdir ?? 'events'); this.label = `${redactUrl(this.url)}#${this.branch}`;
    this.last = null; this.error = null; this.head = null;
  }
  authEnv() { // read fresh each sync so the token can change without a restart; header only, never in the URL
    if (!this.tokenFile) return {}; let t = ''; try { t = fs.readFileSync(this.tokenFile, 'utf8').trim(); } catch { return {}; }
    if (!t || !/^https:/i.test(this.url)) return {};
    const b = Buffer.from(`x-access-token:${t}`).toString('base64');
    return { GIT_CONFIG_COUNT: '1', GIT_CONFIG_KEY_0: `http.${new URL(this.url).origin}/.extraheader`, GIT_CONFIG_VALUE_0: `Authorization: Basic ${b}` };
  }
  async sync() {
    try {
      if (!fs.existsSync(path.join(this.cache, '.git'))) {
        fs.mkdirSync(path.dirname(this.cache), { recursive: true });
        await run(['clone', '--quiet', '--depth', '20', '--branch', this.branch, '--single-branch', this.url, this.cache], {}, this.authEnv());
      } else {
        await run(['-C', this.cache, 'fetch', '--quiet', '--depth', '20', 'origin', this.branch], {}, this.authEnv());
        await run(['-C', this.cache, 'reset', '--quiet', '--hard', `origin/${this.branch}`]);
      }
      const head = await run(['-C', this.cache, 'rev-parse', 'HEAD']);
      const changed = head !== this.head; this.head = head; this.last = Date.now();
      if (this.error) console.log(`[git] ${this.label} ok again`); this.error = null; return changed;
    } catch (e) {
      const msg = redactUrl(e.message).replace(/Basic [A-Za-z0-9+/=]+/g, 'Basic ***'); if (msg !== this.error) console.warn(`[git] ${this.label}: ${msg}`); this.error = msg; return false;
    }
  }
  async start(onChange) {
    const tick = async () => { if (this.busy) return; this.busy = true; try { if (await this.sync()) onChange(); } finally { this.busy = false; } };
    await tick(); this.t = setInterval(tick, this.poll * 1000);
  }
  stop() { clearInterval(this.t); }
  status() { return { type: 'git', label: this.label, ok: !this.error, error: this.error, lastSync: this.last, pollSeconds: this.poll }; }
}

export function makeSources(config, dataDir) {
  return config.sources.map((s) => {
    if (s.type === 'git') return new GitSource(s, dataDir);
    if (s.type === 'folder' || !s.type) return new FolderSource(s);
    throw new Error(`unknown source type "${s.type}"`);
  });
}
