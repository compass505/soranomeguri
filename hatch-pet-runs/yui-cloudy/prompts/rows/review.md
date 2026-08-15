Create one horizontal animation strip for Codex pet `yui-cloudy`, state `review`.

Use the attached canonical base for identity. Use the attached layout guide only for slot count, spacing, centering, and padding; do not draw the guide.

Output exactly 6 full-body frames in one left-to-right row on flat pure green #00FF00. Treat the row as 6 invisible equal-width slots: one centered complete pose per slot, evenly spaced, with no overlap, clipping, empty slots, labels, or borders.

Identity: same pet in every frame: Four-legged sheep/poodle-like weather beast, standing and moving on the ground, body length 1.6x shoulder height, head 1/3 of body length, horizontal back line, belly above elbow. Dense tight curls in white and pale grey, massed into rounded cumulus lobes. Long drop ears clearly below and outside curl mass, one value darker than curls, with a clear separating outline at least 3px in the final 192x208 cell. Sleepy half-lidded eyes with amber/honey irises, round dark pupils, drawn upper lash line, exactly two catchlights; small dark nose; visible paw pads; short curly puff tail. Painterly cel-shaded game-creature art, clean readable outline, soft warm rendering, flat lit palette, match the attached reference rendering exactly. No text, logos, scenery, ground shadow, detached effects, guide marks, or extra creatures. Preserve all specified minimum marking widths at final 192x208 size.. Preserve silhouette, face, proportions, markings, palette, material, style, and props.
Style: Pet-safe sprite: compact full-body mascot, readable in a 192x208 cell, clear silhouette, simple face, stable palette/materials, and crisp edges for chroma-key extraction. Style `painterly`: Painterly mascot with simplified brush texture, readable forms, stable palette, and enough edge clarity for clean extraction. User style notes: Match the attached beast_cloudy.png reference rendering exactly; sibling-series identity lock is authoritative..
Animation continuity: keep apparent pet scale and baseline stable within the row unless the state itself intentionally changes vertical position, such as `jumping`. Move the pose within the slot instead of redrawing the pet larger or smaller frame to frame.

State action: Ready-review loop: focused inspection of completed output with lean, blink, narrowed eyes, head tilt, or paw pose.

State requirements:
- Show review through lean, blink, narrowed eyes, head tilt, or paw/hand position.
- Do not add magnifying glasses, papers, code, UI, punctuation, symbols, or other new props unless they already exist in the base pet identity.

Clean extraction: crisp opaque edges, safe padding, no scenery, text, guide marks, checkerboard, shadows, glows, motion blur, speed lines, dust, detached effects, stray pixels, or chroma-key colors inside the pet.
