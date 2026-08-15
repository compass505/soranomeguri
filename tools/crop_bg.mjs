// 背景レイヤーの余白（無地のクリーム地）を実測して切り落とし、js/bg-metrics.json を吐く。
// ★スライス比を目分量で書くと余白が画面に出る（実際に出た）。画像から測る。
//
//   node tools/crop_bg.mjs

import { createRequire } from 'node:module';
import { writeFile } from 'node:fs/promises';

const require = createRequire(import.meta.url);
const sharp = require('sharp');

const BG = new URL('../assets/bg/', import.meta.url);
const FILES = ['bg_ground_green.png', 'bg_ground_snow.png', 'bg_hills.png'];

/** 上から見ていって「無地でなくなる」最初の行を返す。 */
function firstContentRow(data, w, h, ch) {
  // 基準色は最上行の中央付近
  const at = (x, y) => {
    const i = (y * w + x) * ch;
    return [data[i], data[i + 1], data[i + 2]];
  };
  const base = at(Math.floor(w / 2), 2);
  const far = (c) => Math.abs(c[0] - base[0]) + Math.abs(c[1] - base[1]) + Math.abs(c[2] - base[2]);

  for (let y = 0; y < h; y++) {
    let hits = 0;
    for (let x = 0; x < w; x += 4) if (far(at(x, y)) > 24) hits++;
    if (hits > w / 4 / 24) return y;      // 行の4%以上が無地から外れたら、そこが content
  }
  return 0;
}

/**
 * 上端から繋がっている無地のクリームを透明にする。
 * ★丘のレイヤーは峰と峰の「あいだの空」までクリームで塗り潰されていて、
 *   そのまま重ねると空のグラデーションを覆い隠す（実際に隠れた）。
 *   単純な色キーではなく上端からの塗りつぶしにするのは、
 *   絵の内側にたまたま同じ色があっても消さないため。
 */
function keyOutSky(rgba, w, h) {
  const at = (i) => [rgba[i * 4], rgba[i * 4 + 1], rgba[i * 4 + 2]];
  const base = at(Math.floor(w / 2));
  const near = (i) => {
    const c = at(i);
    return Math.abs(c[0] - base[0]) + Math.abs(c[1] - base[1]) + Math.abs(c[2] - base[2]) < 38;
  };
  const seen = new Uint8Array(w * h);
  const stack = [];
  for (let x = 0; x < w; x++) if (near(x)) { stack.push(x); seen[x] = 1; }
  while (stack.length) {
    const i = stack.pop();
    rgba[i * 4 + 3] = 0;
    const x = i % w, y = (i / w) | 0;
    const push = (nx, ny) => {
      if (nx < 0 || ny < 0 || nx >= w || ny >= h) return;
      const j = ny * w + nx;
      if (!seen[j] && near(j)) { seen[j] = 1; stack.push(j); }
    };
    push(x - 1, y); push(x + 1, y); push(x, y - 1); push(x, y + 1);
  }
  // 境界を1pxだけ和らげる（ジャギーが目立つため）
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      if (rgba[i * 4 + 3] !== 0) continue;
      let solid = 0;
      for (const j of [i - 1, i + 1, i - w, i + w]) if (rgba[j * 4 + 3] > 200) solid++;
      if (solid >= 2) rgba[i * 4 + 3] = 90;
    }
  }
}

const out = {};
for (const f of FILES) {
  const src = new URL(f, BG).pathname;
  const img = sharp(src);
  const meta = await img.metadata();
  const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
  const top = firstContentRow(data, info.width, info.height, info.channels);
  const dst = src.replace(/\.png$/, '_c.png');

  // ★塗りつぶしは切り抜き「前」に行う。切り抜き後は最上行がもう絵なので、
  //   基準色を取り違えて絵そのものを消してしまう（雪地面が65%消えた）。
  const full = await sharp(src).ensureAlpha().raw()
    .toBuffer({ resolveWithObject: true });
  keyOutSky(full.data, full.info.width, full.info.height);
  await sharp(full.data, {
    raw: { width: full.info.width, height: full.info.height, channels: 4 },
  })
    .extract({ left: 0, top, width: meta.width, height: meta.height - top })
    .png().toFile(dst);
  out[f.replace(/\.png$/, '')] = {
    src: `assets/bg/${f.replace(/\.png$/, '_c.png')}`,
    top, width: meta.width, height: meta.height - top,
    topRatio: +(top / meta.height).toFixed(4),
  };
  console.log(`${f.padEnd(22)} 余白 ${top}px (${((top / meta.height) * 100).toFixed(1)}%) → ${meta.width}x${meta.height - top}`);
}

await writeFile(new URL('../js/bg-metrics.json', import.meta.url), JSON.stringify(out, null, 1));
console.log('\n→ js/bg-metrics.json');
