// canvas が自分の大きさを自分で決めてしまわない、という約束。
//
// ★問題（実機で再現）: 画面を横長から縦長へ変えると、庭も丘も画面の下に押し出され、
//   子だけが空に浮いた。canvas の箱の高さが 644px であるべきところ 2021px になっていた。
//
// ★原因: `<canvas>` は width/height **属性**から固有の縦横比を持つ置換要素なので、
//   CSS で高さを与えないと、幅から比で高さが決まる。
//   `fitCanvas()` は逆に「測った箱」から属性を書くので、両者が互いを参照する環になる。
//
//     箱の高さ = 箱の幅 × (属性の高さ / 属性の幅)
//     属性     = 箱 × dpr
//
//   代入すると恒等式になり、**どの高さでも釣り合ってしまう。**
//   だから resize を何度発火させても正しい高さに戻らない（実測: 5回発火して 2021px のまま）。
//   リロードするまで直らない。スマホの画面回転と、iOS Safari の URL バーの出入りで踏む。
//
// ★直し方: 高さを canvas 自身に決めさせない。flex 項目として
//   `flex-basis: 0`（中身から基準を取らない）と `min-height: 0`（自動最小値を切る）を置く。
//
// CSS は node からは評価できないので、ここでは「その2つが宣言されていること」を見張る。
// 実装の写しに見えるが、見張っているのは書き方ではなく**環を作らない**という一点で、
// 壊れても画面を縦横に変えるまで誰も気づけない種類の欠陥なので、機械に見せておく。
//
//   node --test

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const css = await readFile(new URL('../style.css', import.meta.url), 'utf8');

/** セレクタの宣言ブロックを取り出す（改行・空白の入れ方に依らない）。 */
function ruleFor(selector) {
  const m = css.match(new RegExp(`(^|[},])\\s*${selector}\\s*\\{([^}]*)\\}`, 'm'));
  assert.ok(m, `style.css に ${selector} の規則が無い`);
  return m[2];
}

const decl = (block, prop) => {
  const m = block.match(new RegExp(`(?:^|;)\\s*${prop}\\s*:\\s*([^;]+)`));
  return m ? m[1].trim() : null;
};

test('★canvas の高さは canvas 自身の縦横比から決まらない', () => {
  const stage = ruleFor('#stage');

  const basis = decl(stage, 'flex-basis') ?? (decl(stage, 'flex') || '').split(/\s+/)[2];
  assert.ok(basis && parseFloat(basis) === 0,
    `#stage の flex-basis が ${basis ?? '未指定'}。中身（属性の縦横比）から高さを取ってしまう`);

  const minH = decl(stage, 'min-height');
  assert.equal(minH, '0',
    `#stage に min-height:0 が無い（いま ${minH ?? '未指定'}）。` +
    'flex の自動最小値が効いて、はみ出した高さを縮められない');
});

test('canvas は幅いっぱいに広がり、伸びも縮みもする', () => {
  const stage = ruleFor('#stage');
  const flex = decl(stage, 'flex') || '';
  const [grow, shrink] = flex.split(/\s+/);
  assert.ok(parseFloat(grow) > 0, '空いた高さを canvas が受け取らない');
  assert.ok(shrink === undefined || parseFloat(shrink) > 0, 'canvas が縮めない');
  assert.equal(decl(stage, 'width'), '100%');
});

test('つまみの帯は縮まない（canvas に押し潰されると操作できなくなる）', () => {
  const panel = ruleFor('#panel');
  const flex = decl(panel, 'flex') || '';
  const [grow, shrink] = flex.split(/\s+/);
  assert.equal(parseFloat(grow), 0, 'つまみの帯が伸びると庭が痩せる');
  assert.equal(parseFloat(shrink), 0, 'つまみの帯が縮むとつまみが押し潰される');
});
