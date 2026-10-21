// Update checks against GitHub Releases + one-click update for systemd installs.
// - check(): GET https://api.github.com/repos/<repo>/releases/latest (optional GITHUB_TOKEN for a private repo), every 6 h.
// - Install modes (BOTISLAND_INSTALL): systemd = one-click (a root helper does the swap, see deploy/update.sh),
//   docker = show the compose command, desktop = the Windows app updates itself, anything else = manual instructions.
// - apply() never installs anything itself: it only writes <dataDir>/update-request.json {version}. The root helper
//   (botisland-update.path -> deploy/update.sh) downloads that exact official release from GitHub, verifies it against
//   the release's SHA256SUMS, keeps the previous version, restarts, health-checks and rolls back on failure.
import fs from 'node:fs'; import path from 'node:path';

const parse = (v) => String(v || '').replace(/^v/i, '').split(/[.+-]/).slice(0, 3).map((x) => parseInt(x, 10) || 0);
export const newer = (a, b) => { const x = parse(a), y = parse(b); for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return x[i] > y[i]; return false; };
export const VERSION_RE = /^\d+\.\d+\.\d+$/;

export function installMode() {
  const m = String(process.env.BOTISLAND_INSTALL || '').toLowerCase();
  if (process.versions.electron) return 'desktop';
  if (['systemd', 'docker'].includes(m)) return m;
  if (fs.existsSync('/.dockerenv')) return 'docker';
  return 'manual';
}

export function makeUpdater({ version, repo, dataDir, enabled = true, log = console.log }) {
  const REQ = path.join(dataDir, 'update-request.json'); const STATUS = path.join(dataDir, 'update-status.json');
  const mode = installMode();
  const st = { current: version, latest: null, available: false, notes: '', url: null, checkedAt: 0, error: null, mode, repo, enabled: !!(enabled && repo) };
  const readStatus = () => { try { return JSON.parse(fs.readFileSync(STATUS, 'utf8')); } catch { return null; } };
  async function check() {
    if (!st.enabled) return st;
    try {
      const h = { accept: 'application/vnd.github+json', 'user-agent': 'bot-island/' + version };
      if (process.env.GITHUB_TOKEN) h.authorization = 'Bearer ' + process.env.GITHUB_TOKEN;
      const r = await fetch(`https://api.github.com/repos/${repo}/releases/latest`, { headers: h, signal: AbortSignal.timeout(10000) });
      if (r.status === 404) throw new Error('no published release yet (or the repo is private: set GITHUB_TOKEN)');
      if (!r.ok) throw new Error('GitHub answered HTTP ' + r.status);
      const j = await r.json(); const tag = String(j.tag_name || '').replace(/^v/i, '');
      st.latest = VERSION_RE.test(tag) ? tag : null; st.available = !!st.latest && newer(st.latest, version);
      st.notes = String(j.body || '').slice(0, 2000); st.url = j.html_url || null; st.error = null;
    } catch (e) { st.error = String(e.message || e); }
    st.checkedAt = Date.now(); return st;
  }
  function status() {
    const s = readStatus(); const pending = fs.existsSync(REQ);
    return { ...st, canApply: mode === 'systemd', pending, last: s };
  }
  function apply() {
    if (mode !== 'systemd') return { error: 'one-click update is only for the Linux (systemd) install' };
    if (!st.available || !VERSION_RE.test(st.latest || '')) return { error: 'no update available' };
    fs.writeFileSync(REQ, JSON.stringify({ version: st.latest, requestedAt: new Date().toISOString() }) + '\n');
    log(`[update] requested ${version} -> ${st.latest}`); return { ok: true, version: st.latest };
  }
  let timer = null;
  const start = () => { if (!st.enabled) return; setTimeout(check, 5000).unref?.(); timer = setInterval(check, 6 * 3600e3); timer.unref?.(); };
  const stop = () => clearInterval(timer);
  return { check, status, apply, start, stop };
}
