// Side panels: activity log (timeline of every bot's reports) and the task screen (one bot's task, notes, recent events).
import { useEffect, useMemo, useState } from 'react';
import { botColor } from './util.js';

const tLocal = (ts, withDay) => new Date(ts).toLocaleString([], withDay ? { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' } : { hour: 'numeric', minute: '2-digit' });
const midnight = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d.getTime(); };
export function useLog(bot, open, days = 0) {
  const [ev, setEv] = useState([]);
  useEffect(() => { if (!open) return; let dead = false;
    const load = () => fetch(`/api/log?since=${days ? Date.now() - days * 86400000 : midnight()}${bot ? `&bot=${encodeURIComponent(bot)}` : ''}`).then((r) => r.json()).then((d) => { if (!dead) setEv(d.events || []); }).catch(() => {});
    load(); const iv = setInterval(load, 10000); return () => { dead = true; clearInterval(iv); }; }, [bot, open, days]);
  return ev;
}

export function ActivityLog({ bots, info, onClose, onSelect }) {
  const [bot, setBot] = useState(''); const [days, setDays] = useState(0);
  const ev = useLog(bot, true, days); const name = useMemo(() => Object.fromEntries(bots.map((b) => [b.id, b])), [bots]);
  return (<div className="log panel">
    <button className="x" onClick={onClose}>×</button>
    <div className="ph">📜 Activity log</div>
    <div className="logf">
      <select value={bot} onChange={(e) => setBot(e.target.value)}><option value="">All bots</option>{bots.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select>
      <select value={days} onChange={(e) => setDays(+e.target.value)}><option value={0}>Today</option><option value={7}>Last 7 days</option></select>
    </div>
    <div className="logl">
      {[...ev].reverse().map((e, i) => { const b = name[e.bot]; const si = e.state && info[e.state];
        return (<div key={i} className="le" onClick={() => onSelect?.(e.bot)}>
          <span className="lt">{tLocal(e.ts, days > 0)}</span>
          <span className="ln"><i className="dot" style={{ background: b ? botColor(b) : '#999' }} />{b?.name || e.bot}</span>
          {si && <span className="chip" style={{ background: si.color }}>{si.label}</span>}
          <div className="lx">{e.task && <b>{e.task}</b>}{e.text && e.text !== e.task && <span>{e.task ? ' · ' : ''}{e.text}</span>}{e.with && <span className="muted"> · with {e.with.map((w) => name[w]?.name || w).join(', ')}</span>}</div>
        </div>); })}
      {!ev.length && <div className="muted">No reports {days ? 'in the last 7 days' : 'yet today'}.</div>}
    </div>
  </div>);
}

export function TaskScreen({ bot, label, info, onClose }) {
  const ev = useLog(bot.id, true, 7); const last = [...ev].reverse().slice(0, 8);
  const notes = last.filter((e) => e.text).slice(0, 3); const si = info[bot.state] || info.idle;
  return (<div className="tscreen panel">
    <button className="x" onClick={onClose}>×</button>
    <div className="ts-h"><i className="dot" style={{ background: botColor(bot) }} /> {bot.name}'s screen <span className="chip" style={{ background: si.color }}>{label}</span></div>
    <div className="ts-glass">
      <div className="ts-k">CURRENT TASK</div>
      <div className="ts-task">{bot.task || 'Nothing reported'}</div>
      <div className="ts-meta">since {tLocal(bot.stateSince || bot.updatedAt, true)} · last report {tLocal(bot.updatedAt, true)}</div>
      {!!notes.length && <><div className="ts-k">NOTES</div>{notes.map((e, i) => <div key={i} className="ts-note">▸ {e.text}</div>)}</>}
      <div className="ts-k">RECENT EVENTS</div>
      {last.map((e, i) => <div key={i} className="ts-ev"><span>{tLocal(e.ts, true)}</span><span className="chip" style={{ background: (info[e.state] || {}).color || '#889' }}>{(info[e.state] || {}).label || 'note'}</span><span>{e.task || e.text}</span></div>)}
      {!last.length && <div className="ts-note">No events in the last 7 days.</div>}
    </div>
  </div>);
}

export const HATS = [['none', 'None'], ['tophat', '🎩 Top hat'], ['crown', '👑 Crown'], ['beanie', '🧶 Beanie'], ['party', '🥳 Party hat'], ['flower', '🌼 Flower'], ['cap', '🧢 Cap']];
const SWATCH = ['#e74c3c', '#f39c12', '#f1c40f', '#2ecc71', '#1abc9c', '#3498db', '#9b59b6', '#ff6fb5', '#8d5a3b', '#34495e'];
const HAT_SWATCH = ['#1c1c22', '#ffffff', '#e74c3c', '#f39c12', '#f5c542', '#2ecc71', '#3b7dd8', '#9b59b6', '#ff5fa2', '#8d5a3b'];
export async function saveCustom(body) {
  const r = await fetch('/api/bots/custom', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || r.status);
}
export function ProfileEditor({ bot }) {
  const [err, setErr] = useState(''); const send = (b) => saveCustom({ bot: bot.id, ...b }).then(() => setErr('')).catch((e) => setErr(String(e.message || e)));
  const cur = botColor(bot);
  return (<div className="prof">
    <div className="pr"><span>Color</span><div className="sw">{SWATCH.map((c) => <button key={c} className={'swc' + (cur === c ? ' on' : '')} style={{ background: c }} title={c} onClick={() => send({ color: c })} />)}
      <input type="color" value={/^#[0-9a-f]{6}$/i.test(cur) ? cur : '#888888'} onChange={(e) => send({ color: e.target.value })} title="Custom color" /></div></div>
    <div className="pr"><span>Hat</span><select value={bot.hat || 'none'} onChange={(e) => send({ hat: e.target.value })}>{HATS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></div>
    {bot.hat && bot.hat !== 'none' && <div className="pr"><span>Hat color</span><div className="sw">
      <button className={'swc swt' + (!bot.hatColor ? ' on' : '')} title="Default (original colors)" onClick={() => send({ hatColor: null })}>Default</button>
      <button className={'swc swt' + (bot.hatColor === 'match' ? ' on' : '')} style={{ background: cur }} title="Match bot color" onClick={() => send({ hatColor: 'match' })}>Match</button>
      {HAT_SWATCH.map((c) => <button key={c} className={'swc' + (bot.hatColor === c ? ' on' : '')} style={{ background: c }} title={c} onClick={() => send({ hatColor: c })} />)}
      <input type="color" value={/^#[0-9a-f]{6}$/i.test(bot.hatColor || '') ? bot.hatColor : '#888888'} onChange={(e) => send({ hatColor: e.target.value })} title="Custom hat color" /></div></div>}
    <label className="toggle"><input type="checkbox" checked={bot.nameTag !== false} onChange={(e) => send({ nameTag: e.target.checked })} /> Show name tag</label>
    {bot.custom && <button className="clearbtn" onClick={() => send({ reset: true })}>Reset look</button>}
    {err && <div className="muted small" style={{ color: '#c0392b' }}>Couldn't save: {err}</div>}
  </div>);
}
