// 空の見た目のうち、数で決まる部分の約束。
//
// ★問題: 天気名が「にじ」になり子も3体そろうのに、空に虹が描かれていなかった。
//   骨格v2 の9節は演出を4か所に集中させると決めていて、その1つが
//   「つまみを回した瞬間の空 — 触った手応えはここで返す」。
//   虹は v2 で唯一「点ではなく道」の天気で、8節では「狙って作れる一番きれいな瞬間」と
//   呼んでいる。**その見せ場に絵が無かった。**
//
// 絵そのものは目で見るしかないが、弧の位置と色の順序は数で決まる。
// ここが狂うと「空に浮いた輪」や「地面を横切る帯」になる。
//
//   node --test

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { rainbowArc, skyLook } from '../js/sky.js';

const screens = [
  { w: 375, horizon: 308 },      // iPhone 縦
  { w: 768, horizon: 364 },
  { w: 1280, horizon: 364 },
  { w: 320, horizon: 468 },      // 極端に縦長
];

test('★虹は地平線から生えている（空に浮いた輪にならない）', () => {
  for (const { w, horizon } of screens) {
    const a = rainbowArc(w, horizon);
    assert.ok(a.cy >= horizon,
      `${w}px: 弧の中心が地平線より上にある（cy=${a.cy.toFixed(0)} < ${horizon}）。輪が宙に浮く`);
    assert.ok(a.r > a.cy - horizon,
      `${w}px: 半径が足りず、弧が地平線まで届かない`);
  }
});

test('★虹の頂点は空の中にある（画面の外や地面の中に消えない）', () => {
  for (const { w, horizon } of screens) {
    const a = rainbowArc(w, horizon);
    const top = a.cy - a.r;
    assert.ok(top > 0, `${w}px: 頂点 ${top.toFixed(0)} が画面の上に飛び出している`);
    assert.ok(top < horizon * 0.8,
      `${w}px: 頂点 ${top.toFixed(0)} が地平線(${horizon})に近すぎて弧に見えない`);
  }
});

test('虹は画面の横幅をまたぐ大きさがある', () => {
  for (const { w, horizon } of screens) {
    const a = rainbowArc(w, horizon);
    assert.ok(a.r * 2 >= w * 0.6, `${w}px: 半径 ${a.r.toFixed(0)} では小さくて虹に見えない`);
  }
});

test('★帯は外側から赤、内側へ紫（順序が逆だと虹に見えない）', () => {
  const a = rainbowArc(800, 360);
  assert.equal(a.bands.length, 7, '虹は7色');
  const outer = a.bands[0], inner = a.bands.at(-1);
  assert.ok(outer[0] > outer[2], `一番外は赤側であるべき: ${outer}`);
  assert.ok(inner[2] > inner[0], `一番内は青紫側であるべき: ${inner}`);
});

test('虹は細い帯であって、空の塗りつぶしではない', () => {
  for (const { w, horizon } of screens) {
    const a = rainbowArc(w, horizon);
    assert.ok(a.bandWidth * a.bands.length < a.r * 0.35,
      `${w}px: 帯の合計 ${(a.bandWidth * a.bands.length).toFixed(0)}px が半径 ${a.r.toFixed(0)} に対して太すぎる`);
    assert.ok(a.bandWidth >= 2, '細すぎて見えない');
  }
});

test('rainbowArc は純粋（同じ入力で同じ結果）', () => {
  assert.deepEqual(rainbowArc(800, 360), rainbowArc(800, 360));
});

// ---------------------------------------------------------------- 出す条件

test('★虹の絵は判定が虹のときだけ出す', () => {
  // 霧の膜と同じ理由。連続量だけで出すと、雨上がりでない晴れの日にも虹が居座る。
  // 虹は「点ではなく道」なので、道の上にいるかどうかは classify しか知らない
  const wet = { t: 18, w: 92, p: 1030, v: 3 };
  assert.ok(skyLook(wet, 'rainbow').rainbow > 0, '虹の日に虹が出ない');
  assert.equal(skyLook(wet, 'sunny').rainbow, 0, '虹でない日に虹が出ている');
  assert.equal(skyLook({ t: 18, w: 92, p: 978, v: 3 }, 'rainy').rainbow, 0, '雨の最中に虹が出ている');
});

test('虹の濃さは 0〜1 に収まる', () => {
  const look = skyLook({ t: 18, w: 92, p: 1030, v: 3 }, 'rainbow');
  assert.ok(look.rainbow > 0 && look.rainbow <= 1, `濃さが範囲外: ${look.rainbow}`);
});
