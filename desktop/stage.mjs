// Copies the web app + server into desktop/island/ for packaging (the repo's web build is untouched).
// Run from desktop/: `node stage.mjs` (builds ../dist first if it's missing).
import fs from 'node:fs'; import path from 'node:path'; import { spawnSync } from 'node:child_process'; import { fileURLToPath } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url)); const ROOT = path.resolve(HERE, '..'); const OUT = path.join(HERE, 'island');
if (!fs.existsSync(path.join(ROOT, 'dist', 'index.html'))) spawnSync(process.platform === 'win32' ? 'npx.cmd' : 'npx', ['vite', 'build'], { cwd: ROOT, stdio: 'inherit' });
fs.rmSync(OUT, { recursive: true, force: true }); fs.mkdirSync(OUT, { recursive: true });
for (const f of ['server.js', 'lib', 'dist', 'AGENT_REPORTING.md', 'report.ps1', 'report.sh', 'report-git.sh', 'README.md']) {
  const src = path.join(ROOT, f); if (fs.existsSync(src)) fs.cpSync(src, path.join(OUT, f), { recursive: true }); }
const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
fs.writeFileSync(path.join(OUT, 'package.json'), JSON.stringify({ name: 'botisland-island', version: pkg.version, private: true, type: 'module' }, null, 2) + '\n');
console.log('staged', OUT);
