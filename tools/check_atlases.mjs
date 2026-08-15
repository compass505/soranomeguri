// アトラスをセルごとに走査し、セル境界をまたいで切断されたコマを検出する。
//
//   npm run check:atlas
//
// 列ごとの不透明画素数を見て、7列以上の空白で塊を分ける。
// 小さな装飾の分離は除外するが、セル端近くに残った小片は
// 「隣のセルへはみ出した切断片」の可能性が高いため検出対象にする。

import { readdir } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';

const require = createRequire(import.meta.url);
const sharp = (() => {
  try { return require('sharp'); } catch { return null; }
})();

const SPRITES = new URL('../assets/sprites/', import.meta.url);
const CW = 192;
const CH = 208;
const COLS = 8;
const ALPHA_THRESHOLD = 32;
const GAP_COLUMNS = 7;
const MIN_CHUNK_RATIO = 0.05;
const EDGE_FRAGMENT_PX = 24;

// compose_atlas.py の9行に、compose_11row.py の look 2行を加えた仕様。
const ROW_SPECS = [
  ['idle', 6], ['running-right', 8], ['running-left', 8], ['waving', 4],
  ['jumping', 5], ['failed', 8], ['waiting', 6], ['running', 6], ['review', 6],
  ['look-a', 8], ['look-b', 8],
];

function columnCounts(alpha, width, row, col) {
  const counts = new Array(CW).fill(0);
  const x0 = col * CW;
  const y0 = row * CH;
  for (let x = 0; x < CW; x++) {
    for (let y = 0; y < CH; y++) {
      if (alpha[(y0 + y) * width + x0 + x] > ALPHA_THRESHOLD) counts[x]++;
    }
  }
  return counts;
}

function chunksFromColumns(counts) {
  const chunks = [];
  let chunkStart = 0;
  let x = 0;

  while (x < CW) {
    if (counts[x] !== 0) {
      x++;
      continue;
    }

    const gapStart = x;
    while (x < CW && counts[x] === 0) x++;
    const gapLength = x - gapStart;
    if (gapLength < GAP_COLUMNS) continue;

    // セル端の余白は塊の区切りではあるが、空の塊としては出力しない。
    if (gapStart > chunkStart) {
      chunks.push({
        x0: chunkStart,
        x1: gapStart,
        pixels: counts.slice(chunkStart, gapStart).reduce((sum, n) => sum + n, 0),
      });
    }
    chunkStart = x;
  }

  if (chunkStart < CW) {
    chunks.push({
      x0: chunkStart,
      x1: CW,
      pixels: counts.slice(chunkStart).reduce((sum, n) => sum + n, 0),
    });
  }
  return chunks.filter((chunk) => chunk.pixels > 0);
}

function isSplit(chunks) {
  if (chunks.length < 2) return false;

  const sorted = [...chunks].sort((a, b) => b.pixels - a.pixels);
  if (sorted[1].pixels >= sorted[0].pixels * MIN_CHUNK_RATIO) return true;

  // 5%未満の装飾は通常除外する。ただしセル端から24px以内の小片は、
  // 尻尾や耳よりも「隣セルへはみ出した断片」である可能性が高い。
  return chunks.some((chunk) => (
    chunk.pixels === sorted[1].pixels &&
    (chunk.x0 < EDGE_FRAGMENT_PX || CW - chunk.x1 < EDGE_FRAGMENT_PX)
  ));
}

function formatChunks(chunks) {
  return chunks.map((chunk) => `${chunk.pixels}px`).join(' / ');
}

async function inspectAtlas(file) {
  const id = path.basename(file, '.webp');
  const image = sharp(new URL(file, SPRITES).pathname).ensureAlpha();
  const { data, info } = await image.raw().toBuffer({ resolveWithObject: true });
  const alpha = new Uint8Array(info.width * info.height);
  for (let i = 0; i < alpha.length; i++) {
    alpha[i] = data[i * info.channels + info.channels - 1];
  }

  const expectedWidth = COLS * CW;
  const expectedHeight = ROW_SPECS.length * CH;
  if (info.width !== expectedWidth || info.height !== expectedHeight) {
    throw new Error(`${id}: サイズが ${info.width}x${info.height}（期待 ${expectedWidth}x${expectedHeight}）`);
  }

  const totalFrames = ROW_SPECS.reduce((sum, [, count]) => sum + count, 0);
  const splits = [];
  for (let row = 0; row < ROW_SPECS.length; row++) {
    const [rowName, count] = ROW_SPECS[row];
    for (let col = 0; col < count; col++) {
      const chunks = chunksFromColumns(columnCounts(alpha, info.width, row, col));
      if (isSplit(chunks)) splits.push({ rowName, frame: col, chunks });
    }
  }

  console.log(`${id.padEnd(18)} 総コマ数 ${totalFrames} / 分断コマ数 ${splits.length}`);
  for (const split of splits) {
    console.log(`  ${split.rowName}[${split.frame}]  各塊: ${formatChunks(split.chunks)}`);
  }
  return splits.length;
}

async function main() {
  if (!sharp) {
    console.error('sharp が必要です:  npm i sharp');
    process.exitCode = 1;
    return;
  }

  const files = (await readdir(SPRITES)).filter((file) => file.endsWith('.webp')).sort();
  let totalSplits = 0;
  for (const file of files) {
    try {
      totalSplits += await inspectAtlas(file);
    } catch (error) {
      console.error(`${path.basename(file, '.webp').padEnd(18)} ✗ ${error.message}`);
      totalSplits++;
    }
  }

  console.log(`\n合計: 分断コマ数 ${totalSplits}`);
  process.exitCode = totalSplits > 0 ? 1 : 0;
}

main();
