#!/usr/bin/env python3
"""壊れた行だけを作り直すためのプロンプトを作る。

vault の記録より、修復経路は全体再生成より一桁安い:
  1体まるごと 14〜22ジョブ / 15〜37分
  1〜3行の修復  2〜4ジョブ / 8〜15分
壊れた行が分かっているなら、作り直さずに修復を指示する。

使い方:
  /usr/bin/python3 build_repair_prompt.py <pet-id> <row> "<何が壊れているか>"
"""
from __future__ import annotations

import sys
from pathlib import Path

RUNS = Path.home() / "Documents/yui-game/hatch-pet-runs"

TEMPLATE = """\
Repair ONE broken row of an existing hatch-pet run. Do not regenerate the whole pet.

Run dir: {run}
Pet id: {pid}
Broken row: {row}

WHAT IS WRONG WITH THIS ROW
{reason}

WHAT TO DO
1. Read {run}/prompts/ to find the existing prompt for the `{row}` row, and read
   {run}/imagegen-jobs.json for that job's input images.
2. Regenerate ONLY that row with $imagegen, attaching the same input images the job lists:
   the canonical base at {run}/references/canonical-base.png and the layout guide at
   {run}/references/layout-guides/{row}.png. Add the correction described above to the
   prompt. Keep everything else about the row identical.
3. Copy the new strip over {run}/decoded/{row}.png, keeping that job marked complete with
   the new source_path and completed_at.
4. Re-run the deterministic pipeline over the whole run with /usr/bin/python3:
   extract_strip_frames.py (use --method stable-slots), inspect_frames.py
   (with --allow-stable-slots), compose_atlas.py, validate_atlas.py, make_contact_sheet.py.
5. Copy the rebuilt atlas over {run}/../package/{pid}/spritesheet.webp.
   Leave pet.json exactly as it is — it is already correct.

FRAME SLOT RULE — this is what broke the row, so make it explicit in the regeneration prompt:
The strip is cut into {frames} equal slots of equal width. Every pose must sit COMPLETELY
INSIDE its own slot, centred in it, with clear empty chroma-green margin on both sides.
Draw exactly {frames} poses, evenly spaced across the full width of the strip, with the same
horizontal gap between every neighbouring pair. Do not bunch the poses together, do not leave
a large empty region at either end, and never let one pose touch or overlap the next. A pose
that crosses a slot boundary gets sliced in half when the strip is cut.

ENVIRONMENT — verified by the caller, do not re-investigate:
- `python` is NOT on PATH. Use `/usr/bin/python3`.
- `jq` is at /usr/bin/jq.
- $HOME/.codex is NOT writable here. Do not package there and do not run the cleanup step
  that deletes files under $HOME/.codex/generated_images.
- You may spawn subagents without asking. Run autonomously and ask the user nothing.

STOP POLICY: you may stop only if the row cannot be generated at all, frames are missing, or
validate_atlas.py fails. Size variation, cell-edge proximity and dimension targets are goals,
not gates — note them and continue to a rebuilt atlas.

Verify before finishing: open the rebuilt row in the new contact sheet and confirm the defect
described above is gone and that each of the {frames} cells contains exactly one whole,
unsliced creature.

Return exactly:
pet_id={pid}
row={row}
atlas={runs}/package/{pid}/spritesheet.webp
fixed=<yes|no>
note=<one sentence>
"""

FRAME_COUNTS = {
    "idle": 6, "running-right": 8, "running-left": 8, "waving": 4, "jumping": 5,
    "failed": 8, "waiting": 6, "running": 6, "review": 6,
}


def main() -> None:
    if len(sys.argv) != 4:
        raise SystemExit(__doc__)
    pid, row, reason = sys.argv[1], sys.argv[2], sys.argv[3]
    if row not in FRAME_COUNTS:
        raise SystemExit(f"unknown row: {row}")

    out_dir = RUNS / "repair-prompts"
    out_dir.mkdir(parents=True, exist_ok=True)
    out = out_dir / f"{pid}_{row}.txt"
    out.write_text(
        TEMPLATE.format(run=RUNS / pid, runs=RUNS, pid=pid, row=row,
                        reason=reason, frames=FRAME_COUNTS[row]),
        encoding="utf-8",
    )
    print(out)


if __name__ == "__main__":
    main()
