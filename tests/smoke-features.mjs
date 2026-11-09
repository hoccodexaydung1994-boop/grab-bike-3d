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
const run = () => { for (const f of man.files) vm.runInThisContext(fs.readFileSync(ROOT + '/src/' + f, 'utf8'), { filename: f }); vm.runInThisContext('__hook({player, game, profile, cars, police, SIGNALS, EDGES, MERCHANTS, acceptOffer, goToTarget, policeStop, refreshRoute, get route(){return route}, endDay, evRain, evFlat, openActions, makeBatchOffer, reportViolation, policeFlee, CHECKPOINTS, openPanel, closePanel, renderPanel, get panelTab(){return panelTab}, NET, unlocked, tierInfo, onCrash, triggerFall, fall, standUp, trafficLevel, makeCustomer, get nightK(){return nightK}, applyNight, homeSpot, keys, updateGame, sigState, endDay, banForDay, makeOffer, computeRoute, VENDORS, PEDS, DECKS, napMenu, startNap, perfStepDown, PERF, buildDriver2, rebuildDriver, classifyDrop, deckStep, hitPed, STORY, showOffer, dropOff, storyTalk, eatStreet, napSpot, vendorOpen, edgeAt, HOTZONES, hotScore, hotHere, HANGOUTS, SQ, sqSpawnGiver, profile, LESSONS, startLesson, foreignUnlocked, BIKES, curBike, applyBikeModel, mulSpeed: () => mulSpeed(), fuelPrice: (n) => fuelPrice(n), saveSlot, slotInfo, makeBackup, readJSON, SAVE, HOME3D, DECK_CARS, homeMenu, exportProfile, sqDef});', { filename: 'hook' }); };
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

H.profile.bikePicked = true; el('bStart').onclick(); H.profile.level = 6; frame(5); await sleep(1000); frame(2); await pickDlg(0,'intro');
H.game.waitT = 999;
console.log('hotzones', H.HOTZONES.map(z => z.name + ' s12=' + H.hotScore(z, 12*60).toFixed(2)).join(' | '));
console.log('hangouts', H.HANGOUTS.length, 'deck cars', H.DECK_CARS.length);
// hot zone effect
H.player.x = H.HOTZONES[0].x; H.player.z = H.HOTZONES[0].z; H.profile.clock = 12*60; frame(70); console.log('hotHere', JSON.stringify(H.hotHere() && { n: H.hotHere().z.name, s: +H.hotHere().s.toFixed(2) }));
// hangout chat
{ const v = H.HANGOUTS[0]; H.player.x = v.x; H.player.z = v.z; H.player.v = 0; frame(2); H.openActions(); const i = findOpt(/Tán gẫu/); console.log('hangout opt', i); if (i >= 0) { els.get('dlgOpts').children[i].click(); await sleep(120); console.log(' chat:', String(dlgText()).replace(/<[^>]+>/g,' ').slice(0,200)); await pickDlg(1); } }
// side quests: run every quest
for (const q of H.SQ.giver ? [] : []) {}
for (const id of ['grandma_med','docs','dog','tourist','stranded','flowers']) {
  H.profile.sq.active = null; H.sqSpawnGiver(); let tries = 0; while (H.SQ.giver.q.id !== id && tries++ < 60) H.sqSpawnGiver();
  const g = H.SQ.giver; H.player.x = g.x; H.player.z = g.z; H.player.v = 0; frame(2); H.openActions(); const i = findOpt(/❗/); els.get('dlgOpts').children[i].click(); await sleep(100); await pickDlg(0, id);
  for (let st = 0; st < 4 && H.profile.sq.active; st++) { const A = H.profile.sq.active; H.player.x = A.tx; H.player.z = A.tz; H.player.v = 0; for (let k = 0; k < 40; k++) { raf(); tr(); } await sleep(50); }
  if (H.game.paused) { console.log('  done:', String(dlgText()).replace(/<[^>]+>/g,' ').slice(0,90)); await pickDlg(0); } else console.log('  NOT DONE', JSON.stringify(H.profile.sq.active));
}
console.log('sq total', H.profile.sq.total, 'cash', H.profile.cash);
// english
for (const id of ['greet','direction']) { H.startLesson(id); await sleep(50); await pickDlg(0,'start'); await sleep(150); const Ls = H.LESSONS.find(l=>l.id===id); for (const q of Ls.quiz) { await sleep(50); els.get('dlgOpts').children[q.a].click(); await sleep(700); } await pickDlg(0,'result'); }
console.log('foreign unlocked', H.foreignUnlocked());
let fo; for (let k=0;k<300;k++){ const o=H.makeOffer(); if(o.foreign){fo=o;break;} } console.log('foreign offer', fo && fo.cust.name, fo && fo.fare);
H.game.state='wait'; H.showOffer(fo); H.acceptOffer(); console.log(' english during ride', H.profile.english, H.profile.engTemp);
for (let leg=0; leg<3 && H.game.order; leg++) { H.goToTarget(); await sleep(330); let g=0; while(g++<200){ frame(1); if(H.game.paused) await pickDlg(1); if(!H.game.order) break; } }
await sleep(800); console.log(' english after', H.profile.english, H.profile.engTemp, 'order', !!H.game.order);
// garage
const sp0 = H.mulSpeed(); H.profile.bikes.push('exciter','feliz'); H.profile.bikeId='exciter'; H.applyBikeModel(); console.log('garage exciter speed', sp0.toFixed(2), '->', H.mulSpeed().toFixed(2));
H.profile.bikeId='feliz'; H.applyBikeModel(); console.log(' feliz fuelPrice(50)', H.fuelPrice(50), 'elec', H.curBike().elec);
H.openPanel('bike'); H.renderPanel(); H.openPanel('data'); H.renderPanel(); H.openPanel('eng'); H.renderPanel(); H.closePanel(); console.log('panels bike/data/eng ok');
// save data
H.saveSlot(1); console.log('slot1', JSON.stringify(H.slotInfo(1).meta)); H.makeBackup('test'); console.log('backups', H.readJSON(H.SAVE.backupKey).length);
try { H.exportProfile(); console.log('export ok'); } catch (e) { console.log('export err', e.message); }
// home 3D
H.endDay(); await sleep(50); el('ovBtn').onclick(); await sleep(150); console.log('home3d on', H.HOME3D.on, 'mode', H.game.mode);
const ov = els.get('ovOpts'); ov.children[ov.children.length-1].onclick(); await sleep(50); frame(3); console.log('after sleep home3d', H.HOME3D.on, 'day', H.profile.day, 'backups', H.readJSON(H.SAVE.backupKey).length);
console.log('TOASTS:\n ' + toasts.slice(-14).join('\n '));
process.exit(0);
