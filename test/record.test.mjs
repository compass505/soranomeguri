// めぐりの記録が、ゲーム本体の好みと親密度表現からずれないための回帰網。

import { test } from 'node:test';
import assert from 'node:assert/strict';

globalThis.localStorage = {
  _v: new Map(),
  getItem(k) { return this._v.has(k) ? this._v.get(k) : null; },
  setItem(k, v) { this._v.set(k, String(v)); },
  removeItem(k) { this._v.delete(k); },
};

const S = await import('../js/state.js');
const { BOND_TEXT, RING_ORDER, ringEntries } = await import('../js/record.js');

test('★環の矢印と実りは state.js の LIKES を唯一の正本にする', () => {
  const entries = ringEntries({ meals: {} });
  assert.deepEqual(entries.map((edge) => edge.to), [...RING_ORDER]);
  for (const edge of entries) {
    assert.equal(edge.from, S.LIKES[edge.to], `${edge.to} へ入る弧の元が LIKES と違う`);
    assert.equal(edge.fruit, S.FRUIT[S.LIKES[edge.to]], `${edge.to} の弧の実りが違う`);
  }
});

test('好物を食べさせた弧だけが通った記録になる', () => {
  const state = { meals: { thunder: { rainy: 1 }, sunny: { rainy: 4 } } };
  const byTarget = Object.fromEntries(ringEntries(state).map((edge) => [edge.to, edge]));
  assert.equal(byTarget.thunder.passed, true, '雨→雷は通っている');
  assert.equal(byTarget.sunny.passed, false, '晴が雨を食べても、霧→晴の弧は通らない');
});

test('親密度の一文は 骨格v2 §6 の挙動欄と逐語で一致する', () => {
  assert.deepEqual(BOND_TEXT, [
    'idle 中心。こちらを見ない',
    'ときどき視線がカーソルを追う。waiting が増える',
    '現れた時に waving。視線追従が持続する',
    '開いた瞬間に running で駆け寄る。なでると jumping',
  ]);
});
