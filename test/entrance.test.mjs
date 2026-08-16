// 登場演出を天気ごとに変える、という約束（骨格v2 の9節の2番目）。
//
// ★問題: 演出を集中させる4か所のうちの1つなのに、10体とも同じ出方をしていた。
//   企画は「晴は光の中から歩いてくる／雨は水たまりから／雪は舞い降りる／
//   雷は閃光と同時／虹は虹を渡って／霧は輪郭が濃くなって現れる／
//   ダイヤは音もなく座っている」と書き分けている。**絵は1枚も増やさなくてよい。**
//
// ★ここでも関係の側を書く。「天気ごとに違う」だけを約束にすると、
//   秒数を 0.01 ずつずらすだけで満たせてしまう。**速い側と遅い側が何であるべきか**を書く。
//
//   node --test

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ENTRANCE, entranceOf } from '../js/arrival.js';
import { ROWS } from '../js/sprites.js';
import { WEATHERS } from '../js/weather.js';

test('★10体すべてに登場演出がある（無い子は他と同じ出方になる）', () => {
  const missing = WEATHERS.filter((w) => !ENTRANCE[w]);
  assert.deepEqual(missing, [], `登場演出が無い: ${missing.join('・')}`);
});

test('演出に使う行は、アトラスに実在する行だけ', () => {
  for (const [w, e] of Object.entries(ENTRANCE)) {
    assert.ok(e.row in ROWS, `${w} が使う行 "${e.row}" はアトラスに無い`);
  }
});

test('★出方は一様ではない（行と間の両方で分かれている）', () => {
  const rows = new Set(Object.values(ENTRANCE).map((e) => e.row));
  assert.ok(rows.size >= 3, `使っている行が ${rows.size} 種類。演技が分かれていない`);
  const secs = new Set(Object.values(ENTRANCE).map((e) => e.secs));
  assert.ok(secs.size >= 3, `長さが ${secs.size} 種類。間が分かれていない`);
});

test('★雷は一番ぱっと現れ、ダイヤモンドダストは一番ゆっくり現れる', () => {
  // 「閃光と同時」と「音もなく座っている」。ここが逆だと企画の書き分けが死ぬ
  const fades = Object.entries(ENTRANCE).map(([w, e]) => [w, e.fade]);
  const fastest = fades.reduce((a, b) => (b[1] < a[1] ? b : a));
  const slowest = fades.reduce((a, b) => (b[1] > a[1] ? b : a));
  assert.equal(fastest[0], 'thunder', `一番速いのが ${fastest[0]}。雷は閃光と同時に現れる`);
  assert.equal(slowest[0], 'diamonddust', `一番遅いのが ${slowest[0]}。ダイヤは音もなく座っている`);
});

test('★動いて現れる子と、その場に現れる子がいる', () => {
  const moving = WEATHERS.filter((w) => ENTRANCE[w].row.startsWith('running'));
  const still = WEATHERS.filter((w) => ENTRANCE[w].row === 'idle' || ENTRANCE[w].row === 'waiting');
  assert.ok(moving.length >= 2, '歩いて／駆けて現れる子がいない');
  assert.ok(still.length >= 2, 'その場に立ち現れる子がいない');
  assert.ok(moving.includes('rainbow'), '虹の子は虹を渡って来る');
  assert.ok(still.includes('fog'), '霧の子は輪郭が濃くなって現れる');
  assert.ok(still.includes('diamonddust'), 'ダイヤの子は音もなく座っている');
});

test('にじみ出る時間は、演出そのものより長くならない', () => {
  for (const [w, e] of Object.entries(ENTRANCE)) {
    assert.ok(e.fade > 0, `${w}: にじみ出る時間が0だと、ぱっと湧いたように見える`);
    assert.ok(e.fade <= e.secs, `${w}: 演出(${e.secs}秒)より にじみ(${e.fade}秒)が長い`);
    assert.ok(e.secs > 0 && e.secs <= 4, `${w}: 演出 ${e.secs}秒 は待たせすぎ`);
  }
});

test('知らない天気を渡されても落ちない', () => {
  const e = entranceOf('typhoon');
  assert.ok(e && e.row in ROWS && e.secs > 0, '未知の天気で登場演出が壊れる');
});
