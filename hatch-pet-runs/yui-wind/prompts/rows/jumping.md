Create one horizontal animation strip for Codex pet `yui-wind`, state `jumping`.

Use the attached canonical base for identity. Use the attached layout guide only for slot count, spacing, centering, and padding; do not draw the guide.

Output exactly 5 full-body frames in one left-to-right row on flat pure green #00FF00. Treat the row as 5 invisible equal-width slots: one centered complete pose per slot, evenly spaced, with no overlap, clipping, empty slots, labels, or borders.

Identity: same pet in every frame: Shared identity lock: four-legged ground beast, body length 1.6x shoulder height for siblings; for yui-wind specifically body length about 2.0x shoulder height; head about 1/3 body length; horizontal back line; belly above elbow; amber/honey iris, round dark pupil, drawn upper lash line, exactly two catchlights; small dark nose and visible paw pads. Pale green-grey fur, distinctly darker mid-tone dorsal stripe, darker outline, actual long guard hairs at flanks and tail sweeping backward. Painterly cel-shaded game-creature art with clean readable outline, soft warm rendering, flat lit palette. No text, logos, scenery, ground shadow, wind streaks, speed lines, motion arcs, or detached effects. Minimum marking stroke widths must survive 192x208.. Preserve silhouette, face, proportions, markings, palette, material, style, and props.
Style: Pet-safe sprite: compact full-body mascot, readable in a 192x208 cell, clear silhouette, simple face, stable palette/materials, and crisp edges for chroma-key extraction. Style `painterly`: Painterly mascot with simplified brush texture, readable forms, stable palette, and enough edge clarity for clean extraction. User style notes: Match supplied reference rendering exactly: warm painterly cel-shaded game-creature illustration, clean dark contour, pale green-grey fur, simplified readable masses, long backward-swept hair..
Animation continuity: keep apparent pet scale and baseline stable within the row unless the state itself intentionally changes vertical position, such as `jumping`. Move the pose within the slot instead of redrawing the pet larger or smaller frame to frame.

State action: Hover jump loop: anticipation, lift, airborne peak, descent, and settle through body height.

State requirements:
- Show the jump through pose and vertical body position only: anticipation, lift, airborne peak, descent, settle.
- Do not draw ground shadows, contact shadows, drop shadows, oval shadows, landing marks, dust, smears, bounce pads, or motion marks under the pet.
- Keep the background outside the pet perfectly flat chroma key with no darker key-colored patches.

Clean extraction: crisp opaque edges, safe padding, no scenery, text, guide marks, checkerboard, shadows, glows, motion blur, speed lines, dust, detached effects, stray pixels, or chroma-key colors inside the pet.
