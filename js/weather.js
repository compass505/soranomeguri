// 骨格v2 の気象モデル。
// sim/weather_v2.py と同じ式・同じ閾値。あちらで 24節気 x 4軸13分割 = 68万通りを
// 掃引して「空白地帯 0.00% / 9種すべて到達可能」を確認してある。
// 数値をここで変えたら、必ずあちらも変えて掃引し直すこと。
//
// vault: 30_Projects/ゆいゲーム/02_企画/骨格v2_空をつくる.md

export const SEKKI = [
  '立春', '雨水', '啓蟄', '春分', '清明', '穀雨',
  '立夏', '小満', '芒種', '夏至', '小暑', '大暑',
  '立秋', '処暑', '白露', '秋分', '寒露', '霜降',
  '立冬', '小雪', '大雪', '冬至', '小寒', '大寒',
];

export const DAYS_PER_SEKKI = 3;          // 1年 = 72日
export const DAYS_PER_YEAR = SEKKI.length * DAYS_PER_SEKKI;

// 可動域。平常値からこの距離までしかつまみが動かない。
// ★レアリティはこの3つの数字からしか出ていない。確率もガチャも通貨も無い。
export const REACH_T = 12.0;
export const REACH_P = 40.0;    // ±25 では雷とひょうの上昇気流に届かなかった（検算で修正）
export const REACH_V = 15.0;

const WATER_MAX = 40.0;         // 「湿り」100 のときの絶対水蒸気量 g/m^3

/** 節気 i の平常値。★気圧は季節で動かさない — 季節の門は気温だけが担う。 */
export function baseline(sekkiIndex) {
  const phase = (2 * Math.PI * (sekkiIndex - 11)) / 24;
  return {
    t: 13.5 + 18.0 * Math.cos(phase),   // 大暑 31.5 / 大寒 -4.5
    p: 1013.0,
    v: 4.0,
  };
}

/** その日つまみが動ける範囲。UIはこの外側をグレーで止める。 */
export function reachable(sekkiIndex) {
  const b = baseline(sekkiIndex);
  return {
    t: [b.t - REACH_T, b.t + REACH_T],
    w: [0, 100],
    p: [b.p - REACH_P, b.p + REACH_P],
    v: [0, b.v + REACH_V],
  };
}

/** 飽和水蒸気量 g/m^3（Tetens式）。30℃≈30.4 / 0℃≈4.8 / -15℃≈1.6 */
export function satAbsHumidity(t) {
  const es = 6.1078 * Math.pow(10, (7.5 * t) / (t + 237.3));   // hPa
  return (217.0 * es) / (t + 273.15);
}

const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));

/**
 * つまみ4本 → 導出量。プレイヤーはここには触れない。
 * ★相対湿度は気温に依存する。だから気温を上げると湿度計が勝手に下がる。
 *   これがつまみ同士の結び付きの正体で、本物の気象そのもの。
 */
export function derive({ t, w, p, v }) {
  const water = (w / 100) * WATER_MAX;
  const rh = Math.min(100, (water / satAbsHumidity(t)) * 100);
  const u = clamp((1013 - p) / 50, 0, 1);

  let cloud = Math.max(0, (rh - 55) / 45) * 10 * (0.35 + 0.65 * u);
  cloud *= 1 - Math.min(v / 35, 1) * 0.5;      // 強風は雲を流す
  cloud = clamp(cloud, 0, 10);

  // ★降水の閾値は曇の閾値より確実に上に置く。
  //   逆転していると曇が数学的に発生不可能になる（最初のモデルはこれで落ちた）
  const precip = cloud >= 7 && rh >= 82;

  return { rh, u, cloud, precip, sun: 10 - cloud };
}

export const WEATHERS = [
  'sunny', 'cloudy', 'rainy', 'snow', 'thunder',
  'hail', 'fog', 'wind', 'diamonddust', 'rainbow',
];

export const WEATHER_JA = {
  sunny: 'はれ', cloudy: 'くもり', rainy: 'あめ', snow: 'ゆき',
  thunder: 'かみなり', hail: 'ひょう', fog: 'きり', wind: 'かぜ',
  diamonddust: 'ダイヤモンドダスト', rainbow: 'にじ',
};

/**
 * レアな順に判定する。先に当たったものを採る。
 * @param prevPrecip 直前が降水だったか。虹はこれが無いと絶対に出ない。
 */
export function classify(dials, prevPrecip = false) {
  const { t, v } = dials;
  const { rh, u, cloud, precip } = derive(dials);

  if (t <= -15 && v <= 0.5 && rh >= 90) return 'diamonddust';
  // ★虹だけが点ではなく道。空間のどこにも虹の座標は無く、
  //   降水から晴れへ移動している最中にしか存在しない。
  if (prevPrecip && !precip && cloud <= 4) return 'rainbow';
  if (precip && u >= 0.75 && t >= 0 && t <= 12) return 'hail';
  if (precip && u >= 0.70 && t >= 20 && rh >= 90) return 'thunder';
  if (precip && t < -1) return 'snow';
  if (precip) return 'rainy';                    // みぞれは雨に吸収
  if (rh >= 99 && v <= 0.8 && u <= 0.15) return 'fog';
  if (v >= 15 && cloud <= 5) return 'wind';
  if (cloud > 4) return 'cloudy';                // ★晴と曇は隙間なく接する
  return 'sunny';
}

/** 暦。実日付から通算日・節気を出す。 */
export function calendar(dayIndex) {
  const d = ((dayIndex % DAYS_PER_YEAR) + DAYS_PER_YEAR) % DAYS_PER_YEAR;
  const i = Math.floor(d / DAYS_PER_SEKKI);
  return { dayOfYear: d, sekkiIndex: i, sekki: SEKKI[i] };
}
