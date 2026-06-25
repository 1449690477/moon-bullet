# Reference Video Gap Review - 2026-06-18

## Current Alignment

The current V3.6 build now covers the same broad gameplay structure as the reference video:

- vertical bullet-hell playfield
- player auto-fire and burst skill
- multi-phase boss
- visible boss HP and player HP / energy
- dense gold, purple, red, and white bullet families
- graze / combo feedback
- damage numbers and phase messages

After the latest code pass, the closest parts are:

- boss bullet density and patterns
- gold corridor / wall pressure
- red warning ring / laser pressure
- continuous player fire beam feel
- UI information density

## Remaining Gaps

1. The reference video uses a richer top-down ruined city / cathedral scene with stronger depth than the current clean dark background.
2. The reference player and boss have more animation-state polish and stronger silhouette motion.
3. Current bat and orb drone resources are retained from earlier builds because the new ZIP batch did not provide clean final replacements.
4. The reference has stronger side HUD identity: party cards, skill slots, timer, battle stats, and cooldowns.
5. The reference has heavier impact typography, especially stacked orange damage numbers and boss-hit flashes.
6. Music and SFX are still simple compared with the reference's continuous high-energy battle feel.

## Next Assets To Generate

Generate these only if you want the next visual jump. They are the highest-impact missing pieces.

### backgrounds

- `bg_stage_base.png` 720x1280  
  Dark ruined gothic city/cathedral from a top-down vertical shooter angle, low contrast, no UI, no characters, no text, no thin scan lines.

- `bg_stage_depth.png` 720x1280  
  Transparent or dark parallax layer: broken rooftops, shadows, distant ruins, very low brightness, no bright bullet-like points.

- `bg_boss_eclipse_overlay.png` 720x1280  
  Transparent purple/red boss-phase atmosphere, soft eclipse glow, no line residue, no hard full-screen circles.

### characters

- `player_witch_idle.png` 256x256 transparent
- `player_witch_move_left.png` 256x256 transparent
- `player_witch_move_right.png` 256x256 transparent
- `player_witch_focus.png` 256x256 transparent
- `player_witch_hit.png` 256x256 transparent

Requirements: same character, clean readable silhouette, true transparent corners, body anchor stable near the center. Avoid pixel-placeholder style and avoid full-body sheet borders.

### enemies

- `bat_familiar_idle.png` 192x192 transparent
- `bat_familiar_attack.png` 192x192 transparent
- `bat_familiar_hit.png` 192x192 transparent
- `bat_familiar_death.png` 192x192 transparent
- `orb_drone_idle.png` 192x192 transparent
- `orb_drone_attack.png` 192x192 transparent
- `orb_drone_hit.png` 192x192 transparent
- `orb_drone_death.png` 192x192 transparent

Requirements: true transparent PNG, readable at 64px, no source-grid frame lines, no fake dark/white background.

### bosses

Only rerun these if the new model can match or exceed the current boss quality:

- `eclipse_boss_idle.png` 768x768 transparent
- `eclipse_boss_phase1.png` 768x768 transparent
- `eclipse_boss_phase2.png` 768x768 transparent
- `eclipse_boss_phase3.png` 768x768 transparent
- `eclipse_boss_rage.png` 768x768 transparent
- `eclipse_boss_hit.png` 768x768 transparent
- `eclipse_boss_break.png` 768x768 transparent
- `eclipse_boss_death.png` 768x768 transparent

Requirements: anime gothic fallen moon judge, high quality, strong silhouette, no black rectangle, no sheet frame, no dense full-screen magic-line residue.

### ui

Optional but useful for matching the reference video:

- `ui_side_party_card.png` 160x96 transparent
- `ui_timer_panel.png` 220x72 transparent
- `ui_damage_number_style.png` 512x128 transparent, digits only, no labels

## Prompt Rule

For transparent assets, ask the image model for true transparent PNG if available. If it cannot do true transparency, use a solid chroma-key background instead of checkerboard preview. Do not output fake transparent checkerboard baked into RGB.
