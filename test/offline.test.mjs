// 手元から消えても取り返せる、の続き — 端末側で消えないようにする約束。
//
// ★なぜ要るか: 保存は localStorage で、iOS Safari は7日開かないと消す。
//   このゲームの資産は懐き具合と初対面の記録なので、消えると一番大事なものが消える。
//   ホーム画面に追加された PWA だけがその削除の対象外になるので、manifest が要る。
//
// ★配る物の取りこぼしは一度やっている: `js/*-metrics.json` と `assets/bg/*_c.png` を
//   「tools/ で作り直せる生成物」として .gitignore に入れていたが、**実行時に fetch していた。**
//   手元では tools/ を一度走らせれば揃うので、ローカルで動く限りこの穴は見えない。
//   **判断軸は「作り直せるか」ではなく「配る物に要るか」。**
//   同じ間違いを service worker の先読み一覧でもう一度やらないよう、機械に数えさせる。
//
//   node --test

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';

const root = new URL('../', import.meta.url);
const read = (p) => readFile(new URL(p, root), 'utf8');
const list = (p) => readdir(new URL(p, root));

const sw = await read('sw.js');
const manifest = JSON.parse(await read('manifest.webmanifest'));

/** service worker の先読み一覧。配列リテラルから素直に拾う。 */
const precache = (() => {
  const m = sw.match(/PRECACHE\s*=\s*\[([\s\S]*?)\]/);
  assert.ok(m, 'sw.js に PRECACHE の配列が無い');
  return [...m[1].matchAll(/['"`]([^'"`]+)['"`]/g)].map((x) => x[1]);
})();

// ---------------------------------------------------------------- manifest

test('★ホーム画面に追加できる形になっている（これが7日削除の唯一の逃げ道）', () => {
  assert.equal(manifest.display, 'standalone', 'standalone でないとブラウザ扱いのまま');
  assert.ok(manifest.name && manifest.short_name, '名前が無いとホーム画面に置けない');
  assert.ok(Array.isArray(manifest.icons) && manifest.icons.length >= 1, 'アイコンが無い');
  for (const ic of manifest.icons) {
    assert.ok(existsSync(new URL(ic.src, root)), `アイコンの実体が無い: ${ic.src}`);
  }
});

test('manifest の入口と scope は相対（GitHub Pages のサブパスでも開ける）', () => {
  for (const k of ['start_url', 'scope']) {
    assert.ok(manifest[k], `manifest に ${k} が無い`);
    assert.ok(!manifest[k].startsWith('/'),
      `${k} が "${manifest[k]}"。絶対パスだと compass505.github.io/soranomeguri/ で外れる`);
  }
});

test('index.html が manifest と service worker を繋いでいる', async () => {
  const html = await read('index.html');
  assert.match(html, /rel=["']manifest["']/, 'manifest への link が無い');
  assert.match(html, /serviceWorker/, 'service worker を登録していない');
});

// ---------------------------------------------------------------- 先読み一覧

test('★実行時に読む物が、ひとつ残らず先読み一覧に入っている', async () => {
  const need = ['index.html', 'style.css', 'manifest.webmanifest'];

  for (const f of await list('js')) {
    if (f.endsWith('.js') || f.endsWith('.json')) need.push(`js/${f}`);
  }
  for (const f of await list('assets/sprites')) {
    if (f.endsWith('.webp')) need.push(`assets/sprites/${f}`);
  }
  // 背景は切り落とした版だけを読む。どれを読むかは bg-metrics.json が持っている
  const bgm = JSON.parse(await read('js/bg-metrics.json'));
  for (const v of Object.values(bgm)) need.push(v.src);
  // 雲も同じ形。原寸PNGは配らず、clouds.json が指す webp だけを読む
  const clouds = JSON.parse(await read('assets/clouds/clouds.json'));
  need.push('assets/clouds/clouds.json');
  for (const v of clouds) need.push(v.src);

  const have = new Set(precache.map((p) => p.replace(/^\.\//, '')));
  const missing = need.filter((p) => !have.has(p));
  assert.deepEqual(missing, [],
    `先読みから漏れている。電波が無いと読めず、庭も空も出ない:\n  ${missing.join('\n  ')}`);
});

test('先読み一覧に、実体の無い物が混ざっていない', () => {
  const dead = precache.filter((p) => !existsSync(new URL(p.replace(/^\.\//, ''), root)));
  assert.deepEqual(dead, [], `実体が無い: ${dead.join(', ')}`);
});

test('先読みは相対パス（サブパス配信でも外れない）', () => {
  const abs = precache.filter((p) => p.startsWith('/') || /^https?:/.test(p));
  assert.deepEqual(abs, [], `絶対パスが混ざっている: ${abs.join(', ')}`);
});

test('版が変わったら古い置き場を捨てる仕掛けがある', () => {
  // これが無いと、直した後もいつまでも古い js が配られる
  assert.match(sw, /caches\.keys\(\)/, '古いキャッシュを消していない');
  assert.match(sw, /CACHE\s*=\s*['"`][^'"`]+['"`]/, 'キャッシュ名に版が無い');
});
