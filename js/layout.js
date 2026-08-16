// 画面サイズから、空・庭・生き物のレイアウトを決める純粋な計算。

// 既存の奥行き感を保つ基準値。gardenLayout は画面幅に応じてこの値を調整する。
export const PET_SCALE_RANGE = [0.42, 0.72];

const GARDEN_SHARE = 0.48;
const MIN_PET_WIDTH = 375;
const PET_SCALE_MIN = 0.78;
const PET_SCALE_MAX = 1.12;

const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));

/**
 * @param {{width:number, height:number, groundAspect:number}} v
 *   groundAspect は地面レイヤーの 高さ/幅。
 * @returns {{horizon:number, groundW:number, groundH:number, petScale:[number,number]}}
 */
export function gardenLayout(v) {
  const width = Math.max(1, v.width);
  const height = Math.max(1, v.height);
  const groundAspect = Math.max(Number.EPSILON, v.groundAspect);

  // まず庭の高さを確保し、横幅も覆えるよう必要ならさらに拡大する。
  // 画像はこのサイズで描き、画面中央に置いて左右を均等に切る。
  const groundH = Math.max(height * GARDEN_SHARE, width * groundAspect);
  const groundW = groundH / groundAspect;
  const horizon = height - groundH;

  // 狭い画面では子を少し大きくする。sqrt にして極端な幅でも破綻しにくくする。
  const widthResponsive = clamp(Math.sqrt(MIN_PET_WIDTH / width), PET_SCALE_MIN, PET_SCALE_MAX);

  // 地面を cover で拡大した分だけ、生き物も同じ画面上の存在感を保つ。
  // 極端な縦長画面での過剰な寄りを避けるため、地面の拡大率には上限を設ける。
  const groundZoom = groundW / width;
  const groundResponsive = Math.min(groundZoom, 1.6) * 0.7;
  const responsive = clamp(Math.max(widthResponsive, groundResponsive), PET_SCALE_MIN, PET_SCALE_MAX);
  const petScale = PET_SCALE_RANGE.map((scale) => scale * responsive);

  return { horizon, groundW, groundH, petScale };
}

/** 地面の絵は1枚に固定されていて池の位置は動かないので、絵に対する比で持てる。 */
export const POND = { cx: 0.336, cy: 0.260, rx: 0.187, ry: 0.129 };

/**
 * @param {{width:number, height:number, groundAspect:number}} v
 * @returns {{x0:number, x1:number, y0:number, y1:number}}
 */
export function walkBounds(v) {
  const width = Math.max(1, v.width);
  const height = Math.max(1, v.height);
  const { horizon } = gardenLayout(v);
  return {
    x0: width * 0.10,
    x1: width * 0.90,
    y0: horizon + (height - horizon) * 0.22,
    y1: height - 16,
  };
}

/**
 * 地面の絵（1672×475）に対する、水面の楕円の比。
 * 地面は中央寄せで cover 拡大されるので、それに追随する。
 * @param {{width:number, height:number, groundAspect:number}} v
 * @returns {{cx:number, cy:number, rx:number, ry:number}}
 */
export function pondOnScreen(v) {
  const width = Math.max(1, v.width);
  const { horizon, groundW, groundH } = gardenLayout(v);
  return {
    cx: (width - groundW) / 2 + POND.cx * groundW,
    cy: horizon + POND.cy * groundH,
    rx: POND.rx * groundW,
    ry: POND.ry * groundH,
  };
}

/**
 * その点は水の上か。
 * @param {{cx:number, cy:number, rx:number, ry:number}} pond
 */
export function inPond(pond, x, y) {
  const dx = (x - pond.cx) / pond.rx;
  const dy = (y - pond.cy) / pond.ry;
  return dx * dx + dy * dy <= 1;
}

/**
 * その直線は水の上を通るか（両端が陸でも、突っ切るなら true）。
 * @param {{cx:number, cy:number, rx:number, ry:number}} pond
 */
export function crossesPond(pond, x0, y0, x1, y1) {
  // 楕円を単位円へ写して、線分と単位円の交差を二次方程式で解く。
  const ax = (x0 - pond.cx) / pond.rx;
  const ay = (y0 - pond.cy) / pond.ry;
  const dx = (x1 - x0) / pond.rx;
  const dy = (y1 - y0) / pond.ry;
  const a = dx * dx + dy * dy;
  const c = ax * ax + ay * ay - 1;
  if (c <= 0) return true;
  if (a === 0) return false;

  const b = 2 * (ax * dx + ay * dy);
  const discriminant = b * b - 4 * a * c;
  if (discriminant < 0) return false;
  const root = Math.sqrt(discriminant);
  const t0 = (-b - root) / (2 * a);
  const t1 = (-b + root) / (2 * a);
  return (t0 >= 0 && t0 <= 1) || (t1 >= 0 && t1 <= 1);
}
