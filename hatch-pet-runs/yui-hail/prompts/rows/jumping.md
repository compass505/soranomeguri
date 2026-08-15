Create one horizontal animation strip for Codex pet `yui-hail`, state `jumping`.

Use the attached canonical base for identity. Use the attached layout guide only for slot count, spacing, centering, and padding; do not draw the guide.

Output exactly 5 full-body frames in one left-to-right row on flat pure yellow #FFFF00. Treat the row as 5 invisible equal-width slots: one centered complete pose per slot, evenly spaced, with no overlap, clipping, empty slots, labels, or borders.

Identity: same pet in every frame: Yui weather-series sibling. Four-legged cub-like quadruped standing and moving on ground, body length 1.6x shoulder height, head 1/3 body length, horizontal back, belly above elbow. Deep storm-slate plush fur, dark mid-to-dark value. Small rounded standing ears, level head, smooth open brow, gentle friendly expression, large round amber/honey eyes with round dark pupils, drawn upper lash line and exactly two catchlights per eye, small dark nose, visible paw pads, short thick rounded tail. Neat overlapping rows of pale silver-white translucent-rimmed ice pellets cover back and top of tail only; each pellet must retain a 3px minimum outline at final 192x208 cell scale and stay strongly contrasted against dark fur. Face, cheeks, throat, chest, belly and legs remain dark plush fur. Painterly cel-shaded game-creature art, clean readable outline, soft warm rendering, flat-lit palette matching reference. No text, logos, scenery, ground shadow, guide marks, detached effects.. Preserve silhouette, face, proportions, markings, palette, material, style, and props.
Style: Pet-safe sprite: compact full-body mascot, readable in a 192x208 cell, clear silhouette, simple face, stable palette/materials, and crisp edges for chroma-key extraction. Style `painterly`: Painterly mascot with simplified brush texture, readable forms, stable palette, and enough edge clarity for clean extraction. User style notes: Match the attached beast_hail.png rendering exactly; preserve shared identity lock numerically and keep cape contrast legible at sprite size..
Animation continuity: keep apparent pet scale and baseline stable within the row unless the state itself intentionally changes vertical position, such as `jumping`. Move the pose within the slot instead of redrawing the pet larger or smaller frame to frame.

State action: Hover jump loop: anticipation, lift, airborne peak, descent, and settle through body height.

State requirements:
- Show the jump through pose and vertical body position only: anticipation, lift, airborne peak, descent, settle.
- Do not draw ground shadows, contact shadows, drop shadows, oval shadows, landing marks, dust, smears, bounce pads, or motion marks under the pet.
- Keep the background outside the pet perfectly flat chroma key with no darker key-colored patches.

Clean extraction: crisp opaque edges, safe padding, no scenery, text, guide marks, checkerboard, shadows, glows, motion blur, speed lines, dust, detached effects, stray pixels, or chroma-key colors inside the pet.
