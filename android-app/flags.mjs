// Writes www/flags.js before a build. Self-update check (GitHub Releases APK) is ON for the sideloaded APK and must be
// OFF for a Play Store build (Google Play doesn't allow apps to update themselves):
//   node flags.mjs            -> selfUpdate: true     (npm run apk)
//   node flags.mjs --play     -> selfUpdate: false    (npm run apk:play / bundle:play)
import fs from 'node:fs';
const pkg = JSON.parse(fs.readFileSync(new URL('./package.json', import.meta.url)));
const flags = { version: pkg.version, selfUpdate: !process.argv.includes('--play'), repo: pkg.botisland?.updateRepo || '' };
fs.writeFileSync(new URL('./www/flags.js', import.meta.url), `window.BI_FLAGS = ${JSON.stringify(flags)};\n`);
console.log('flags', flags);
