// 庭の広さとキャラの大きさの約束。
//
// ★問題: 地面の絵を「画面の幅に合わせて」置いていたため、
//   横幅の狭いスマホほど庭が薄くなり、実測で 592px 中 189px（32%）しか無かった。
//   残り68%は空で、そこには雲しか無い。
//   **生き物が主役のゲームなのに、生き物が画面の一番小さい部分に押し込まれていた。**
//
// ★直し方の方針: 地面は「幅に合わせる」のではなく「庭の高さを満たすように拡大して、
//   はみ出した横をを切る」（cover）。狭い画面では寄りの絵になる。

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { gardenLayout, PET_SCALE_RANGE } from '../js/layout.js';

const GROUND_ASPECT = 475 / 1672;          // 実際の地面レイヤーの縦横比

const phone   = { width: 375, height: 592, groundAspect: GROUND_ASPECT };   // iPhone 縦
const tablet  = { width: 768, height: 700, groundAspect: GROUND_ASPECT };
const desktop = { width: 1280, height: 700, groundAspect: GROUND_ASPECT };

test('★スマホの縦画面で、庭が画面の42%以上を占める', () => {
  const l = gardenLayout(phone);
  const share = (phone.height - l.horizon) / phone.height;
  assert.ok(share >= 0.42,
    `庭が ${(share * 100).toFixed(0)}% しかない。生き物が主役なのに一番小さい部分に押し込まれる`);
});

test('庭が画面を占めすぎない（空が消えると天気が見えなくなる）', () => {
  for (const v of [phone, tablet, desktop]) {
    const l = gardenLayout(v);
    const share = (v.height - l.horizon) / v.height;
    assert.ok(share <= 0.68, `${v.width}x${v.height} で庭が ${(share * 100).toFixed(0)}% は多すぎる`);
  }
});

test('★地面の絵は必ず庭を覆いきる（隙間や余白が出ない）', () => {
  for (const v of [phone, tablet, desktop, { width: 320, height: 900, groundAspect: GROUND_ASPECT }]) {
    const l = gardenLayout(v);
    assert.ok(l.groundW >= v.width - 0.5,
      `${v.width}x${v.height}: 地面の幅 ${l.groundW.toFixed(0)} が画面幅 ${v.width} に足りず横に隙間が出る`);
    assert.ok(l.groundH >= v.height - l.horizon - 0.5,
      `${v.width}x${v.height}: 地面の高さが庭に足りず下に隙間が出る`);
  }
});

test('地平線は画面の内側に収まる', () => {
  for (const v of [phone, tablet, desktop]) {
    const l = gardenLayout(v);
    assert.ok(l.horizon > 0 && l.horizon < v.height, `${v.width}x${v.height}: 地平線が画面外`);
  }
});

test('★スマホで、一番奥にいる子でも画面幅の16%以上に描かれる', () => {
  const l = gardenLayout(phone);
  const CELL = 208;                        // アトラスのセル高さ
  const smallest = CELL * l.petScale[0];
  assert.ok(smallest / phone.width >= 0.16,
    `一番奥の子が ${smallest.toFixed(0)}px（画面幅の${(smallest / phone.width * 100).toFixed(0)}%）で小さすぎる`);
});

test('手前と奥で大きさに差がある（奥行きが出る）', () => {
  const l = gardenLayout(phone);
  assert.ok(l.petScale[1] > l.petScale[0] * 1.2, '手前と奥の差が小さすぎて奥行きが出ない');
});

test('画面が広いほどキャラは相対的に小さくてよい（寄りすぎない）', () => {
  const p = gardenLayout(phone).petScale[1];
  const d = gardenLayout(desktop).petScale[1];
  assert.ok(p >= d, 'スマホのほうが寄った絵になるべき');
});

test('倍率の既定値が公開されている', () => {
  assert.ok(Array.isArray(PET_SCALE_RANGE) && PET_SCALE_RANGE.length === 2);
});

// ★ここが最初の修正で抜けた条件。
//   庭を広げるために地面を2.7倍に寄せたのに、キャラの倍率は据え置きだった。
//   結果、石や池だけが大きくなって生き物が相対的に小さくなった。
//   「庭が画面の何%か」だけを約束にしていたので、すり抜けた。
//   **生き物と背景は同じ縮尺で見えなければならない。**

/** 地面の絵をどれだけ拡大して描いているか（1 = 等倍で画面幅に収まる） */
const groundZoom = (v) => gardenLayout(v).groundW / v.width;

test('★キャラの大きさは、地面の寄り具合に追随する', () => {
  for (const v of [phone, tablet, desktop]) {
    const z = groundZoom(v);
    const l = gardenLayout(v);
    const ratio = l.petScale[1] / PET_SCALE_RANGE[1];
    assert.ok(ratio >= Math.min(z, 1.6) * 0.7,
      `${v.width}x${v.height}: 地面は${z.toFixed(1)}倍に寄っているのに ` +
      `キャラは${ratio.toFixed(2)}倍のまま。背景だけ大きくなって生き物が小さく見える`);
  }
});

test('★スマホで、手前の子が画面幅の35%以上に描かれる', () => {
  const l = gardenLayout(phone);
  const near = 208 * l.petScale[1];
  assert.ok(near / phone.width >= 0.35,
    `手前の子が ${near.toFixed(0)}px（画面幅の${(near / phone.width * 100).toFixed(0)}%）。` +
    '生き物を眺めるゲームとして小さすぎる');
});

test('キャラが画面を占領しない', () => {
  for (const v of [phone, tablet, desktop]) {
    const near = 208 * gardenLayout(v).petScale[1];
    assert.ok(near / v.height <= 0.55, `${v.width}x${v.height}: 手前の子が画面の高さの半分超`);
  }
});
