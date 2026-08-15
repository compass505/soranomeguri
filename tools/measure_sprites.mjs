// アトラスを実測して js/sprite-metrics.json を吐く。
// アトラスを作り直したら必ず走らせる。手で数字を書かない。
//
//   node tools/measure_sprites.mjs
//
// 測るのは「足元Y」だけ。体の大きさは正規化しない——
// カワウソが低くて長い / ウサギが高くて細いのは実際の体型であって、
// 揃えると生き物としての違いが消える。
// 足元だけは揃える必要がある（セル内で171〜203pxとばらつき、そのまま描くと浮く・沈む）。

import { readFile, writeFile, readdir } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';

const require = createRequire(import.meta.url);
const sharp = (() => {
  try { return require('sharp'); } catch { return null; }
})();

const SPRITES = new URL('../assets/sprites/', import.meta.url);
const CW = 192, CH = 208;

// hatch-pet の compose_atlas.py ROW_SPECS + compose_11row.py が足す look 2行。
// ★推測ではなくスキル本体の定義。行がずれると「跳躍」を「ぶれ」と読み違える。
export const ROW_SPECS = [
  ['idle', 6], ['running-right', 8], ['running-left', 8], ['waving', 4],
  ['jumping', 5], ['failed', 8], ['waiting', 6], ['running', 6], ['review', 6],
  ['look-a', 8], ['look-b', 8],
];

function median(xs) {
  const s = [...xs].sort((a, b) => a - b);
  return s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2;
}

/** セルの不透明領域の bbox。無ければ null。 */
function bbox(alpha, w, x0, y0) {
  let minX = 1e9, minY = 1e9, maxX = -1, maxY = -1;
  for (let y = 0; y < CH; y++) {
    for (let x = 0; x < CW; x++) {
      if (alpha[(y0 + y) * w + (x0 + x)] > 32) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  return maxX < 0 ? null : { x0: minX, y0: minY, x1: maxX + 1, y1: maxY + 1 };
}

async function main() {
  if (!sharp) {
    console.error('sharp が必要です:  npm i sharp');
    process.exit(1);
  }
  const files = (await readdir(SPRITES)).filter((f) => f.endsWith('.webp')).sort();
  const out = { cell: { w: CW, h: CH }, rows: ROW_SPECS, pets: {} };

  for (const file of files) {
    const id = path.basename(file, '.webp');
    const img = sharp(new URL(file, SPRITES).pathname).ensureAlpha();
    const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
    const w = info.width, ch = info.channels;
    const alpha = new Uint8Array(info.width * info.height);
    for (let i = 0; i < alpha.length; i++) alpha[i] = data[i * ch + ch - 1];

    const rows = {};
    let idleFeet = [];
    for (let r = 0; r < ROW_SPECS.length; r++) {
      const [name, count] = ROW_SPECS[r];
      const frames = [];
      for (let c = 0; c < count; c++) {
        const b = bbox(alpha, w, c * CW, r * CH);
        frames.push(b);
        if (name === 'idle' && b) idleFeet.push(b.y1);
      }
      rows[name] = frames;
    }
    // 足元の基準は idle 行の中央値。跳躍や伏せの足元は素直に外れてよい（それが演技）
    const ground = median(idleFeet);
    const idle = rows.idle.filter(Boolean);
    out.pets[id] = {
      ground,
      idleHeight: median(idle.map((b) => b.y1 - b.y0)),
      idleWidth: median(idle.map((b) => b.x1 - b.x0)),
      rows,
    };
    console.log(`${id.padEnd(18)} ground=${ground}  idle ${median(idle.map((b) => b.x1 - b.x0))}x${median(idle.map((b) => b.y1 - b.y0))}`);
  }

  const dest = new URL('../js/sprite-metrics.json', import.meta.url);
  await writeFile(dest, JSON.stringify(out));
  console.log(`\n→ ${dest.pathname} (${files.length} 体)`);
}

main();
