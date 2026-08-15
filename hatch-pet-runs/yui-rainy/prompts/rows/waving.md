Create one horizontal animation strip for Codex pet `yui-rainy`, state `waving`.

Use the attached canonical base for identity. Use the attached layout guide only for slot count, spacing, centering, and padding; do not draw the guide.

Output exactly 4 full-body frames in one left-to-right row on flat pure user-selected #00FF00. Treat the row as 4 invisible equal-width slots: one centered complete pose per slot, evenly spaced, with no overlap, clipping, empty slots, labels, or borders.

Identity: same pet in every frame: Series identity lock: four-legged beast standing and moving on the ground; not bipedal and not a mascot blob. Body length about 1.6x shoulder height. Head about 1/3 of body length. Back line horizontal when standing. Belly line above the elbow. Eyes have amber/honey irises, round dark pupils, a drawn upper lash line, and exactly two catchlights. Small dark nose and visible paw pads. Character-specific: otter-like quadruped with short slicked-down wet-looking blue-grey coat and a paler throat; 3 to 5 opaque water droplets resting ON the back, each attached to and overlapping the body silhouette with an outline at least 3px wide at final 192x208 cell size; never floating free. Webbed feet with webbing visible between toes. Thick-based tapering tail carried low. No text, logos, scenery, ground shadow, detached effects, guide marks, or extra creatures. Use the attached reference as the canonical sibling visual.. Preserve silhouette, face, proportions, markings, palette, material, style, and props.
Style: Pet-safe sprite: compact full-body mascot, readable in a 192x208 cell, clear silhouette, simple face, stable palette/materials, and crisp edges for chroma-key extraction. Style `painterly`: Painterly mascot with simplified brush texture, readable forms, stable palette, and enough edge clarity for clean extraction. User style notes: Painterly cel-shaded game-creature art with a clean readable outline, soft warm rendering, and flat lit palette. Match the attached reference rendering exactly across all rows. Keep the pet readable as one full-body sprite at 192x208..
Animation continuity: keep apparent pet scale and baseline stable within the row unless the state itself intentionally changes vertical position, such as `jumping`. Move the pose within the slot instead of redrawing the pet larger or smaller frame to frame.

State action: Greeting loop: paw or limb down, raised, tilted, and returning in a friendly attention gesture.

State requirements:
- Show the greeting through paw, hand, wing, or limb pose only.
- Do not draw wave marks, motion arcs, lines, sparkles, symbols, or floating effects around the gesture.

Clean extraction: crisp opaque edges, safe padding, no scenery, text, guide marks, checkerboard, shadows, glows, motion blur, speed lines, dust, detached effects, stray pixels, or chroma-key colors inside the pet.
