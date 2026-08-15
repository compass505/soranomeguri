#!/usr/bin/env python3
"""アトラスに残ったクロマキーの緑を消す。

hatch-pet の抽出を通しても、スプライトの輪郭に純緑 (0,255,0) が不透過のまま
残っていた（風4.06%・虹2.98%・雷0.98%・曇り0.89%・雨0.50%）。
ゲームで表示すると輪郭に緑のふちとして出る。Codex側のQAは「クロマ検査は綺麗」と
報告していたので、これもこちらで数え直して初めて見つかった類の欠陥。

実測では、残りはほぼ輪郭のふちに集中していた（風のidle 1コマで 輪郭近く379 / 内部6）。
そこで扱いを分ける:
  - 透明画素が近くにある = 背景の取り残し → 透明にする
  - 内部にぽつんとある     = 穴を開けたくない → 周囲の色で塗り替える

体色として緑を持つ風（淡い緑灰）と虹（角のスペクトル）を壊さないよう、
判定は「彩度が高く #00FF00 に近い緑」だけに限る。淡い緑や明るい緑は対象外。

使い方:
  /usr/bin/python3 despill.py <in.webp> <out.webp>
"""
from __future__ import annotations

import sys
from pathlib import Path

from PIL import Image

# クロマの取り残しと見なす条件。体色の緑を巻き込まないよう強めに絞る。
G_MIN = 140       # 緑がこれ以上明るい
RB_MAX = 110      # 赤と青がこれ以下（＝淡い緑・明るい緑は対象外）
SPILL_MIN = 60    # 緑が赤・青の大きいほうをこれ以上上回る
EDGE_RADIUS = 2   # この距離に透明画素があれば「ふち」と見なす


def is_chroma(r: int, g: int, b: int) -> bool:
    return g > G_MIN and r < RB_MAX and b < RB_MAX and g - max(r, b) > SPILL_MIN


def despill(src: Path, dst: Path) -> None:
    img = Image.open(src).convert("RGBA")
    w, h = img.size
    px = img.load()

    targets = [(x, y) for y in range(h) for x in range(w)
               if px[x, y][3] > 8 and is_chroma(*px[x, y][:3])]

    removed = filled = 0
    for x, y in targets:
        near_transparent = False
        for dy in range(-EDGE_RADIUS, EDGE_RADIUS + 1):
            for dx in range(-EDGE_RADIUS, EDGE_RADIUS + 1):
                nx, ny = x + dx, y + dy
                if 0 <= nx < w and 0 <= ny < h and px[nx, ny][3] <= 8:
                    near_transparent = True
                    break
            if near_transparent:
                break

        if near_transparent:
            px[x, y] = (0, 0, 0, 0)      # 背景の取り残し
            removed += 1
        else:
            # 内部。近傍のクロマでない不透過画素の平均で埋め、穴を作らない
            acc = [0, 0, 0]
            n = 0
            for dy in range(-3, 4):
                for dx in range(-3, 4):
                    nx, ny = x + dx, y + dy
                    if not (0 <= nx < w and 0 <= ny < h):
                        continue
                    nr, ng, nb, na = px[nx, ny]
                    if na > 8 and not is_chroma(nr, ng, nb):
                        acc[0] += nr; acc[1] += ng; acc[2] += nb; n += 1
            if n:
                px[x, y] = (acc[0] // n, acc[1] // n, acc[2] // n, px[x, y][3])
                filled += 1

    dst.parent.mkdir(parents=True, exist_ok=True)
    img.save(dst, "WEBP", lossless=True)
    print(f"{src.name}: 対象{len(targets)}  透明化{removed}  塗り替え{filled} -> {dst}")


def main() -> None:
    if len(sys.argv) != 3:
        raise SystemExit(__doc__)
    despill(Path(sys.argv[1]), Path(sys.argv[2]))


if __name__ == "__main__":
    main()
