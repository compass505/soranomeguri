// 保存される状態と、1日で締まるもの。
// ★罰なしを守る: 開かなかった日に失うものは無い。上限は「その日採れる量」だけで、
//   採らなかった分は3日ぶんまで繰り越す（骨格v2 の7節）。

import { calendar, WEATHERS } from './weather.js';

// 実りの名前。01_調査/F 4章の語彙庫（雨の異名400種・風の異名2000種）から引いている
export const FRUIT = {
  sunny: 'ひだまりの実', cloudy: 'くもの綿', rainy: 'しずく飴',
  snow: '六花糖', thunder: 'いかづち石', hail: 'あられ玉',
  fog: 'もやの露', wind: 'かぜの種', rainbow: 'にじのかけら',
  diamonddust: '氷華',
};

// ★好みは「自分を生んだ空」— 因果の環。
//   霧 → 晴 → 曇 → 雨 → 雷 → ひょう → 雪 → 霧 と閉じる。
//   これが1天気での自己完結を禁じ、空を巡らせる理由になる。
export const LIKES = {
  sunny: 'fog', cloudy: 'sunny', rainy: 'cloudy', thunder: 'rainy',
  hail: 'thunder', snow: 'hail', fog: 'snow', rainbow: 'rainy',
  // 風は日替わり（風向きは毎日変わる）。ダイヤは食べない（静けさで懐く）
  wind: null, diamonddust: null,
};

const DAILY_TOTAL = 5;      // 1日に採れる実りの合計
const DAILY_PER_KIND = 3;   // 天気1種あたり
const CARRY_DAYS = 3;       // 繰り越しの上限

const KEY = 'soranomeguri-v1';   // 旧 'yui-game-v2'（改名前のテスト保存は引き継がない）

function todayIndex() {
  return Math.floor(Date.now() / 86400000);
}

export function freshState() {
  return {
    version: 2,
    startDay: todayIndex(),
    lastDay: todayIndex(),
    dials: { t: 13.5, w: 40, p: 1013, v: 3 },
    bag: {},                        // 天気id -> 個数
    bond: {},                       // 天気id -> 隠し点数
    daily: { day: todayIndex(), taken: 0, perKind: {}, fed: {}, petted: {} },
    carry: 0,
    seen: {},                       // 初めて会った日
    log: [],
  };
}

export function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return freshState();
    const s = JSON.parse(raw);
    return s.version === 2 ? rollDay(s) : freshState();
  } catch { return freshState(); }
}

export function save(s) {
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* 容量超過は黙って諦める */ }
}

/** 日付が変わっていたら1日ぶん進める。★何も失わせない。 */
export function rollDay(s) {
  const now = todayIndex();
  if (s.daily.day === now) return s;
  const missed = now - s.daily.day;
  const unused = Math.max(0, DAILY_TOTAL - s.daily.taken);
  s.carry = Math.min(DAILY_TOTAL * CARRY_DAYS, s.carry + unused + Math.max(0, missed - 1) * DAILY_TOTAL);
  s.daily = { day: now, taken: 0, perKind: {}, fed: {}, petted: {} };
  s.lastDay = now;
  return s;
}

/** ゲーム内の暦。実日付1日 = ゲーム1日。1年72日。 */
export function gameCalendar(s) {
  return calendar(todayIndex() - s.startDay);
}

export function harvestBudget(s) {
  return Math.max(0, DAILY_TOTAL + s.carry - s.daily.taken);
}

export function canHarvest(s, kind) {
  if (harvestBudget(s) <= 0) return false;
  return (s.daily.perKind[kind] || 0) < DAILY_PER_KIND;
}

export function harvest(s, kind) {
  if (!canHarvest(s, kind)) return false;
  s.bag[kind] = (s.bag[kind] || 0) + 1;
  s.daily.perKind[kind] = (s.daily.perKind[kind] || 0) + 1;
  if (s.carry > 0) s.carry--; else s.daily.taken++;
  return true;
}

/** 風の子の好物は日替わり。今日の分を暦から決める（乱数だと再読込で変わる）。 */
export function windLikes(s) {
  const d = todayIndex() - s.startDay;
  const pool = WEATHERS.filter((k) => k !== 'wind' && k !== 'diamonddust');
  return pool[((d % pool.length) + pool.length) % pool.length];
}

export function likedBy(s, pet) {
  if (pet === 'wind') return windLikes(s);
  return LIKES[pet];
}

/**
 * 餌をやる。1体1日1回。好物 +3、それ以外 +1。★減ることはない。
 * @returns 'liked' | 'ok' | 'refused' | null
 */
export function feed(s, pet, kind) {
  // ダイヤモンドダストの子は餌ではなく、静けさを保った時間で懐く。
  if (pet === 'diamonddust') return 'refused';
  if (s.daily.fed[pet]) return null;
  if (!(s.bag[kind] > 0)) return null;
  s.bag[kind]--;
  s.daily.fed[pet] = kind;
  const liked = likedBy(s, pet) === kind || kind === 'rainbow';   // にじのかけらは万能
  s.bond[pet] = (s.bond[pet] || 0) + (liked ? 3 : 1);
  return liked ? 'liked' : 'ok';
}

/** なでる。1体1日1回。 */
export function pet(s, id) {
  if (s.daily.petted[id]) return false;
  s.daily.petted[id] = true;
  s.bond[id] = (s.bond[id] || 0) + 1;
  return true;
}

/** ダイヤモンドダストの子だけ、餌ではなく静けさを保った時間で懐く。 */
export function quietTick(s, secs) {
  s.bond.diamonddust = (s.bond.diamonddust || 0) + secs / 20;
}
