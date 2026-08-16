// 雲の並べ方のうち、数で決まる部分の約束。
//
// ★問題: 雲が「灰色の綿」だった。原因は絵だけではなかった。
//   前の実装は全部の雲を同じ大きさ・同じ速さ・同じ高さの帯に置いていて、
//   **空が板になっていた。** 絵を差し替えても、板に貼るだけでは同じ結果になる。
//
// 絵の良し悪しは目で見るしかないが、奥行きの成立条件は数で決まる。
// ここが狂うと「地平線を割る雲」や「遠い雲が手前より速い空」になる。
//
//   node --test

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ROSTER, kindCounts, cloudCast, overcastVeil, placeSlot, phaseOf } from '../js/clouds.js';
import { skyLook } from '../js/sky.js';
import { classify } from '../js/weather.js';

const sprite = { w: 1536, h: 1024 };
const tall = { w: 1024, h: 1536 };

/** 雲量を直接指定して look を組む。つまみからは特定の雲量に必ずしも届かないため。 */
const look = (cloud, over = {}) => ({
  cloud, u: 0.3, windSpeed: 4, cloudDark: 0, botColor: 'rgb(200,232,245)', ...over,
});

const screens = [
  { w: 375, horizon: 308 },      // iPhone 縦
  { w: 768, horizon: 364 },
  { w: 1280, horizon: 364 },
  { w: 320, horizon: 468 },      // 極端に縦長
];

// ---------------------------------------------------------------- 配役

test('★配役は固定 — 天気で雲の種類が入れ替わらない', () => {
  // 種類を天気で切り替えると、つまみを回した瞬間に雲が別の雲へ化ける。
  // 湧く・消えるは連続だが、化けるは不連続。連続の側だけを使う
  for (let c = 0; c <= 10; c += 0.5) {
    for (const slot of cloudCast(look(c))) {
      const src = ROSTER.find((r) => r.seed === slot.seed);
      assert.equal(slot.kind, src.kind, `雲量${c}: seed=${slot.seed} の種類が変わっている`);
      assert.equal(slot.sprite, src.sprite, `雲量${c}: seed=${slot.seed} の絵が変わっている`);
    }
  }
});

test('★雲は1本ずつ滲んで湧く（まるごと点滅しない）', () => {
  // 本数が整数だと、雲量をわずかに動かしただけで雲が1本ぶん一気に出現する
  let sawPartial = false;
  for (let c = 0; c <= 10; c += 0.1) {
    for (const slot of cloudCast(look(c))) {
      assert.ok(slot.alpha > 0 && slot.alpha <= 1, `濃さが範囲外: ${slot.alpha}`);
      if (slot.alpha > 0.01 && slot.alpha < 0.99) sawPartial = true;
    }
  }
  assert.ok(sawPartial, '途中の濃さが一度も現れない＝雲が点滅している');
});

test('★雲量を上げていく途中で空が一度も薄くならない（単調）', () => {
  // ★数えるのは本数ではなく面積。積雲が層積雲へ入れ替わる 6〜7 のあたりでは
  //   本数は必ず減る（層積雲は1枚が積雲の3倍広いので、少ない本数で置き換わる）。
  //   本数で見張ると、この健全な入れ替わりを異常として叩いてしまう。
  //   つまみを回している人に見えるのは面積であって本数ではない
  const cover = (c) => {
    const l = look(c);
    return cloudCast(l).reduce((s, x) => s + x.alpha * x.size, 0) + overcastVeil(l) * 3;
  };
  let prev = -1;
  for (let c = 0; c <= 10; c += 0.25) {
    const t = cover(c);
    assert.ok(t >= prev - 1e-9, `雲量${c} で空が薄くなった: ${prev.toFixed(3)} → ${t.toFixed(3)}`);
    prev = t;
  }
  assert.ok(cover(10) > cover(0) * 4, '雲量0と10で空の埋まり方が変わらない');
});

test('★快晴でも空は空っぽではない — 巻雲が残る', () => {
  // 雲量0で一切なにも無いと、空が単なるグラデーションの板に見える
  const cast = cloudCast(look(0));
  assert.ok(cast.length > 0, '雲量0の空に雲が1つも無い');
  assert.ok(cast.every((s) => s.kind === 'cirrus'), `快晴に巻雲以外が居る: ${cast.map((s) => s.kind)}`);
});

test('★曇天は「大きい雲を並べる」ではなく蓋で作る', () => {
  // 個々の雲をいくら並べても隙間から青が覗く。本当の曇天は一枚の蓋
  assert.equal(overcastVeil(look(6)), 0, '曇りきっていないのに蓋が出ている');
  assert.ok(overcastVeil(look(10)) > 0.4, '雲量10でも空に蓋がかからない');
});

test('積乱雲は雲量と上昇気流の両方が要る', () => {
  const has = (l) => cloudCast(l).some((s) => s.kind === 'cumulonimbus');
  assert.ok(!has(look(10, { u: 0.2 })), '上昇気流が無いのに積乱雲が立っている');
  assert.ok(!has(look(5, { u: 0.9 })), '雲が薄いのに積乱雲が立っている');
  assert.ok(has(look(10, { u: 0.9 })), '荒天なのに積乱雲が立たない');
});

test('★雷とひょうの空には、必ず積乱雲が立っている', () => {
  // ★実際に落ちた: 積乱雲の閾値を雲量7.8に置いていたが、降水は7.0から始まる。
  //   雷の空（雲量7.7・上昇気流0.82）に塔が立たず、雷なのに穏やかな午後の空に見えた。
  //   **雷とひょうは「上昇気流が作る天気」なので、その絵が積乱雲以外にはならない。**
  //   閾値を独立に決めず、降水の開始（weather.js の cloud>=7）に括り付ける
  let checked = 0;
  for (let t = -20; t <= 40; t += 2) {
    for (let w = 0; w <= 100; w += 4) {
      for (let p = 960; p <= 1040; p += 4) {
        for (const v of [0, 3, 8, 15]) {
          const dials = { t, w, p, v };
          const kind = classify(dials);
          if (kind !== 'thunder' && kind !== 'hail') continue;
          checked++;
          const cast = cloudCast(skyLook(dials, kind));
          const cb = cast.find((s) => s.kind === 'cumulonimbus');
          assert.ok(cb && cb.alpha > 0.3,
            `${kind} ${JSON.stringify(dials)} の空に積乱雲が立たない (濃さ ${cb?.alpha ?? 0})`);
        }
      }
    }
  }
  assert.ok(checked > 50, `検算した空が ${checked} 通りしかない。掃引が効いていない`);
});

test('ちぎれ雲は風が千切る（無風の日には出ない）', () => {
  const n = (v) => kindCounts(look(8, { windSpeed: v })).fractus;
  assert.ok(n(0) < n(14), '風を強めてもちぎれ雲が増えない');
});

// ---------------------------------------------------------------- 配置

test('★雲は地平線を割らない（雲底が地面に食い込まない）', () => {
  for (const { w, horizon } of screens) {
    for (let c = 0; c <= 10; c += 1) {
      for (const slot of cloudCast(look(c, { u: 0.9 }))) {
        const sp = slot.kind === 'cumulonimbus' ? tall : sprite;
        const r = placeSlot(slot, sp, w, horizon, 0, look(c, { u: 0.9 }));
        assert.ok(r.y + r.h <= horizon + 0.001,
          `${w}px 雲量${c}: ${slot.sprite} の底 ${(r.y + r.h).toFixed(0)} が地平線 ${horizon} より下`);
      }
    }
  }
});

test('★雲は空の高さに収まる（画面の上に突き抜けない）', () => {
  for (const { w, horizon } of screens) {
    for (const slot of cloudCast(look(10, { u: 1 }))) {
      const sp = slot.kind === 'cumulonimbus' ? tall : sprite;
      const r = placeSlot(slot, sp, w, horizon, 0, look(10, { u: 1 }));
      assert.ok(r.h <= horizon,
        `${w}px: ${slot.sprite} の高さ ${r.h.toFixed(0)} が空 ${horizon} より高い`);
    }
  }
});

test('★奥の雲ほど遅い（これが唯一の奥行きの証拠）', () => {
  // 全部同じ速さで流れると、大きさが違っても「大小の雲」にしか見えず遠近が出ない
  const l = look(6, { windSpeed: 8 });
  const at = (slot, t) => placeSlot(slot, sprite, 800, 360, t, l).x;
  const near = { ...ROSTER[0], z: 1.0, seed: 5 };
  const far = { ...ROSTER[0], z: 0.2, seed: 5 };
  assert.ok(at(near, 1) - at(near, 0) > at(far, 1) - at(far, 0),
    '手前の雲が奥の雲より速く流れていない');
});

test('風が強いほど雲は速く流れる', () => {
  const slot = ROSTER[4];
  const dx = (v) => {
    const l = look(6, { windSpeed: v });
    return placeSlot(slot, sprite, 800, 360, 1, l).x - placeSlot(slot, sprite, 800, 360, 0, l).x;
  };
  assert.ok(dx(12) > dx(2), '風を強めても雲の流れが速くならない');
});

test('★上昇気流は雲を増やすのではなく縦に伸ばす', () => {
  // 積雲が積乱雲へ育つのはこの一軸。気圧のつまみを下げた手応えがここに出る
  const slot = ROSTER.find((r) => r.kind === 'cumulus');
  const h = (u) => placeSlot(slot, sprite, 800, 360, 0, look(5, { u })).h;
  assert.ok(h(1) > h(0) * 1.2, `上昇気流を上げても雲が育たない: ${h(0)} → ${h(1)}`);
});

test('★雲は画面の横幅に散る（片側に寄らない）', () => {
  // ★実際に寄った: 初期位置を `(seed * 37) % span` で出していたが、seed が等差なので
  //   積 mod も等差の帯になり、雲が右3割に固まって左が空いたままだった。
  //   **等差数列に線形写像をかけても等差のまま。** 散らばりはハッシュからしか来ない
  const l = look(6);
  const centers = cloudCast(l)
    .map((s) => placeSlot(s, sprite, 375, 273, 0, l))
    .map((r) => r.x + r.w / 2);
  const left = centers.filter((x) => x < 375 / 2).length;
  assert.ok(left >= 2 && left <= centers.length - 2,
    `雲 ${centers.length} 個のうち左半分が ${left} 個。片側に寄っている`);
});

test('★初期位置は「先頭から何個取っても」散る', () => {
  // ★ここが低食い違い列でなければならない理由。雲は種類ごとに配役の先頭から順に点くので、
  //   全体が散っていても **prefix が散っていなければ意味がない。**
  //   ふつうのハッシュは全体の散らばりしか保証しない
  for (let n = 3; n <= ROSTER.length; n++) {
    const vs = ROSTER.slice(0, n).map((r) => r.phase);
    for (const v of vs) assert.ok(v >= 0 && v < 1, `範囲外: ${v}`);
    const buckets = new Set(vs.map((v) => Math.floor(v * 3)));
    assert.equal(buckets.size, 3, `先頭${n}個が ${buckets.size}/3 区画にしか落ちていない`);
  }
  assert.equal(phaseOf(4), phaseOf(4), '同じ番号で違う値が出る');
});

test('placeSlot は純粋（同じ入力で同じ結果）', () => {
  const slot = ROSTER[4];
  assert.deepEqual(
    placeSlot(slot, sprite, 800, 360, 3, look(5)),
    placeSlot(slot, sprite, 800, 360, 3, look(5)),
  );
});

// ---------------------------------------------------------------- skyLook との接続

test('skyLook が雲の描画に要る値をすべて渡している', () => {
  const l = skyLook({ t: 18, w: 92, p: 978, v: 6 }, 'rainy');
  for (const key of ['cloud', 'u', 'windSpeed', 'cloudDark', 'botColor']) {
    assert.ok(l[key] !== undefined, `skyLook に ${key} が無い`);
  }
});
