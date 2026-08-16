// 「開くと、空は一晩かけて平常値に戻っている」という約束（骨格v2 の8節）。
//
// ★問題: 日をまたいでも つまみが前日のまま残っていた。
//   昨日つくった雷雲の中に開き、雷の子がもう庭にいる状態から始まる。
//   **v1→v2 で一番大事だった「空はプレイヤーが作る」が、2日目から消えていた。**
//   毎回まっさらから始まるから「作る」という行為が要る。
//
// ★併せて、平常値の湿りを暦から決める。
//   同じ相対湿度でも、抱えられる水の量は夏と冬でまるで違う（夏の朝は湿り49、冬の朝は5）。
//   **開いた瞬間の湿度計に、つまみが独立していないことが出る。**
//
// ★ここでも関係の側を書く。「戻す」だけを約束にすると、
//   持ち物や懐き具合まで戻す実装で満たせてしまう。**戻らない物の側を必ず併記する。**
//
//   node --test

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { freshState, rollDay, gameCalendar } from '../js/state.js';
import { baseline, derive, classify, reachable, calendar, DAYS_PER_YEAR } from '../js/weather.js';

/** s を「n日後に開いた」状態にする。 */
function reopen(s, n) {
  s.daily.day -= n;
  return rollDay(s);
}

// ---------------------------------------------------------------- 平常値の湿り

test('★平常値の湿りは暦で動く（夏は多く、冬は少ない）', () => {
  const summer = baseline(calendar(35).sekkiIndex);   // 大暑
  const winter = baseline(calendar(0).sekkiIndex);    // 立春
  assert.ok(typeof summer.w === 'number', 'baseline が湿りの平常値を持っていない');
  assert.ok(summer.w > winter.w * 2,
    `夏 ${summer.w?.toFixed(1)} / 冬 ${winter.w?.toFixed(1)}。同じ水の量では季節の違いが出ない`);
});

test('★どの節気でも、平常の空はおだやかな湿り気になる', () => {
  // 冷たい空気は水を持てないので、水の量を固定すると冬の湿度計が100%に張り付く
  for (let i = 0; i < 24; i++) {
    const b = baseline(i);
    const { rh } = derive({ t: b.t, w: b.w, p: b.p, v: b.v });
    assert.ok(rh > 40 && rh < 80,
      `節気${i}（${b.t.toFixed(1)}℃）の平常の湿度が ${rh.toFixed(0)}%。針が端に張り付いている`);
  }
});

test('平常値は可動域の内側にある（開いた瞬間に端で止まらない）', () => {
  for (let i = 0; i < 24; i++) {
    const b = baseline(i);
    const r = reachable(i);
    for (const k of ['t', 'w', 'p', 'v']) {
      assert.ok(b[k] >= r[k][0] && b[k] <= r[k][1],
        `節気${i}: 平常値の ${k}=${b[k]} が可動域 ${JSON.stringify(r[k])} の外`);
    }
  }
});

test('★平常の空はおだやかな天気になる（開いた瞬間が荒天だと「まっさら」ではない）', () => {
  for (let i = 0; i < 24; i++) {
    const b = baseline(i);
    const kind = classify({ t: b.t, w: b.w, p: b.p, v: b.v });
    assert.ok(['sunny', 'cloudy'].includes(kind),
      `節気${i} の平常の空が ${kind}。まっさらから始まる感じにならない`);
  }
});

// ---------------------------------------------------------------- 日をまたぐ

test('★日をまたぐと、つまみは平常値に戻っている', () => {
  const s = freshState();
  s.dials = { t: 38, w: 99, p: 962, v: 30 };          // 昨日つくった荒れた空
  reopen(s, 1);
  const b = baseline(gameCalendar(s).sekkiIndex);
  for (const k of ['t', 'w', 'p', 'v']) {
    assert.ok(Math.abs(s.dials[k] - b[k]) < 0.001,
      `${k} が ${s.dials[k]} のまま。昨日の空の中で目が覚める`);
  }
});

test('何日空けても、開いた日の平常値に戻る', () => {
  for (const days of [1, 3, 8, 40, DAYS_PER_YEAR + 5]) {
    const s = freshState();
    s.dials = { t: 38, w: 99, p: 962, v: 30 };
    reopen(s, days);
    const b = baseline(gameCalendar(s).sekkiIndex);
    assert.ok(Math.abs(s.dials.t - b.t) < 0.001, `${days}日後に戻っていない`);
  }
});

test('同じ日のうちは戻さない（読み込み直しただけで空を消さない）', () => {
  const s = freshState();
  s.dials = { t: 38, w: 99, p: 962, v: 30 };
  const before = { ...s.dials };
  rollDay(s);                                          // 日は変わっていない
  assert.deepEqual(s.dials, before, '同じ日に読み込み直しただけで空が消えた');
});

// ---------------------------------------------------------------- 戻らない物の側

test('★戻るのは空だけ。持ち物・懐き具合・初対面の記録は日をまたいでも残る', () => {
  const s = freshState();
  s.dials = { t: 38, w: 99, p: 962, v: 30 };
  s.bag = { sunny: 4, rainbow: 1 };
  s.bond = { rainy: 22, fog: 7 };
  s.seen = { rainy: 1755300000000 };
  reopen(s, 5);
  assert.deepEqual(s.bag, { sunny: 4, rainbow: 1 }, '持ち物が消えた');
  assert.deepEqual(s.bond, { rainy: 22, fog: 7 }, '懐き具合が戻された');
  assert.deepEqual(s.seen, { rainy: 1755300000000 }, '初対面の記録が消えた');
});

test('★開かなかった日に失うものは無い（罰なしは崩さない）', () => {
  const s = freshState();
  const kept = reopen(s, 8);
  assert.ok(kept.carry > 0, '8日開けなかった分の繰り越しが消えている');
});
