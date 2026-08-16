// 池の上を歩かない、という約束。
//
// ★問題: 歩ける範囲を地面の矩形で決めていたので、子が池の真ん中に立った。
//   実機で2体が水面の上に浮いていた。地面の絵は1枚に固定されていて池の位置は動かないので、
//   絵に対する比で池を持てば避けられる。
//
// ★ここでも測る対象を1つに絞らない。「池を避ける」だけを約束にすると、
//   庭ぜんぶを池ということにしても満たせてしまう。**避けた後に庭が残っている**方を必ず併記する。
//
//   node --test

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { gardenLayout, walkBounds, pondOnScreen, inPond, crossesPond, POND } from '../js/layout.js';

const GROUND_ASPECT = 475 / 1672;
const phone   = { width: 375, height: 592, groundAspect: GROUND_ASPECT };
const tablet  = { width: 768, height: 700, groundAspect: GROUND_ASPECT };
const desktop = { width: 1280, height: 700, groundAspect: GROUND_ASPECT };
const screens = [phone, tablet, desktop];

test('池は地面の絵に対する比で持つ（画面サイズで動かない）', () => {
  for (const k of ['cx', 'cy', 'rx', 'ry']) {
    assert.ok(POND[k] > 0 && POND[k] < 1, `POND.${k} は 0〜1 の比であるべき: ${POND[k]}`);
  }
});

test('★池は地面の絵と一緒に拡大・移動する', () => {
  for (const v of screens) {
    const l = gardenLayout(v);
    const p = pondOnScreen(v);
    // 地面は中央寄せで cover 拡大される。池もその中に乗っていなければ絵とずれる
    const left = (v.width - l.groundW) / 2;
    assert.ok(Math.abs(p.cx - (left + POND.cx * l.groundW)) < 0.5,
      `${v.width}px: 池の横位置が地面の絵とずれている`);
    assert.ok(Math.abs(p.cy - (l.horizon + POND.cy * l.groundH)) < 0.5,
      `${v.width}px: 池の縦位置が地面の絵とずれている`);
    assert.ok(p.rx > 0 && p.ry > 0);
  }
});

test('★池の中は歩ける場所ではない', () => {
  for (const v of screens) {
    const p = pondOnScreen(v);
    assert.ok(inPond(p, p.cx, p.cy), '池の中心が池でないと判定されている');
    assert.ok(!inPond(p, p.cx + p.rx * 1.4, p.cy), '池の外が池と判定されている');
    assert.ok(!inPond(p, p.cx, p.cy + p.ry * 1.4), '池の外が池と判定されている');
  }
});

test('★池を突っ切る道は通れない（両端が陸でも水の上を歩かない）', () => {
  const p = pondOnScreen(desktop);
  assert.ok(crossesPond(p, p.cx - p.rx * 2, p.cy, p.cx + p.rx * 2, p.cy),
    '池を左右に貫く直線が「横切っていない」と判定されている');
  assert.ok(!crossesPond(p, p.cx - p.rx * 2, p.cy + p.ry * 3, p.cx + p.rx * 2, p.cy + p.ry * 3),
    '池の手前を通るだけの直線が「横切っている」と判定されている');
  assert.ok(!crossesPond(p, p.cx - p.rx * 3, p.cy, p.cx - p.rx * 2, p.cy),
    '池に届いていない直線が「横切っている」と判定されている');
});

test('★池を避けても、庭は歩く場所として広いまま', () => {
  // これが無いと「庭ぜんぶを池ということにする」で上の条件を満たせてしまう
  for (const v of screens) {
    const b = walkBounds(v);
    const p = pondOnScreen(v);
    let dry = 0, n = 0;
    for (let i = 0; i < 60; i++) {
      for (let j = 0; j < 60; j++) {
        const x = b.x0 + ((b.x1 - b.x0) * (i + 0.5)) / 60;
        const y = b.y0 + ((b.y1 - b.y0) * (j + 0.5)) / 60;
        n++;
        if (!inPond(p, x, y)) dry++;
      }
    }
    const share = dry / n;
    assert.ok(share >= 0.60,
      `${v.width}x${v.height}: 池を除くと歩ける所が ${(share * 100).toFixed(0)}% しか残らない`);
  }
});

// ---------------------------------------------------------------- 歩ける範囲そのもの

test('歩ける範囲は庭の内側に収まる', () => {
  for (const v of screens) {
    const l = gardenLayout(v);
    const b = walkBounds(v);
    assert.ok(b.y0 > l.horizon, `${v.width}px: 歩ける範囲が地平線より上に出ている`);
    assert.ok(b.y1 <= v.height, `${v.width}px: 歩ける範囲が画面の下に出ている`);
    assert.ok(b.x0 >= 0 && b.x1 <= v.width);
    assert.ok(b.x1 - b.x0 > v.width * 0.5, '横に狭すぎて庭に見えない');
    assert.ok(b.y1 - b.y0 > 0, '奥行きが無い');
  }
});
