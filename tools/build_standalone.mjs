// スマホで見せるための単体HTMLを作る。
// 画像も含めて全部1枚に畳むので、サーバ無しで開ける。
//
//   node tools/build_standalone.mjs
//
// ★元のソースは一切変えない。ここで文字列置換して差し込むだけ。
//   ゲーム本体は複数ファイル + 20MB のアトラスなので、そのままでは配れない。

import { readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import * as esbuild from 'esbuild';

const require = createRequire(import.meta.url);
const sharp = require('sharp');

const ROOT = new URL('..', import.meta.url).pathname;
const SPRITE_SCALE = 0.75;      // 192x208 のセルが 144x156 になる
const SPRITE_Q = 68;
const BG_Q = 78;

const dataURI = (buf, mime) => `data:${mime};base64,${buf.toString('base64')}`;
const MB = (n) => (n / 1024 / 1024).toFixed(2) + 'MB';

/** 元のソースを壊さないよう、置換できたことを必ず確かめる */
function must(text, from, to, label) {
  if (!text.includes(from)) throw new Error(`置換対象が見つからない: ${label}\n  ${from}`);
  return text.split(from).join(to);
}

const spriteMetrics = JSON.parse(await readFile(ROOT + 'js/sprite-metrics.json', 'utf8'));
const bgMetrics = JSON.parse(await readFile(ROOT + 'js/bg-metrics.json', 'utf8'));

/** アトラスを縮めるなら、セル座標も同じ倍率で縮める。
 *  ここを忘れると描画元の矩形がはみ出して、隣のコマまで一緒に写る。 */
function scaleSpriteMetrics(m, s) {
  const px = (n) => Math.round(n * s);
  const scaleBBox = (bbox) => bbox && Object.fromEntries(
    Object.entries(bbox).map(([key, value]) => [key, px(value)]),
  );
  const pets = {};
  for (const [id, pet] of Object.entries(m.pets)) {
    const rows = {};
    for (const [row, frames] of Object.entries(pet.rows)) {
      rows[row] = frames.map(scaleBBox);
    }
    pets[id] = {
      ground: px(pet.ground),
      idleHeight: px(pet.idleHeight),
      idleWidth: px(pet.idleWidth),
      rows,
    };
  }
  return { cell: { w: px(m.cell.w), h: px(m.cell.h) }, rows: m.rows, pets };
}

// --- アトラスを縮めて data URI に ---
const petIds = Object.keys(spriteMetrics.pets);
const sprites = {};
let spriteBytes = 0;
for (const id of petIds) {
  const buf = await sharp(`${ROOT}assets/sprites/${id}.webp`)
    .resize(Math.round(1536 * SPRITE_SCALE), Math.round(2288 * SPRITE_SCALE))
    .webp({ quality: SPRITE_Q })
    .toBuffer();
  spriteBytes += buf.length;
  sprites[id] = dataURI(buf, 'image/webp');
}
console.log(`アトラス ${petIds.length}体  ${MB(spriteBytes)}  (${SPRITE_SCALE}倍 q${SPRITE_Q})`);

// --- 背景も同様に。metrics の src を data URI で置き換える ---
let bgBytes = 0;
const bgOut = structuredClone(bgMetrics);
for (const [key, meta] of Object.entries(bgMetrics)) {
  const buf = await sharp(ROOT + meta.src).webp({ quality: BG_Q }).toBuffer();
  bgBytes += buf.length;
  bgOut[key].src = dataURI(buf, 'image/webp');
}
console.log(`背景 ${Object.keys(bgMetrics).length}枚  ${MB(bgBytes)}`);

// --- JS を1本に束ねる ---
const bundled = await esbuild.build({
  entryPoints: [ROOT + 'js/game.js'],
  bundle: true, format: 'iife', write: false, target: 'es2022',
});
let js = bundled.outputFiles[0].text;

// スプライトの読み込み先を data URI に差し替える
js = must(js,
  'const metrics = await fetch("js/sprite-metrics.json").then((r) => r.json());',
  'const metrics = __SPRITE_METRICS__;',
  'sprite-metrics の取得');
js = must(js,
  'im.src = `assets/sprites/${id}.webp`;',
  'im.src = __SPRITES__[id];',
  'アトラスのsrc');
js = must(js,
  'bgm = await fetch("js/bg-metrics.json").then((r) => r.json());',
  'bgm = __BG_METRICS__;',
  'bg-metrics の取得');

const head = `const __SPRITE_METRICS__ = ${JSON.stringify(scaleSpriteMetrics(spriteMetrics, SPRITE_SCALE))};
const __BG_METRICS__ = ${JSON.stringify(bgOut)};
const __SPRITES__ = ${JSON.stringify(sprites)};
`;

// --- HTML を組む ---
const html = await readFile(ROOT + 'index.html', 'utf8');
const css = await readFile(ROOT + 'style.css', 'utf8');

let out = html;
out = must(out, '<link rel="stylesheet" href="style.css">', `<style>\n${css}\n</style>`, 'CSSの差し込み');
out = must(out, '<script type="module" src="js/game.js"></script>',
  `<script>\n${head}\n${js}\n</script>`, 'JSの差し込み');

// 単体で開くので、外部を一切参照していないことを確かめる
for (const bad of ['src="js/', 'href="style', 'fetch("js/', 'fetch(\'js/']) {
  if (out.includes(bad)) throw new Error(`外部参照が残っている: ${bad}`);
}

const dest = ROOT + 'dist/soranomeguri.html';
await writeFile(dest, out);
console.log(`\n→ ${dest}  ${MB(Buffer.byteLength(out))}`);
if (Buffer.byteLength(out) > 15 * 1024 * 1024) {
  console.error('⚠ 16MBの上限に近い。SPRITE_SCALE か品質を下げること');
  process.exit(1);
}
