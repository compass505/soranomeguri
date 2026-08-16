# 雲の生成プロンプト

これまでの雲は `js/sky.js` の `drawClouds` が blur(11px) をかけた楕円を5個並べたもので、
**灰色の綿にしか見えなかった。** 足りていなかったのは解像度ではなく、雲の構造そのもの:

1. **平らな底** — 積雲の底は凝結高度で揃うので水平に切れる。楕円には底が無い
2. **カリフラワー状の頭** — 上昇する塊が丸い瘤を重ねる。ぼかした楕円には瘤が無い
3. **自己陰影** — 上面は白く飛び、底面は青灰に沈む。単色塗りには明暗が無い
4. **種類が天気で変わる** — 巻雲・積雲・層積雲・積乱雲は別の形。1種類では雲量しか表せない
5. **奥行き** — 遠い雲は小さく・低く・霞む。全部同じ大きさでは空が板になる

1〜4 は絵で解く（このファイル）。5 は描画側で解く（`js/sky.js`）。

## 共通の画風（背景画に合わせる）

`assets/bg/bg_hills.png` と同じ画材。**やわらかいガッシュ／水彩。**
マットで、彩度は低め、輪郭線は無い、紙の目がわずかに残る。
写実的な写真やCG的なボリュームレンダリングにはしない。

- 白は純白ではなく**わずかに温かい生成り**（#FBF7EE 寄り）
- 影は黒ではなく**冷たい灰藤色**（#B6BCCE 寄り）
- 光は**左上から**（背景画・スプライトと同じ）

## 共通の制約（全カット）

- **背景は完全な透明（アルファチャンネル）。** 空の色・地平線・地面・太陽・鳥・文字は一切描かない
- 雲が1つだけ、または指定された1かたまりだけ。額縁・枠・影の落ち先を描かない
- キャンバスの端に雲を接触させない（左右上下に余白を残す。タイル化しないため）
- 署名・透かし・ロゴ・文字なし

---

## 1. `cumulus_a.png` — 積雲（1536x1024）

Use case: illustration
Asset type: A single isolated fair-weather cumulus cloud, painted as a game background element, on a fully transparent background.

Primary request: Paint one fair-weather cumulus cloud in soft matte gouache, isolated on a completely transparent background with no sky behind it.

Subject and construction: One cohesive cumulus mass, wider than it is tall, roughly 2.5 units wide to 1 unit tall. The **bottom edge is nearly flat and horizontal** — a clean, slightly ragged shelf where the cloud base sits at the condensation level, not a rounded balloon underside. The **top is built from four or five overlapping rounded cauliflower turrets** of different sizes, the tallest one left of center, each turret bulging outward with its own smaller secondary bumps. The silhouette is confident and readable, softening into a few thin torn wisps only at the far left and right trailing edges.

Light and shading: Sunlight from the upper left. The upper-left faces of the turrets are the brightest, a warm off-white, close to bare paper. As each turret curves away from the light, it turns through a pale cool gray. The flat underside is the darkest value, a soft cool gray-lavender, and it is clearly darker than the top — the value difference between top and base should be immediately obvious at a glance. Faint self-shadow where one turret overlaps the one behind it. No cast shadow onto anything else.

Medium and technique: Opaque gouache on lightly textured paper. Flat layered washes with soft, brushy transitions rather than airbrushed gradients. Visible but subtle brush marks. Slight paper tooth in the lighter passages. Absolutely no outline, no ink line, no cel-shaded hard edge.

Color: Warm off-white highlights, neutral pale gray midtones, cool gray-lavender base shadow. Muted and desaturated. No blue sky tint, no sunset orange, no pure black.

Constraints: Exactly one cloud. Transparent background — no sky, no horizon, no ground, no sun, no birds. The cloud does not touch any canvas edge; leave a clear margin on all four sides. No frame, no border, no text, no watermark, no signature. Not photorealistic, not a 3D volumetric render, not fluffy cotton wool, not a soft blurred blob.

## 2. `cumulus_b.png` — 積雲・小さめの群れ（1536x1024）

同じ画風・同じ制約。以下だけ差し替える:

Subject and construction: **Three separate small cumulus clouds** of clearly different sizes, arranged left to right across the canvas with generous transparent gaps between them, as they would appear scattered on a fair day. The largest sits right of center, the smallest at the far left. **Every one of them has the same flat horizontal base**, and all three bases sit at very nearly the same height — this shared flat baseline is the most important thing in the picture. Each has two or three rounded cauliflower turrets on top. They must read as three distinct clouds, not one connected mass.

## 3. `cumulus_c.png` — 積雲・縦に育った1つ（1024x1024）

同じ画風・同じ制約。以下だけ差し替える:

Subject and construction: One cumulus cloud that has grown **taller than it is wide** — a congestus, roughly 1 unit wide to 1.3 units tall, the stage just before a storm cloud. A flat horizontal base at the bottom, and above it a stack of increasingly large cauliflower turrets piling upward and slightly to the right, the highest crown boiling and knobbly. The sides are hard and sculptural where the light strikes and softer where the mass turns away.

Light and shading: As above, but with a stronger vertical value range: the crown is nearly white in the light, and the base is a distinctly heavier gray-lavender, hinting that this cloud is thick enough to shade the ground.

## 4. `cirrus_a.png` — 巻雲（1536x1024）

Use case: illustration
Asset type: Isolated high cirrus cloud streaks, painted as a game background element, on a fully transparent background.

Primary request: Paint a band of high cirrus in soft matte gouache, isolated on a completely transparent background.

Subject and construction: **Five or six thin, nearly horizontal streaks** of ice cloud sweeping across the canvas from lower left to upper right, at a shallow angle. Each streak is a fine filament that is slightly denser and brighter at its leading (right) end and **trails off into a long, feathered, hair-thin tail** to the left, the way falling ice crystals get sheared by wind. The streaks are separate and do not merge into a sheet — the transparent gaps between them are as important as the paint. No lumps, no turrets, no flat base; cirrus has none of those.

Light and shading: Extremely high key. Almost all of the paint is a bright warm off-white at low opacity; the only darker note is a faint cool gray in the very densest core of the two largest streaks. Barely any modeling — cirrus is too thin to shade.

Medium and technique: Dry-brush gouache, thin and streaky, letting the paper texture break the stroke so the edges are fibrous rather than smooth. Visible directional brush drag along the length of every streak.

Constraints: Exactly one band of streaks. Transparent background — no sky, no horizon, no sun. Streaks must not touch the left or right canvas edge; leave a margin. No outline, no text, no watermark. Not photorealistic, not a smoke or vapor-trail effect, not a soft blurred smear.

## 5. `stratocumulus_a.png` — 層積雲（1536x1024）

Use case: illustration
Asset type: An isolated low stratocumulus cloud sheet, painted as a game background element, on a fully transparent background.

Primary request: Paint one low, wide stratocumulus sheet in soft matte gouache, isolated on a completely transparent background.

Subject and construction: A **broad, low, horizontally stretched raft of cloud**, roughly 5 units wide to 1 unit tall, spanning most of the canvas. Its **top edge is gently undulating and soft**, its **underside is broken into a row of large shallow rounded lumps** — the characteristic quilted, cobbled belly of a stratocumulus deck. The left and right ends thin out and dissolve into flat torn tatters rather than ending abruptly. It is one continuous deck, not separate clouds.

Light and shading: Light from the upper left, but this cloud is thick and low, so the mood is grayer overall than a fair-weather cumulus. The top surface is a soft pale gray with a warm off-white sheen where the light grazes it. The lumpy underside is a noticeably heavier, flat, cool gray, with each lump slightly darker in its hollow, giving the belly a quilted rhythm. Low overall contrast — no bright white anywhere, no dark black.

Medium and technique: Opaque gouache, flat layered washes, soft brushy edges, subtle paper tooth. No outline, no hard cel edge.

Constraints: Exactly one deck. Transparent background — no sky, no horizon, no rain, no ground. Leave a clear margin above and below; the ends may approach but must not touch the left and right edges. No text, no watermark. Not photorealistic, not a 3D render, not a blurred gray smear.

## 6. `stratus_a.png` — 層雲・切れ端（1536x1024）

同じ画風・同じ制約。以下だけ差し替える:

Subject and construction: **Two long, flat, featureless ribbons of low stratus**, one above the other with a wide transparent gap between them, each roughly 8 units wide to 1 unit tall. They are nearly structureless — no turrets, no lumps, just soft flat veils with slightly ragged, feathered ends that fade to nothing. The lower ribbon is longer and slightly heavier than the upper one. These are the flat scraps that hang under an overcast sky.

Light and shading: Very low contrast. A uniform soft cool gray, marginally lighter along the top edge of each ribbon and marginally heavier along the bottom. No highlights, no deep shadow.

## 7. `cumulonimbus_a.png` — 積乱雲（1024x1536）

Use case: illustration
Asset type: An isolated cumulonimbus storm cloud, painted as a game background element, on a fully transparent background.

Primary request: Paint one towering cumulonimbus in soft matte gouache, isolated on a completely transparent background.

Subject and construction: One enormous storm tower filling the tall canvas. From the bottom: a **flat, heavy, dark base** cut horizontally straight across; above it a thick trunk of hard, sculptural cauliflower turrets boiling upward and widening as they rise; and at the top the tower **flattens out and spreads sideways into a wide anvil** that overhangs the trunk to the right, its upper surface smooth and fibrous rather than knobbly, its leading edge streaming into thin ice wisps. The transition from knobbly trunk to smooth anvil is the reading of this picture — make it unmistakable.

Light and shading: Sunlight from the upper left, striking mainly the anvil and the highest turrets, which are a bright warm off-white. Value falls off steeply downward: the mid-trunk turrets are a mid cool gray, and **the base is by far the darkest part of the image**, a deep slate blue-gray, heavy enough to read as a cloud that has blocked out the sun. Strong self-shadowing between the turrets on the right side, away from the light. Dramatic vertical value range from near-white crown to near-charcoal base.

Medium and technique: Opaque gouache, flat layered washes, soft brushy transitions, subtle paper tooth. No outline, no cel-shaded hard edge, no airbrushed gradient.

Color: Warm off-white crown, neutral to cool gray midtones, deep slate blue-gray base. Desaturated. No pure black, no purple, no lightning bolt, no rain streaks.

Constraints: Exactly one cloud. Transparent background — no sky, no horizon, no ground, no lightning, no rain, no birds. Leave a clear margin on all four sides. No text, no watermark, no signature. Not photorealistic, not a 3D volumetric render, not a mushroom cloud, not smoke.

## 8. `fractus_a.png` — ちぎれ雲（1536x1024）

同じ画風・同じ制約。以下だけ差し替える:

Subject and construction: **Six or seven small, ragged, torn scraps of cloud** (fractus) of clearly different sizes, scattered across the canvas with large transparent gaps between them. Each scrap is irregular and wind-torn — no flat base, no neat turrets, just soft shredded lumps with feathered trailing edges, as if a larger cloud had been pulled apart. The two largest are near the center; the smallest are wisps barely holding together. They must read as separate scraps, never as one mass.

Light and shading: Light from the upper left. Each scrap is warm off-white on its upper left and a soft cool gray underneath, but with much less contrast than a cumulus — these are thin and let light through. The smallest wisps are nearly transparent.
