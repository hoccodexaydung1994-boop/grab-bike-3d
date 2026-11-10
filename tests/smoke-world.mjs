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


globalThis.THREE = THREEw; globalThis.OrbitControls = mk('OrbitControls'); globalThis.GLTFLoader = mk('GLTFLoader'); globalThis.mergeGeometries = () => mk('merged'); for (const n of ['EffectComposer','RenderPass','UnrealBloomPass','OutputPass']) globalThis[n] = mk(n);
globalThis.Q7 = JSON.parse(fs.readFileSync(ROOT + '/data/map/q7.json', 'utf8')); globalThis.GAME_VERSION = man.version;
globalThis.CFG = Object.fromEntries((man.config || []).map(n => [n, JSON.parse(fs.readFileSync(ROOT + '/data/config/' + n + '.json', 'utf8'))]));
let H;
globalThis.__hook = (h) => { H = h; };
const run = () => { for (const f of man.files) vm.runInThisContext(fs.readFileSync(ROOT + '/src/' + f, 'utf8'), { filename: f }); vm.runInThisContext('__hook({player, game, profile, cars, police, SIGNALS, EDGES, MERCHANTS, acceptOffer, goToTarget, policeStop, refreshRoute, get route(){return route}, endDay, evRain, evFlat, openActions, makeBatchOffer, reportViolation, policeFlee, CHECKPOINTS, openPanel, closePanel, renderPanel, get panelTab(){return panelTab}, NET, unlocked, tierInfo, onCrash, triggerFall, fall, standUp, trafficLevel, makeCustomer, get nightK(){return nightK}, applyNight, homeSpot, keys, updateGame, sigState, endDay, banForDay, makeOffer, computeRoute, VENDORS, PEDS, DECKS, napMenu, startNap, perfStepDown, PERF, buildDriver2, rebuildDriver, classifyDrop, deckStep, hitPed, STORY, showOffer, dropOff, storyTalk, eatStreet, napSpot, vendorOpen, edgeAt});', { filename: 'hook' }); };
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
console.log('vendors', H.VENDORS.length, Object.entries(H.VENDORS.reduce((a,v)=>(a[v.kind]=(a[v.kind]||0)+1,a),{})).map(e=>e.join(':')).join(' '), 'peds', H.PEDS.length, 'decks', H.DECKS.length);
H.profile.bikePicked = true; el('bStart').onclick(); H.profile.level = 6;
frame(5); await sleep(1000); frame(2);
console.log('story intro shown', H.game.paused, String(dlgText()).slice(0,80)); await pickDlg(0,'intro');
console.log('story', JSON.stringify(H.profile.story));
// ---- street food
H.game.state='wait'; H.game.waitT=999; H.profile.clock = 12*60;
const v = H.VENDORS.find(v => H.vendorOpen(v)); H.player.x = v.x; H.player.z = v.z; H.player.v = 0; frame(2);
H.profile.st.hunger = 80; H.profile.st.thirst=80; H.openActions();
console.log(' opts', els.get('dlgOpts').children.map(c=>c.innerHTML.slice(0,40)).join(' / '), H.player.x-v.x, H.player.z-v.z, H.game.paused);
let i = findOpt(/vỉa hè/); console.log('vendor opt idx', i, v.kind); els.get('dlgOpts').children[i].click(); await sleep(120);
console.log(' menu:', String(dlgText()).replace(/<[^>]+>/g,'').slice(0,60), '| items', els.get('dlgOpts').children.map(c=>c.innerHTML).join(' / ').slice(0,160));
await pickDlg(0,'eat'); console.log(' hunger', Math.round(H.profile.st.hunger), 'thirst', Math.round(H.profile.st.thirst));
// poisoning + medicine
H.profile.sick = { until: H.profile.clock + 90, from: 'x' }; const st0 = H.profile.st.stamina; frame(300); console.log('sick stamina', st0.toFixed(1), '->', H.profile.st.stamina.toFixed(1));
H.openActions(); console.log(' med option?', findOpt(/thuốc/)); await pickDlg(els.get('dlgOpts').children.length-1,'close');
// ---- nap
H.profile.cash = 900000; H.profile.st.stamina = 20; const c0 = H.profile.clock;
H.player.v=0; H.napMenu(); console.log('nap spot', JSON.stringify(H.napSpot())); await pickDlg(1, 'nap 1h'); console.log(' frozen', H.game.frozen); await sleep(2800); frame(3);
console.log(' after nap clock +', Math.round(H.profile.clock - c0), 'stamina', Math.round(H.profile.st.stamina), 'cash', H.profile.cash, 'frozen', H.game.frozen);
await pickDlg(0,'wake');
// ---- perf
H.perfStepDown(); H.perfStepDown(); H.perfStepDown(); console.log('perf lvl', H.PERF.lvl, 'traffic', H.PERF.traffic, JSON.stringify(H.trafficLevel()), 'hiq', H.profile.settings.hiq, 'shadows', H.profile.settings.shadows);
// ---- character
for (const lk of [{g:'f',skin:2,jacket:'pink',helmet:'gold',acc:'mask'},{g:'m',skin:1,jacket:'retro',helmet:'red',acc:'bag'},{jacket:'rain',acc:'sleeves'}]) H.buildDriver2(lk);
H.profile.look.jacket='black'; H.rebuildDriver(); H.openPanel('char'); H.renderPanel(); console.log('char panel ok', H.panelTab); H.closePanel();
// ---- zones & special orders
const zc = {}; for (let k=0;k<200;k++){ const o=H.makeOffer(); if(o.type!=='batch'){ const z=H.classifyDrop(o.drop); zc[z]=(zc[z]||0)+1; } if(o.urgent) zc.urgent=(zc.urgent||0)+1; if(o.rare) zc.rare=(zc.rare||0)+1; if (o.type==='food') zc.food=(zc.food||0)+1; }
console.log('zones/special over 200 offers', JSON.stringify(zc));
let off; for (let k=0;k<400;k++){ off=H.makeOffer(); if(off.type==='food' && (off.rare)) break; }
console.log('rare offer', off.rare, off.items, off.fare); H.game.state='wait'; H.showOffer(off); H.acceptOffer();
for (let leg=0; leg<6 && H.game.order; leg++) { H.goToTarget(); await sleep(330); let g=0; while(g++<200){ frame(1); if(H.game.paused){ await pickDlg(leg%3); } if(!H.game.order) break; }
  if (H.game.order && H.game.state==='ride' && !H.game.order._t) { H.game.order._t=1; const i0=H.game.order.integ; H.onCrash(10); console.log(' fragile integ', i0, '->', H.game.order.integ, 'zone', H.classifyDrop(H.game.order.drop)); } }
await sleep(3900); frame(3);
console.log('rare done order?', !!H.game.order, 'food', H.profile.today.food);
// ---- bridge
const D = H.DECKS[0]; const ang = Math.atan2(D.p[2]-D.p[0], D.p[3]-D.p[1]);
H.player.x = D.p[0] + Math.sin(ang)*2; H.player.z = D.p[1] + Math.cos(ang)*2; H.player.h = ang; H.player.v = 10; H.game.order=null; H.game.state='wait'; H.game.waitT=999;
H.keys.KeyW = true; let maxY=0; for (let k=0;k<2500;k++){ if(H.player.deck){ const d=H.DECKS[H.player.deck.di], kk=Math.min(d.n-2,H.player.deck.k+1); H.player.h=Math.atan2(d.p[kk*2+2]-H.player.x, d.p[kk*2+3]-H.player.z);} raf(); if(H.game.paused) await pickDlg(0); maxY=Math.max(maxY,H.player.y); if(k%400===0) console.log('  bridge k',k,'deck',JSON.stringify(H.player.deck),'y',H.player.y.toFixed(2),'v',H.player.v.toFixed(1)); } H.keys.KeyW=false;
console.log('dbg bridge', H.game.dayOver, H.profile.clock, H.game.lastCall, H.game.paused, H.game.frozen, H.game.mode, H.player.x.toFixed(1), H.player.z.toFixed(1), H.player.v.toFixed(1), H.fall.on);console.log('bridge maxY', maxY.toFixed(1), 'deck', JSON.stringify(H.player.deck));
// ---- pedestrian
H.player.deck=null; H.player.y=0.07; const p = H.PEDS[0]; const q=H.edgeAt(p.E,p.s,true), off2=(p.E.w/2+1.6)*p.side; H.player.x=q.x-q.dz*off2; H.player.z=q.z+q.dx*off2; H.player.v=10; const cash0=H.profile.cash+H.profile.wallet;
frame(2); await sleep(400); console.log('ped hit dialog', H.game.paused, String(dlgText()).replace(/<[^>]+>/g,'').slice(0,60), 'money diff', H.profile.cash+H.profile.wallet-cash0); await pickDlg(0);
// ---- story progression
H.profile.totals.bike += 3; frame(70); await sleep(1500); frame(2); console.log('story ch', H.profile.story.ch); await sleep(4000); frame(2); if(H.game.paused) await pickDlg(0,'story');
console.log('story after', JSON.stringify(H.profile.story));
H.endDay(); console.log('endDay ok', H.game.dayOver);
console.log('TOASTS:\n ' + toasts.slice(-25).join('\n '));
process.exit(0);
