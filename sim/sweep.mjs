// js/weather.js を sim/weather_v2.py と同じ条件で掃引し、数字が一致するか確かめる。
// モデルは2箇所（本体JS / 検算Python）にあるので、片方だけ直すと静かにズレる。
// これはそのズレを検出するためだけのファイル。
//
//   node sim/sweep.mjs

import { SEKKI, baseline, reachable, classify } from '../js/weather.js';

const ORDER = ['sunny', 'cloudy', 'rainy', 'snow', 'thunder',
               'hail', 'fog', 'wind', 'diamonddust'];
const JA = { sunny: '晴', cloudy: '曇', rainy: '雨', snow: '雪', thunder: '雷',
             hail: 'ひょう', fog: '霧', wind: '風', diamonddust: 'ダイヤ' };
const STEPS = 13;

let blank = 0, all = 0;
const seasonsFor = Object.fromEntries(ORDER.map((k) => [k, []]));
const rows = [];

for (let i = 0; i < SEKKI.length; i++) {
  const r = reachable(i);
  const hit = Object.fromEntries(ORDER.map((k) => [k, 0]));
  let cells = 0;

  for (let a = 0; a < STEPS; a++) {
    const t = r.t[0] + ((r.t[1] - r.t[0]) * a) / (STEPS - 1);
    for (let b = 0; b < STEPS; b++) {
      const w = (100 * b) / (STEPS - 1);
      for (let c = 0; c < STEPS; c++) {
        const p = r.p[0] + ((r.p[1] - r.p[0]) * c) / (STEPS - 1);
        for (let e = 0; e < STEPS; e++) {
          const v = r.v[0] + ((r.v[1] - r.v[0]) * e) / (STEPS - 1);
          const k = classify({ t, w, p, v });
          if (k in hit) hit[k]++; else blank++;
          cells++; all++;
        }
      }
    }
  }
  for (const k of ORDER) if (hit[k] > 0) seasonsFor[k].push(SEKKI[i]);
  rows.push({ name: SEKKI[i], t: baseline(i).t, hit, cells });
}

console.log('節気     平常気温 ' + ORDER.map((k) => JA[k].padStart(7)).join(''));
for (const r of rows) {
  console.log(
    r.name.padEnd(5) + r.t.toFixed(1).padStart(8) + '℃ ' +
    ORDER.map((k) => ((r.hit[k] / r.cells) * 100).toFixed(1).padStart(6) + '%').join('')
  );
}

console.log(`\n■ 空白地帯: ${blank} / ${all} = ${((blank / all) * 100).toFixed(2)}%`);
console.log('\n■ 各キャラに会える節気の数');
for (const k of ORDER) {
  const s = seasonsFor[k];
  console.log(`  ${JA[k].padEnd(5)} ${String(s.length).padStart(2)}/24  ` +
              (s.length ? s.slice(0, 3).join('、') + (s.length > 3 ? '…' : '') : '**作れない**'));
}

if (blank > 0) {
  console.error('\n✗ 空白地帯がある。判定表に穴。');
  process.exit(1);
}
const unreachable = ORDER.filter((k) => seasonsFor[k].length === 0);
if (unreachable.length) {
  console.error(`\n✗ どの季節でも作れないキャラ: ${unreachable.join(', ')}`);
  process.exit(1);
}
console.log('\n✓ 空白地帯なし・9種すべて到達可能');
