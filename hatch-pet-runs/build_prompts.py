#!/usr/bin/env python3
"""ゆいゲーム 7体分の hatch-pet 実行プロンプトを生成する。

vault (30_Projects/ゆいゲーム/03_キャラクター/README.md) に記録された
前回の失敗の原因を、すべてプロンプト側で潰した形にしてある。
"""
from pathlib import Path

RUNS = Path.home() / "Documents/yui-game/hatch-pet-runs"
STILLS = Path.home() / "Documents/SecondBrain/30_Projects/ゆいゲーム/03_キャラクター"

# 共通の同一性ロック。★前回の最大の発見: 形は「言葉」ではなく「数値」で渡す
COMMON_IDENTITY = """\
SHARED IDENTITY LOCK (all ten characters in this series must match on these;
specify them as numbers, not adjectives — vague wording is what made them drift last time):
- A four-legged beast standing and moving on the ground. Not bipedal, not a mascot blob.
- Body length is about 1.6x the shoulder height.
- The head is about 1/3 of the body length.
- The back line is horizontal when standing.
- The belly line sits above the elbow.
- Eyes: amber/honey iris, a round dark pupil, a drawn upper lash line, and exactly two catchlights.
- A small dark nose and visible paw pads.
- Style: painterly cel-shaded game-creature art with a clean readable outline, soft warm
  rendering, and a flat lit palette. Match the attached reference image's rendering exactly.
- No text, no logos, no scenery, no ground shadow.

MARKING RULE (this is the difference between a marking that survives and one that disappears):
At the final 192x208 cell size, any marking specified only as a "shape" gets absorbed into the
fur shading and vanishes. Every marking below is specified with a MINIMUM STROKE WIDTH.
Honor that width in the 192x208 cell, even if it means simplifying the marking.
"""

# 1体ごとの設計。前回残った不揃い（README「揃わなかった」「落ちた」）を明示的な訂正として書く
PETS = [
    {
        "id": "yui-sunny",
        "display": "はれ",
        "still": "beast_sunny.png",
        "desc": "A golden fox-like weather beast whose mane tips end in sharp light-ray points.",
        "notes": """\
Species read: a fox/cat-like quadruped.
Fur: saturated golden yellow with a cream underside and chest.
Mane: a thick ruff around the neck and chest whose tips end in sharp, straight,
  light-ray points rather than soft curls.
Marking: one flame-shaped mark on each flank in deep orange against the yellow fur,
  drawn as a bold filled shape with an outline at least 3px wide inside the 192x208 cell.
  CORRECTION: in the previous version this flame marking was specified only as "a flame
  shape" and it disappeared into the fur shading at sprite size. Draw it thick and
  high-contrast enough to read.
Tail: large and plumed, carried curled upward.""",
    },
    {
        "id": "yui-cloudy",
        "display": "くもり",
        "still": "beast_cloudy.png",
        "desc": "A sheep-like weather beast covered in dense cumulus-shaped curls, with sleepy half-lidded eyes.",
        "notes": """\
Species read: a sheep/poodle-like quadruped.
Fur: dense tight curls in white and pale grey, massed into rounded lobes like cumulus cloud.
Ears: long drop ears that hang clearly BELOW and OUTSIDE the curly mass.
  CORRECTION: in the previous version the drop ears were buried in the curls and could not be
  identified at all. Draw the ears one value darker than the curls, with a separating outline
  at least 3px wide inside the 192x208 cell, and keep their silhouette clear of the curl mass.
Eyes: sleepy, half-lidded, while still showing the amber iris and two catchlights.
Tail: a short curly puff.""",
    },
    {
        "id": "yui-rainy",
        "display": "あめ",
        "still": "beast_rainy.png",
        "desc": "An otter-like weather beast with a slicked wet coat, webbed feet, and droplets on its back.",
        "notes": """\
Species read: an otter-like quadruped.
Fur: short, slicked-down, wet-looking coat in blue-grey with a paler throat.
Marking: three to five water droplets resting ON the back, each drawn as an opaque attached
  shape with an outline at least 3px wide. The droplets must touch and overlap the body
  silhouette. Never draw them floating free of the body.
Feet: webbed, with the webbing visible between the toes.
Tail: thick at the base and tapering, carried low.""",
    },
    {
        "id": "yui-snow",
        "display": "ゆき",
        "still": "beast_snow.png",
        "desc": "A rabbit-like weather beast in a straight dense winter coat with black-tipped ears and tail.",
        "notes": """\
Species read: a rabbit/stoat-like quadruped.
Fur: straight, dense winter coat, near-white with faint cool blue shadow.
Ears: long, upright and straight.
Marking: solid black tips on both ear ends and on the tail tip, each drawn as a solid block
  at least 3px wide inside the 192x208 cell.
Build: CORRECTION: in the previous version this character came out rounder and heavier than
  the other six. Keep it as slender as the shared identity lock specifies — body length about
  1.6x shoulder height, back line horizontal, belly above the elbow.""",
    },
    {
        "id": "yui-thunder",
        "display": "かみなり",
        "still": "beast_thunder.png",
        "desc": "A wolf-like weather beast with stiff spiked fur and a bright yellow lightning marking.",
        "notes": """\
Species read: a wolf-like quadruped.
Fur: dark blue-grey, standing up in stiff spiky tufts along the neck, back and tail.
Marking: one lightning bolt on each flank in bright yellow, drawn as a single thick zigzag
  stroke at least 3px wide inside the 192x208 cell.
  NOTE: this exact marking specification is the one that survived at sprite size in the
  previous version. Reproduce it the same way.
Tail: straight and spiked rather than plumed.""",
    },
    {
        "id": "yui-rainbow",
        "display": "にじ",
        "still": "beast_rainbow.png",
        "desc": "A deer-like weather beast, nearly achromatic, with two translucent spectrum antler arcs.",
        "notes": """\
Species read: a deer-like quadruped.
Fur: unbleached off-white, almost achromatic. The BODY carries no rainbow colour at all —
  the spectrum belongs only to the antlers.
Antlers: TWO SEPARATE ARCS, one rising from each side of the head, translucent with a
  spectrum gradient running through them.
  CORRECTION — this is the single most important fix for this character: in BOTH previous
  attempts the two arcs closed together into a ring or halo above the head. They must not.
  The two arc tips must stay apart, with a gap between the tips equal to the width of the
  head. Each arc ends in a free, open, unconnected tip. There is no ring, no circle, no halo,
  no closed loop above the head in any frame.
Tail: short.""",
    },
    {
        "id": "yui-wind",
        "display": "かぜ",
        "still": "beast_wind.png",
        "desc": "A long-bodied weasel-like weather beast whose flank and tail guard hairs sweep backward.",
        "notes": """\
Species read: a weasel-like quadruped, noticeably long in the body.
Proportion override for this one character only: body length is about 2.0x the shoulder
  height instead of 1.6x. Every other item in the shared identity lock still applies.
Fur: pale green-grey base with a clearly darker mid-tone stripe running down the back.
  Long guard hairs at the flanks and along the tail sweep backward.
Contrast: CORRECTION: in the previous version this was the lowest-contrast character of the
  seven and it dissolved into the background when drawn small. Give it a distinctly darker
  dorsal stripe and a darker outline so the silhouette still reads at 192x208.
Note: the backward sweep of the fur is drawn as actual hair on the body. Do not draw wind
  streaks, speed lines, motion arcs, or any detached effect.""",
    },
    # --- 第3弾（2026-08-15）。骨格v2でパラメータ空間の穴を埋めるために追加した3体 ---
    {
        "id": "yui-fog",
        "display": "きり",
        "still": "beast_fog.png",
        "desc": "A long-haired dog-like weather beast whose coat fades away into the air at the tips.",
        "notes": """\
Species read: a long-haired dog/cat-like quadruped, low and broad.
Fur: an extremely long, fine, straight coat in pale silver-grey with lavender in its depths,
  hanging straight down and drifting outward at the tips.
Signature trait — read this carefully, it is the whole point of this character:
  the coat is dense and OPAQUE close to the body, and becomes progressively finer, paler and
  more transparent toward the tips, so that the outline SOFTENS at the belly fringe, the leg
  fur and the tail tip. The body core stays fully opaque and the silhouette stays readable.
  This is drawn as the character's own fur fading, using per-hair alpha at the tips.
  Do NOT draw mist, haze, clouds, particles or any detached effect in the air around it.
Ears: small, low, rounded, sitting close to the skull inside the fur.
Eyes: use the shared eye construction, wide open, but the iris is a pale milky grey-white
  instead of amber. This is the ONE permitted departure from the shared identity lock, and it
  is deliberate: this character's gaze is meant to read as unfocused.
Tail: long and plume-like, with the same fading tips.
Contrast note: this is a deliberately low-contrast character. Keep a visible outline on the
  body core so it does not dissolve entirely at 192x208.""",
    },
    {
        "id": "yui-hail",
        "display": "ひょう",
        "still": "beast_hail.png",
        "desc": "A dark slate-furred weather beast wearing a cape of pale ice pellets over its back.",
        "notes": """\
Species read: a rounded, softly built quadruped — a cub-like animal, not armored or reptilian.
Fur: DEEP storm-slate grey plush fur on the face, throat, chest, belly and legs. This is a
  dark character — mid-to-dark in value, in the same value range as the thunder character.
  Do not lighten it toward white or pale grey.
Marking — the cape: the back and the top of the tail are covered by neat overlapping rows of
  small rounded ice pellets, each pellet roughly the size of the eye, pale silver-white and
  translucent at the rim. Each pellet is drawn with an outline at least 3px wide inside the
  192x208 cell. The pale pellets against the dark fur is this character's read at sprite size:
  keep that contrast strong in every frame.
  The cape covers the back and tail ONLY. The face, cheeks, throat, chest, belly and legs
  stay dark plush fur.
Ears: small and rounded, standing clear of the head so the ear shape reads at a glance.
Expression: gentle and friendly. Large round eyes set under a smooth open forehead.
  CORRECTION: an earlier version of this character was drawn with a heavy brow and a braced,
  lowered head, and it came out intimidating and out of place beside the others in the series.
  Keep the head carried level, the brow smooth, and the expression soft.
Tail: short, thick, rounded at the tip.""",
    },
    {
        "id": "yui-diamonddust",
        "display": "ダイヤモンドダスト",
        "still": "beast_diamonddust.png",
        "desc": "A tiny round dormouse-like weather beast whose colorless ice-needle coat scatters points of spectral light.",
        "notes": """\
Species read: a very small, round, dome-backed quadruped like a dormouse or a hedgehog.
Proportion override for this one character only — this character intentionally breaks the
  shared proportions, and that difference is the point. It is the smallest of the series:
  - body length is about 1.1x the shoulder height (round, not elongated)
  - the head is about 1/2 of the body length (large for the body)
  - the back line is gently domed rather than horizontal
  - the legs are very short, so the belly sits close to the ground
  - it is drawn noticeably SMALLER within its cell than the other characters:
    target about 70% of the height the other characters fill in the same 192x208 cell.
    The extra empty margin is intentional and communicates its size.
  Every other item in the shared identity lock (eyes, nose, paw pads, style) still applies.
Fur: a coat of countless fine straight needles standing slightly away from the body, clear
  and colorless like window frost, reading as a soft glassy halo of texture rather than fur.
  The body is colorless and near-white with the palest grey-blue in shadow.
Marking: where light strikes the needles the color breaks into small ISOLATED POINTS of pure
  spectral color — scattered sparks of pink, cyan and gold. Each spark is a small bright dot.
  They are never bands, arcs, gradients, rings or halos, and they never join into a rainbow.
  At 192x208 keep only a handful of the brightest sparks rather than many faint ones.
Ears: small and round, held close to the head.
Tail: short and round, covered in the same needles.""",
    },
]

# ★ 前回6体を全滅させた原因への対処。品質基準は「門」ではなく「目標」だと明示する
STOP_POLICY = """\
STOP / CONTINUE POLICY — read this twice. This is the most important instruction in this task.

The previous run of this exact job produced ZERO output for six of seven characters. The cause
was not image quality. The cause was that a dimension target was written as a pass/fail gate,
the target turned out to be physically unreachable for a long-bodied quadruped, and the run
stopped at the gate instead of delivering anything.

Therefore:

You may STOP and report failure ONLY for these three reasons:
  1. A row cannot be generated at all after its retries.
  2. Frames are missing from a generated row.
  3. validate_atlas.py fails.

You must NOT stop, and must NOT skip packaging, for any of these:
  - sprite width or height varying between frames or between rows
  - a sprite touching or nearly touching the edge of its cell
  - a row rendering smaller or larger than other rows
  - any dimension, size, or margin target being missed
These are GOALS, not GATES. Note them and keep going.

Retry a genuinely failing row at most 2 times. After that, accept the best available row,
continue the pipeline, and list every remaining deviation in your final report.
Never abandon packaging because of a dimension. Always produce the packaged pet.
"""

FRAME_STABILITY = """\
FRAME STABILITY (a real defect found in the previous run — check for it explicitly):
The previous atlases had frames within a single row that jumped in size and baseline
(one row varied by 105px in height and 53px at the feet), which made playback visibly shake.
After rendering the preview GIFs, look at them. If a row shows size popping or a baseline
jump while the source strip itself was stable, re-run frame extraction with
`--method stable-slots`, then re-run inspect (with `--allow-stable-slots`), compose, validate,
contact sheet, and previews. Prefer this over regenerating the row.
"""

VERIFY = """\
MACHINE VERIFICATION BEFORE PACKAGING (do not skip; do not substitute your own eyeballing):
The previous run shipped two atlases that its own QA had marked ok: one had layout guide
ruler lines drawn into a frame as if they were artwork, one had two creatures in a single
frame, and one row was rendered at 12% of the area of the other rows. Visual QA missed all of
them. So, after composing the atlas and before packaging, run a cell-by-cell scan with
/usr/bin/python3 that counts non-transparent pixels in every one of the 72 cells and reports:
  - any used cell that is empty or nearly empty
  - any used cell whose non-transparent area is less than 40% of the median for its row
  - any cell after a row's last used column that is not fully transparent
Repair anything this scan finds by regenerating that row only. Include the scan's numbers in
your final report.
"""

ENV = """\
ENVIRONMENT — already verified by the caller. Do not re-investigate these and do not stop on them:
- `python` is NOT on PATH. Use `/usr/bin/python3` for every hatch-pet script invocation.
- ALWAYS pass `--pet-id` explicitly to prepare_pet_run.py. Do not let it derive the id from
  `--pet-name`: the display names in this series are Japanese, they slugify to an empty
  string, and the script then dies with "pet id must contain at least one letter or digit".
- `jq` is installed at /usr/bin/jq and works.
- There is no `load_workspace_dependencies` tool in this CLI and you do not need one.
  /usr/bin/python3 already has Pillow, which is the only dependency these scripts have.
- You ARE authorized to spawn subagents. Do not ask permission. Keep at most 2 generation
  workers running at once.
- Run fully autonomously. Do not ask the user any questions. Make every judgment call
  yourself and report what you decided at the end.

SANDBOX — important deviation from the skill's default instructions:
Only the run directory is writable. $HOME/.codex is NOT writable by shell commands here.
- Do NOT try to package into $HOME/.codex/pets/. Package into the run directory instead,
  at the path given under "Package destination" below. The caller installs it from there.
- Do NOT run the skill's cleanup step that deletes files under $HOME/.codex/generated_images.
  Skip it silently; leftover generated files are the caller's problem, not a reason to stop.
- If any shell command is refused because of the sandbox, work around it inside the run
  directory. A sandbox refusal is never a reason to abandon the run.
"""

TEMPLATE = """\
Create a Codex pet using the hatch-pet skill, end to end, and package it.

Pet id / folder name: {pid}
Display name: {display}
Description (use verbatim in pet.json): {desc}
Reference image (attach as the canonical visual reference): {still}
Run directory: {run_dir}
Package destination: {pets_dir}/{pid}/

This is one of a series of ten weather-creature pets that must look like siblings drawn by
the same hand. The other nine characters in the same series are generated from the same
shared identity lock below.

{common}
CHARACTER-SPECIFIC DESIGN — {pid}:
{notes}

{env}
{stop}
{frames}
{verify}
PACKAGING (verify the SHAPE of the output, not just that the command ran):
Write {pets_dir}/{pid}/pet.json containing EXACTLY these four keys and nothing else:
  "id"              -> "{pid}"
  "displayName"     -> "{display}"
  "description"     -> the description string above
  "spritesheetPath" -> "spritesheet.webp"
Then read the file back and confirm those four key names are present and no others.
In the previous run three of seven pet.json files came out with different key names
(pet_id / petId / spritesheet / a 23-key internal manifest) and those pets could not be
loaded at all. A successful generation is not the same thing as a usable deliverable.
Also copy the atlas to {pets_dir}/{pid}/spritesheet.webp and confirm it is 1536x1872.

FINAL REPORT — end your response with exactly these lines:
pet_id={pid}
atlas={pets_dir}/{pid}/spritesheet.webp
atlas_size=<width>x<height>
pet_json_keys=<comma-separated key names actually written>
contact_sheet=<absolute path>
cell_scan=<pass, or a list of the cells that failed the scan>
deviations=<remaining known deviations, or none>
"""


def main() -> None:
    prompt_dir = RUNS / "prompts"
    prompt_dir.mkdir(parents=True, exist_ok=True)
    pets_dir = RUNS / "package"

    for pet in PETS:
        still = STILLS / pet["still"]
        if not still.exists():
            raise SystemExit(f"reference still missing: {still}")
        text = TEMPLATE.format(
            pid=pet["id"],
            display=pet["display"],
            desc=pet["desc"],
            still=still,
            run_dir=RUNS / pet["id"],
            pets_dir=pets_dir,
            common=COMMON_IDENTITY,
            notes=pet["notes"],
            env=ENV,
            stop=STOP_POLICY,
            frames=FRAME_STABILITY,
            verify=VERIFY,
        )
        out = prompt_dir / f"{pet['id']}.txt"
        out.write_text(text, encoding="utf-8")
        print(f"wrote {out} ({len(text)} chars)")


if __name__ == "__main__":
    main()
