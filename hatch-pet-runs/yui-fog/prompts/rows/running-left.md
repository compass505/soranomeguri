Create one horizontal animation strip for Codex pet `yui-fog`, state `running-left`.

Use the attached canonical base for identity. Use the attached layout guide only for slot count, spacing, centering, and padding; do not draw the guide.

Output exactly 8 full-body frames in one left-to-right row on flat pure green #00FF00. Treat the row as 8 invisible equal-width slots: one centered complete pose per slot, evenly spaced, with no overlap, clipping, empty slots, labels, or borders.

Identity: same pet in every frame: SHARED IDENTITY LOCK: four-legged quadruped standing and moving on the ground, not bipedal and not a mascot blob; body length 1.6x shoulder height; head 1/3 of body length; horizontal back line; belly line above elbow; small dark nose; visible paw pads; painterly cel-shaded game-creature art with clean readable outline, soft warm rendering, flat lit palette matching the attached reference exactly; no text, logos, scenery, ground shadow. Eyes use the shared construction with amber/honey iris, round dark pupil, drawn upper lash line, exactly two catchlights, except this character deliberately uses a pale milky grey-white iris for an unfocused gaze. Character yui-fog: long-haired dog/cat-like low broad quadruped; extremely long fine straight pale silver-grey coat with lavender depths, dense opaque body core and progressively finer paler transparent per-hair tips, especially belly fringe, leg fur, tail tip; no mist, haze, clouds, particles, or detached effects; small low rounded ears close to skull inside fur; long plume-like tail with fading tips; keep body-core outline visible at 192x208. Every specified marking must remain at least 4px stroke width at final 192x208 cell size; simplify instead of allowing it to vanish. Flat solid chroma background only.. Preserve silhouette, face, proportions, markings, palette, material, style, and props.
Style: Pet-safe sprite: compact full-body mascot, readable in a 192x208 cell, clear silhouette, simple face, stable palette/materials, and crisp edges for chroma-key extraction. Style `painterly`: Painterly mascot with simplified brush texture, readable forms, stable palette, and enough edge clarity for clean extraction. User style notes: Match the attached reference image rendering exactly: warm painterly cel-shaded creature art, soft silver-white and lavender fur, clean readable body-core outline, opaque body fading to translucent hair tips. Sprite-production oriented, one complete pet per frame..
Animation continuity: keep apparent pet scale and baseline stable within the row unless the state itself intentionally changes vertical position, such as `jumping`. Move the pose within the slot instead of redrawing the pet larger or smaller frame to frame.

State action: Dragging-left loop: show directional movement to the left through body and limb poses only.

State requirements:
- Show directional drag movement to the left through body, limb, and prop movement only.
- The row must unmistakably face and travel left.
- The movement cadence must alternate visibly across the 8 frames instead of repeating one nearly static stride.
- Do not draw speed lines, dust clouds, floor shadows, motion trails, or detached motion effects.

Clean extraction: crisp opaque edges, safe padding, no scenery, text, guide marks, checkerboard, shadows, glows, motion blur, speed lines, dust, detached effects, stray pixels, or chroma-key colors inside the pet.
