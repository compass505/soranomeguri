#!/usr/bin/env python3
"""アトラスをセル単位で走査する。相手のQAが通したことを合格と見なさないための検算。

前回の実害（vault 03_キャラクター/README.md「目視だけでは足りない」）:
  - 雪 failed の5コマ目にレイアウトガイドの罫線が絵として描き込まれていた
  - 雪 idle の1コマ目に生き物が2体写っていた
  - 風 look10 の8方向すべてが他行の12%の面積しかなかった
  - 行の中のコマ同士が揃わず、再生すると激しくぶれた（雨idleで高さ105px伸縮・足元53px上下）
どれもCodex側のQAは ok: true で通していた。

使い方:
  /usr/bin/python3 verify_atlas.py <spritesheet.webp> [...]
"""
from __future__ import annotations

import sys
from pathlib import Path
from statistics import median

from PIL import Image

CELL_W, CELL_H = 192, 208
COLS = 8

# 各行の使用コマ数（hatch-pet references/animation-rows.md）
ROW_SPEC = [
    ("idle", 6),
    ("running-right", 8),
    ("running-left", 8),
    ("waving", 4),
    ("jumping", 5),
    ("failed", 8),
    ("waiting", 6),
    ("running", 6),
    ("review", 6),
]
# look行を足した11行版のときに使う
LOOK_SPEC = [("look-000-157", 8), ("look-180-337", 8)]

# 判定のしきい値
OUTLIER_RATIO = 0.40   # 行の中央値に対してこれを下回るコマは「はずれ」

# ぶれは行の意味で扱いを変える。jumping や failed の上下動は演技そのもので欠陥ではない。
# 位置が動かないはずの行だけを欠陥として扱い、それ以外は参考値として出すに留める。
# （ゲーム側で足元固定・高さスケールの実行時補正を入れるので、多少のぶれは吸収できる）
JITTER_STRICT = {"idle", "waving", "look-000-157", "look-180-337"}
JITTER_H_PX = 16
JITTER_FOOT_PX = 10

# 1セルに写っている塊の数。2つ以上あれば、セル幅を超えたスプライトが
# 切られて隣のポーズの断片が入り込んでいる（曇りの failed 行で実害が出た形）。
# hatch-pet は分離した装飾を禁じているので、正常なコマは必ず1塊になる。
MIN_COMPONENT_PX = 300

# 行どうしの大きさの差。全行の中央値に対してこれを下回る行は縮んで見える。
ROW_SIZE_RATIO = 0.65


def cell_stats(img: Image.Image, row: int, col: int) -> dict:
    box = (col * CELL_W, row * CELL_H, (col + 1) * CELL_W, (row + 1) * CELL_H)
    cell = img.crop(box)
    alpha = cell.getchannel("A")
    data = list(alpha.getdata())
    count = sum(1 for v in data if v > 8)
    bbox = alpha.point(lambda v: 255 if v > 8 else 0).getbbox()

    # セル内の塊を数える（4近傍の連結成分）。小さすぎる塊は輪郭のノイズなので無視。
    solid = [v > 8 for v in data]
    seen = bytearray(CELL_W * CELL_H)
    components = 0
    for start in range(CELL_W * CELL_H):
        if not solid[start] or seen[start]:
            continue
        stack, size = [start], 0
        seen[start] = 1
        while stack:
            i = stack.pop()
            size += 1
            x, y = i % CELL_W, i // CELL_W
            if x > 0 and solid[i - 1] and not seen[i - 1]:
                seen[i - 1] = 1; stack.append(i - 1)
            if x < CELL_W - 1 and solid[i + 1] and not seen[i + 1]:
                seen[i + 1] = 1; stack.append(i + 1)
            if y > 0 and solid[i - CELL_W] and not seen[i - CELL_W]:
                seen[i - CELL_W] = 1; stack.append(i - CELL_W)
            if y < CELL_H - 1 and solid[i + CELL_W] and not seen[i + CELL_W]:
                seen[i + CELL_W] = 1; stack.append(i + CELL_W)
        if size >= MIN_COMPONENT_PX:
            components += 1
    return {"count": count, "bbox": bbox, "components": components}


def verify(path: Path) -> bool:
    img = Image.open(path).convert("RGBA")
    w, h = img.size
    rows_total = h // CELL_H
    spec = ROW_SPEC + (LOOK_SPEC if rows_total == 11 else [])

    print(f"\n=== {path} ===")
    print(f"size {w}x{h}  rows={rows_total}  cells={COLS * rows_total}")

    problems: list[str] = []
    notes: list[str] = []
    row_medians: dict[str, float] = {}
    if w != COLS * CELL_W:
        problems.append(f"幅が {w}px（期待 {COLS * CELL_W}px）")
    if rows_total != len(spec):
        problems.append(f"行数が {rows_total}（仕様は {len(spec)}）")

    for row, (name, used) in enumerate(spec[:rows_total]):
        stats = [cell_stats(img, row, c) for c in range(COLS)]
        used_counts = [s["count"] for s in stats[:used]]
        med = median(used_counts) if used_counts else 0
        row_medians[name] = med

        # 1. 使用セルが空
        for c, s in enumerate(stats[:used]):
            if s["count"] < 200:
                problems.append(f"row{row} {name} col{c}: ほぼ空（{s['count']}px）")

        # 2. 行の中で極端に小さいコマ（風 look10 型の実害）
        for c, s in enumerate(stats[:used]):
            if med and s["count"] < med * OUTLIER_RATIO:
                pct = round(100 * s["count"] / med)
                problems.append(f"row{row} {name} col{c}: 面積が行中央値の{pct}%")

        # 3. 未使用セルに残留がある
        for c, s in enumerate(stats[used:], start=used):
            if s["count"] > 0:
                problems.append(f"row{row} {name} col{c}: 未使用セルに{s['count']}px残っている")

        # 4. 1セルに2つ以上の塊 = スプライトが切られて断片が入り込んでいる
        clipped = [c for c, s in enumerate(stats[:used]) if s["components"] > 1]
        if clipped:
            problems.append(f"row{row} {name}: 切断されたコマ {clipped}"
                            f"（本体と断片に分かれている）")

        # 5. 行内のコマ間のぶれ（再生時の伸縮・足元の上下）
        boxes = [s["bbox"] for s in stats[:used] if s["bbox"]]
        if len(boxes) >= 2:
            heights = [b[3] - b[1] for b in boxes]
            feet = [b[3] for b in boxes]
            dh, df = max(heights) - min(heights), max(feet) - min(feet)
            flag = ""
            if name in JITTER_STRICT and (dh > JITTER_H_PX or df > JITTER_FOOT_PX):
                flag = "  ← 動かないはずの行がぶれている"
                problems.append(f"row{row} {name}: 高さ差{dh}px / 足元差{df}px")
            elif dh > 40 or df > 40:
                flag = "  （演技由来。実行時補正で吸収する）"
                notes.append(f"row{row} {name}: 高さ差{dh}px / 足元差{df}px")
            print(f"  row{row:>2} {name:<14} 中央値{med:>7}px  高さ差{dh:>3}px  足元差{df:>3}px"
                  f"  {'切断あり' if clipped else '        '}{flag}")
        else:
            print(f"  row{row:>2} {name:<14} 中央値{med:>7}px")

    # 6. 行どうしの大きさの差。状態が変わった瞬間にキャラが伸縮して見える原因。
    #    ゲーム側の高さスケール補正で吸収する前提なので、欠陥ではなく参考として出す。
    if row_medians:
        overall = median(list(row_medians.values()))
        for name, m in row_medians.items():
            if overall and m < overall * ROW_SIZE_RATIO:
                notes.append(f"{name}: 面積が全行中央値の{round(100 * m / overall)}%"
                             f"（状態遷移で縮んで見える）")

    if notes:
        print(f"  参考 {len(notes)}件（欠陥ではない）")
        for n in notes:
            print(f"    - {n}")
    if problems:
        print(f"  ✗ 要修復 {len(problems)}件")
        for p in problems:
            print(f"    - {p}")
        return False
    print("  ✓ 修復の必要なし")
    return True


def main() -> None:
    args = sys.argv[1:]
    if not args:
        raise SystemExit(__doc__)
    # 1体落ちても残りを飛ばさない（all の短絡で後続が走らなくなるのを避ける）
    results = [verify(Path(a)) for a in args]
    sys.exit(0 if all(results) else 1)


if __name__ == "__main__":
    main()
