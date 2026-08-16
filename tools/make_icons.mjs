import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const sharp = require('sharp');

const ICONS = [
  { size: 192, stroke: 10, path: '../assets/icon-192.png' },
  { size: 512, stroke: 26, path: '../assets/icon-512.png' },
];

function iconSvg(size, stroke) {
  const center = size / 2;
  const outerRadius = size * 0.34;
  const centerY = center + size * 0.10;
  const radii = [outerRadius, outerRadius - stroke * 2, outerRadius - stroke * 4];
  const arcs = radii.map((radius) => (
    `<path d="M ${center - radius} ${centerY} A ${radius} ${radius} 0 0 1 ${center + radius} ${centerY}"/>`
  )).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" fill="#7fa8c9"/>
  <g fill="none" stroke="#fffdf6" stroke-width="${stroke}" stroke-linecap="butt">${arcs}</g>
</svg>`;
}

for (const icon of ICONS) {
  const dest = fileURLToPath(new URL(icon.path, import.meta.url));
  await sharp(Buffer.from(iconSvg(icon.size, icon.stroke))).png().toFile(dest);
}
