# V3.6 ZIP Asset Import Report - 2026-06-18

## Imported
- `bullets/bullet_gold_orb.png` from `bullets_batch_6/assets/bullets/bullet_gold_orb.png` (128x128, alpha=(0, 245))
- `bullets/bullet_white_needle.png` from `bullets_batch_6/assets/bullets/bullet_white_needle.png` (128x128, alpha=(0, 240))
- `bullets/bullet_purple_moon.png` from `bullets_batch_6/assets/bullets/bullet_purple_moon.png` (128x128, alpha=(0, 241))
- `bullets/bullet_red_warning.png` from `bullets_batch_6/assets/bullets/bullet_red_warning.png` (128x128, alpha=(0, 225))
- `bullets/bullet_laser_core.png` from `bullets_batch_6/assets/bullets/bullet_laser_core.png` (128x128, alpha=(0, 235))
- `bullets/bullet_laser_glow.png` from `bullets_batch_6/assets/bullets/bullet_laser_glow.png` (128x128, alpha=(0, 110))
- `ui/ui_hp_bar_player.png` from `ui_batch_12/assets/ui/ui_hp_bar_player.png` (512x128, alpha=(0, 220))
- `ui/ui_hp_bar_boss.png` from `ui_batch_12/assets/ui/ui_hp_bar_boss.png` (512x128, alpha=(0, 220))
- `ui/ui_energy_bar.png` from `ui_batch_12/assets/ui/ui_energy_bar.png` (512x128, alpha=(0, 220))
- `ui/ui_skill_frame.png` from `ui_batch_12/assets/ui/ui_skill_frame.png` (128x128, alpha=(0, 220))
- `ui/ui_skill_beam.png` from `ui_batch_12/assets/ui/ui_skill_beam.png` (128x128, alpha=(0, 230))
- `ui/ui_skill_bomb.png` from `ui_batch_12/assets/ui/ui_skill_bomb.png` (128x128, alpha=(0, 246))
- `ui/ui_pause_panel.png` from `ui_batch_12/assets/ui/ui_pause_panel.png` (720x420, alpha=(0, 220))
- `ui/ui_victory_panel.png` from `ui_batch_12/assets/ui/ui_victory_panel.png` (720x420, alpha=(0, 220))
- `ui/ui_gameover_panel.png` from `ui_batch_12/assets/ui/ui_gameover_panel.png` (720x420, alpha=(0, 220))
- `ui/ui_boss_warning.png` from `ui_batch_12/assets/ui/ui_boss_warning.png` (720x180, alpha=(0, 220))
- `ui/ui_stage_clear.png` from `ui_batch_12/assets/ui/ui_stage_clear.png` (720x180, alpha=(0, 220))
- `ui/ui_combo_number_style.png` from `ui_batch_12/assets/ui/ui_combo_number_style.png` (512x128, alpha=(0, 210))
- `vfx/vfx_player_shot.png` from `vfx_batch_10_checked/assets/vfx/vfx_player_shot.png` (256x256, alpha=(0, 240))
- `vfx/vfx_player_beam.png` from `vfx_batch_10_checked/assets/vfx/vfx_player_beam.png` (256x256, alpha=(0, 245))
- `vfx/vfx_player_ultimate_circle.png` from `vfx_batch_10_checked/assets/vfx/vfx_player_ultimate_circle.png` (256x256, alpha=(0, 170))
- `vfx/vfx_enemy_hit.png` from `vfx_batch_10_checked/assets/vfx/vfx_enemy_hit.png` (256x256, alpha=(0, 230))
- `vfx/vfx_boss_hit.png` from `vfx_batch_10_checked/assets/vfx/vfx_boss_hit.png` (256x256, alpha=(0, 240))
- `vfx/vfx_boss_break.png` from `vfx_batch_10_checked/assets/vfx/vfx_boss_break.png` (256x256, alpha=(0, 188))
- `vfx/vfx_explosion_small.png` from `vfx_batch_10_checked/assets/vfx/vfx_explosion_small.png` (256x256, alpha=(0, 230))
- `vfx/vfx_explosion_large.png` from `vfx_batch_10_checked/assets/vfx/vfx_explosion_large.png` (256x256, alpha=(0, 235))
- `vfx/vfx_graze.png` from `vfx_batch_10_checked/assets/vfx/vfx_graze.png` (256x256, alpha=(0, 220))
- `vfx/vfx_clear_bullets.png` from `vfx_batch_10_checked/assets/vfx/vfx_clear_bullets.png` (256x256, alpha=(0, 143))
- `enemies/nun_spirit_idle.png` from `enemies_nun_spirit_batch_4/assets/enemies/nun_spirit_idle.png` (224x224, alpha=(0, 255))
- `enemies/nun_spirit_attack.png` from `enemies_nun_spirit_batch_4/assets/enemies/nun_spirit_attack.png` (224x224, alpha=(0, 255))
- `enemies/nun_spirit_hit.png` from `enemies_nun_spirit_batch_4/assets/enemies/nun_spirit_hit.png` (224x224, alpha=(0, 255))
- `enemies/nun_spirit_death.png` from `enemies_nun_spirit_batch_4/assets/enemies/nun_spirit_death.png` (224x224, alpha=(0, 245))

## Skipped / Retained Existing
- `characters/*.png in characters_batch_missing_6.zip`: lower-quality placeholder style than the current in-game character sprites.
- `characters/player_witch_idle.png in moon_bullet_asset_pack_v0_1.zip`: opaque crop from a multi-image sheet with frame-line residue, not a clean battle sprite.
- `bosses/*.png in bosses_batch_10.zip`: simplified placeholder style; current boss artwork is higher quality.
- `backgrounds/*.png in backgrounds_batch_5.zip`: visible preview/checker/line residue and lower scene quality than the current background.
- `bat_familiar_*.png in moon_bullet_asset_pack_v0_1.zip`: opaque crops from a source grid, not clean transparent sprites.
- `orb_drone_*.png`: not present in the provided ZIP batches; existing game assets retained.

## Missing From ZIP Batches
- `enemies/orb_drone_idle.png`
- `enemies/orb_drone_attack.png`
- `enemies/orb_drone_hit.png`
- `enemies/orb_drone_death.png`

These four files are still present in the game package from the previous V3.6 build, so the playable build is not missing files. They are only missing from the new ZIP batches.

Backup directory: `/Users/wanghan/Downloads/moon_bullet_demo_v3/moon_bullet_demo_v3_6/assets/_backup_before_user_import/20260618_150200`
