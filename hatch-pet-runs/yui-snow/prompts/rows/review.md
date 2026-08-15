Create one horizontal animation strip for Codex pet `yui-snow`, state `review`.

Use the attached canonical base for identity. Use the attached layout guide only for slot count, spacing, centering, and padding; do not draw the guide.

Output exactly 6 full-body frames in one left-to-right row on flat pure green #00FF00. Treat the row as 6 invisible equal-width slots: one centered complete pose per slot, evenly spaced, with no overlap, clipping, empty slots, labels, or borders.

Identity: same pet in every frame: Four-legged rabbit/stoat-like weather beast standing and moving on the ground; not bipedal and not a mascot blob. Numeric sibling-series lock: body length about 1.6x shoulder height; head about 1/3 of body length; back line horizontal when standing; belly line above the elbow. Slender build, not round or heavy. Amber/honey iris, round dark pupil, drawn upper lash line, exactly two catchlights; small dark nose; visible paw pads. Straight dense winter coat, near-white with faint cool blue shadow. Long upright straight ears and a tail, with solid black tips on both ear ends and tail tip; each tip is a solid block at least 3px wide in the final 192x208 cell. Painterly cel-shaded game-creature art, clean readable outline, soft warm rendering, flat lit palette, match the attached reference rendering exactly. No text, logos, scenery, ground shadow, detached effects, guide marks, or extra creatures. Preserve the minimum marking widths at final 192x208 size.. Preserve silhouette, face, proportions, markings, palette, material, style, and props.
Style: Pet-safe sprite: compact full-body mascot, readable in a 192x208 cell, clear silhouette, simple face, stable palette/materials, and crisp edges for chroma-key extraction. Style `painterly`: Painterly mascot with simplified brush texture, readable forms, stable palette, and enough edge clarity for clean extraction. User style notes: Match beast_snow.png rendering exactly; shared seven-character identity lock is authoritative; numeric proportions and 3px minimum black tip markings are mandatory..
Animation continuity: keep apparent pet scale and baseline stable within the row unless the state itself intentionally changes vertical position, such as `jumping`. Move the pose within the slot instead of redrawing the pet larger or smaller frame to frame.

State action: Ready-review loop: focused inspection of completed output with lean, blink, narrowed eyes, head tilt, or paw pose.

State requirements:
- Show review through lean, blink, narrowed eyes, head tilt, or paw/hand position.
- Do not add magnifying glasses, papers, code, UI, punctuation, symbols, or other new props unless they already exist in the base pet identity.

Clean extraction: crisp opaque edges, safe padding, no scenery, text, guide marks, checkerboard, shadows, glows, motion blur, speed lines, dust, detached effects, stray pixels, or chroma-key colors inside the pet.
