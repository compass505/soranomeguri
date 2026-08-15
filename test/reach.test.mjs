// 可動域を「見せる」ための約束。
//
// ★問題: つまみは季節ごとに動ける幅が変わるが、画面上はスライダーが黙って止まるだけで、
//   なぜそこから先へ行けないのかがプレイヤーに一切伝わらない。
//   夏に雪を作ろうとした人は「壊れている」と受け取る。
//   可動域はこのゲームのレアリティを一手で生んでいる中心機構なので、
//   これが見えないと仕組みそのものが理解されない。
//
// ★見せるには「全体の幅」と「今日届く幅」の両方が要る。
//   届く範囲しか知らないと、届かない部分を灰色で描けない。

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SEKKI, reachable, fullRange, DIAL_KEYS } from '../js/weather.js';

test('つまみ4本の全体の幅が取れる', () => {
  assert.deepEqual([...DIAL_KEYS].sort(), ['p', 't', 'v', 'w']);
  for (const k of DIAL_KEYS) {
    const r = fullRange(k);
    assert.ok(Array.isArray(r) && r.length === 2, `${k} の全体の幅が配列で返らない`);
    assert.ok(r[0] < r[1], `${k} の下限が上限以上`);
  }
});

test('★全体の幅は、どの節気の可動域も必ず内側に含む', () => {
  for (let i = 0; i < SEKKI.length; i++) {
    const reach = reachable(i);
    for (const k of DIAL_KEYS) {
      const [lo, hi] = fullRange(k);
      assert.ok(reach[k][0] >= lo,
        `${SEKKI[i]} の ${k} 可動域下限 ${reach[k][0].toFixed(1)} が全体の下限 ${lo} を下回る`);
      assert.ok(reach[k][1] <= hi,
        `${SEKKI[i]} の ${k} 可動域上限 ${reach[k][1].toFixed(1)} が全体の上限 ${hi} を上回る`);
    }
  }
});

test('★気温は、どの節気でも必ず届かない部分が残る（灰色に描く余地がある）', () => {
  const [lo, hi] = fullRange('t');
  for (let i = 0; i < SEKKI.length; i++) {
    const [rlo, rhi] = reachable(i).t;
    assert.ok(rlo > lo || rhi < hi,
      `${SEKKI[i]} は気温が全域に届いてしまう。季節の門が消える`);
  }
});

test('★真冬と真夏で、届く範囲が実際に入れ替わる', () => {
  const winter = reachable(SEKKI.indexOf('大寒')).t;
  const summer = reachable(SEKKI.indexOf('大暑')).t;
  assert.ok(winter[1] < summer[0],
    `大寒の上限 ${winter[1].toFixed(1)} と大暑の下限 ${summer[0].toFixed(1)} が重なっている。` +
    '重なっていると「季節でしか作れない天気」が成立しない');
});

test('全体の幅は季節で動かない（動くのは可動域だけ）', () => {
  const a = DIAL_KEYS.map((k) => fullRange(k).join(','));
  const b = DIAL_KEYS.map((k) => fullRange(k).join(','));
  assert.deepEqual(a, b, 'fullRange が呼ぶたび変わっている');
});
