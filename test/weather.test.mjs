// 気象モデルの回帰網。
// ★ここに書いてあるのは「動かしてはいけない設計上の約束」であって、実装の写しではない。
//   数値を変えたくなったら、まずこのテストを読んで、約束を変えてよいのか判断する。
//
//   node --test

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  SEKKI, DAYS_PER_SEKKI, DAYS_PER_YEAR, AFTER_RAIN_WINDOW,
  baseline, reachable, satAbsHumidity, derive, classify, calendar,
} from '../js/weather.js';

const sekkiOf = (name) => SEKKI.indexOf(name);
const dialsAt = (name, over = {}) => ({ ...baseline(sekkiOf(name)), w: 50, ...over });

// ---------------------------------------------------------------- 暦

test('1年は72日、1節気は3日', () => {
  assert.equal(DAYS_PER_SEKKI, 3);
  assert.equal(SEKKI.length, 24);
  assert.equal(DAYS_PER_YEAR, 72);
});

test('暦は72日で一周し、負の日数でも壊れない', () => {
  assert.equal(calendar(0).sekki, '立春');
  assert.equal(calendar(72).sekki, '立春');
  assert.equal(calendar(-1).sekki, '大寒');
  assert.equal(calendar(35).sekki, '大暑');
});

// ---------------------------------------------------------------- 飽和水蒸気量

test('飽和水蒸気量は実際の値に近い（冷たい空気は水を持てない）', () => {
  assert.ok(Math.abs(satAbsHumidity(30) - 30.4) < 1.5, '30℃ ≈ 30.4 g/m3');
  assert.ok(Math.abs(satAbsHumidity(0) - 4.8) < 0.5, '0℃ ≈ 4.8 g/m3');
  assert.ok(Math.abs(satAbsHumidity(-15) - 1.6) < 0.4, '-15℃ ≈ 1.6 g/m3');
});

test('★つまみは独立していない — 水を変えずに気温を上げると湿度が下がる', () => {
  const cold = derive({ t: 5, w: 40, p: 1013, v: 0 });
  const warm = derive({ t: 25, w: 40, p: 1013, v: 0 });
  assert.ok(warm.rh < cold.rh, '暖めると相対湿度は下がる');
});

// ---------------------------------------------------------------- 閾値の整合

test('★曇は発生可能でなければならない（最初のモデルはここで落ちた）', () => {
  // 曇 = 雲量>4 かつ 降水なし。降水の閾値が曇より下にあると数学的に発生できない
  let found = null;
  for (let w = 0; w <= 100 && !found; w += 0.5) {
    for (let p = 973; p <= 1053 && !found; p += 1) {
      const d = { t: 15, w, p, v: 3 };
      if (classify(d) === 'cloudy') found = d;
    }
  }
  assert.ok(found, '曇になる組み合わせが存在する');
});

test('★可動域のどこを取っても必ずどれかの天気になる（空白地帯ゼロ）', () => {
  const KNOWN = new Set(['sunny', 'cloudy', 'rainy', 'snow', 'thunder',
                         'hail', 'fog', 'wind', 'diamonddust', 'rainbow']);
  for (let i = 0; i < SEKKI.length; i++) {
    const r = reachable(i);
    for (let a = 0; a <= 6; a++) {
      for (let b = 0; b <= 6; b++) {
        for (let c = 0; c <= 6; c++) {
          for (let e = 0; e <= 6; e++) {
            const d = {
              t: r.t[0] + ((r.t[1] - r.t[0]) * a) / 6,
              w: (100 * b) / 6,
              p: r.p[0] + ((r.p[1] - r.p[0]) * c) / 6,
              v: r.v[0] + ((r.v[1] - r.v[0]) * e) / 6,
            };
            assert.ok(KNOWN.has(classify(d)), `未知の天気 ${classify(d)} @ ${JSON.stringify(d)}`);
          }
        }
      }
    }
  }
});

// ---------------------------------------------------------------- 季節の門

test('★季節の門: 冬に雷は作れない / 夏に雪は作れない', () => {
  const winter = reachable(sekkiOf('大寒'));
  const summer = reachable(sekkiOf('大暑'));
  assert.ok(winter.t[1] < 20, `大寒の気温上限 ${winter.t[1].toFixed(1)} は雷の条件20℃に届かない`);
  assert.ok(summer.t[0] > -1, `大暑の気温下限 ${summer.t[0].toFixed(1)} は雪の条件-1℃に届かない`);
});

test('★ダイヤモンドダストは真冬の数節気でしか作れない', () => {
  const ok = SEKKI.map((_, i) => reachable(i).t[0] <= -15).filter(Boolean).length;
  assert.ok(ok > 0, '作れる節気が1つは要る');
  assert.ok(ok <= 5, `作れる節気が多すぎる（${ok}/24）。最レアでなくなっている`);
});

test('気圧の可動域は雷とひょうの上昇気流に届く', () => {
  const r = reachable(sekkiOf('大暑'));
  const u = (1013 - r.p[0]) / 50;
  assert.ok(u >= 0.75, `上昇気流の上限 ${u.toFixed(2)} がひょうの条件0.75に届かない`);
});

// ---------------------------------------------------------------- 天気の判定

test('10種すべてが、どこかの節気で作れる', () => {
  const seen = new Set();
  for (let i = 0; i < SEKKI.length; i++) {
    const r = reachable(i);
    for (let a = 0; a <= 10; a++) {
      for (let b = 0; b <= 10; b++) {
        for (let c = 0; c <= 10; c++) {
          for (let e = 0; e <= 10; e++) {
            seen.add(classify({
              t: r.t[0] + ((r.t[1] - r.t[0]) * a) / 10,
              w: (100 * b) / 10,
              p: r.p[0] + ((r.p[1] - r.p[0]) * c) / 10,
              v: r.v[0] + ((r.v[1] - r.v[0]) * e) / 10,
            }));
          }
        }
      }
    }
  }
  for (const k of ['sunny', 'cloudy', 'rainy', 'snow', 'thunder', 'hail', 'fog', 'wind', 'diamonddust']) {
    assert.ok(seen.has(k), `${k} がどの節気でも作れない`);
  }
});

test('降水は気温で雨と雪に分かれる', () => {
  const wet = { w: 95, p: 975, v: 2 };
  assert.equal(classify({ ...wet, t: 15 }), 'rainy');
  assert.equal(classify({ ...wet, t: -10 }), 'snow');
});

// ---------------------------------------------------------------- 虹（遷移）

test('★虹は状態では絶対に出ない — 雨上がりの窓が要る', () => {
  const clear = { t: 18, w: 92, p: 1020, v: 3 };
  assert.notEqual(classify(clear, false), 'rainbow', '窓が閉じていれば虹にならない');
  assert.equal(classify(clear, true), 'rainbow', '窓が開いていれば虹になる');
});

test('★虹は雨から晴れへ動かせば必ず出る（1フレーム判定では0回だった回帰）', () => {
  const base = { t: 18, w: 92, v: 3 };
  for (const fps of [30, 60]) {
    for (const secs of [0.5, 2, 10]) {
      let afterRain = 0, hit = false;
      const steps = Math.round(secs * fps), dt = 1 / fps;
      for (let i = 0; i <= steps; i++) {
        const d = { ...base, p: 978 + ((1035 - 978) * i) / steps };
        if (classify(d, afterRain > 0) === 'rainbow') hit = true;
        const { precip } = derive(d);
        afterRain = precip ? AFTER_RAIN_WINDOW : Math.max(0, afterRain - dt);
      }
      assert.ok(hit, `${secs}秒 / ${fps}fps で虹が出ない`);
    }
  }
});

test('虹の窓は、触らずに晴らしても間に合う長さがある', () => {
  assert.ok(AFTER_RAIN_WINDOW >= 30, '短すぎると餌をやる前に消える');
});
