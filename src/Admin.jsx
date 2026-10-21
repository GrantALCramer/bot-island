// Key-holder tools: the "Update available" banner and the Pair-a-device panel (QR pairing link + key rotation).
// Everyone who can open the island holds the access key (or is on the island's own computer), so they are the admins.
import { useEffect, useState } from 'react';
import QRCode from 'qrcode';

const post = (u, body = {}) => fetch(u, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }).then(async (r) => ({ ok: r.ok, ...(await r.json().catch(() => ({}))) }));
const DISMISS = 'botisland.updateDismissed';

export function UpdateBanner() {
  const [u, setU] = useState(null); const [busy, setBusy] = useState(false); const [msg, setMsg] = useState('');
  const load = () => fetch('/api/update').then((r) => r.json()).then(setU).catch(() => {});
  useEffect(() => { load(); const t = setInterval(load, 10 * 60e3); return () => clearInterval(t); }, []);
  useEffect(() => { if (!busy) return; const t = setInterval(async () => { const s = await fetch('/api/update').then((r) => r.json()).catch(() => null);
    if (!s) { setMsg('Restarting…'); return; } // server is mid-restart
    setU(s); const l = s.last; if (!s.pending && l && ['done', 'rolled_back', 'failed'].includes(l.state) && Date.parse(l.at) > busy) { setBusy(false); setMsg(l.message); if (l.state === 'done') setTimeout(() => location.reload(), 1500); } }, 2000);
    return () => clearInterval(t); }, [busy]);
  if (!u?.available && !msg) return null;
  if (u?.available && localStorage.getItem(DISMISS) === u.latest && !busy && !msg) return null;
  const apply = async () => { if (!confirm(`Update Bot Island from ${u.current} to ${u.latest}? The island restarts (about 10 seconds). If the new version doesn't start, the old one is restored automatically.`)) return;
    setMsg('Downloading and installing…'); const r = await post('/api/update/apply'); if (!r.ok) { setMsg(r.error || 'Update failed'); return; } setBusy(Date.now()); };
  return (<div className="updbar panel">
    {u?.available && <b>⬆ Update available: v{u.latest}</b>} {u?.available && <span className="muted">(you have v{u.current})</span>}
    {msg ? <span> {msg}</span> : u.mode === 'systemd' ? <button className="clearbtn" disabled={!!busy} onClick={apply}>Update now</button>
      : u.mode === 'docker' ? <span className="muted"> Run <code>git pull &amp;&amp; docker compose up -d --build</code> where you installed it.</span>
      : u.mode === 'desktop' ? <span className="muted"> The app will offer the update from its tray icon.</span>
      : <span className="muted"> Run <code>git pull &amp;&amp; npm install &amp;&amp; npm start</code>, or tell your bot "update my Bot Island".</span>}
    {u?.url && <a href={u.url} target="_blank" rel="noreferrer">What's new</a>}
    {!busy && <button className="linkish" title="Hide until the next version" onClick={() => { localStorage.setItem(DISMISS, u?.latest || ''); setMsg(''); setU({ ...u, available: false }); }}>✕</button>}
  </div>);
}

const ADDR = 'botisland.pairUrl';
const loopback = (h) => /^(127\.0\.0\.1|localhost|\[::1\])$/.test(h);
export function PairDevice() {
  const [info, setInfo] = useState(null); const [show, setShow] = useState(false); const [qr, setQr] = useState(''); const [msg, setMsg] = useState('');
  const [addr, setAddr] = useState(() => localStorage.getItem(ADDR) || (loopback(location.hostname) ? '' : location.origin));
  useEffect(() => { fetch('/api/pair').then((r) => r.json()).then(setInfo).catch(() => {}); }, []);
  const base = addr.trim().replace(/\/+$/, ''); const okAddr = /^https?:\/\/[^\s/]+/.test(base);
  const link = info?.key && okAddr ? `${base}/?key=${encodeURIComponent(info.key)}` : '';
  useEffect(() => { if (show && link) QRCode.toDataURL(link, { margin: 1, width: 240 }).then(setQr).catch(() => setQr('')); else setQr(''); }, [show, link]);
  if (!info) return null;
  if (!info.remote) return <div className="muted small">Pairing needs remote access turned on (Windows app: tray → <b>Allow bot connections</b>; server: <code>BOTISLAND_REMOTE=1</code>).</div>;
  const rotate = async () => { if (!confirm('Make a new access key? The old key stops working right away: every phone, PC and bot using it must be paired / updated again.')) return;
    const r = await post('/api/key/rotate', { confirm: true }); if (r.ok) { setInfo({ ...info, key: r.key }); setMsg('New key made. Re-pair your devices and update your bots.'); } else setMsg(r.error || 'Could not rotate the key'); };
  return (<div className="pair">
    <div className="muted small">Island address your phone/PC will use (e.g. your Tailscale URL):</div>
    <div className="evrow"><input value={addr} placeholder="https://my-pc.my-tailnet.ts.net" spellCheck={false} onChange={(e) => { setAddr(e.target.value); localStorage.setItem(ADDR, e.target.value.trim()); }} /></div>
    {!show ? <button className="clearbtn" disabled={!okAddr} onClick={() => setShow(true)}>Show pairing QR</button> : <>
      <div className="pairwarn">⚠ This code <b>is your admin key</b>. Never screenshot, record or share it (no reels!). Hide it when you're done.</div>
      {qr && <img className="pairqr" src={qr} alt="pairing QR code" />}
      <div className="muted small">Scan with the Bot Island Android app (<b>Scan QR</b>) or your phone camera. Windows app: tray → <b>Pair with link…</b> and paste the link.</div>
      <div className="evrow"><button className="clearbtn" onClick={() => navigator.clipboard?.writeText(link).then(() => setMsg('Pairing link copied. Paste it only into your own apps.'))}>Copy pairing link</button>
        <button className="clearbtn" onClick={() => setShow(false)}>Hide</button></div></>}
    <div className="evrow"><button className="clearbtn" onClick={rotate}>Rotate access key…</button></div>
    {msg && <div className="muted small">{msg}</div>}
  </div>);
}
