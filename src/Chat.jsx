// Chat on the island: per-bot threads (server: lib/chat.js), unread badges, connection settings.
import { useEffect, useRef, useState } from 'react';
import { fmtET } from './util.js';

const READ_KEY = 'botsim.chatRead';
const loadRead = () => { try { return JSON.parse(localStorage.getItem(READ_KEY) || '{}'); } catch { return {}; } };
export const tsOf = (m) => Date.parse(m.ts) || 0;
const post = async (url, body) => {
  const r = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body), credentials: 'same-origin' });
  let j = {}; try { j = await r.json(); } catch {} return { status: r.status, ...j };
};

// chat state from the WebSocket ({type:'chat'} messages) + unread tracking + transient speech bubbles
export function useChat(wsChat) {
  const [threads, setThreads] = useState({}); const [connected, setConnected] = useState({});
  const [read, setRead] = useState(loadRead); const [say, setSay] = useState({});
  const seen = useRef(null);
  useEffect(() => { fetch('/api/chat').then((r) => r.json()).then((d) => { setThreads((t) => ({ ...d.threads, ...t })); setConnected(d.connected || {}); }).catch(() => {}); }, []);
  useEffect(() => {
    if (!wsChat) return; const { threads: th, connected: co, full } = wsChat;
    setConnected(co || {});
    setThreads((t) => (full ? { ...th } : { ...t, ...th }));
    // speech bubble for replies that arrive while the page is open
    const first = !seen.current; seen.current ||= new Set(); const fresh = {};
    for (const [bot, msgs] of Object.entries(th || {})) for (const m of msgs) {
      if (seen.current.has(m.id)) continue; seen.current.add(m.id);
      if (!first && m.from !== 'user' && Date.now() - tsOf(m) < 120000) fresh[bot] = { text: m.text, until: Date.now() + 14000 };
    }
    if (Object.keys(fresh).length) setSay((s) => ({ ...s, ...fresh }));
  }, [wsChat]);
  useEffect(() => { const t = setInterval(() => setSay((s) => { const n = Date.now(); const k = Object.entries(s).filter(([, v]) => v.until > n); return k.length === Object.keys(s).length ? s : Object.fromEntries(k); }), 2000); return () => clearInterval(t); }, []);
  const unread = (bot) => (threads[bot] || []).filter((m) => m.from !== 'user' && tsOf(m) > (read[bot] || 0)).length;
  const markRead = (bot) => { const last = Math.max(0, ...(threads[bot] || []).filter((m) => m.from !== 'user').map(tsOf)); if (last > (read[bot] || 0)) { const n = { ...read, [bot]: last }; setRead(n); localStorage.setItem(READ_KEY, JSON.stringify(n)); } };
  return { threads, connected, unread, markRead, say };
}

const STATUS = { sending: ['⏳', 'sending…'], delivered: ['✓', 'delivered'], failed: ['⚠', 'failed'], replied: ['✓✓', 'replied'] };
export function ChatThread({ bot, chat }) {
  const msgs = chat.threads[bot.id] || []; const on = !!chat.connected[bot.id];
  const [text, setText] = useState(''); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  const box = useRef();
  useEffect(() => { const t = setTimeout(() => chat.markRead(bot.id), 3000); return () => clearTimeout(t); }, [bot.id, msgs.length]); // eslint-disable-line  (seen after 3 s open)
  useEffect(() => { if (box.current) box.current.scrollTop = box.current.scrollHeight; }, [bot.id, msgs.length]);
  const send = async (e) => {
    e?.preventDefault(); const t = text.trim(); if (!t || busy) return;
    setBusy(true); setErr('');
    try { const r = await post('/api/chat/send', { bot: bot.id, text: t }); if (r.ok) setText(''); else setErr(r.error || `HTTP ${r.status}`); }
    catch { setErr('offline?'); } finally { setBusy(false); }
  };
  return (<div className="chat">
    <div className="lbl">Chat {on ? <span className="cok">● connected</span> : <span className="cno">not connected</span>}</div>
    {(msgs.length > 0 || on) && <div className="thread" ref={box}>
      {msgs.map((m) => { const me = m.from === 'user'; const st = STATUS[m.status] || null; return (
        <div key={m.id} className={'msg ' + (me ? 'me' : 'them')}>
          <div className="mt">{m.text}</div>
          <div className="mm">{fmtET(tsOf(m))}{me && st && <span className={'ms ' + m.status} title={m.error || (m.http ? `HTTP ${m.http}` : '')}> · {st[0]} {st[1]}{m.status === 'failed' && m.http ? ` (HTTP ${m.http})` : m.status === 'failed' && m.error ? ` (${m.error})` : ''}</span>}</div>
        </div>); })}
      {!msgs.length && <div className="muted small">No messages yet. Say hi 👋</div>}
    </div>}
    {on ? <form className="cin" onSubmit={send}>
      <textarea rows={2} maxLength={2000} placeholder={`Message ${bot.name}…`} value={text} onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) send(e); }} />
      <button type="submit" disabled={busy || !text.trim()}>Send</button>
    </form> : <div className="howto">
      <b>Chat not connected.</b> To chat with {bot.name}: in Grok Bot, give {bot.name} a routine with a <i>Webhook</i> trigger,
      then in <b>Island settings → Chat connections</b> press <b>Copy setup</b> and paste it to {bot.name} so it connects itself. The bot answers with <code>reply.sh</code> (see <a href="/agent.txt" target="_blank" rel="noreferrer">agent.txt</a>).
    </div>}
    {err && <div className="err small">{err}</div>}
  </div>);
}

// Island settings → Bot chat connections. Keys go to the server only; it never sends them back.
export function ChatSettings({ bots, onChange }) {
  const [cfg, setCfg] = useState(null); const [open, setOpen] = useState(null);
  const load = () => fetch('/api/chat/config').then((r) => r.json()).then(setCfg).catch(() => setCfg({ bots: {}, defaults: {} }));
  useEffect(() => { load(); }, []);
  if (!cfg) return <div className="muted small">Loading…</div>;
  const ids = [...new Set([...bots.map((b) => b.id), ...Object.keys(cfg.bots)])];
  const name = (id) => bots.find((b) => b.id === id)?.name || id;
  return (<div className="conns">
    {ids.map((id) => { const c = cfg.bots[id]; const on = !!c?.connected; return (<div key={id} className="conn">
      <div className="crow3">
        <button className="cmain" onClick={() => setOpen(open === id ? null : id)} title="Enter the webhook by hand">
          <span className="nm">{name(id)}</span>
          <span className={on ? 'cok' : 'cno'}>{on ? `● connected${c.host ? ` · ${c.host}` : ''}` : '○ not connected'}</span>
        </button>
        <CopySetup id={id} name={name(id)} />
        <button className="car" onClick={() => setOpen(open === id ? null : id)} aria-label="Manual setup">{open === id ? '▾' : '▸'}</button>
      </div>
      {open === id && <ConnEdit id={id} c={c} defaults={cfg.defaults} onSaved={(b) => { setCfg((x) => ({ ...x, bots: b })); onChange?.(); }} />}
    </div>); })}
    <div className="muted small"><b>Copy setup</b> copies a short instruction to paste into that bot: it registers its own webhook with the island (<code>register.sh</code> / <code>POST /api/chat/register</code>), so you never handle the URL or key. Stored on this computer only (chmod 600), never shown again or logged. Grok Bot routine webhooks take the key as <code>Authorization: Bearer &lt;key&gt;</code> (the default).</div>
  </div>);
}
// the pasted instruction holds no secrets: the bot supplies its own webhook URL/key, and the island key (needed only
// for a remote island) comes from the bot's environment, never from this page
export function setupText(id, name, origin) {
  return `Bot Island chat setup for ${name} (bot id: ${id}). Let me chat with you from Bot Island:
1. Make sure you have a routine with a Webhook trigger; get its webhook URL and key. Treat both as secrets: never print, log or echo them.
2. Register them with the island (the URL and key go in env vars / stdin, never on the command line or in output):
   WEBHOOK_URL='<your webhook url>' WEBHOOK_KEY='<your webhook key>' ISLAND_URL='${origin}' ./register.sh ${id}
   No register.sh? POST JSON {"bot":"${id}","url":"<webhook url>","key":"<webhook key>"} to ${origin}/api/chat/register with header "Authorization: Bearer $BOTISLAND_KEY" (the island access key from your environment; not needed when the island runs on this same computer).
3. Messages from me arrive on that webhook with "source":"bot-island". Answer with: ./reply.sh ${id} <messageId> "<your reply>". Full spec: ${origin}/agent.txt (section "Chat").
Reply "registered" when the island answers {"ok":true}.`;
}
function CopySetup({ id, name }) {
  const [done, setDone] = useState(false);
  const copy = async () => { const t = setupText(id, name, window.location.origin);
    try { await navigator.clipboard.writeText(t); } catch { const ta = document.createElement('textarea'); ta.value = t; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); } catch {} ta.remove(); }
    setDone(true); setTimeout(() => setDone(false), 1800); };
  return <button className={'csetup' + (done ? ' ok' : '')} onClick={copy} title="Copy an instruction to paste into this bot so it connects itself">{done ? '✓ Copied' : '📋 Copy setup'}</button>;
}
function ConnEdit({ id, c, defaults, onSaved }) {
  const [url, setUrl] = useState(''); const [key, setKey] = useState('');
  const [header, setHeader] = useState(c?.header || defaults.header || 'Authorization'); const [prefix, setPrefix] = useState(c?.prefix ?? defaults.prefix ?? 'Bearer ');
  const [msg, setMsg] = useState(null); const [adv, setAdv] = useState(false);
  const save = async () => { setMsg(null); const r = await post('/api/chat/config', { bot: id, url, key, header, prefix }); if (r.ok) { setUrl(''); setKey(''); setMsg({ ok: true, t: 'Saved.' }); onSaved(r.bots); } else setMsg({ ok: false, t: r.error || `HTTP ${r.status}` }); };
  const test = async () => { setMsg({ t: 'Sending test…' }); const r = await post('/api/chat/test', { bot: id }); setMsg(r.http !== undefined ? { ok: r.ok, t: `Test: HTTP ${r.http || '—'}${r.ok ? ' (accepted)' : r.error ? ` (${r.error})` : ''}` } : { ok: false, t: r.error || `HTTP ${r.status}` }); };
  const remove = async () => { const r = await post('/api/chat/config', { bot: id, remove: true }); if (r.ok) { setMsg({ ok: true, t: 'Removed.' }); onSaved(r.bots); } };
  return (<div className="cedit">
    <label>Webhook URL<input type="url" placeholder={c?.connected ? `saved${c.host ? ` (${c.host})` : ''}: leave empty to keep` : 'https://…'} value={url} onChange={(e) => setUrl(e.target.value)} autoComplete="off" spellCheck={false} /></label>
    <label>Sender key<input type="password" placeholder={c?.hasKey ? '•••••••• saved (leave empty to keep)' : 'paste the key'} value={key} onChange={(e) => setKey(e.target.value)} autoComplete="new-password" /></label>
    <button className="linkish" onClick={() => setAdv((v) => !v)}>{adv ? 'Hide' : 'Header'} options</button>
    {adv && <div className="adv"><label>Header<input value={header} onChange={(e) => setHeader(e.target.value)} spellCheck={false} /></label>
      <label>Value prefix<input value={prefix} onChange={(e) => setPrefix(e.target.value)} spellCheck={false} /></label>
      <div className="muted small">Sent as <code>{header}: {prefix}&lt;key&gt;</code></div></div>}
    <div className="cbtn"><button onClick={save} disabled={!url && !key && !(c && (header !== c.header || prefix !== c.prefix))}>Save</button>
      <button onClick={test} disabled={!c?.connected} title="POSTs a test message now. For a Grok Bot routine this starts a real run.">Send test</button>
      {c && <button className="danger" onClick={remove}>Remove</button>}</div>
    {msg && <div className={'small ' + (msg.ok === false ? 'err' : msg.ok ? 'okt' : 'muted')}>{msg.t}</div>}
  </div>);
}
