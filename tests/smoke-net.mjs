// Smoke test: run the game module in Node with a recording Proxy mock for three.js + DOM.
import fs from 'fs';
import vm from 'vm';
const ROOT = process.argv[2];
const man = JSON.parse(fs.readFileSync(ROOT + '/src/manifest.json', 'utf8'));



function mk(name = 'x') {
  const store = new Map();
  const target = function () { };
  let self;
  return self = new Proxy(target, {
    get(t, k) {
      if (k === 'set') return (...a) => { if (typeof a[0] === 'number') { store.set('x', a[0]); store.set('y', a[1]); store.set('z', a[2]); } return self; };
      if (k === Symbol.toPrimitive) return () => 0;
      if (k === Symbol.iterator) return function* () { };
      if (k === 'then') return undefined;
      if (k === 'prototype') return t.prototype;
      if (store.has(k)) return store.get(k);
      const v = mk(name + '.' + String(k)); store.set(k, v); return v;
    },
    set(t, k, v) { store.set(k, v); return true; },
    apply() { return mk(name + '()'); },
    construct() { return mk('new ' + name); },
    has() { return true; },
    ownKeys(t) { return ['prototype']; },
    getOwnPropertyDescriptor(t, k) { return k === 'prototype' ? Reflect.getOwnPropertyDescriptor(t, k) : undefined; },
  });
}
const THREE = mk('THREE');
const realClock = class { constructor() { this.t = 0; } getDelta() { return 1 / 60; } };
const MathUtils = { clamp: (v, a, b) => Math.max(a, Math.min(b, v)) };
const THREEw = new Proxy(THREE, { get(t, k) { if (k === 'Clock') return realClock; if (k === 'MathUtils') return MathUtils; return t[k]; } });

const els = new Map();
function box(id) { const b = { children: [], appendChild(c) { this.children.push(c); }, set innerHTML(v) { this.children = []; }, get innerHTML() { return ''; }, querySelector: () => mk('q') }; els.set(id, b); return b; }
function el(id) {
  if (els.has(id)) return els.get(id);
  if (id === 'dlgOpts' || id === 'ovOpts') return box(id);
  const e = mk('#' + id);
    if (id === 'vespa-glb') e.textContent = '';
  e.value = 'Tester';
  const cls = new Set(); e.classList = { add: (...c) => c.forEach(x => cls.add(x)), remove: (...c) => c.forEach(x => cls.delete(x)), toggle: (c, f) => (f ?? !cls.has(c)) ? cls.add(c) : cls.delete(c), contains: c => cls.has(c) };
  e.style = {}; e.dataset = { v: '300000' };
  els.set(id, e); return e;
}
const handlers = {};
const g = globalThis;
g.document = { getElementById: el, createElement: (t) => t === 'button' ? { innerHTML: '', dataset: {}, style: {}, onclick: null, disabled: false, click() { this.onclick && this.onclick(); } } : mk(t), querySelectorAll: () => [], body: { classList: el('body').classList, appendChild() {} }, head: { appendChild() {} } };
g.innerWidth = 1280; g.innerHeight = 720; g.devicePixelRatio = 1;
g.addEventListener = (t, f) => (handlers[t] ||= []).push(f);
g.matchMedia = () => ({ matches: false });
let raf = null; g.requestAnimationFrame = (f) => { if (f.name === 'animate' || !raf) raf = f; };
const ls = {}; g.localStorage = { getItem: k => ls[k] ?? null, setItem: (k, v) => { ls[k] = v; } };
g.atob = (s) => Buffer.from(s, 'base64').toString('binary');
g.window = g;


globalThis.THREE = THREEw; globalThis.OrbitControls = mk('OrbitControls'); globalThis.GLTFLoader = mk('GLTFLoader'); globalThis.mergeGeometries = () => mk('merged');
globalThis.Q7 = JSON.parse(fs.readFileSync(ROOT + '/data/map/q7.json', 'utf8')); globalThis.GAME_VERSION = man.version;
globalThis.CFG = Object.fromEntries((man.config || []).map(n => [n, JSON.parse(fs.readFileSync(ROOT + '/data/config/' + n + '.json', 'utf8'))]));
let H;
globalThis.__hook = (h) => { H = h; };
const run = () => { for (const f of man.files) vm.runInThisContext(fs.readFileSync(ROOT + '/src/' + f, 'utf8'), { filename: f }); vm.runInThisContext('__hook({player, game, profile, cars, police, SIGNALS, EDGES, MERCHANTS, acceptOffer, goToTarget, policeStop, refreshRoute, get route(){return route}, endDay, evRain, evFlat, openActions, makeBatchOffer, reportViolation, policeFlee, CHECKPOINTS, openPanel, closePanel, renderPanel, get panelTab(){return panelTab}, NET, unlocked, tierInfo, onCrash, triggerFall, fall, standUp, trafficLevel, makeCustomer, get nightK(){return nightK}, applyNight, homeSpot, keys, updateGame, sigState, endDay, banForDay, makeOffer, computeRoute, VENDORS, PEDS, DECKS, napMenu, startNap, perfStepDown, PERF, buildDriver2, rebuildDriver, classifyDrop, deckStep, hitPed, STORY, showOffer, dropOff, storyTalk, eatStreet, napSpot, vendorOpen, edgeAt, HOTZONES, hotScore, hotHere, HANGOUTS, SQ, sqSpawnGiver, profile, LESSONS, startLesson, foreignUnlocked, BIKES, curBike, applyBikeModel, mulSpeed: () => mulSpeed(), fuelPrice: (n) => fuelPrice(n), saveSlot, slotInfo, makeBackup, readJSON, SAVE, HOME3D, DECK_CARS, homeMenu, exportProfile, sqDef, netRecv, NET, FR, frFollow, SND, sndPlay, SIDEQ_MARKS});', { filename: 'hook' }); };
const toasts=[];
run();
if (!process.env.NEWBIE) { H.profile.totals.days = 5; H.profile.settings.noAuto = true; H.profile.settings.easy = true; } // VETERAN: tests assume all features unlocked
if (process.env.DUMP) { const names = process.env.DUMP.split('|'); const out = {}; const hasFn = (v) => typeof v === 'function' || (v && typeof v === 'object' && Object.values(v).some(hasFn));
  for (const n of names) { const v = vm.runInThisContext(n); out[n] = hasFn(v) ? '__FN__' : v; } fs.writeFileSync('/tmp/cfgdump.json', JSON.stringify(out)); process.exit(0); }
const T = els.get('toast') || el('toast');
let lastT=''; const tr=()=>{ const v=T.innerHTML; if(typeof v==='string'&&v!==lastT){lastT=v;toasts.push(v.replace(/<[^>]+>/g,' ').slice(0,110));} };
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const frame = (n) => { for (let i = 0; i < n; i++) { raf(); tr(); } };
const dlgText = () => (els.get('dlgText')||el('dlgText')).innerHTML;
async function pickDlg(i = 0, label) { const b = els.get('dlgOpts'); if (!H.game.paused || !b.children.length) return false; const c = b.children[Math.min(i, b.children.length - 1)]; console.log('   dlg>', label || '', '|', String(dlgText()).replace(/<[^>]+>/g,'').slice(0,70), '=>', c.innerHTML.replace(/<[^>]+>/g, '').slice(0, 70)); c.click(); await sleep(450); tr(); return true; }
const findOpt = (re) => els.get('dlgOpts').children.findIndex(c => re.test(c.innerHTML));


H.profile.bikePicked = true; el('bStart').onclick(); frame(5); await sleep(1000); frame(2); await pickDlg(0,'intro'); H.game.waitT = 999;
H.netRecv({ t: 's', id: 'p2', n: 'Lan', lv: 3, x: H.player.x + 30, z: H.player.z, h: 0, l: 0, y: 6, bk: 'exciter', st: 'bike', m: 120000, lk: { g: 'f', jacket: 'pink' } }, null);
H.netRecv({ t: 's', id: 'p3', n: 'Hai', lv: 5, x: H.player.x - 300, z: H.player.z, h: 0, l: 0, y: 0.07, bk: 'vespa', st: 'wait', m: 50000 }, null);
frame(400);
const r = H.NET.remotes.get('p2');
console.log('dbg', JSON.stringify(Object.keys(H.profile.friends)), typeof H.profile.friends);console.log('remotes', H.NET.remotes.size, 'p2 bk', r.bk, 'y', r.g.position.y.toFixed(2), 'lean children', r.lean.children.length, 'friends', Object.keys(H.profile.friends).join(','));
H.openPanel('friends'); H.renderPanel(); H.closePanel(); console.log('friends panel ok');
H.frFollow('p3'); frame(3); console.log('follow target', H.FR.target, 'marks', H.SIDEQ_MARKS.map(m => m.t).join(''));
H.player.x = H.NET.remotes.get('p3').x; H.player.z = H.NET.remotes.get('p3').z; frame(3); console.log('after meet target', H.FR.target);
console.log('snd cfg', Object.keys(H.SND.cfg).join(','), 'play w/o audio', H.sndPlay('horn'));
console.log('TOASTS:\n ' + toasts.slice(-6).join('\n '));
process.exit(0);
