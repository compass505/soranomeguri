Create one horizontal animation strip for Codex pet `yui-thunder`, state `running-right`.

Use the attached canonical base for identity. Use the attached layout guide only for slot count, spacing, centering, and padding; do not draw the guide.

Output exactly 8 full-body frames in one left-to-right row on flat pure green #00FF00. Treat the row as 8 invisible equal-width slots: one centered complete pose per slot, evenly spaced, with no overlap, clipping, empty slots, labels, or borders.

Identity: same pet in every frame: Series sibling identity lock: four-legged beast standing and moving on the ground, not bipedal and not a mascot blob; body length 1.6x shoulder height; head 1/3 of body length; horizontal back line when standing; belly line above the elbow. Eyes have amber/honey irises, round dark pupils, a drawn upper lash line, and exactly two catchlights. Small dark nose and visible paw pads. Painterly cel-shaded game-creature art with clean readable outline, soft warm rendering, flat lit palette; match the attached reference rendering exactly. No text, logos, scenery, ground shadow. Character: wolf-like quadruped, dark blue-grey fur in stiff spiky tufts along neck, back, tail; straight spiked tail rather than plumed; one bright yellow lightning bolt on each flank, each a single thick zigzag stroke at least 3px wide at final 192x208 cell size, simplify if needed but preserve width and visibility. Keep one centered full-body pet per frame, complete unclipped paws and tail, consistent sibling proportions and palette across rows.. Preserve silhouette, face, proportions, markings, palette, material, style, and props.
Style: Pet-safe sprite: compact full-body mascot, readable in a 192x208 cell, clear silhouette, simple face, stable palette/materials, and crisp edges for chroma-key extraction. Style `painterly`: Painterly mascot with simplified brush texture, readable forms, stable palette, and enough edge clarity for clean extraction. User style notes: Warm painterly cel-shaded creature game art matching canonical reference; crisp dark outline, readable at 192x208, flat removable chroma background, no shadows or scenery..
Animation continuity: keep apparent pet scale and baseline stable within the row unless the state itself intentionally changes vertical position, such as `jumping`. Move the pose within the slot instead of redrawing the pet larger or smaller frame to frame.

State action: Dragging-right loop: show directional movement to the right through body and limb poses only.

State requirements:
- Show directional drag movement to the right through body, limb, and prop movement only.
- The row must unmistakably face and travel right.
- The movement cadence must alternate visibly across the 8 frames instead of repeating one nearly static stride.
- Do not draw speed lines, dust clouds, floor shadows, motion trails, or detached motion effects.

Clean extraction: crisp opaque edges, safe padding, no scenery, text, guide marks, checkerboard, shadows, glows, motion blur, speed lines, dust, detached effects, stray pixels, or chroma-key colors inside the pet.
