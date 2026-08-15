// 保存・収穫・給餌・親密度の回帰網。
// ★中心にあるのは「罰なし」と「餌の環」。この2つが壊れたら設計が別物になる。

import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// state.js は localStorage を触るので、node 側に最小の実物を用意する
globalThis.localStorage = {
  _v: new Map(),
  getItem(k) { return this._v.has(k) ? this._v.get(k) : null; },
  setItem(k, v) { this._v.set(k, String(v)); },
  removeItem(k) { this._v.delete(k); },
};

const S = await import('../js/state.js');
const { WEATHERS } = await import('../js/weather.js');

let st;
beforeEach(() => { globalThis.localStorage._v.clear(); st = S.freshState(); });

// ---------------------------------------------------------------- 餌の環

test('★好みは「自分を生んだ空」の環になっていて、閉じている', () => {
  const ring = ['fog', 'sunny', 'cloudy', 'rainy', 'thunder', 'hail', 'snow'];
  for (let i = 0; i < ring.length; i++) {
    const pet = ring[i];
    const parent = ring[(i - 1 + ring.length) % ring.length];
    assert.equal(S.LIKES[pet], parent, `${pet} の好物は ${parent} のはず`);
  }
});

test('★どの子も自分の天気の実りは好物ではない（1天気で完結させない）', () => {
  for (const [pet, likes] of Object.entries(S.LIKES)) {
    if (likes === null) continue;                 // 風とダイヤは別扱い
    assert.notEqual(pet, likes, `${pet} が自分の実りを好んでいる`);
  }
});

test('風の好物は日替わりで、同じ日なら何度呼んでも同じ', () => {
  const a = S.windLikes(st);
  assert.equal(a, S.windLikes(st), '同じ日で結果が揺れてはいけない');
  const tomorrow = { ...st, startDay: st.startDay - 1 };
  assert.notEqual(a, S.windLikes(tomorrow), '日が変われば変わる');
});

test('全キャラに実りの名前がある', () => {
  for (const w of WEATHERS) assert.ok(S.FRUIT[w], `${w} の実りに名前が無い`);
});

// ---------------------------------------------------------------- 給餌

test('好物なら +3、それ以外なら +1', () => {
  st.bag = { fog: 1, rainy: 1 };
  assert.equal(S.feed(st, 'sunny', 'fog'), 'liked');    // 晴の好物は 霧
  assert.equal(st.bond.sunny, 3);

  st.daily.fed = {};
  assert.equal(S.feed(st, 'sunny', 'rainy'), 'ok');
  assert.equal(st.bond.sunny, 4);
});

test('にじのかけらは万能（どの子にも好物として効く）', () => {
  st.bag = { rainbow: 1 };
  assert.equal(S.feed(st, 'thunder', 'rainbow'), 'liked');
  assert.equal(st.bond.thunder, 3);
});

test('給餌は1体1日1回まで', () => {
  st.bag = { fog: 2 };
  assert.equal(S.feed(st, 'sunny', 'fog'), 'liked');
  assert.equal(S.feed(st, 'sunny', 'fog'), null, '2回目は通らない');
  assert.equal(st.bag.fog, 1, '通らなかった分は消費されない');
});

test('持っていない実りは与えられない', () => {
  assert.equal(S.feed(st, 'sunny', 'fog'), null);
  assert.equal(st.bond.sunny, undefined);
});

test('★親密度は絶対に減らない（罰なし）', () => {
  st.bag = { rainy: 1 };
  S.feed(st, 'sunny', 'rainy');            // 好物ではない
  assert.ok(st.bond.sunny > 0, '好物でなくても減らない');
});

// ---------------------------------------------------------------- 収穫

test('収穫は1日合計5個・1種3個まで', () => {
  for (let i = 0; i < 3; i++) assert.equal(S.harvest(st, 'sunny'), true);
  assert.equal(S.harvest(st, 'sunny'), false, '同じ天気は3個まで');
  assert.equal(S.harvest(st, 'rainy'), true);
  assert.equal(S.harvest(st, 'rainy'), true);
  assert.equal(S.harvest(st, 'rainy'), false, '合計5個で打ち止め');
  assert.equal(st.bag.sunny, 3);
  assert.equal(st.bag.rainy, 2);
});

// ---------------------------------------------------------------- 罰なし

test('★開かなかった日があっても何も失わず、繰り越しが増える', () => {
  const before = { ...st.bag };
  st.daily.day -= 3;                        // 3日開かなかった
  S.rollDay(st);
  assert.deepEqual(st.bag, before, '持ち物は減らない');
  assert.ok(st.carry > 0, '採らなかった分が繰り越される');
});

test('繰り越しには上限がある（放置が有利になりすぎない）', () => {
  st.daily.day -= 400;
  S.rollDay(st);
  assert.ok(st.carry <= 15, `繰り越し ${st.carry} が上限15を超えている`);
});

test('日が変わると給餌となでるの回数が戻る', () => {
  st.bag = { fog: 2 };
  S.feed(st, 'sunny', 'fog');
  assert.equal(S.feed(st, 'sunny', 'fog'), null);
  st.daily.day -= 1;
  S.rollDay(st);
  assert.equal(S.feed(st, 'sunny', 'fog'), 'liked', '翌日はまた与えられる');
});

// ---------------------------------------------------------------- なでる

test('なでるは1体1日1回、親密度が1上がる', () => {
  assert.equal(S.pet(st, 'sunny'), true);
  assert.equal(st.bond.sunny, 1);
  assert.equal(S.pet(st, 'sunny'), false);
  assert.equal(st.bond.sunny, 1);
});

// ---------------------------------------------------------------- 保存

test('壊れた保存データを読んでも落ちず、新規状態になる', () => {
  globalThis.localStorage.setItem('soranomeguri-v1', '{壊れたJSON');
  const loaded = S.load();
  assert.ok(loaded.version, '読み込みが落ちない');
});
