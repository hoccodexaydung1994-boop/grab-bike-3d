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
const run = () => { for (const f of man.files) vm.runInThisContext(fs.readFileSync(ROOT + '/src/' + f, 'utf8'), { filename: f }); vm.runInThisContext('__hook({player, game, profile, cars, police, SIGNALS, EDGES, MERCHANTS, acceptOffer, goToTarget, policeStop, refreshRoute, get route(){return route}, endDay, evRain, evFlat, openActions, makeBatchOffer, reportViolation, policeFlee, CHECKPOINTS, openPanel, closePanel, renderPanel, get panelTab(){return panelTab}, NET, unlocked, tierInfo, onCrash, triggerFall, fall, standUp, trafficLevel, makeCustomer, get nightK(){return nightK}, applyNight, homeSpot, keys, updateGame, sigState, endDay, banForDay, makeOffer, computeRoute, VENDORS, PEDS, DECKS, napMenu, startNap, perfStepDown, PERF, buildDriver2, rebuildDriver, classifyDrop, deckStep, hitPed, STORY, showOffer, dropOff, storyTalk, eatStreet, napSpot, vendorOpen, edgeAt});', { filename: 'hook' }); };
const toasts=[];
run();
if (!process.env.NEWBIE) { H.profile.totals.days = 5; H.profile.settings.noAuto = true; H.profile.settings.easy = true; } // VETERAN: tests assume all features unlocked

const t0=Date.now();
console.log('init', 'edges', H.EDGES.length, 'signals', H.SIGNALS.length, 'merchants', H.MERCHANTS.length, 'cars', H.cars.length);
console.log('home', H.homeSpot.x.toFixed(1), H.homeSpot.z.toFixed(1), H.homeSpot.E.n);
// start driving
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const frame = (n) => { for (let i = 0; i < n; i++) raf(); };
const ovVisible = () => !els.get('overlay').classList.contains('hidden');
async function pickDlg(i = 0, label) { const b = els.get('dlgOpts'); if (!H.game.paused || !b.children.length) return false; const c = b.children[Math.min(i, b.children.length - 1)]; console.log('   dlg>', label || '', '|', c.innerHTML.replace(/<[^>]+>/g, '').slice(0, 90)); c.click(); await sleep(650); return true; }
H.profile.bikePicked = true; el('bStart').onclick();
H.profile.level = 6; H.profile.sp = 5;
console.log('unlocks', ['food', 'batch', 'premium', 'night'].map(u => u + ':' + H.unlocked(u)).join(' '), 'tier', H.tierInfo().name);
frame(60);
// ---- falls / phone / traffic / night
{ H.player.v = 15; H.game.order = null; const hp0 = H.profile.st.hp; H.triggerFall('crash'); for (let k = 0; k < 200; k++) raf();
  console.log('fall on', H.fall.on, 'canUp', H.fall.canUp, 'hp', Math.round(hp0), '->', Math.round(H.profile.st.hp), 'lean', H.player.lean.toFixed(2));
  H.standUp(); console.log('after standUp fall', H.fall.on, 'lean', H.player.lean);
  H.profile.st.phone = 0; H.game.state = 'wait'; H.game.waitT = 0; for (let k = 0; k < 120; k++) raf(); console.log('phone dead -> state', H.game.state);
  H.profile.st.phone = 100;
  H.profile.clock = 8 * 60; console.log('traffic 8h', JSON.stringify(H.trafficLevel())); H.profile.clock = 14 * 60; console.log('traffic 14h', JSON.stringify(H.trafficLevel())); H.profile.clock = 21.5 * 60; console.log('traffic 21:30', JSON.stringify(H.trafficLevel()));
  for (let k = 0; k < 60; k++) raf(); console.log('visible cars at 21:30', H.cars.filter(c => c.mesh.visible).length, '/', H.cars.length, 'nightK', H.nightK.toFixed(2));
  H.profile.clock = 7 * 60 + 30; for (let k = 0; k < 60; k++) raf(); console.log('visible cars 7:30', H.cars.filter(c => c.mesh.visible).length);
  console.log('customer sample', JSON.stringify(H.makeCustomer())); }
// ---- 1. batch order
H.game.state = 'wait'; H.game.waitT = 999;
const bo = H.makeBatchOffer(); console.log('batch offer', bo && bo.subs.map(s => s.shop.name + '->' + s.drop.name).join(' | '), bo && bo.fare);
H.game.offer = bo; H.game.state = 'offer'; H.acceptOffer();
await pickDlg(0, 'route');
console.log('stops', H.game.order.stops.map(s => s.k + s.s).join(','), 'optimal', H.game.order.optimal);
for (let k = 0; k < 4 && H.game.order; k++) {
  H.goToTarget(); await sleep(330);
  let g = 0; while (g++ < 300) { frame(1); if (H.game.paused) { await pickDlg(0); break; } }
  H.onCrash(10);
}
await sleep(3200); frame(5);
console.log('batch done state', H.game.state, 'order', !!H.game.order, 'food today', H.profile.today.food, 'wallet', H.profile.wallet, 'combo', H.profile.totals.combo || 0);
// ---- 2. normal offers still work
H.game.waitT = 0; let g1 = 0; while (H.game.state !== 'offer' && g1++ < 600) frame(1);
console.log('next offer type', H.game.offer && H.game.offer.type, 'premium', H.game.offer && H.game.offer.premium);
H.acceptOffer(); if (H.game.paused) await pickDlg(0, 'route2');
for (let leg = 0; leg < 5 && H.game.order; leg++) { const o = H.game.order; console.log('  leg', leg, 'si', o.si, 'state', H.game.state, 'handling', o.handling, 'paused', H.game.paused, 'police', H.police.active); H.goToTarget(); await sleep(330); const t = o.stops ? o.stops[o.si] : null; console.log('   dist to target', o.stops ? Math.hypot(H.player.x - (t.k==='pick'?o.subs[t.s].shop.spot:o.subs[t.s].drop).x, H.player.z - (t.k==='pick'?o.subs[t.s].shop.spot:o.subs[t.s].drop).z).toFixed(1) : '-', 'v', H.player.v.toFixed(2)); let g2 = 0; while (g2++ < 300) { frame(1); if (H.game.paused) { await pickDlg(1); } if (!H.game.order) break; } }
console.log('after order: state', H.game.state, 'trips', H.profile.trips, 'xp', H.profile.xp, 'lvl', H.profile.level);
// ---- 3. law: camera (no witness) + speeding check + pursuit at checkpoint
H.player.x = H.CHECKPOINTS[0].x + 400; H.player.z = H.CHECKPOINTS[0].z; frame(2);
const lic0 = H.profile.license; H.reportViolation('red');
console.log('camera fines', JSON.stringify(H.profile.today.cam), 'licence', lic0, '->', H.profile.license, 'police', H.police.active);
H.keys.KeyW = true; for (let k = 0; k < 400; k++) { raf(); if (H.game.paused) await pickDlg(0); } H.keys.KeyW = false;
console.log('viol after fast drive', H.profile.today.viol, 'v', H.player.v.toFixed(1));
const cp = H.CHECKPOINTS[1]; H.player.x = cp.x + 5; H.player.z = cp.z; H.game.noViolT = 0; frame(1);
H.reportViolation('wrong'); console.log('pursuit', H.police.active, H.police.mode, 'wanted', H.profile.wanted);
H.policeFlee(); let g3 = 0; while (H.police.mode === 'pursue' && g3++ < 4000) { frame(1); if (H.game.paused) await pickDlg(0); }
console.log('police mode', H.police.mode, 'frozen', H.game.frozen, 'fines', H.profile.today.costs.fine, 'licence', H.profile.license);
let g4 = 0; while (H.game.frozen && !H.profile.banned && g4++ < 3000) frame(1);
console.log('banned', H.profile.banned, 'overlay', els.get('ovTitle').textContent);
// ---- 4. panels
for (const t of ['profile', 'skills', 'bike', 'money', 'settings']) { H.openPanel(t); } H.closePanel();
console.log('panels ok, last tab', H.panelTab);
// ---- 5. end of day -> report -> home -> sleep
el('ovBtn').onclick(); await sleep(150);
if (!ovVisible() || !els.get('ovOpts').children.length) { H.endDay(); el('ovBtn').onclick(); await sleep(150); }
const ov = els.get('ovOpts'); console.log('home opts', ov.children.length);
ov.children[ov.children.length - 1].onclick(); await sleep(50);
console.log('new day', H.profile.day, 'mode', H.game.mode, 'history', H.profile.history.length, JSON.stringify(H.profile.history.at(-1)), 'licence', H.profile.license, 'wanted', H.profile.wanted, 'banned', H.profile.banned);
H.profile.bikePicked = true; el('bStart').onclick(); frame(30); console.log('day2 state', H.game.state, 'mode', H.game.mode);
process.exit(0);
