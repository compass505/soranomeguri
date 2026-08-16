// つまみの値 → 空の見た目。
// 天気の「名前」ではなく導出量（雲量・上昇気流・気温・降水）から連続的に作る。
// ★名前で分岐すると、つまみを回している最中に空がカクッと切り替わる。
//   連続量から作れば、雲が湧いてくる途中も絵になる。ここが v2 の手触りの半分。

import { derive } from './weather.js';

const lerp = (a, b, t) => a + (b - a) * t;
const clamp01 = (x) => Math.max(0, Math.min(1, x));

function mix(c1, c2, t) {
  return [Math.round(lerp(c1[0], c2[0], t)),
          Math.round(lerp(c1[1], c2[1], t)),
          Math.round(lerp(c1[2], c2[2], t))];
}
const rgb = (c) => `rgb(${c[0]},${c[1]},${c[2]})`;

// 晴れ / 曇り / 荒れ の3点を雲量で補間する
const CLEAR_TOP  = [ 96, 165, 220], CLEAR_BOT = [200, 232, 245];
const OVER_TOP   = [166, 176, 188], OVER_BOT  = [214, 218, 222];
const STORM_TOP  = [ 66,  72,  86], STORM_BOT = [120, 126, 138];

/** 寒いほど青く、暑いほど黄色く転ぶ色被り。気温を色で分からせる。 */
function tempTint(t) {
  if (t <= 0) return { c: [176, 205, 238], a: clamp01((-t) / 28) * 0.22 };
  return { c: [255, 214, 150], a: clamp01((t - 18) / 22) * 0.28 };
}

export function skyLook(dials, kind) {
  const d = derive(dials);
  const c = d.cloud / 10;

  // 雲量 0→0.65 で晴れ→曇り、0.65→1 で曇り→荒れ。上昇気流が強いほど暗く沈む
  const k = c < 0.65 ? c / 0.65 : 1;
  const storm = c < 0.65 ? 0 : ((c - 0.65) / 0.35) * (0.35 + 0.65 * d.u);
  let top = mix(CLEAR_TOP, OVER_TOP, k);
  let bot = mix(CLEAR_BOT, OVER_BOT, k);
  top = mix(top, STORM_TOP, storm);
  bot = mix(bot, STORM_BOT, storm);

  return {
    ...d,
    topColor: rgb(top),
    botColor: rgb(bot),
    tint: tempTint(dials.t),
    // 雲は「量」ではなく「厚み」と「数」の2軸で出す
    cloudCount: Math.round(c * 14),
    cloudAlpha: clamp01(0.25 + c * 0.6),
    cloudDark: clamp01(storm),
    // 降水の見た目
    precipKind: d.precip ? (dials.t < -1 ? 'snow' : (d.u >= 0.75 && dials.t <= 12 ? 'hail' : 'rain')) : null,
    precipRate: d.precip ? clamp01((d.cloud - 7) / 3) * 0.7 + 0.3 : 0,
    // 霧の膜。★判定が霧のときだけ出す。
    //   飽和と無風という連続条件だけで出すと、-15℃・無風のダイヤモンドダストの日まで
    //   相対湿度100%になって画面が真っ白に潰れた（実際に潰れた）。
    fogVeil: kind === 'fog' ? clamp01((d.rh - 96) / 4) : 0,
    // 虹は「点ではなく道」なので、いま道の上にいるかは classify しか知らない。
    // 連続量だけで出すと、雨上がりでない晴れの日にも虹が居座るため kind で分岐する。
    rainbow: kind === 'rainbow' ? clamp01(0.45 + ((4 - d.cloud) / 4) * 0.55) : 0,
    // 雪景色への切り替えは気温そのもの（積雪は残るので降水と独立）
    snowCover: clamp01((-dials.t - 1) / 6),
    windSpeed: dials.v,
    lightning: d.precip && d.u >= 0.70 && dials.t >= 20 && d.rh >= 90,
  };
}

/** 虹の弧の幾何。画面上半分に地平線から生える大きさを返す。 */
export function rainbowArc(w, horizon) {
  const r = Math.min(Math.max(w * 0.34, horizon * 0.50), horizon * 1.20);
  const cx = w * 0.5;
  const cy = horizon + r * 0.25;
  const bandWidth = Math.min(Math.max(r * 0.03, 3), 7);
  const bands = [
    [239, 83, 80],
    [245, 166, 35],
    [250, 220, 80],
    [83, 190, 117],
    [86, 155, 220],
    [89, 100, 190],
    [154, 93, 190],
  ];
  return { cx, cy, r, bandWidth, bands };
}

/** 虹。淡い7本の帯を空の上半分だけに描く。 */
export function drawRainbow(ctx, look, w, horizon) {
  if (look.rainbow <= 0.01) return;
  const { cx, cy, r, bandWidth, bands } = rainbowArc(w, horizon);
  ctx.save();
  ctx.globalAlpha = look.rainbow * 0.38;
  ctx.filter = 'blur(2px)';
  ctx.lineWidth = bandWidth;
  ctx.lineCap = 'round';
  for (let i = 0; i < bands.length; i++) {
    ctx.strokeStyle = rgb(bands[i]);
    ctx.beginPath();
    ctx.arc(cx, cy, r - i * bandWidth, Math.PI, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

/** 粒（雨・雪・ひょう）の簡易パーティクル。 */
export class Precip {
  constructor(w, h) { this.p = []; this.resize(w, h); }
  resize(w, h) { this.w = w; this.h = h; }

  step(look, dt) {
    const want = look.precipKind ? Math.round(look.precipRate * (look.precipKind === 'rain' ? 320 : 160)) : 0;
    while (this.p.length < want) {
      this.p.push({ x: Math.random() * this.w, y: Math.random() * this.h, s: Math.random() });
    }
    if (this.p.length > want) this.p.length = want;

    const kind = look.precipKind;
    const fall = kind === 'rain' ? 900 : kind === 'hail' ? 700 : 130;
    const drift = look.windSpeed * (kind === 'snow' ? 14 : 6);
    for (const q of this.p) {
      q.y += (fall * (0.6 + q.s * 0.8)) * dt;
      q.x += drift * dt + (kind === 'snow' ? Math.sin((q.y + q.s * 100) / 40) * 18 * dt : 0);
      if (q.y > this.h) { q.y = -10; q.x = Math.random() * this.w; }
      if (q.x > this.w + 20) q.x -= this.w + 40;
      if (q.x < -20) q.x += this.w + 40;
    }
  }

  draw(ctx, look) {
    if (!look.precipKind) return;
    const kind = look.precipKind;
    ctx.save();
    if (kind === 'rain') {
      ctx.strokeStyle = 'rgba(190,215,240,0.55)';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      for (const q of this.p) {
        ctx.moveTo(q.x, q.y);
        ctx.lineTo(q.x - look.windSpeed * 0.5, q.y + 12 + q.s * 8);
      }
      ctx.stroke();
    } else {
      ctx.fillStyle = kind === 'hail' ? 'rgba(226,240,250,0.92)' : 'rgba(255,255,255,0.88)';
      for (const q of this.p) {
        const r = kind === 'hail' ? 2.2 + q.s * 1.6 : 1.8 + q.s * 2.2;
        ctx.beginPath();
        ctx.arc(q.x, q.y, r, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }
}

/** 雲。ふわっとした楕円の重ね描き。 */
export function drawClouds(ctx, look, w, h, time) {
  if (look.cloudCount <= 0) return;
  const band = h * 0.52;
  ctx.save();
  // ★輪郭のある楕円だと「灰色の塊」に見える。ぼかして初めて雲になる
  ctx.filter = 'blur(11px)';
  for (let i = 0; i < look.cloudCount; i++) {
    const seed = i * 97.13;
    const speed = 5 + look.windSpeed * 2.0 + (i % 3) * 3;
    const x = (((seed * 7) % (w + 500)) + time * speed) % (w + 500) - 250;
    const y = 14 + ((seed * 13) % band);
    const s = 0.55 + ((seed * 3) % 100) / 100;
    const g = 250 - look.cloudDark * 165;
    ctx.fillStyle = `rgba(${g},${g + 2},${g + 8},${look.cloudAlpha})`;
    for (let b = 0; b < 5; b++) {
      const bs = s * (0.65 + Math.sin(b * 2.1 + seed) * 0.35);
      ctx.beginPath();
      ctx.ellipse(x + b * 34 * s, y + Math.sin(b * 1.7 + seed) * 12 * s,
                  46 * bs, 26 * bs, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.filter = 'none';
  ctx.restore();
}
