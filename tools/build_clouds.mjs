// 生成PNGの透明余白を実測で落とし、描画時に余白ぶんの拡大縮小が混ざらない素材へ揃える。
// 元PNGは再生成時の検証に残し、ゲームが読むWebPだけを雲そのものの境界にする。
//
//   npm run clouds


import { writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const sharp = require('sharp');

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const CLOUDS = path.join(ROOT, 'assets/clouds');
const SPRITES = [
  ['cumulus_a', 'cumulus'],
  ['cumulus_b', 'cumulus'],
  ['cumulus_c', 'cumulus'],
  ['cirrus_a', 'cirrus'],
  ['stratocumulus_a', 'stratocumulus'],
  ['stratus_a', 'stratus'],
  ['cumulonimbus_a', 'cumulonimbus'],
  ['fractus_a', 'fractus'],
];

const manifest = [];

for (const [id, kind] of SPRITES) {
  const png = path.join(CLOUDS, `${id}.png`);
  const webp = path.join(CLOUDS, `${id}.webp`);
  const metadata = await sharp(png).metadata();

  // アルファ無しや全不透明を通すと空の矩形がゲーム内の空を覆うため、変換前に止める。
  if (!metadata.hasAlpha) throw new Error(`${id}: PNGにアルファチャンネルがありません`);
  const { data: pixels, info: sourceInfo } = await sharp(png)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  let transparentPixels = 0;
  for (let i = 3; i < pixels.length; i += sourceInfo.channels) {
    if (pixels[i] < 10) transparentPixels++;
  }
  if (transparentPixels === 0) throw new Error(`${id}: 透明領域がありません`);

  const { data, info } = await sharp(png)
    .trim()
    .png()
    .toBuffer({ resolveWithObject: true });

  // 雲の薄い縁をWebPの色圧縮から独立させ、半透明の筆致を保つ。
  await sharp(data)
    .webp({ quality: 88, alphaQuality: 100 })
    .toFile(webp);

  manifest.push({
    id,
    src: `assets/clouds/${id}.webp`,
    w: info.width,
    h: info.height,
    kind,
  });
  console.log(`${id.padEnd(18)} ${info.width}x${info.height}`);
}

const dest = path.join(CLOUDS, 'clouds.json');
await writeFile(dest, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`\n→ ${dest}`);
