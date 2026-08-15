#!/bin/zsh
# ゆいゲーム 7体のアトラスを hatch-pet で生成する。
# 同時実行は2体まで（スキル自身が「生成ワーカーは同時2つまで」と定めているため、
# 2体 x 2ワーカー = 同時4ジョブを上限とする）。

set -u
RUNS="$HOME/Documents/yui-game/hatch-pet-runs"
LOGS="$RUNS/logs"
mkdir -p "$LOGS"

PETS=(yui-sunny yui-cloudy yui-rainy yui-snow yui-thunder yui-rainbow yui-wind)
MAX_PARALLEL=2

run_one() {
  local pid="$1"
  local start=$(date +%s)
  echo "[$(date +%H:%M:%S)] START $pid" >> "$LOGS/driver.log"
  cd "$RUNS"
  codex exec \
    -m gpt-5.6-luna \
    -s workspace-write \
    --add-dir "$HOME/.codex" \
    -c approval_policy='"never"' \
    --skip-git-repo-check \
    - < "$RUNS/prompts/$pid.txt" > "$LOGS/$pid.log" 2>&1
  local rc=$?
  local dur=$(( ($(date +%s) - start) / 60 ))
  echo "[$(date +%H:%M:%S)] END   $pid rc=$rc ${dur}min" >> "$LOGS/driver.log"
}

for pid in $PETS; do
  while [ "$(jobs -r | wc -l | tr -d ' ')" -ge "$MAX_PARALLEL" ]; do
    sleep 20
  done
  run_one "$pid" &
  sleep 5
done

wait
echo "[$(date +%H:%M:%S)] ALL DONE" >> "$LOGS/driver.log"
