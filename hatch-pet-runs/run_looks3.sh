#!/bin/zsh
set -u
RUNS="$HOME/Documents/yui-game/hatch-pet-runs"
LOGS="$RUNS/logs"; mkdir -p "$LOGS" "$RUNS/look-strips"
JOBS=(yui-fog_look-a yui-fog_look-b yui-hail_look-a yui-hail_look-b yui-diamonddust_look-a yui-diamonddust_look-b)
MAX=2
for j in $JOBS; do
  while [ "$(jobs -r | wc -l | tr -d ' ')" -ge "$MAX" ]; do sleep 15; done
  (
    echo "[$(date +%H:%M:%S)] START $j" >> "$LOGS/driver_looks3.log"
    cd "$RUNS"
    codex exec -m gpt-5.6-luna -s workspace-write --add-dir "$HOME/.codex" \
      -c approval_policy='"never"' --skip-git-repo-check \
      - < "$RUNS/look-prompts/$j.txt" > "$LOGS/look_$j.log" 2>&1
    echo "[$(date +%H:%M:%S)] END   $j rc=$?" >> "$LOGS/driver_looks3.log"
  ) &
  sleep 4
done
wait
echo "[$(date +%H:%M:%S)] LOOKS DONE" >> "$LOGS/driver_looks3.log"
