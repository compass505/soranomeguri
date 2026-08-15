// アトラスの読み込みと描画。
// 行の定義は tools/measure_sprites.mjs が hatch-pet の compose_atlas.py から写したもの。
// ★行を推測で並べると「跳躍」を「ぶれ」と読み違える。実測は tools/ が吐く JSON に入っている。

const CW = 192, CH = 208;

export const ROWS = {
  idle: 0, 'running-right': 1, 'running-left': 2, waving: 3, jumping: 4,
  failed: 5, waiting: 6, running: 7, review: 8, 'look-a': 9, 'look-b': 10,
};

export class SpriteBank {
  constructor(metrics) { this.metrics = metrics; this.img = {}; }

  static async load(ids) {
    const metrics = await fetch('js/sprite-metrics.json').then((r) => r.json());
    const bank = new SpriteBank(metrics);
    await Promise.all(ids.map((id) => new Promise((res) => {
      const im = new Image();
      im.onload = () => { bank.img[id] = im; res(); };
      im.onerror = () => { console.warn('アトラス無し:', id); res(); };
      im.src = `assets/sprites/${id}.webp`;
    })));
    return bank;
  }

  has(id) { return !!this.img[id]; }
  frameCount(id, row) {
    const spec = this.metrics.rows.find(([n]) => n === row);
    return spec ? spec[1] : 1;
  }

  /**
   * 足元を groundY に合わせて1コマ描く。
   * ★体の大きさは正規化しない。カワウソが低くて長い / ウサギが高くて細いのは
   *   実際の体型なので、揃えると生き物としての違いが消える。
   *   足元だけ揃える（セル内で168〜201pxとばらつくため、素直に描くと浮く・沈む）。
   */
  draw(ctx, id, row, frame, x, groundY, scale = 1, flip = false) {
    const im = this.img[id];
    if (!im) return;
    const m = this.metrics.pets[id];
    const r = ROWS[row] ?? 0;
    const n = this.frameCount(id, row);
    const c = ((frame % n) + n) % n;

    const sx = c * CW, sy = r * CH;
    const dw = CW * scale, dh = CH * scale;
    // その体の idle 足元を基準線に置く。跳躍や伏せはここから素直に外れてよい（それが演技）
    const dy = groundY - m.ground * scale;
    const dx = x - dw / 2;

    ctx.save();
    if (flip) {
      ctx.translate(dx + dw / 2, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(im, sx, sy, CW, CH, -dw / 2, dy, dw, dh);
    } else {
      ctx.drawImage(im, sx, sy, CW, CH, dx, dy, dw, dh);
    }
    ctx.restore();
  }

  /**
   * 16方向の視線。yaw 0=真後ろ / 90=右 / 180=正面 / 270=左（build_look_prompts.py の定義）。
   * look-a が 0〜157.5度、look-b が 180〜337.5度。
   */
  drawGaze(ctx, id, yawDeg, x, groundY, scale = 1) {
    const yaw = ((yawDeg % 360) + 360) % 360;
    const idx = Math.round(yaw / 22.5) % 16;
    const row = idx < 8 ? 'look-a' : 'look-b';
    this.draw(ctx, id, row, idx % 8, x, groundY, scale);
  }
}

/** カーソルの方向を yaw に変換する。正面(180)を基準に左右へ振る。 */
export function yawToward(fromX, fromY, toX, toY) {
  const dx = toX - fromX, dy = toY - fromY;
  // 画面手前（dy>0）を 180度、右を 90度 として合わせる
  return (Math.atan2(dx, dy) * 180) / Math.PI + 180;
}
