// 直した版がちゃんと届く、という約束。
//
// ★問題（実機で踏んだ）: service worker を cache-first にしたら、
//   **コードを直しても古い版が配られ続けた。** 手元で直したはずの修正が画面に出ず、
//   キャッシュを手で消すまで直らなかった。
//
//   install は `sw.js` 自身が変わった時にしか走らないので、`js/*.js` をいくら直しても
//   先読み済みの古い中身が返る。**キャッシュ名に版を持つ仕掛けはあるが、
//   版を上げるのは人間の仕事なので、上げ忘れれば永遠に古い版が配られる。**
//
// ★これは黙って壊れる種類の欠陥。プレイヤー側からは「更新されないゲーム」に見えるだけで、
//   こちらには何も届かない。**人間の規律に頼らない形にする。**
//
// ★直し方: 置き場を用途で分ける。
//   - **コード**（html / css / js / json / webmanifest）は **network-first**。
//     オンラインなら必ず新しい物を取り、落ちたらキャッシュに逃げる。合計100KB程度。
//   - **絵**（webp / png）は **cache-first**。25MBあり、内容が変わらない。
//   これで「常に新しく、かつオフラインでも開ける」が両立する。
//
//   node --test

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const sw = await readFile(new URL('../sw.js', import.meta.url), 'utf8');

const precache = (() => {
  const m = sw.match(/PRECACHE\s*=\s*\[([\s\S]*?)\]/);
  assert.ok(m, 'sw.js に PRECACHE の配列が無い');
  return [...m[1].matchAll(/['"`]([^'"`]+)['"`]/g)].map((x) => x[1].replace(/^\.\//, ''));
})();

/** コードと絵を見分ける規則。sw.js が持っているものを取り出す。 */
const codeRe = (() => {
  const m = sw.match(/CODE\s*=\s*\/(.+?)\/([a-z]*)/);
  assert.ok(m, 'sw.js に、コードと絵を見分ける CODE の正規表現が無い');
  return new RegExp(m[1], m[2]);
})();

test('★コードは全部「常に新しい方」に分類される', () => {
  const code = precache.filter((p) => /\.(html|css|js|json|webmanifest)$/.test(p));
  assert.ok(code.length >= 10, '数え漏れ（配列の取り出しが壊れている）');
  const missed = code.filter((p) => !codeRe.test(p));
  assert.deepEqual(missed, [],
    `この物たちは古いまま配られ続ける:\n  ${missed.join('\n  ')}`);
});

test('★絵は「常に新しい方」に入れない（毎回25MB取りに行くことになる）', () => {
  const art = precache.filter((p) => /\.(webp|png)$/.test(p));
  assert.ok(art.length >= 13, '数え漏れ');
  const wrong = art.filter((p) => codeRe.test(p));
  assert.deepEqual(wrong, [], `絵が毎回取り直される: ${wrong.join(', ')}`);
});

test('★コードは網が無ければキャッシュに逃げる（オフラインで開けなくなっては本末転倒）', () => {
  // network-first の要点は、取りに行って失敗した時に必ず受け皿があること
  assert.match(sw, /\.catch\s*\(/, '取りに行って失敗した時の受け皿が無い');
  assert.match(sw, /caches\.match/, 'キャッシュへ逃げる道が無い');
});

test('取ってきた新しい物は置き場を更新する（次はオフラインでも新しい）', () => {
  assert.match(sw, /\.put\s*\(/, '取ってきた物をキャッシュに書き戻していない');
});

test('版が変わったら古い置き場を捨てる（分け方を変えた時に残骸が残らない）', () => {
  assert.match(sw, /caches\.keys\(\)/);
  assert.match(sw, /caches\.delete/);
});

test('めぐりの記録を配るキャッシュは v3', () => {
  assert.match(sw, /CACHE\s*=\s*['"]soranomeguri-v3['"]/);
});

// ★実機で踏んだ（2026-08-16）: 「/」（拡張子なしのトップページ）は上の CODE 正規表現に
//   マッチしない。URLを叩いて開く・PWAのホーム画面アイコンから開く、どちらのナビゲーション
//   も拡張子の無いリクエストとして来るので、一度キャッシュされると index.html だけが
//   古いまま配られ続ける——このテストが確認する分岐（PRECACHEの拡張子）は素通りしていた。
test('★拡張子の無いナビゲーション（「/」で開く）も常に新しい方を取りに行く', () => {
  assert.match(
    sw,
    /request\.mode\s*===\s*['"]navigate['"]/,
    '拡張子の無いページ読み込み（トップページを直接開く）が network-first の判定に入っていない',
  );
});
