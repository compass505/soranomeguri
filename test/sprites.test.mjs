// スプライトの切り出しの約束。
//
// ★問題: セル寸法（192x208）が js/sprites.js に直書きされていた。
//   スマホ配布用にアトラスを0.75倍（セル144x156）に縮めた版を作ったところ、
//   コードは192x208で切り出し続けたため **1.33セル分を掴んで隣のコマまで描き**、
//   画面に頭が2つ出た。
//
// ★セル寸法は sprite-metrics.json に最初から入っていた。使っていなかっただけ。
//   **同じ数字が2箇所にあると、片方だけ変えたときに静かに壊れる。**

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SpriteBank, ROWS } from '../js/sprites.js';

/** drawImage の引数を記録するだけの偽 ctx */
function fakeCtx() {
  const calls = [];
  return {
    calls,
    save() {}, restore() {}, translate() {}, scale() {},
    drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh) {
      calls.push({ sx, sy, sw, sh, dx, dy, dw, dh });
    },
  };
}

/** 指定したセル寸法の metrics を組み立てる */
function metricsFor(cw, ch) {
  const rows = [['idle', 6], ['running-right', 8], ['running-left', 8], ['waving', 4],
                ['jumping', 5], ['failed', 8], ['waiting', 6], ['running', 6],
                ['review', 6], ['look-a', 8], ['look-b', 8]];
  return {
    cell: { w: cw, h: ch },
    rows,
    pets: { 'test-pet': { ground: ch * 0.9, idleHeight: ch * 0.8, idleWidth: cw * 0.9, rows: {} } },
  };
}

function bankWith(cw, ch) {
  const bank = new SpriteBank(metricsFor(cw, ch));
  bank.img['test-pet'] = { width: cw * 8, height: ch * 11 };   // 画像の実体は使わない
  return bank;
}

test('★切り出す寸法は metrics のセル寸法に一致する（原寸）', () => {
  const ctx = fakeCtx();
  bankWith(192, 208).draw(ctx, 'test-pet', 'idle', 0, 100, 300);
  const c = ctx.calls.at(-1);
  assert.equal(c.sw, 192, '切り出し幅がセル幅と違う');
  assert.equal(c.sh, 208, '切り出し高さがセル高さと違う');
});

test('★アトラスを縮めても、切り出しはセル寸法に追随する（頭が2つ出た回帰）', () => {
  const ctx = fakeCtx();
  bankWith(144, 156).draw(ctx, 'test-pet', 'idle', 0, 100, 300);
  const c = ctx.calls.at(-1);
  assert.equal(c.sw, 144,
    `縮小版で切り出し幅が ${c.sw}。セル幅144を超えると隣のコマまで描いてしまう`);
  assert.equal(c.sh, 156, `縮小版で切り出し高さが ${c.sh}`);
});

test('★コマ番号が変わると、切り出し位置がちょうどセル1つ分ずれる', () => {
  for (const [cw, ch] of [[192, 208], [144, 156]]) {
    const ctx = fakeCtx();
    const bank = bankWith(cw, ch);
    bank.draw(ctx, 'test-pet', 'idle', 0, 100, 300);
    bank.draw(ctx, 'test-pet', 'idle', 1, 100, 300);
    assert.equal(ctx.calls[1].sx - ctx.calls[0].sx, cw,
      `セル${cw}x${ch}: コマ送りの幅が ${ctx.calls[1].sx - ctx.calls[0].sx} でセル幅と違う`);
  }
});

test('★行が変わると、切り出し位置がちょうど行1つ分ずれる', () => {
  for (const [cw, ch] of [[192, 208], [144, 156]]) {
    const ctx = fakeCtx();
    const bank = bankWith(cw, ch);
    bank.draw(ctx, 'test-pet', 'idle', 0, 100, 300);
    bank.draw(ctx, 'test-pet', 'waving', 0, 100, 300);
    assert.equal(ctx.calls[1].sy - ctx.calls[0].sy, ch * ROWS.waving,
      `セル${cw}x${ch}: 行送りが合わない`);
  }
});

test('★切り出しがアトラスの外へはみ出さない', () => {
  for (const [cw, ch] of [[192, 208], [144, 156]]) {
    const bank = bankWith(cw, ch);
    for (const [row, count] of bank.metrics.rows) {
      const ctx = fakeCtx();
      for (let f = 0; f < count; f++) bank.draw(ctx, 'test-pet', row, f, 100, 300);
      for (const c of ctx.calls) {
        assert.ok(c.sx >= 0 && c.sx + c.sw <= cw * 8, `${row}: 横にはみ出す`);
        assert.ok(c.sy >= 0 && c.sy + c.sh <= ch * 11, `${row}: 縦にはみ出す`);
      }
    }
  }
});

test('16方向の視線も同じセル寸法で切り出す', () => {
  const ctx = fakeCtx();
  const bank = bankWith(144, 156);
  for (let yaw = 0; yaw < 360; yaw += 22.5) bank.drawGaze(ctx, 'test-pet', yaw, 100, 300);
  assert.equal(ctx.calls.length, 16);
  for (const c of ctx.calls) {
    assert.equal(c.sw, 144);
    assert.equal(c.sh, 156);
  }
});
