// 庭にいる子のふるまい。
// ★親密度は数値を見せず挙動で表す（骨格v2 の6節、どうぶつの森型）。
//   段階が上がると waving が増え、視線がこちらを追う時間が伸び、駆け寄ってくる。

import { yawToward } from './sprites.js';

export const BONDS = ['よそよそしい', '気づく', '懐く', '甘える'];

/** 親密度の点 → 段階。隠し数値なので画面には出さない。 */
export function bondLevel(points) {
  if (points >= 40) return 3;
  if (points >= 18) return 2;
  if (points >= 6) return 1;
  return 0;
}

const rand = (a, b) => a + Math.random() * (b - a);

// 種としての大小。1 が基準
const SPECIES_SCALE = {
  diamonddust: 0.62,   // 極小。骨格v2 で体長比 1.1・頭身も別に設計した1体
  rainbow: 1.06,       // 鹿。角のぶん大きい
};

export class Pet {
  constructor(id, bounds, bond = 0) {
    this.id = id;
    this.bond = bond;                       // 0..3
    this.b = bounds;
    this.x = rand(bounds.x0, bounds.x1);
    this.y = rand(bounds.y0, bounds.y1);
    this.tx = this.x; this.ty = this.y;
    this.state = 'idle';
    this.t = 0;                             // 状態内の経過秒
    this.frame = 0;
    this.facing = 1;
    this.gaze = null;                       // 視線追従中の yaw
    this.gazeLeft = 0;
    this.arriving = 2.0;                    // 登場演出の残り
    this.mood = 0;                          // 一時的な演技（給餌の反応など）の残り秒
    this.pickNew(0.5);
  }

  /**
   * 奥ほど小さく描く。庭に奥行きを出す。
   * ★体ごとの倍率は「絵の大きさを揃える」ためではなく、種としての大小を出すため。
   *   アトラスはどの子もセルいっぱいに描かれてくるので、
   *   ダイヤモンドダスト（極小の生き物という設計）はここで縮めないと他と同じ大きさに見える。
   */
  get scale() {
    const k = (this.y - this.b.y0) / Math.max(1, this.b.y1 - this.b.y0);
    return (0.42 + k * 0.30) * (SPECIES_SCALE[this.id] ?? 1);
  }

  pickNew(delay = 0) {
    this.nextIn = delay || rand(2.5, 6.5);
    const r = Math.random();
    // 懐くほど動きが活発になり、こちらの近くに来たがる
    const wanderBias = this.bond >= 2 ? 0.55 : 0.35;
    if (r < wanderBias) {
      this.tx = rand(this.b.x0, this.b.x1);
      this.ty = rand(this.b.y0, this.b.y1);
      this.state = 'running';
    } else if (r < wanderBias + 0.15 && this.bond >= 1) {
      this.state = 'waving';
    } else if (r < wanderBias + 0.28) {
      this.state = 'waiting';
    } else if (r < wanderBias + 0.36) {
      this.state = 'review';
    } else {
      this.state = 'idle';
    }
    this.t = 0;
  }

  /** 一時的な演技を差し込む（給餌・なでる の反応）。 */
  react(state, secs = 1.6) { this.state = state; this.t = 0; this.mood = secs; }

  step(dt, pointer) {
    this.t += dt;
    this.frame += dt * (this.state === 'running' ? 12 : 6);

    if (this.arriving > 0) { this.arriving -= dt; }
    if (this.mood > 0) {
      this.mood -= dt;
      if (this.mood <= 0) this.pickNew(0.2);
      return;
    }

    // 視線追従。★懐くほど長く見つめる — これが親密度の見せ方の中心
    if (pointer && this.gazeLeft <= 0) {
      const chance = [0.10, 0.35, 0.65, 0.9][this.bond];
      if (Math.random() < chance * dt * 0.8) {
        this.gazeLeft = [0.6, 1.2, 2.2, 3.5][this.bond] * rand(0.7, 1.3);
      }
    }
    if (this.gazeLeft > 0 && pointer) {
      this.gazeLeft -= dt;
      this.gaze = yawToward(this.x, this.y, pointer.x, pointer.y);
    } else {
      this.gaze = null;
    }

    if (this.state === 'running') {
      const dx = this.tx - this.x, dy = this.ty - this.y;
      const d = Math.hypot(dx, dy);
      if (d < 6) { this.pickNew(); }
      else {
        const sp = (this.bond >= 2 ? 62 : 48) * dt;
        this.x += (dx / d) * sp;
        this.y += (dy / d) * sp;
        this.facing = dx >= 0 ? 1 : -1;
      }
    } else if (this.t > this.nextIn) {
      this.pickNew();
    }
  }

  /** いま描くべき行と向き。 */
  render() {
    if (this.arriving > 0) return { row: 'jumping', flip: false };
    if (this.gaze !== null) return { row: null, yaw: this.gaze };
    if (this.state === 'running') {
      return { row: this.facing >= 0 ? 'running-right' : 'running-left', flip: false };
    }
    return { row: this.state, flip: this.facing < 0 && this.state === 'idle' };
  }
}
