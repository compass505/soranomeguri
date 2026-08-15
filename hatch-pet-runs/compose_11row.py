#!/usr/bin/env python3
"""9行アトラス + look用の2本のストリップ → 11行アトラス（1536x2288）を組む。

現行の hatch-pet は9行（9状態）しか作らない。前バージョンにあった look 2行
（16方向の視線）が消えているため、ゲーム側で必要な視線追従を別途足す。
Codexアプリの9行契約には縛られない（このアトラスを読むのは自作Webのため）。

行の割り当て:
   0-8  hatch-pet の9状態（元のアトラスをそのまま貼る）
   9    look 000-157.5  （22.5度刻みの8方向）
  10    look 180-337.5  （残りの8方向）

look ストリップの切り出しは hatch-pet の extract_strip_frames.py を再利用する。
8コマの行として扱わせるため、一時ディレクトリに running-right.png として置く
（スクリプト側を書き換えないための回避。ROW_FRAME_COUNTS["running-right"] == 8）。

使い方:
  /usr/bin/python3 compose_11row.py \
      --atlas   <9行アトラス.webp> \
      --look-a  <look 000-157.5 のストリップ.png> \
      --look-b  <look 180-337.5 のストリップ.png> \
      --chroma  '#RRGGBB' \
      --output  <11行アトラス.webp>
"""
from __future__ import annotations

import argparse
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

from statistics import median

from PIL import Image

CELL_W, CELL_H = 192, 208
COLS = 9 - 1  # 8列
BASE_ROWS = 9
LOOK_ROWS = 2
TOTAL_ROWS = BASE_ROWS + LOOK_ROWS

SKILL_SCRIPTS = Path.home() / ".codex/skills/hatch-pet/scripts"
PYTHON = "/usr/bin/python3"


def extract_strip(strip: Path, chroma: str, workdir: Path, method: str) -> list[Image.Image]:
    """1本のストリップを8枚の192x208フレームに切り出す。"""
    decoded = workdir / "decoded"
    decoded.mkdir(parents=True, exist_ok=True)
    # 8コマの行として扱わせるための名前
    shutil.copy(strip, decoded / "running-right.png")

    out = workdir / "frames"
    cmd = [
        PYTHON, str(SKILL_SCRIPTS / "extract_strip_frames.py"),
        "--decoded-dir", str(decoded),
        "--output-dir", str(out),
        "--states", "running-right",
        "--method", method,
    ]
    if chroma:
        cmd += ["--chroma-key", chroma]
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        sys.exit(f"フレーム切り出しに失敗: {strip}\n{result.stdout}\n{result.stderr}")

    frame_dir = out / "running-right"
    frames = sorted(frame_dir.glob("*.png"))
    if len(frames) != 8:
        sys.exit(f"{strip}: 8コマ取れなかった（{len(frames)}コマ）")
    return [Image.open(f).convert("RGBA") for f in frames]


def normalize_look_frames(frames: list[Image.Image]) -> list[Image.Image]:
    """16コマの高さと足元を揃える。

    look行は「同じ姿勢のまま向きだけ変わる」ので、高さは本来一定になるはず。
    実際には2本のストリップが別々に生成されるため縮尺がずれる（雨は look-a が
    look-b の6割で描かれた）。このままだと視線が157.5度から180度へ移った瞬間に
    キャラの大きさが飛ぶ。横幅は向きによって変わってよいので、縦だけを合わせる。
    """
    boxes = [f.getchannel("A").point(lambda v: 255 if v > 8 else 0).getbbox() for f in frames]
    heights = [b[3] - b[1] for b in boxes if b]
    if not heights:
        return frames
    target_h = int(median(heights))
    target_foot = int(median([b[3] for b in boxes if b]))

    out: list[Image.Image] = []
    for frame, box in zip(frames, boxes):
        if not box:
            out.append(frame)
            continue
        sprite = frame.crop(box)
        scale = target_h / (box[3] - box[1])
        new_size = (max(1, round(sprite.width * scale)), max(1, round(sprite.height * scale)))
        sprite = sprite.resize(new_size, Image.LANCZOS)

        cell = Image.new("RGBA", (CELL_W, CELL_H), (0, 0, 0, 0))
        x = (CELL_W - sprite.width) // 2           # 横は中央に置く
        y = target_foot - sprite.height            # 足元を共通の線に合わせる
        cell.alpha_composite(sprite, (max(0, x), max(0, min(y, CELL_H - sprite.height))))
        out.append(cell)
    return out


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--atlas", required=True, type=Path)
    ap.add_argument("--look-a", required=True, type=Path)
    ap.add_argument("--look-b", required=True, type=Path)
    ap.add_argument("--chroma", default="")
    ap.add_argument("--method", default="stable-slots",
                    help="look行は向きが変わるだけで位置は動かないので既定は stable-slots")
    ap.add_argument("--output", required=True, type=Path)
    args = ap.parse_args()

    base = Image.open(args.atlas).convert("RGBA")
    if base.size != (COLS * CELL_W, BASE_ROWS * CELL_H):
        sys.exit(f"元アトラスの寸法が想定外: {base.size}")

    with tempfile.TemporaryDirectory() as tmp:
        tmpdir = Path(tmp)
        look_a = extract_strip(args.look_a, args.chroma, tmpdir / "a", args.method)
        look_b = extract_strip(args.look_b, args.chroma, tmpdir / "b", args.method)

    # 2本まとめて正規化する。行をまたいだ縮尺のずれもここで吸収される。
    look_a, look_b = (lambda n: (n[:8], n[8:]))(normalize_look_frames(look_a + look_b))

    atlas = Image.new("RGBA", (COLS * CELL_W, TOTAL_ROWS * CELL_H), (0, 0, 0, 0))
    atlas.paste(base, (0, 0))
    for row, frames in enumerate((look_a, look_b), start=BASE_ROWS):
        for col, frame in enumerate(frames):
            atlas.paste(frame, (col * CELL_W, row * CELL_H))

    # 完全透過画素にRGBの残りかすを残さない（hatch-pet と同じ不変条件）
    pixels = atlas.load()
    for y in range(atlas.height):
        for x in range(atlas.width):
            if pixels[x, y][3] == 0:
                pixels[x, y] = (0, 0, 0, 0)

    args.output.parent.mkdir(parents=True, exist_ok=True)
    atlas.save(args.output, "WEBP", lossless=True)
    print(f"wrote {args.output}  {atlas.width}x{atlas.height}  {TOTAL_ROWS}行")


if __name__ == "__main__":
    main()
