// 本体。つまみ → 空 → 子 → 餌 のループを繋ぐ。
// vault: 30_Projects/そらのめぐり/02_企画/骨格v2_空をつくる.md

import {
  classify, reachable, fullRange, DIAL_KEYS,
  AFTER_RAIN_WINDOW, WEATHER_JA, WEATHERS,
} from './weather.js';
import { skyLook, drawClouds, drawRainbow, Precip } from './sky.js';
import { SpriteBank } from './sprites.js';
import { Pet, bondLevel } from './garden.js';
import { gardenLayout, walkBounds, pondOnScreen } from './layout.js';
import * as S from './state.js';
import { relax, settled } from './inertia.js';
import { Roster } from './arrival.js';

// アトラスのidは `yui-*` のまま据え置く。ゲーム名を「そらのめぐり」に変えた後も改名しない:
// このidは ~/.codex/pets/ のフォルダ名・各 pet.json の id・hatch-pet-runs の生成記録と
// ログの全部を貫いていて、揃えて直さないと「どう作ったか」を辿り直せなくなる。
// プレイヤーには一切見えないので、由来だけ書いて残す。
const PET_ID = Object.fromEntries(WEATHERS.map((w) => [w, `yui-${w}`]));

const cv = document.getElementById('stage');
const ctx = cv.getContext('2d');
const el = (id) => document.getElementById(id);

let st = S.load();
let sky = { ...st.dials };       // つまみを目標として追いかける、空の実際の状態
let bank = null;
let bg = {};
let bgm = null;
let pets = [];                 // いま庭にいる子
let pointer = null;
let selected = null;           // 持ち物で選んでいる実り
let time = 0;
let stableFor = 0;             // いまの天気が続いている秒数
let current = null;            // いまの天気
let afterRain = 0;             // 降水が止まってからの残り猶予（秒）。虹の窓
let sinceHarvest = 0;
const roster = new Roster();

const precip = new Precip(1, 1);

// ---------------------------------------------------------------- 初期化

function fitCanvas() {
  const r = cv.getBoundingClientRect();
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  cv.width = Math.round(r.width * dpr);
  cv.height = Math.round(r.height * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  precip.resize(r.width, r.height);
}

function loadImage(src) {
  return new Promise((res) => {
    const im = new Image();
    im.onload = () => res(im);
    im.onerror = () => res(null);
    im.src = src;
  });
}

async function init() {
  window.addEventListener('resize', fitCanvas);
  fitCanvas();

  // 余白を切り落とした版を使う。切る位置は tools/crop_bg.mjs が画像から実測している
  bgm = await fetch('js/bg-metrics.json').then((r) => r.json());
  [bg.green, bg.snow, bg.hills] = await Promise.all([
    loadImage(bgm.bg_ground_green.src),
    loadImage(bgm.bg_ground_snow.src),
    loadImage(bgm.bg_hills.src),
  ]);
  bank = await SpriteBank.load(Object.values(PET_ID));

  setupDials();
  // 範囲外の保存値を季節の可動域へ寄せた後、空とつまみを一致させて始める。
  sky = { ...st.dials };
  bindPointer();
  drawBag();
  requestAnimationFrame(loop);
}

// ---------------------------------------------------------------- つまみ

const DIALS = DIAL_KEYS;
const FMT = {
  t: (x) => `${x.toFixed(1)}℃`,
  w: (x) => `${x.toFixed(0)}`,
  p: (x) => `${x.toFixed(0)}hPa`,
  v: (x) => `${x.toFixed(1)}m/s`,
};

const boundaryNoticeAt = Object.fromEntries(DIALS.map((k) => [k, -Infinity]));
const boundaryWords = {
  t: { low: '冷えない', high: '暑くならない' },
  w: { low: '湿らない', high: '湿りすぎない' },
  p: { low: '気圧が下がらない', high: '気圧が上がらない' },
  v: { low: '風が弱まらない', high: '風が強くならない' },
};

function sayBoundary(k, side) {
  const now = performance.now();
  if (now - boundaryNoticeAt[k] < 3000) return;
  boundaryNoticeAt[k] = now;
  const sekki = S.gameCalendar(st).sekki;
  say(`${sekki}の空は ここまでしか ${boundaryWords[k][side]}`);
}

function updateRangeVisual(k, reach) {
  const [lo, hi] = fullRange(k);
  const start = ((reach[0] - lo) / (hi - lo)) * 100;
  const width = ((reach[1] - reach[0]) / (hi - lo)) * 100;
  const band = el(`r-${k}`);
  band.style.marginLeft = `${start}%`;
  band.style.width = `${width}%`;
}

/** ★可動域は暦で動く。ここがレアリティの全て — 確率もガチャも無い。 */
function applyRanges() {
  const cal = S.gameCalendar(st);
  const r = reachable(cal.sekkiIndex);
  for (const k of DIALS) {
    const input = el(`d-${k}`);
    const [fullLo, fullHi] = fullRange(k);
    input.min = fullLo;
    input.max = fullHi;
    updateRangeVisual(k, r[k]);
    // 季節が変わって範囲外になった値は、範囲の内側へ寄せる
    st.dials[k] = Math.max(r[k][0], Math.min(r[k][1], st.dials[k]));
    input.value = st.dials[k];
    el(`v-${k}`).textContent = FMT[k](st.dials[k]);
  }
  el('sekki').textContent = cal.sekki;
  el('dayno').textContent = `${cal.dayOfYear + 1}日目`;
}

function setupDials() {
  applyRanges();
  for (const k of DIALS) {
    el(`d-${k}`).addEventListener('input', (e) => {
      const [lo, hi] = reachable(S.gameCalendar(st).sekkiIndex)[k];
      const attempted = parseFloat(e.target.value);
      const value = Math.max(lo, Math.min(hi, attempted));
      if (attempted < lo) sayBoundary(k, 'low');
      if (attempted > hi) sayBoundary(k, 'high');
      st.dials[k] = value;
      e.target.value = value;
      el(`v-${k}`).textContent = FMT[k](st.dials[k]);
      S.save(st);
    });
  }
}

// ---------------------------------------------------------------- 通知

function say(text) {
  const d = document.createElement('div');
  d.className = 'msg';
  d.textContent = text;
  el('feed').appendChild(d);
  setTimeout(() => d.remove(), 4600);
}

// ---------------------------------------------------------------- 持ち物

function drawBag() {
  const box = el('bag');
  box.innerHTML = '';
  const kinds = WEATHERS.filter((k) => st.bag[k] > 0);
  if (!kinds.length) {
    const s = document.createElement('span');
    s.className = 'hint';
    s.textContent = '空を保つと実りが生ります';
    box.appendChild(s);
    return;
  }
  for (const k of kinds) {
    const b = document.createElement('button');
    b.textContent = `${S.FRUIT[k]} ${st.bag[k]}`;
    if (selected === k) b.classList.add('sel');
    b.onclick = () => { selected = selected === k ? null : k; drawBag(); };
    box.appendChild(b);
  }
  const s = document.createElement('span');
  s.className = 'hint';
  s.textContent = selected ? 'この実りを持って、子をタップ' : '選んでから子をタップすると与えられます';
  box.appendChild(s);
}

// ---------------------------------------------------------------- 入力

function bindPointer() {
  const pos = (e) => {
    const r = cv.getBoundingClientRect();
    const p = e.touches ? e.touches[0] : e;
    return { x: p.clientX - r.left, y: p.clientY - r.top };
  };
  cv.addEventListener('pointermove', (e) => { pointer = pos(e); });
  cv.addEventListener('pointerleave', () => { pointer = null; });
  cv.addEventListener('pointerdown', (e) => {
    const p = pos(e);
    pointer = p;
    const hit = pets.find((q) => Math.hypot(q.x - p.x, q.y - p.y) < 60);
    if (!hit) return;
    if (selected) tryFeed(hit);
    else tryPet(hit);
  });
}

function tryFeed(target) {
  const r = S.feed(st, target.id, selected);
  if (r === 'refused') {
    target.react('waiting', 1.4);
    say('ダイヤモンドダストの子は 食べない。しずかな空を 保つといい');
    selected = null;
    drawBag();
    return;
  }
  if (r === null) {
    say(st.daily.fed[target.id] ? 'きょうはもう おなかいっぱいのようだ' : 'その実りが足りない');
    return;
  }
  const before = bondLevel((st.bond[target.id] || 0) - (r === 'liked' ? 3 : 1));
  const after = bondLevel(st.bond[target.id]);
  target.bond = after;
  if (r === 'liked') { target.react('jumping', 1.8); say(`${WEATHER_JA[target.id]}の子は とても嬉しそうだ`); }
  else { target.react('waving', 1.4); say(`${WEATHER_JA[target.id]}の子は 静かに食べた`); }
  if (after > before) setTimeout(() => say(bondWord(after, target.id)), 1200);
  selected = null;
  drawBag();
  S.save(st);
}

function bondWord(level, id) {
  const n = WEATHER_JA[id];
  return [`${n}の子は まだ こちらを うかがっている`,
          `${n}の子が こちらに 気づくようになった`,
          `${n}の子が 近くに いたがるようになった`,
          `${n}の子は もう すっかり甘えている`][level];
}

function tryPet(target) {
  if (!S.pet(st, target.id)) { say('きょうは もう なでた'); return; }
  const lv = bondLevel(st.bond[target.id]);
  target.bond = lv;
  target.react(lv >= 3 ? 'jumping' : lv >= 1 ? 'waving' : 'waiting', 1.4);
  S.save(st);
}

// ---------------------------------------------------------------- 天気と来訪

function syncPets(kind, dt) {
  const events = roster.step(kind, dt);
  const bounds = groundBounds();
  const present = new Set(events.present);
  const left = new Set(events.left);

  for (const k of events.arrived) {
    if (!st.seen[k]) { st.seen[k] = Date.now(); say(`${WEATHER_JA[k]}の子が はじめて 庭に来た`); }
    else say(`${WEATHER_JA[k]}の子が 庭に来た`);
  }

  // Roster が持つ顔ぶれを正として、帰り支度中の子も描画配列に残す。
  pets = pets.filter((p) => present.has(p.id) && !left.has(p.id));
  for (const k of events.present) {
    if (pets.some((p) => p.id === k)) continue;
    if (!bank.has(PET_ID[k])) continue;            // アトラス未生成の子は出さない
    pets.push(new Pet(k, bounds, bondLevel(st.bond[k] || 0)));
  }
  for (const p of pets) p.b = bounds;
}

function groundBounds() {
  const r = cv.getBoundingClientRect();
  const gAsp = bgm ? bgm.bg_ground_green.height / bgm.bg_ground_green.width : 0.284;
  const v = { width: r.width, height: r.height, groundAspect: gAsp };
  return { ...walkBounds(v), petScale: gardenLayout(v).petScale, pond: pondOnScreen(v) };
}

// ---------------------------------------------------------------- 描画

function paint(look, dt) {
  const r = cv.getBoundingClientRect();
  const W = r.width, H = r.height;
  const gAsp = bgm ? bgm.bg_ground_green.height / bgm.bg_ground_green.width : 0.284;
  const layout = gardenLayout({ width: W, height: H, groundAspect: gAsp });
  const { horizon, groundW, groundH } = layout;

  // 空
  const g = ctx.createLinearGradient(0, 0, 0, horizon + 40);
  g.addColorStop(0, look.topColor);
  g.addColorStop(1, look.botColor);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, horizon + 40);

  drawClouds(ctx, look, W, horizon, time);

  // 虹は空にある。丘の向こうに立つよう、丘より先に描く。
  drawRainbow(ctx, look, W, horizon);

  // 遠景の丘。下端を地平線に合わせる。
  // 幅いっぱいの自然な高さだと空を食い潰すので、遠景として 0.62 に縮める
  if (bg.hills) {
    const hw = W * 1.25;                                       // 少し広げて端の切れを隠す
    const hh = hw * (bgm.bg_hills.height / bgm.bg_hills.width) * 0.62;
    ctx.globalAlpha = 0.92 - look.cloudDark * 0.3;
    ctx.drawImage(bg.hills, -(hw - W) / 2, horizon - hh, hw, hh);
    ctx.globalAlpha = 1;
  }

  // 地面。緑 ⇄ 雪 を気温でクロスフェード
  const drawGround = (img, a) => {
    if (!img || a <= 0.001) return;
    ctx.globalAlpha = a;
    ctx.drawImage(img, -(groundW - W) / 2, horizon, groundW, groundH);
    ctx.globalAlpha = 1;
  };
  drawGround(bg.green, 1);
  drawGround(bg.snow, look.snowCover);

  // 気温の色被り。寒いと青く、暑いと黄色く
  if (look.tint.a > 0.01) {
    ctx.save();
    ctx.globalCompositeOperation = 'multiply';
    ctx.globalAlpha = look.tint.a;
    ctx.fillStyle = `rgb(${look.tint.c.join(',')})`;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }
  // 雲が厚いと地面も暗くなる。★空だけ暗くして地面が明るいままだと嘘に見えたので強めた
  // 雲量5から効き始め、荒れるほど強い。雨なのに春の芝が鮮やかなままだと嘘に見える
  // 積雪は光を跳ね返すので、雪の日は同じ雲量でも暗くならない
  const gloom = Math.min(1, Math.max(0, (look.cloud - 4.5) / 5.5) * 0.75 + look.cloudDark * 0.55)
                * (1 - look.snowCover * 0.5);
  if (gloom > 0.01) {
    ctx.save();
    ctx.globalCompositeOperation = 'multiply';
    ctx.fillStyle = `rgba(96,106,138,${Math.min(0.78, gloom)})`;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }

  // 子。奥にいる子から描く
  const sorted = [...pets].sort((a, b) => a.y - b.y);
  for (const p of sorted) {
    const id = PET_ID[p.id];
    if (!bank.has(id)) continue;
    ctx.globalAlpha = roster.fade(p.id);
    const rr = p.render();
    if (rr.row === null) bank.drawGaze(ctx, id, rr.yaw, p.x, p.y, p.scale);
    else bank.draw(ctx, id, rr.row, Math.floor(p.frame), p.x, p.y, p.scale, rr.flip);
    ctx.globalAlpha = 1;
  }

  // 降水
  precip.step(look, dt);
  precip.draw(ctx, look);

  // 霧の膜
  if (look.fogVeil > 0.01) {
    ctx.fillStyle = `rgba(238,240,244,${look.fogVeil * 0.72})`;
    ctx.fillRect(0, 0, W, H);
  }
  // 雷の閃光
  if (look.lightning && Math.random() < 0.006) {
    ctx.fillStyle = 'rgba(255,255,245,0.55)';
    ctx.fillRect(0, 0, W, H);
  }
}

// ---------------------------------------------------------------- ループ

let last = performance.now();

function loop(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  time += dt;

  sky = relax(sky, st.dials, dt);
  const kind = classify(sky, afterRain > 0);
  const look = skyLook(sky, kind);
  el('app').classList.toggle('settling', !settled(sky, st.dials));

  if (kind !== current) {
    current = kind;
    stableFor = 0;
    sinceHarvest = 0;
    el('wname').textContent = WEATHER_JA[kind];
  } else {
    stableFor += dt;
  }
  syncPets(kind, dt);
  // 降っている間は窓を満タンに保ち、止んだらそこから減る。
  // ★1フレームのフラグでは虹が出せなかった（雲が晴れる前にフラグが落ちる）
  // ★窓を開けるのは雨とひょうだけ。雪では開けない——
  //   虹は水滴に光が屈折して出るものなので、雪上がりの虹は成立しない（01_調査/F 1-2）。
  //   ここを precip 全部にしていたら、-6℃の雪のあとに虹が出た。
  const wetPrecip = look.precipKind === 'rain' || look.precipKind === 'hail';
  afterRain = wetPrecip ? AFTER_RAIN_WINDOW : Math.max(0, afterRain - dt);

  // ★空を保つこと自体が収穫。別の操作は要らない
  if (stableFor > 6) {
    sinceHarvest += dt;
    if (sinceHarvest > 8) {
      sinceHarvest = 0;
      if (S.canHarvest(st, kind)) {
        S.harvest(st, kind);
        say(`${S.FRUIT[kind]} が生った`);
        drawBag();
        S.save(st);
      }
    }
  }
  // ダイヤの子だけ、静けさを保った時間で懐く
  if (kind === 'diamonddust' && stableFor > 3) S.quietTick(st, dt);

  for (const p of pets) p.step(dt, pointer);

  // ゲージ
  el('g-cloud').style.width = `${look.cloud * 10}%`;
  el('g-rh').style.width = `${look.rh}%`;
  el('g-u').style.width = `${look.u * 100}%`;

  paint(look, dt);
  requestAnimationFrame(loop);
}

init();
