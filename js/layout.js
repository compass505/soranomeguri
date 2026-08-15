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
  const responsive = clamp(Math.sqrt(MIN_PET_WIDTH / width), PET_SCALE_MIN, PET_SCALE_MAX);
  const petScale = PET_SCALE_RANGE.map((scale) => scale * responsive);

  return { horizon, groundW, groundH, petScale };
}
