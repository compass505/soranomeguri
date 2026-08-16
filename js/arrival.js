// 天気が続いたときの来訪と、天気が変わったときの帰り支度。

export const ARRIVE_AFTER = 2.5;    // 天気がこの秒数続いたら、その子が庭に来る
export const LEAVE_SECS   = 6.0;    // 帰るのにかける秒数

/** 天気ごとの登場演出。row はアトラスの行、secs は演出の長さ、fade はにじみ出る秒数。 */
export const ENTRANCE = {
  sunny: { row: 'running', secs: 2.0, fade: 0.6 },
  cloudy: { row: 'idle', secs: 1.8, fade: 1.2 },
  rainy: { row: 'jumping', secs: 1.6, fade: 0.35 },
  snow: { row: 'idle', secs: 2.4, fade: 1.8 },
  thunder: { row: 'jumping', secs: 1.2, fade: 0.12 },
  hail: { row: 'jumping', secs: 1.4, fade: 0.3 },
  fog: { row: 'idle', secs: 2.6, fade: 2.2 },
  wind: { row: 'running', secs: 1.8, fade: 0.5 },
  rainbow: { row: 'running', secs: 2.2, fade: 0.8 },
  diamonddust: { row: 'waiting', secs: 3.0, fade: 2.6 },
};

/** 未知の天気でも落ちないように、既定を返す。 */
export function entranceOf(kind) {
  return ENTRANCE[kind] || { row: 'idle', secs: 1.8, fade: 1.0 };
}

// 虹の日だけの道連れ。骨格v2の8節「雨→晴れの途中は、雨の子・虹の子・晴れの子が
// 居合わせる」を保証する。慣性を入れると雨の子は先に帰ってしまうので、自然には起きなくなった。
export const COMPANIONS = { rainbow: ['rainy', 'sunny'] };

export class Roster {
  constructor() {
    this._present = new Set();
    this._leaving = new Map();
    this._kind = null;
    this._continued = 0;
  }

  /** @returns {{present: string[], arrived: string[], left: string[]}} */
  step(kind, dt) {
    if (kind === this._kind) this._continued += dt;
    else {
      this._kind = kind;
      this._continued = dt;
    }

    const desired = new Set([kind, ...(COMPANIONS[kind] || [])]);
    const arrived = [];
    const left = [];

    // 帰り支度中の子の天気に戻ったら、帰るのをやめて庭に残す。
    for (const id of desired) this._leaving.delete(id);

    for (const id of this._present) {
      if (desired.has(id)) continue;
      if (!this._leaving.has(id)) this._leaving.set(id, LEAVE_SECS);
      const remaining = this._leaving.get(id) - dt;
      if (remaining <= 0) {
        this._leaving.delete(id);
        this._present.delete(id);
        left.push(id);
      } else {
        this._leaving.set(id, remaining);
      }
    }

    if (this._continued >= ARRIVE_AFTER) {
      for (const id of [kind, ...(COMPANIONS[kind] || [])]) {
        if (this._present.has(id)) continue;
        this._present.add(id);
        arrived.push(id);
      }
    }

    return { present: this.present, arrived, left };
  }

  /** いま庭にいる子の id 配列（帰り支度中の子を含む）。 */
  get present() {
    return [...this._present];
  }

  /** 帰り支度中の子について、残り秒数 / LEAVE_SECS を返す。 */
  fade(id) {
    return this._leaving.has(id) ? Math.max(0, this._leaving.get(id) / LEAVE_SECS) : 1;
  }
}
