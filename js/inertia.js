// つまみの目標を、空がゆっくり追いかけるための一次遅れ。

// 空気の熱容量は大きいので気温は一番遅く動き、風は吹けばすぐ吹く。
// 手触りの差であると同時に、気象的にも正しい動きにするため時定数を分ける。
export const TAU = { t: 10, w: 7, p: 6, v: 2.5 };          // 時定数（秒）
export const SETTLE_EPS = { t: 0.25, w: 0.5, p: 0.4, v: 0.1 };

/** 一次遅れ。純粋関数。引数を書き換えず、新しいオブジェクトを返す。 */
export function relax(sky, dials, dt) {
  const next = { ...sky };
  for (const k of Object.keys(TAU)) {
    next[k] = sky[k] + (dials[k] - sky[k]) * (1 - Math.exp(-dt / TAU[k]));
  }
  return next;
}

/** 空がつまみに十分近づいたか（各キーの差が SETTLE_EPS 未満）。 */
export function settled(sky, dials) {
  return Object.keys(SETTLE_EPS).every((k) => Math.abs(sky[k] - dials[k]) < SETTLE_EPS[k]);
}
