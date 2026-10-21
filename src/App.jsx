import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { EffectComposer, Bloom, ToneMapping } from '@react-three/postprocessing';
import { ToneMappingMode } from 'postprocessing';
import * as THREE from 'three';
import Blob, { BLOB_STYLES } from './Blob.jsx';
import Sky, { WEATHER } from './world/Sky.jsx';
import World from './world/World.jsx';
import { WorldCtx, themeDay, QUALITY } from './world/env.js';
import { assignTargets, buildLayout } from './world/layout.js';
import { KINDS, context as actContext, kindsFor, makeActivity, nextGap, pickKind, LEVEL_FROM_FREQ, wakeChance, fmtGap } from './activities.js';
import { themeFor, surroundLayout, surroundModesOf } from './world/surround.js';
import { getTheme, THEME_LIST } from './themes/index.js';
import Seasonal, { seasonFor, SEASON_LABEL } from './world/Seasonal.jsx';
import { localHour, themeWeather, useLiveWeather } from './live.js';
import { ActivityLog, ProfileEditor, TaskScreen } from './Panels.jsx';
import { askPermission, chime, useAlertNotifications } from './notify.js';
import { botColor, etHour, fmtET, fmtHour, STATE_INFO } from './util.js';
import { useChat, ChatThread, ChatSettings } from './Chat.jsx';
import EarthTouch from './EarthTouch.jsx';
import { RATES, DEFAULT_RATE, newClock, clockHour, pickWeather } from './random.js';

const qs = new URLSearchParams(location.search);
// timeMode: auto (Eastern time) | live (viewer's clock) | manual (slider) | random (own world clock). wxMode: pick | random | live (Open-Meteo)
const DEFAULTS = { theme: 'tropical', timeMode: 'auto', hour: 12, rate: DEFAULT_RATE, rclock: null, weather: 'clear', wxMode: 'pick', rwx: null, bubbles: true, glow: true, room: 0, surround: 'water', blobStyle: 'avatar', lite: null, activities: true, actFreq: 'normal', wxLoc: 'New York, NY', seasonMode: 'auto', touchMode: 'standard' }; // lite: null = auto
// phones / small touch screens: lite mode on by default, panels start collapsed
const TOUCH = typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches;
const IS_PHONE = TOUCH && Math.min(screen.width, screen.height) < 820;
const NARROW = () => innerWidth < 720;
export const ROOM_PRESETS = [['Auto', 0], ['M', 0.2], ['L', 0.45], ['XL', 0.8]];
const ICON = { tropical: '🏝️', antarctica: '🧊', atlantis: '🫧', jungle: '🌴', moon: '🌙', heaven: '☁️', hell: '🌋', sakura: '🌸', city: '🏙️', west: '🤠', candy: '🍭', glade: '🍄', cave: '💎', haunted: '🎃' };
function loadSettings() {
  let s = { ...DEFAULTS };
  try { const saved = JSON.parse(localStorage.getItem('botsim.settings') || '{}'); if (!saved.timeMode && 'auto' in saved) saved.timeMode = saved.auto ? 'auto' : 'manual'; delete saved.auto; s = { ...s, ...saved }; } catch {}
  if (qs.has('hour')) { s.hour = +qs.get('hour'); s.timeMode = 'manual'; }
  if (qs.get('time') === 'random') { s.timeMode = 'random'; if (qs.has('rate')) s.rate = +qs.get('rate') || DEFAULT_RATE; s.rclock = qs.has('h0') ? newClock(+qs.get('h0')) : s.rclock || newClock(); }
  if (qs.get('time') === 'live') s.timeMode = 'live';
  if (qs.has('season')) s.seasonMode = qs.get('season');
  if (qs.has('weather')) { if (qs.get('weather') === 'random') s.wxMode = 'random'; else if (qs.get('weather') === 'live') s.wxMode = 'live'; else { s.weather = qs.get('weather'); s.wxMode = 'pick'; } }
  if (s.timeMode === 'random' && !s.rclock) s.rclock = newClock();
  if (qs.has('theme')) s.theme = qs.get('theme');
  if (qs.has('glow')) s.glow = qs.get('glow') !== '0';
  if (qs.has('room')) s.room = +qs.get('room') || 0;
  if (qs.has('surround')) s.surround = qs.get('surround') === 'land' ? 'land' : 'water';
  if (qs.has('touch')) s.touchMode = qs.get('touch') === 'earth' ? 'earth' : 'standard';
  if (qs.has('blobstyle')) s.blobStyle = qs.get('blobstyle');
  if (qs.has('lite')) s.lite = qs.get('lite') !== '0';
  // activity level slider (0..100) replaces rare/normal/often; migrate old saved values
  if (s.actLevel == null) s.actLevel = s.activities === false ? 0 : LEVEL_FROM_FREQ[s.actFreq] ?? 50;
  if (qs.has('actlevel')) s.actLevel = Math.max(0, Math.min(100, +qs.get('actlevel') || 0));
  s.activities = s.actLevel > 0; delete s.actFreq;
  return s;
}
const URL_OVERRIDE = ['hour', 'time', 'weather', 'theme', 'glow', 'room', 'surround', 'blobstyle', 'lite'].some((k) => qs.has(k));

function useBotState() {
  const [data, setData] = useState({ bots: [], demo: false, connected: false }); const [chat, setChat] = useState(null);
  useEffect(() => {
    let ws, dead = false, timer;
    const connect = () => {
      ws = new WebSocket(`${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws`);
      ws.onmessage = (m) => { try { const j = JSON.parse(m.data); if (j.type === 'chat') setChat(j); else setData({ ...j, connected: true }); } catch {} };
      ws.onclose = () => { if (dead) return; setData((d) => ({ ...d, connected: false })); timer = setTimeout(connect, 2000); };
    };
    fetch('/api/state').then((r) => r.json()).then((d) => setData((x) => (x.bots.length ? x : { ...d, connected: false }))).catch(() => {});
    connect();
    return () => { dead = true; clearTimeout(timer); ws && ws.close(); };
  }, []);
  return { ...data, wsChat: chat };
}

function CameraFollow({ selected, positions, follow }) {
  const controls = useThree((s) => s.controls); const camera = useThree((s) => s.camera);
  const goal = useRef(new THREE.Vector3()); const delta = new THREE.Vector3();
  useFrame((_, dt) => {
    if (!controls || !selected || !follow.current) return;
    const p = positions.current[selected]; if (!p) return;
    goal.current.set(p.x, p.y + 0.6, p.z); delta.subVectors(goal.current, controls.target).multiplyScalar(Math.min(1, dt * 2.5));
    controls.target.add(delta); camera.position.add(delta);
    const off = camera.position.clone().sub(controls.target); const L = off.length();
    if (L > 15 && follow.current !== 'keep') camera.position.copy(controls.target).add(off.multiplyScalar(1 - Math.min(1, dt * 1.5) * (1 - 14 / L)));
  });
  return null;
}
// When the island grows/shrinks (bot count or size setting) ease the camera distance to keep the same framing.
function CameraFit({ dist, initial, follow }) {
  const controls = useThree((s) => s.controls); const camera = useThree((s) => s.camera);
  const prev = useRef(initial); const goal = useRef(null);
  useEffect(() => { if (!controls || prev.current === dist) return; const L = camera.position.distanceTo(controls.target); goal.current = L * (dist / prev.current); prev.current = dist; }, [dist, controls]);
  useFrame((_, dt) => {
    if (!controls || goal.current == null || follow.current) return;
    const off = camera.position.clone().sub(controls.target); const L = off.length(); const nL = L + (goal.current - L) * Math.min(1, dt * 2.5);
    camera.position.copy(controls.target).add(off.multiplyScalar(nL / L));
    if (Math.abs(goal.current - nL) < 0.05) goal.current = null;
  });
  return null;
}
// lets scripts/screenshots place the camera: window.__botsim.cam([x,y,z],[tx,ty,tz])
function CamApi({ follow }) {
  const controls = useThree((s) => s.controls); const camera = useThree((s) => s.camera); const gl = useThree((s) => s.gl); const scene = useThree((s) => s.scene);
  useEffect(() => { if (!controls) return; window.__botsim = { ...(window.__botsim || {}), camera, controls, gl, scene, cam: (p, t) => { follow.current = false; camera.position.set(...p); controls.target.set(...t); controls.update(); } };
    if (qs.has('cam')) { const v = qs.get('cam').split(',').map(Number); window.__botsim.cam(v.slice(0, 3), v.slice(3, 6)); } }, [controls]);
  return null;
}

export default function App() {
  const { bots, demo, connected, sources = [], wsChat } = useBotState();
  const chat = useChat(wsChat);
  const [settings, setSettings] = useState(loadSettings);
  const [selected, setSelected] = useState(qs.get('select') || null);
  const [showSettings, setShowSettings] = useState(qs.get('settings') === '1');
  const [nowHour, setNowHour] = useState(etHour()); const [now, setNow] = useState(Date.now());
  const positions = useRef({}); const follow = useRef(!!qs.get('select')); const env = useRef(null);
  const ui = qs.get('ui') !== '0';
  const [rosterOpen, setRosterOpen] = useState(!NARROW()); const [showLog, setShowLog] = useState(qs.has('log')); const [screenOf, setScreenOf] = useState(qs.get('screen'));
  const lite = settings.lite ?? IS_PHONE; QUALITY.lite = lite; // read by world components when the Canvas (re)mounts
  const glow = settings.glow && !lite;

  useEffect(() => { const t = setInterval(() => { setNowHour(etHour()); setNow(Date.now()); }, settings.timeMode === 'random' ? 2000 : 5000); return () => clearInterval(t); }, [settings.timeMode]);
  useEffect(() => { if (!URL_OVERRIDE) localStorage.setItem('botsim.settings', JSON.stringify(settings)); }, [settings]);
  useEffect(() => { window.__botsim = { ...(window.__botsim || {}), select: (id) => { follow.current = true; setSelected(id); }, positions }; }, []);

  const baseTheme = getTheme(settings.theme); const surround = settings.surround === 'land' ? 'land' : 'water';
  const theme = useMemo(() => themeFor(baseTheme, surround), [baseTheme, surround]);
  const calm = theme.weathers.includes('clear') ? 'clear' : theme.defaultWeather;
  const rwxOk = settings.rwx && theme.weathers.includes(settings.rwx.w) && settings.rwx.theme === theme.id;
  // random weather: re-pick when the current pick expires or doesn't belong to this theme
  useEffect(() => { if (settings.wxMode === 'random' && (!rwxOk || settings.rwx.until < now)) setSettings((s) => ({ ...s, rwx: { ...pickWeather(theme.weathers, calm, s.rwx?.w), theme: theme.id } })); }, [settings.wxMode, rwxOk, now, theme.id]); // eslint-disable-line
  const season = seasonFor(settings.seasonMode);
  const liveWx = useLiveWeather(settings.wxMode === 'live', settings.wxLoc);
  const weather = settings.wxMode === 'live' ? themeWeather(theme, liveWx && !liveWx.error ? liveWx.cond : null) : settings.wxMode === 'random' ? (rwxOk ? settings.rwx.w : calm) : theme.weathers.includes(settings.weather) ? settings.weather : theme.defaultWeather;
  const worldHour = clockHour(settings.rclock, settings.rate, now);
  const hour = settings.timeMode === 'auto' ? nowHour : settings.timeMode === 'live' ? localHour() + 0 * now : settings.timeMode === 'random' ? worldHour : settings.hour;
  const baseLayout = useMemo(() => buildLayout(baseTheme, bots.length, settings.room || 0), [baseTheme, bots.length, settings.room]); // positions never depend on surroundings
  const layout = useMemo(() => surroundLayout(baseLayout, theme), [baseLayout, theme]);
  const camInit = useMemo(() => { const d = theme.camera.dir; const L = Math.hypot(...d); const tgt = [d[0] / L * layout.extent * 0.1, 0, d[2] / L * layout.extent * 0.1]; return { pos: d.map((v, i) => (v / L) * layout.camDist + tgt[i]), dist: layout.camDist, target: tgt }; }, [theme.id]); // eslint-disable-line
  const since = useMemo(() => Object.fromEntries(bots.map((b) => [b.id, (typeof (b.stateSince || b.updatedAt) === 'number' ? (b.stateSince || b.updatedAt) : Date.parse(b.stateSince || b.updatedAt || 0)) || 0])), [bots]);
  // idle group activities: a scheduler picks idle bots + a fitting activity every few minutes (or on demand)
  const level = settings.actLevel ?? 50; // 0 = off
  const [act, setAct] = useState(null); const nextAct = useRef(Date.now() + Math.min(40000, nextGap(level)));
  const actCtx = useMemo(() => actContext(theme, hour, weather, layout), [theme, layout, Math.floor(hour * 4), weather]); // eslint-disable-line
  // free bots: idle, plus sleeping (stale) ones, which wake up to join (or keep napping, more often at low levels)
  const idleIds = bots.filter((b) => b.state === 'idle' || b.state === 'stale').map((b) => b.id);
  const startAct = (kind, opts = {}) => { const t = Date.now(); const st = Object.fromEntries(bots.map((b) => [b.id, b.state])); const wake = opts.all || kind ? 1 : wakeChance(level);
    const pool = idleIds.filter((id) => st[id] === 'idle' || Math.random() < wake).sort(() => Math.random() - 0.5);
    if (!pool.length) return null; const solo = pool.length === 1 || opts.solo; const k = kind && KINDS[kind] && kindsFor(theme, layout).includes(kind) ? kind : pickKind(actCtx, solo);
    if (solo && !KINDS[k].solo && !kind) return null; if (!level && !kind) return null; const n = solo ? 1 : pool.length; // every idle bot can join: the structures grow to seat them
    const a = makeActivity(k, pool.slice(0, n), theme, actCtx, t); if (opts.long) a.until = t + 10 * 60000; setAct(a); return a; };
  useEffect(() => { const iv = setInterval(() => setAct((a) => (a && Date.now() > a.until ? (nextAct.current = Date.now() + nextGap(level), null) : a)), 1000); return () => clearInterval(iv); }, [level]);
  useEffect(() => { nextAct.current = Math.min(nextAct.current, Date.now() + nextGap(level)); }, [level]);
  // check every second when activities are frequent (the shared clock ticks only every 5 s)
  const [tick, setTick] = useState(0); useEffect(() => { if (level < 80) return; const iv = setInterval(() => setTick((x) => x + 1), 1000); return () => clearInterval(iv); }, [level >= 80]);
  useEffect(() => { // members that got busy (or stale) leave right away; an empty activity ends
    const t = Date.now();
    if (act) { const keep = act.ids.filter((id) => idleIds.includes(id)); if (keep.length !== act.ids.length) setAct(keep.length ? { ...act, ids: keep } : (nextAct.current = t + nextGap(level), null)); return; }
    if (!level || t < nextAct.current) return;
    nextAct.current = t + nextGap(level);
    // a lone free bot goes for something solo; often at high levels, sometimes at low ones
    if (!startAct() && idleIds.length && Math.random() < 0.35 + 0.65 * (level / 100)) startAct(null, { solo: true });
  }, [now, tick, idleIds.join(), level]); // eslint-disable-line
  useEffect(() => { if (theme.id !== act?.theme) setAct((a) => (a && a.theme && a.theme !== theme.id ? null : a)); }, [theme.id]); // eslint-disable-line
  const actNow = act && { ...act, theme: theme.id };
  useEffect(() => { if (qs.has('activity') && bots.length) { const t = setTimeout(() => startAct(qs.get('activity'), { all: true, long: true }), 400); return () => clearTimeout(t); } }, [bots.length > 0]); // eslint-disable-line
  useEffect(() => { if (window.__botsim) { window.__botsim.activity = (k, o = { all: true }) => startAct(k, o); if (qs.has('snap')) window.__botsim.snapWalk = true; window.__botsim.act = act; window.__botsim.endActivity = () => setAct(null); } });
  const targets = useMemo(() => assignTargets(bots, layout, theme, since, now, settings.activities || act?.forced ? actNow : null), [bots, layout, theme, since, now, act, settings.activities]); // eslint-disable-line
  const ctx = useMemo(() => ({ theme, layout, env }), [theme, layout]);
  const sel = bots.find((b) => b.id === selected);
  useEffect(() => { if (window.__botsim) { window.__botsim.targets = targets; window.__botsim.bots = bots; window.__botsim.layout = layout; } }, [targets, bots, layout]);
  const set = (k, v) => setSettings((s) => ({ ...s, [k]: v }));
  useEffect(() => { const h = (e) => { const id = Object.keys(targets).find((k) => targets[k]?.station === e.detail); if (id) { setScreenOf(id); setSelected(id); } };
    window.addEventListener('botsim:screen', h); return () => window.removeEventListener('botsim:screen', h); }, [targets]); // eslint-disable-line
  useAlertNotifications(bots, { notify: settings.notify, sound: settings.notifySound }, (id) => select(id));
  const [perm, setPerm] = useState(() => ('Notification' in window ? Notification.permission : 'unsupported'));
  const setTimeMode = (m) => setSettings((s) => ({ ...s, timeMode: m, ...(m === 'random' && !s.rclock ? { rclock: newClock() } : {}), ...(m === 'manual' && s.timeMode !== 'manual' ? { hour: Math.round((s.timeMode === 'auto' ? etHour() : clockHour(s.rclock, s.rate)) * 4) / 4 % 24 } : {}) }));
  const setRate = (r) => setSettings((s) => ({ ...s, rate: r, rclock: newClock(clockHour(s.rclock, s.rate)) })); // keep the current world hour, change the speed
  const rerollWx = () => setSettings((s) => ({ ...s, wxMode: 'random', rwx: { ...pickWeather(theme.weathers, calm, s.rwx?.w), theme: theme.id } }));
  useEffect(() => { if (window.__botsim) window.__botsim.rerollWeather = rerollWx; });
  const select = (id) => { follow.current = true; setSelected(id); if (NARROW()) { setRosterOpen(false); setShowSettings(false); } };
  const label = (st) => theme.stateLabels?.[st] || (STATE_INFO[st] || STATE_INFO.idle).label;

  return (<div className="app">
    <Canvas key={theme.id + (lite ? ':lite' : '')} shadows={!lite} dpr={lite ? [1, 1.5] : [1, 2]} camera={{ position: camInit.pos, fov: 42, near: 0.1, far: Math.max(1200, layout.camDist * 14) }} gl={{ antialias: true, preserveDrawingBuffer: true }}
      onPointerMissed={() => setSelected(null)}>
      <WorldCtx.Provider value={ctx}>
        <Suspense fallback={null}>
          <Sky hour={hour} weather={weather} slow={settings.wxMode === 'random'} />
          <World bots={bots} targets={targets} selected={selected} onSelect={select} />
          <Seasonal season={season} night={hour < 7 || hour > 18.5} />
          {bots.map((b) => targets[b.id] && <Blob key={b.id} bot={b} target={targets[b.id]} selected={selected === b.id} onSelect={select} showBubble={settings.bubbles}
            positions={positions} layout={layout} gait={theme.gait} props={theme.props} accessory={theme.accessory} blobStyle={BLOB_STYLES[settings.blobStyle] ? settings.blobStyle : 'avatar'} say={chat.say[b.id]?.text} unread={selected === b.id ? 0 : chat.unread(b.id)} />)}
        </Suspense>
      </WorldCtx.Provider>
      <OrbitControls makeDefault target={camInit.target} enableDamping enablePan enableZoom
        minDistance={5} maxDistance={theme.camZoom ? layout.camDist * theme.camZoom : Math.max(70, layout.camDist * 2.3)} maxPolarAngle={1.38} minPolarAngle={0.2}
        touches={{ ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN }}
        onStart={() => (follow.current = false)} />
      <EarthTouch enabled={settings.touchMode === 'earth'} follow={follow} maxDist={Math.max(70, layout.camDist * 2.3)} />
      <CameraFollow selected={selected} positions={positions} follow={follow} />
      <CamApi follow={follow} />
      <CameraFit dist={layout.camDist} initial={camInit.dist} follow={follow} />
      {glow && <EffectComposer multisampling={4} disableNormalPass>
        <Bloom mipmapBlur luminanceThreshold={1.0} luminanceSmoothing={0.2} intensity={0.9} radius={0.7} />
        <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
      </EffectComposer>}
    </Canvas>

    {ui && <>
      <div className="title panel">
        <div className="t1">{ICON[theme.id] || ''} Bot Island</div>
        <div className="t2">{fmtHour(nowHour)} ET · {bots.length} {bots.length === 1 ? "bot" : "bots"} {demo && <span className="pill demo" title="No real bots have reported yet. See Island settings → Bots report to">DEMO</span>} {!connected && <span className="pill off">offline</span>}</div>
      </div>

      <div className={'roster panel' + (rosterOpen ? '' : ' closed')}>
        <button className="ph tog" onClick={() => setRosterOpen((v) => !v)} aria-expanded={rosterOpen}>
          <span>Roster{!rosterOpen && ` · ${bots.length}`}{!rosterOpen && bots.some((b) => chat.unread(b.id) > 0) && <span className="ubadge" style={{ marginLeft: 6 }}>💬</span>}</span><span className="car">{rosterOpen ? '▾' : '▸'}</span></button>
        {rosterOpen && <>
        {bots.map((b) => { const si = STATE_INFO[b.state] || STATE_INFO.idle; return (
          <button key={b.id} className={'row' + (selected === b.id ? ' on' : '')} onClick={() => select(b.id)}>
            <i className="dot" style={{ background: botColor(b) }} />
            <span className="nm">{b.name}</span>{selected !== b.id && chat.unread(b.id) > 0 && <span className="ubadge" title="unread chat replies">{chat.unread(b.id)}</span>}
            <span className="chip" style={{ background: si.color }}>{si.label}</span>
          </button>); })}
        {bots.filter((b) => ALERT_STATES.has(b.state)).length > 1 && <button className="clearbtn all" onClick={() => clearAlerts({ all: true })}>✓ Clear all alerts ({bots.filter((b) => ALERT_STATES.has(b.state)).length})</button>}
        {!bots.length && <div className="muted">Waiting for data…</div>}</>}
      </div>

      {screenOf && bots.find((b) => b.id === screenOf) && <TaskScreen bot={bots.find((b) => b.id === screenOf)} label={label(bots.find((b) => b.id === screenOf).state)} info={STATE_INFO} onClose={() => setScreenOf(null)} />}
      {sel && <Card onScreen={() => setScreenOf(sel.id)} bot={sel} label={act?.ids.includes(sel.id) && sel.state === 'idle' ? `${label(sel.state)} · ${act.label}` : label(sel.state)} chat={chat} onClose={() => setSelected(null)} />}

      <button className="toolbtn panel" onClick={() => setShowLog((v) => !v)}>📜 <span className="gl">Activity log</span></button>
      {showLog && <ActivityLog bots={bots} info={STATE_INFO} onClose={() => setShowLog(false)} onSelect={(id) => select(id)} />}
      <button className="gear panel" onClick={() => { setShowSettings((v) => !v); if (NARROW()) { setSelected(null); setRosterOpen(false); } }}>⚙ <span className="gl">Island settings</span></button>
      {showSettings && <div className="settings panel">
        <div className="ph">Island settings <button className="x" onClick={() => setShowSettings(false)}>×</button></div>
        <Sec id="theme" title="Themes" sub={`${ICON[theme.id] || ''} ${theme.name}`}>
        <div className="themes">{THEME_LIST.map((t) => <button key={t.id} className={theme.id === t.id ? 'on' : ''} title={t.description} onClick={() => set('theme', t.id)}>
          {ICON[t.id]} {t.name}{t.status !== 'ready' && <span className="soon">preview</span>}</button>)}</div>
        {theme.status !== 'ready' && <div className="muted small">{theme.description}</div>}
        </Sec><Sec id="blobs" title="Blob style" sub={BLOB_STYLES[settings.blobStyle]?.label || 'Avatar match'}>
        <div className="wx size">{Object.entries(BLOB_STYLES).map(([k, st]) => <button key={k} className={(BLOB_STYLES[settings.blobStyle] ? settings.blobStyle : 'avatar') === k ? 'on' : ''} title={st.hint} onClick={() => set('blobStyle', k)}>{st.label}</button>)}</div>
        <div className="muted small">{BLOB_STYLES[settings.blobStyle]?.hint || BLOB_STYLES.avatar.hint}. Shapes and colours come from each bot's Grok Bot avatar.</div>
        </Sec><Sec id="size" title="Island size & surroundings" sub={settings.room ? `+${Math.round(settings.room * 100)}%` : 'Auto'}>
        <div className="lbl">Island size <b>{settings.room ? `+${Math.round(settings.room * 100)}% room` : 'Auto (fits bots)'}</b></div>
        <div className="wx size">{ROOM_PRESETS.map(([n, v]) => <button key={n} className={Math.abs((settings.room || 0) - v) < 0.001 ? 'on' : ''} onClick={() => set('room', v)}>{n}</button>)}</div>
        <input type="range" min="0" max="1" step="0.05" value={settings.room || 0} onChange={(e) => set('room', +e.target.value)} />
        <div className="muted small">{bots.length} {bots.length === 1 ? "bot" : "bots"} → land radius {layout.R.toFixed(1)} m · {layout.homes.length} homes · {Object.entries(layout.zones).filter(([k]) => k !== 'plaza').map(([k, z]) => `${z.instances.length} ${k}`).join(' · ')}</div>
        <div className="lbl">Surroundings <b>{baseTheme.surround?.[theme.surroundMode]?.label || surround}</b></div>
        {surroundModesOf(baseTheme).length > 1 && <div className="wx two">{surroundModesOf(baseTheme).map((m) => <button key={m} className={surround === m ? 'on' : ''} title={baseTheme.surround?.[m]?.label} onClick={() => set('surround', m)}>{m === 'water' ? '🌊 Water' : '⛰️ Land'}<small>{baseTheme.surround?.[m]?.label}</small></button>)}</div>}
        </Sec><Sec id="time" title="Time & weather" sub={`${fmtHour(hour)} · ${WEATHER[weather]?.label || ''}`}>
        <div className="lbl">Time of day <b>{fmtHour(hour)}{settings.timeMode === 'random' ? ' (world clock)' : ''}</b></div>
        <div className="wx size">{[['auto', '🕒 Auto', 'Follows Eastern time'], ['live', '📍 Live', 'Your own local clock'], ['manual', '🎚 Slider', 'Pick an hour'], ['random', '🎲 Random', 'Its own world clock']].map(([m, n, t]) =>
          <button key={m} className={settings.timeMode === m ? 'on' : ''} title={t} onClick={() => setTimeMode(m)}>{n}</button>)}</div>
        <input type="range" min="0" max="23.99" step="0.25" value={hour} onChange={(e) => setSettings((s) => ({ ...s, timeMode: 'manual', hour: +e.target.value }))} />
        <div className="ticks"><span>12a</span><span>6a</span><span>12p</span><span>6p</span><span>12a</span></div>
        {settings.timeMode === 'live' && <div className="muted small">Live: your computer's clock ({new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', timeZoneName: 'short' })}).</div>}
        {settings.timeMode === 'auto' && <div className="muted small">Auto: follows Eastern time ({fmtHour(nowHour)} ET).</div>}
        {settings.timeMode === 'random' && <div className="rnd">
          <div>🎲 World clock started at <b>{fmtHour(settings.rclock?.h0 ?? 0)}</b>, now <b>{fmtHour(worldHour)}</b></div>
          <div className="rrow">1 world hour every <span className="seg">{RATES.map((r) => <button key={r} className={settings.rate === r ? 'on' : ''} onClick={() => setRate(r)}>{r} min</button>)}</span></div>
          <button className="linkish" onClick={() => set('rclock', newClock())}>↻ New random start</button>
        </div>}
        <div className="lbl">Weather {settings.wxMode === 'random' && <b>🎲 {WEATHER[weather]?.label}</b>}</div>
        <div className="wx">{theme.weathers.map((k) => <button key={k} className={settings.wxMode === 'pick' && weather === k ? 'on' : ''} onClick={() => setSettings((s) => ({ ...s, weather: k, wxMode: 'pick' }))}>{WEATHER[k].label}</button>)}
          <button className={settings.wxMode === 'random' ? 'on' : ''} title="Changes every 10-30 min, mostly clear" onClick={() => (settings.wxMode === 'random' ? null : set('wxMode', 'random'))}>🎲 Random</button>
          <button className={settings.wxMode === 'live' ? 'on' : ''} title="Real weather for a place (Open-Meteo, needs internet)" onClick={() => set('wxMode', 'live')}>📍 Live</button></div>
        {settings.wxMode === 'live' && <div className="rnd livewx">
          <input defaultValue={settings.wxLoc} placeholder="City, State" onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }} onBlur={(e) => set('wxLoc', e.target.value.trim() || 'New York, NY')} />
          <div className="muted small">{!liveWx ? 'Checking the weather…' : liveWx.error ? `Live weather unavailable (${liveWx.error}); showing ${WEATHER[weather]?.label || weather}.` : `${liveWx.place}: ${Math.round(liveWx.tempF)}°F, ${liveWx.cond} → ${WEATHER[weather]?.label || weather}${liveWx.offline ? ' (offline, last known)' : ''}. Uses Open-Meteo, refreshed every 15 min.`}</div></div>}
        {settings.wxMode === 'random' && <div className="rnd">
          <div>Now: <b>{WEATHER[weather]?.label}</b>{rwxOk && <> · next change in ~{Math.max(1, Math.round((settings.rwx.until - now) / 60000))} min</>}</div>
          <div className="muted small">Changes every 10 to 30 minutes, mostly {WEATHER[calm]?.label.toLowerCase()}, blending smoothly.</div>
          <button className="linkish" onClick={rerollWx}>↻ Change now</button>
        </div>}
        <div className="lbl">Seasonal events {season && <b>{SEASON_LABEL[season]}</b>}</div>
        <div className="wx size">{[['auto', '📅 Auto'], ['off', 'Off'], ['halloween', '🎃'], ['winter', '❄️'], ['spring', '🌸']].map(([m, n]) => <button key={m} className={(settings.seasonMode || 'auto') === m ? 'on' : ''} title={m === 'auto' ? 'By date: Halloween in October, winter holidays in December, spring Mar-May' : SEASON_LABEL[m] || 'No decorations'} onClick={() => set('seasonMode', m)}>{n}</button>)}</div>
        </Sec><Sec id="idle" title="Idle activities" sub={level ? `${level}%` : 'Off'}>
        <div className="lbl">Idle activities {act && <b>{act.emojis[0]} {act.label}</b>}</div>
        <div className="slider actlvl"><span>😴</span><input type="range" min="0" max="100" step="1" value={level} onChange={(e) => { const v = +e.target.value; setSettings((s) => ({ ...s, actLevel: v, activities: v > 0 })); if (!v) setAct(null); }} /><span>🎉</span></div>
        <div className="muted small">{level ? `${level === 100 ? 'Max: back-to-back' : level >= 80 ? 'Very lively' : level >= 40 ? 'Lively' : 'Mostly resting'} · next every ~${fmtGap(level)} · sleepy bots join ${Math.round(wakeChance(level) * 100)}% of the time` : 'Off: idle bots just rest'}</div>
        {level > 0 && <div className="actnow">{act ? <>Now: <b>{act.label}</b> with {act.ids.length} bot{act.ids.length > 1 ? 's' : ''} · <button className="linkish" onClick={() => setAct(null)}>end</button></>
          : <>{idleIds.length ? `${idleIds.length} idle bot${idleIds.length > 1 ? 's' : ''}` : 'No idle bots right now'} · next in ~{Math.max(1, Math.round((nextAct.current - now) / 60000))} min{idleIds.length > 0 && <> · <button className="linkish" onClick={() => startAct()}>start one now</button></>}</>}</div>}
        </Sec><Sec id="alerts" title="Alerts" sub={settings.notify ? 'On' : 'Off'}>
        <label className="toggle"><input type="checkbox" checked={!!settings.notify} onChange={async (e) => { const on = e.target.checked; set('notify', on); if (on) setPerm(await askPermission()); }} /> Notify me when a bot waits on me or errors</label>
        {settings.notify && perm !== 'granted' && <div className="muted small">{perm === 'denied' ? 'Notifications are blocked for this page in your browser settings.' : perm === 'unsupported' ? 'This browser has no notifications.' : 'Allow notifications when your browser asks.'}</div>}
        <label className="toggle"><input type="checkbox" checked={!!settings.notifySound} onChange={(e) => { set('notifySound', e.target.checked); if (e.target.checked) chime(); }} /> Play a sound too</label>
        </Sec><Sec id="display" title="Display">
        <label className="toggle"><input type="checkbox" checked={settings.bubbles} onChange={(e) => set('bubbles', e.target.checked)} /> Show speech bubbles</label>
        <label className="toggle"><input type="checkbox" checked={glow} disabled={lite} onChange={(e) => set('glow', e.target.checked)} /> Glow effects (bloom){lite && <small className="muted"> (off in lite)</small>}</label>
        <label className="toggle"><input type="checkbox" checked={lite} onChange={(e) => set('lite', e.target.checked)} /> Lite mode <small className="muted">(no glow/shadows, fewer plants &amp; particles{settings.lite == null ? `; auto ${IS_PHONE ? 'on for phones' : 'off'}` : ''})</small></label>
        {settings.lite != null && <button className="linkish" onClick={() => set('lite', null)}>Reset lite mode to auto</button>}
        </Sec><Sec id="touch" title="Touch controls" sub={settings.touchMode === 'earth' ? 'Google Earth' : 'Standard'}>
        <div className="wx two touchmode">
          <button className={settings.touchMode !== 'earth' ? 'on' : ''} onClick={() => set('touchMode', 'standard')}>Standard<small>1 finger orbit · pinch zoom · 2 fingers pan</small></button>
          <button className={settings.touchMode === 'earth' ? 'on' : ''} onClick={() => set('touchMode', 'earth')}>Google Earth style<small>drag moves map · twist rotates · 2 fingers up/down tilt · double-tap zoom</small></button>
        </div>
        </Sec><Sec id="chat" title="Chat connections">
        <ChatSettings bots={bots} />
        </Sec><Sec id="report" title="Bots report to">
        <ul className="srcs">{sources.map((s, i) => <li key={i} title={s.error || ''}><span className={'sd ' + (s.ok ? 'ok' : 'bad')} />{s.type === 'git' ? '🔀 git ' : '📁 '}<code>{s.label}</code>{s.error && <small className="err"> {s.error.slice(0, 90)}</small>}</li>)}</ul>
        <div className="muted small">{demo ? 'No real bots have reported yet, so demo bots are shown. ' : ''}Give your bots <a href="/agent.txt" target="_blank" rel="noreferrer">agent.txt</a> (how to report). </div>
        <EventsDirEditor />
        </Sec>
      </div>}

      <div className="hint">{TOUCH ? (settings.touchMode === 'earth' ? 'Drag to move · pinch to zoom · twist to rotate · two fingers up/down to tilt' : 'Drag to orbit · pinch to zoom · two fingers to pan · tap a blob') : 'Drag to orbit · scroll to zoom · click a blob or a home'}</div>
    </>}
  </div>);
}

// collapsible Island-settings section (Discord-style chevron); open/closed state is remembered per section
const SEC_KEY = 'botsim.settingsOpen';
const secLoad = () => { try { return JSON.parse(localStorage.getItem(SEC_KEY) || '{}'); } catch { return {}; } };
function Sec({ id, title, sub, children }) {
  const [open, setOpen] = useState(() => { const v = secLoad()[id]; return v === undefined ? id === 'theme' : !!v; });
  const toggle = () => setOpen((o) => { const n = !o; try { localStorage.setItem(SEC_KEY, JSON.stringify({ ...secLoad(), [id]: n })); } catch {} return n; });
  return (<section className={'sec' + (open ? ' open' : '')}>
    <button className="sech" onClick={toggle} aria-expanded={open}><svg className="chev" viewBox="0 0 24 24" width="14" height="14"><path d="M9 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
      <span className="sect">{title}</span>{sub && !open && <span className="secs">{sub}</span>}</button>
    {open && <div className="secb">{children}</div>}
  </section>);
}
const ALERT_STATES = new Set(['waiting_on_user', 'error', 'done']);
// clear a bot's alert (or all of them): the server keeps an ack for that report, so it stays cleared on reload / other devices
async function clearAlerts(body) {
  try { const r = await fetch('/api/alerts/clear', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
    if (!r.ok) console.warn('[alerts] clear failed', r.status, await r.text()); } catch (e) { console.warn('[alerts] clear failed', e); }
}
// Island settings footer: change the local events folder (saved to the config file, applied live) + app version
function EventsDirEditor() {
  const [info, setInfo] = useState(null); const [val, setVal] = useState(''); const [msg, setMsg] = useState('');
  useEffect(() => { fetch('/api/info').then((r) => r.json()).then((d) => { setInfo(d); setVal(d.eventsDir || ''); }).catch(() => {}); }, []);
  if (!info) return null;
  const save = async () => { setMsg('Saving…'); try { const r = await fetch('/api/config/events-dir', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ eventsDir: val }) }); const d = await r.json();
    setMsg(r.ok ? `Now reading ${d.eventsDir}` : `Couldn't change it: ${d.error}`); if (r.ok) setInfo({ ...info, eventsDir: d.eventsDir }); } catch (e) { setMsg('Couldn\'t reach the app.'); } };
  return (<div className="evdir">
    {info.canEdit && <><div className="muted small">Local reports folder (bots on this computer write here):</div>
      <div className="evrow"><input value={val} onChange={(e) => setVal(e.target.value)} spellCheck={false} /><button className="clearbtn" disabled={val === info.eventsDir} onClick={save}>Save</button></div>
      {msg && <div className="muted small">{msg}</div>}</>}
    {info.canEdit && <GitSourceEditor git={info.git} onSaved={(g) => setInfo({ ...info, git: g })} />}
    <div className="muted small ver">Bot Island v{info.version}{info.desktop ? ' · desktop app' : ''}</div>
  </div>);
}
// shared git repo (read-only pull). The token goes to the app's data folder and never comes back to the page.
function GitSourceEditor({ git, onSaved }) {
  const [open, setOpen] = useState(false); const [url, setUrl] = useState(git?.url || ''); const [branch, setBranch] = useState(git?.branch || 'main');
  const [token, setToken] = useState(''); const [msg, setMsg] = useState('');
  const post = async (body) => { setMsg('Saving…'); try { const r = await fetch('/api/config/git', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }); const d = await r.json();
    if (!r.ok) return setMsg(`Couldn't save: ${d.error}`); setToken(''); onSaved(d.git); setMsg(d.git ? 'Saved. Pulling every 15 s…' : 'Git source removed.'); } catch { setMsg('Couldn\'t reach the app.'); } };
  return (<div className="gitsrc">
    <button className="linkish" onClick={() => setOpen((v) => !v)}>{open ? '▾' : '▸'} Shared git repo {git ? (git.ok ? '✓' : '⚠') : '(off)'}</button>
    {open && <div className="gitform">
      <div className="muted small">Pull bot reports from a private GitHub repo (read-only). Needs git installed on this computer.</div>
      <input placeholder="https://github.com/owner/bot-island-status.git" value={url} onChange={(e) => setUrl(e.target.value)} spellCheck={false} />
      <div className="evrow"><input placeholder="branch" value={branch} onChange={(e) => setBranch(e.target.value)} style={{ maxWidth: 110 }} />
        <input type="password" autoComplete="off" placeholder={git?.hasToken ? 'token saved (leave empty to keep)' : 'read-only token (optional)'} value={token} onChange={(e) => setToken(e.target.value)} /></div>
      <div className="evrow"><button className="clearbtn" onClick={() => post({ url, branch, token })}>Save</button>
        {git?.hasToken && <button className="clearbtn" onClick={() => post({ url, branch, clearToken: true })}>Forget token</button>}
        {git && <button className="clearbtn" onClick={() => post({ remove: true })}>Remove</button>}</div>
      {git?.error && <div className="muted small" style={{ color: '#c0392b' }}>{git.error.slice(0, 160)}</div>}
      {msg && <div className="muted small">{msg}</div>}
    </div>}
  </div>);
}
function Card({ bot, label, chat, onClose, onScreen }) {
  const si = STATE_INFO[bot.state] || STATE_INFO.idle;
  return (<div className="card panel">
    <button className="x" onClick={onClose}>×</button>
    <div className="ch"><i className="big" style={{ background: botColor(bot) }} /><div><div className="cn">{bot.name}{chat.unread(bot.id) > 0 && <span className="ubadge" title="new chat replies">{chat.unread(bot.id)} new</span>}</div><div className="cr">{bot.title || 'Grok Bot'}</div></div></div>
    <div className="crow"><span className="chip" style={{ background: si.color }}>{label}</span><span className="src">{bot.source === 'demo' ? 'demo data' : bot.source === 'real' ? 'live' : 'no reports yet'}</span>
      {ALERT_STATES.has(bot.state) && <button className="clearbtn" title="Not actually waiting? Clear this alert: the bot goes back to idle until its next report" onClick={() => clearAlerts({ bot: bot.id })}>✓ Clear alert</button>}</div>
    <details className="custom"><summary>🎨 Customize look</summary><ProfileEditor bot={bot} /></details>
    <div className="lbl">Current task <button className="clearbtn" style={{ float: 'right' }} onClick={onScreen}>📺 Task screen</button></div>
    <div className="task">{bot.task || '—'}</div>
    <div className="muted small">Last update: {fmtET(bot.updatedAt, true)}</div>
    <ChatThread bot={bot} chat={chat} />
    <div className="lbl">Recent actions</div>
    <ol className="acts">{(bot.actions || []).slice(0, 10).map((a, i) => <li key={i}><span className="tm">{fmtET(a.ts)}</span><span>{a.text}</span></li>)}
      {!bot.actions?.length && <li className="muted">Nothing yet</li>}</ol>
  </div>);
}
