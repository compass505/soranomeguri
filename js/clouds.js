// 雲。描いた絵を空に並べる。
//
// ★前の実装は blur(11px) をかけた楕円を5個ずつ重ねたものだった。
//   ぼかせば雲に見えるだろうと思っていたが、見えなかった。灰色の綿だった。
//   足りなかったのは解像度ではなく、雲が雲である条件そのもの:
//
//   1. **平らな底** — 積雲の底は凝結高度で揃うので水平に切れる。楕円に底は無い
//   2. **カリフラワー状の頭** — 上昇する塊が丸い瘤を重ねる。ぼかした楕円に瘤は無い
//   3. **自己陰影** — 上面は白く飛び、底面は青灰に沈む。単色塗りに明暗は無い
//   4. **種類が天気で変わる** — 巻雲・積雲・層積雲・積乱雲は別の形をしている
//   5. **奥行き** — 遠い雲は小さく・低く・霞み・ゆっくり動く
//
//   1〜4 は絵で解いた（`assets/clouds/PROMPTS.md`。Codex の image_generation で生成）。
//   **5 は絵では解けない。** ここで解く。
//
// ★配置の原則: 雲の位置は「中心」ではなく **「底」** で決める。
//   雲底は凝結高度という物理的な1本の線で、同じ層の雲はそこに揃う。
//   中心を揃えると、大きい雲ほど下に食い込んで地平線を割る。

const clamp01 = (x) => Math.max(0, Math.min(1, x));

/**
 * i 番目の雲の初期位置（0〜1）。**黄金比の低食い違い列。**
 *
 * ★`sin` を使う定番のハッシュを試したが、小さい整数を入れると値が下寄りに固まり、
 *   雲が画面の左端に積み上がった。ハッシュは「散らばって見える」だけで
 *   **散らばりを保証しない。** 黄金比の列は、先頭から何個取っても均等に散る
 *   という性質そのものを持っている。雲は種類ごとに先頭から順に点くので、
 *   まさにこの「どの個数で切っても均等」が要る。
 */
const GOLDEN = 0.6180339887498949;
export function phaseOf(i) { return ((i + 1) * GOLDEN) % 1; }

/**
 * 雲の配役。**この表は固定で、天気によって増減しない。**
 *
 * ★天気で slot の種類を切り替えると、つまみを回した瞬間に雲が別の雲へ化ける。
 *   だから種類は slot に焼き付けておき、天気で動かすのは **濃さ（alpha）だけ** にする。
 *   湧く・消えるは連続、化けるは不連続。連続の側だけを使う。
 *
 * - `sprite` … `assets/clouds/clouds.json` の id
 * - `z`      … 奥行き 0=遠い 1=近い。速さ・霞み・ぼけの全部がここから出る
 * - `alt`    … 雲底の高さ 0=地平線ぎわ 1=天頂。**z とは独立**
 *              （巻雲は「遠い」のではなく「高い」。同じ軸に押し込むと巻雲が地平線に貼り付く）
 * - `size`   … 画面幅に対する描画幅
 * - `flip`   … 左右反転。同じ絵を複数置くときの繰り返し感を消す唯一の手段
 */
const CAST = [
  // 巻雲 — 空の一番高いところ。晴れていても空は空っぽではない
  { kind: 'cirrus', sprite: 'cirrus_a', z: 0.30, alt: 0.80, size: 0.62, flip: false, seed: 11 },
  { kind: 'cirrus', sprite: 'cirrus_a', z: 0.22, alt: 0.64, size: 0.48, flip: true, seed: 29 },

  // 積雲 — 遠近3段に散らす。近いものほど大きく、高く、速い
  { kind: 'cumulus', sprite: 'cumulus_b', z: 0.30, alt: 0.26, size: 0.26, flip: false, seed: 43 },
  { kind: 'cumulus', sprite: 'cumulus_a', z: 0.58, alt: 0.46, size: 0.34, flip: false, seed: 61 },
  { kind: 'cumulus', sprite: 'cumulus_c', z: 0.92, alt: 0.62, size: 0.30, flip: false, seed: 79 },
  { kind: 'cumulus', sprite: 'cumulus_a', z: 0.44, alt: 0.34, size: 0.28, flip: true, seed: 97 },
  { kind: 'cumulus', sprite: 'cumulus_b', z: 0.76, alt: 0.55, size: 0.44, flip: true, seed: 113 },
  { kind: 'cumulus', sprite: 'cumulus_c', z: 1.00, alt: 0.74, size: 0.38, flip: true, seed: 131 },

  // 層積雲 — 空に蓋をする側。横に長く、重ねて敷く
  { kind: 'stratocumulus', sprite: 'stratocumulus_a', z: 0.38, alt: 0.30, size: 0.78, flip: false, seed: 149 },
  { kind: 'stratocumulus', sprite: 'stratocumulus_a', z: 0.66, alt: 0.48, size: 0.98, flip: true, seed: 167 },
  { kind: 'stratocumulus', sprite: 'stratocumulus_a', z: 0.94, alt: 0.66, size: 1.18, flip: false, seed: 181 },

  // 層雲 — 蓋の下にぶら下がる平たい切れ端。低いほど速い
  { kind: 'stratus', sprite: 'stratus_a', z: 0.52, alt: 0.14, size: 1.00, flip: false, seed: 199 },
  { kind: 'stratus', sprite: 'stratus_a', z: 0.86, alt: 0.24, size: 1.22, flip: true, seed: 211 },

  // ちぎれ雲 — 風の強さを目で見せる係。速くて低い
  { kind: 'fractus', sprite: 'fractus_a', z: 0.80, alt: 0.20, size: 0.46, flip: false, seed: 233 },
  { kind: 'fractus', sprite: 'fractus_a', z: 1.00, alt: 0.36, size: 0.56, flip: true, seed: 251 },

  // 積乱雲 — 1つだけ。荒天のときにだけ立ち上がる
  { kind: 'cumulonimbus', sprite: 'cumulonimbus_a', z: 0.34, alt: 0.02, size: 0.42, flip: false, seed: 269 },
];

/** 並び順そのものが初期位置になる。★同じ種類は表の上で連続させておくこと */
export const ROSTER = CAST.map((slot, i) => ({ ...slot, phase: phaseOf(i) }));

/**
 * 種類ごとに「いま何本立てるか」。整数ではなく実数で返す。
 * ★小数部が先頭の1本の alpha になる。ここが整数だと雲が1本まるごと点滅する。
 */
export function kindCounts(look) {
  const c = look.cloud;
  const u = look.u;
  const v = look.windSpeed;

  // 積雲は「中くらいの空」のもの。晴れすぎても曇りすぎても消える（曇りは層積雲に化ける）
  const rise = clamp01((c - 0.5) / 4.0);
  const fall = clamp01((9.5 - c) / 3.5);

  return {
    // 巻雲は快晴の側。雲量が増えると下の雲に隠れて見えなくなる
    cirrus: 2 * clamp01((5.0 - c) / 4.0),
    cumulus: 6 * rise * fall,
    stratocumulus: 3 * clamp01((c - 4.5) / 3.5),
    // 層雲は「静かな曇り」の雲。上昇気流が強い日は千切れて出てこない
    stratus: 2 * clamp01((c - 6.5) / 2.5) * (1 - u * 0.4),
    // ちぎれ雲は風が千切る。風が無い日にちぎれ雲は無い
    fractus: 2 * clamp01((c - 3.0) / 4.0) * (0.3 + 0.7 * clamp01(v / 14)),
    // 積乱雲は雲量と上昇気流の両方が要る。片方だけでは立たない。
    // ★閾値は降水の開始（weather.js の cloud>=7）に合わせる。
    //   ここを 7.8 に置いていたとき、雷（雲量7.7・上昇気流0.82）の空に塔が立たなかった。
    //   雷なのに積乱雲が無い空は、雲がいくら綺麗でも嘘に見える。
    //   ★立ち上がりは降水の開始より手前（6.5）に置く。ひょうは雲量7.0ちょうどでも成立し、
    //   そこで塔が薄すぎると「降っているのに塔が透けている」空になる。
    //   雨より先に塔が育つのは気象としても正しい
    cumulonimbus: clamp01((c - 6.5) / 0.9) * clamp01((u - 0.45) / 0.25),
  };
}

/**
 * 配役 → いま描く雲の一覧。alpha 0 のものは落とす。
 * 純粋関数（時間も画面サイズも要らない）。テストはここを見る。
 */
export function cloudCast(look) {
  const counts = kindCounts(look);
  const used = {};
  const out = [];
  for (const slot of ROSTER) {
    const i = used[slot.kind] ?? 0;
    used[slot.kind] = i + 1;
    // 何本目か i に対し、残り本数 (n - i) が alpha。1本ずつ滲むように湧いて消える
    const a = clamp01((counts[slot.kind] ?? 0) - i);
    if (a <= 0.004) continue;
    out.push({ ...slot, alpha: a });
  }
  return out;
}

/**
 * 空全体にかぶせる曇り止め。
 * ★雲量10を「大きい雲を14個」で表そうとすると、どう並べても隙間から青が覗く。
 *   本当の曇天は個々の雲ではなく **一枚の蓋** なので、蓋は蓋として塗る。
 */
export function overcastVeil(look) {
  return clamp01((look.cloud - 8.2) / 1.8) * 0.52;
}

/**
 * slot を画面に置く。
 * @returns {{x:number,y:number,w:number,h:number}} 描画矩形（x は左端）
 */
export function placeSlot(slot, sprite, W, horizon, time, look) {
  const sky = Math.max(1, horizon);

  let dw = W * slot.size;
  let dh = dw * (sprite.h / sprite.w);

  // ★上昇気流は雲を「増やす」のではなく「縦に伸ばす」。
  //   積雲が積乱雲へ育つのはこの一軸で、気圧のつまみを下げた手応えがここに出る。
  if (slot.kind === 'cumulus' || slot.kind === 'cumulonimbus') {
    dh *= 1 + look.u * 0.35;
  }

  // 空より高い雲は描けない。はみ出す分は幅ごと縮める（縦だけ潰すと絵が崩れる）
  const maxH = sky * (slot.kind === 'cumulonimbus' ? 0.95 : 0.60);
  if (dh > maxH) { dw *= maxH / dh; dh = maxH; }

  // 雲底の高さ。0.06 は地平線に食い込ませないための下駄
  const baseY = horizon - sky * (0.06 + 0.80 * slot.alt);
  const y = Math.min(baseY - dh, horizon - dh);

  // 流れる速さ。★奥ほど遅い。ここが唯一の奥行きの証拠になる
  const speed = (3 + look.windSpeed * 3.2) * (0.25 + 0.95 * slot.z);
  const span = W + dw * 2;
  // ★初期位置は必ず散らしてから使うこと。
  //   `(seed * 37) % span` で済ませていたとき、seed が等差なので積 mod も狭い帯に固まり、
  //   雲が画面の右3割にだけ湧いて左が空いた。
  //   **等差数列に線形写像をかけても等差のまま。** 散らばりはどこからも湧いてこない
  const x = (slot.phase * span + time * speed) % span - dw;

  return { x, y, w: dw, h: dh };
}

/** 読み込み済みの雲の絵。読み込めなくてもゲームは動く（雲が出ないだけ）。 */
export class CloudBank {
  constructor(sprites) { this.sprites = sprites; }

  // ★fetch と img.src の2行は、この形のまま置いておくこと。
  //   tools/build_standalone.mjs が文字列で探して data URI に差し替えている
  //   （テンプレートリテラルにすると単体HTMLの空から雲が消える）。
  static async load() {
    const sprites = {};
    try {
      const manifest = await fetch('assets/clouds/clouds.json').then((r) => r.json());
      await Promise.all(manifest.map((m) => new Promise((res) => {
        const im = new Image();
        im.onload = () => { sprites[m.id] = { img: im, w: m.w, h: m.h }; res(); };
        im.onerror = () => { console.warn('雲の絵が無い:', m.id); res(); };
        im.src = m.src;
      })));
    } catch (e) {
      // 絵が無い環境（初回・オフラインの取りこぼし）では空は無雲になる。
      // ★ここで例外を投げると庭ごと止まる。空の絵は落ちてよいが庭は落ちてはいけない
      console.warn('雲の一覧を読めなかった:', e.message);
    }
    return new CloudBank(sprites);
  }

  get ready() { return Object.keys(this.sprites).length > 0; }

  /**
   * 描く。奥の段 → 霞み → 中の段 → 霞み → 手前の段、の順。
   * ★空気遠近は雲ごとの色ではなく **段と段の間に挟む一枚の霞** で作る。
   *   雲を1つずつ霞ませるとオフスクリーンが要るが、間に挟むだけなら fillRect 2枚で済む。
   */
  draw(ctx, look, W, horizon, time) {
    if (!this.ready || horizon <= 0) return;

    const cast = cloudCast(look);
    if (!cast.length && overcastVeil(look) <= 0.004) return;

    // 霞の色は空の下端の色そのもの。地平線に近いほど空の色に溶ける
    const haze = look.botColor;
    const bands = [[0, 0.42, 0.30], [0.42, 0.78, 0.15], [0.78, 1.01, 0]];

    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, W, horizon);
    ctx.clip();

    for (const [zLo, zHi, hazeA] of bands) {
      for (const slot of cast) {
        if (slot.z < zLo || slot.z >= zHi) continue;
        const sp = this.sprites[slot.sprite];
        if (!sp) continue;
        const r = placeSlot(slot, sp, W, horizon, time, look);

        // 荒れるほど暗く沈む。彩度も落として鉛色へ寄せる
        const bright = 1 - look.cloudDark * 0.62;
        const sat = 1 - look.cloudDark * 0.35;
        // 奥の雲は輪郭が甘い。1px にも満たないぼけでも、手前と並ぶと奥に見える
        const blur = (1 - slot.z) * 1.6;
        ctx.filter = `blur(${blur.toFixed(2)}px) brightness(${bright.toFixed(3)}) saturate(${sat.toFixed(3)})`;
        ctx.globalAlpha = slot.alpha * (0.90 - (1 - slot.z) * 0.18);

        ctx.save();
        if (slot.flip) {
          ctx.translate(r.x + r.w, r.y);
          ctx.scale(-1, 1);
          ctx.drawImage(sp.img, 0, 0, r.w, r.h);
        } else {
          ctx.drawImage(sp.img, r.x, r.y, r.w, r.h);
        }
        ctx.restore();

        // 横に流れる雲は、反対の端からも同時に入ってくる。継ぎ目を出さない
        const wrap = r.x > W - r.w ? r.x - (W + r.w * 2) : (r.x < 0 ? r.x + (W + r.w * 2) : null);
        if (wrap !== null) {
          ctx.save();
          if (slot.flip) {
            ctx.translate(wrap + r.w, r.y);
            ctx.scale(-1, 1);
            ctx.drawImage(sp.img, 0, 0, r.w, r.h);
          } else {
            ctx.drawImage(sp.img, wrap, r.y, r.w, r.h);
          }
          ctx.restore();
        }
      }

      if (hazeA > 0) {
        ctx.filter = 'none';
        ctx.globalAlpha = hazeA;
        const g = ctx.createLinearGradient(0, horizon * 0.25, 0, horizon);
        g.addColorStop(0, 'rgba(0,0,0,0)');
        g.addColorStop(1, haze);
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, W, horizon);
      }
    }

    // 曇天の蓋
    const veil = overcastVeil(look);
    if (veil > 0.004) {
      ctx.filter = 'none';
      ctx.globalAlpha = veil;
      const g = ctx.createLinearGradient(0, 0, 0, horizon);
      const top = look.cloudDark > 0.3 ? 'rgb(104,110,124)' : 'rgb(196,201,210)';
      const bot = look.cloudDark > 0.3 ? 'rgb(146,152,164)' : 'rgb(224,228,233)';
      g.addColorStop(0, top);
      g.addColorStop(1, bot);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, horizon);
    }

    ctx.filter = 'none';
    ctx.globalAlpha = 1;
    ctx.restore();
  }
}
