from __future__ import annotations

import json
import shutil
from datetime import datetime
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "moon_bullet_demo_v3_6"
ASSETS = OUT / "assets"
STAGE = ROOT / "tmp_asset_import_20260618"


CURATED_IMPORTS: dict[str, Path] = {
    # Clean true-transparent, correctly-sized packs.
    "bullets/bullet_gold_orb.png": STAGE / "bullets_batch_6/assets/bullets/bullet_gold_orb.png",
    "bullets/bullet_white_needle.png": STAGE / "bullets_batch_6/assets/bullets/bullet_white_needle.png",
    "bullets/bullet_purple_moon.png": STAGE / "bullets_batch_6/assets/bullets/bullet_purple_moon.png",
    "bullets/bullet_red_warning.png": STAGE / "bullets_batch_6/assets/bullets/bullet_red_warning.png",
    "bullets/bullet_laser_core.png": STAGE / "bullets_batch_6/assets/bullets/bullet_laser_core.png",
    "bullets/bullet_laser_glow.png": STAGE / "bullets_batch_6/assets/bullets/bullet_laser_glow.png",

    "ui/ui_hp_bar_player.png": STAGE / "ui_batch_12/assets/ui/ui_hp_bar_player.png",
    "ui/ui_hp_bar_boss.png": STAGE / "ui_batch_12/assets/ui/ui_hp_bar_boss.png",
    "ui/ui_energy_bar.png": STAGE / "ui_batch_12/assets/ui/ui_energy_bar.png",
    "ui/ui_skill_frame.png": STAGE / "ui_batch_12/assets/ui/ui_skill_frame.png",
    "ui/ui_skill_beam.png": STAGE / "ui_batch_12/assets/ui/ui_skill_beam.png",
    "ui/ui_skill_bomb.png": STAGE / "ui_batch_12/assets/ui/ui_skill_bomb.png",
    "ui/ui_pause_panel.png": STAGE / "ui_batch_12/assets/ui/ui_pause_panel.png",
    "ui/ui_victory_panel.png": STAGE / "ui_batch_12/assets/ui/ui_victory_panel.png",
    "ui/ui_gameover_panel.png": STAGE / "ui_batch_12/assets/ui/ui_gameover_panel.png",
    "ui/ui_boss_warning.png": STAGE / "ui_batch_12/assets/ui/ui_boss_warning.png",
    "ui/ui_stage_clear.png": STAGE / "ui_batch_12/assets/ui/ui_stage_clear.png",
    "ui/ui_combo_number_style.png": STAGE / "ui_batch_12/assets/ui/ui_combo_number_style.png",

    "vfx/vfx_player_shot.png": STAGE / "vfx_batch_10_checked/assets/vfx/vfx_player_shot.png",
    "vfx/vfx_player_beam.png": STAGE / "vfx_batch_10_checked/assets/vfx/vfx_player_beam.png",
    "vfx/vfx_player_ultimate_circle.png": STAGE / "vfx_batch_10_checked/assets/vfx/vfx_player_ultimate_circle.png",
    "vfx/vfx_enemy_hit.png": STAGE / "vfx_batch_10_checked/assets/vfx/vfx_enemy_hit.png",
    "vfx/vfx_boss_hit.png": STAGE / "vfx_batch_10_checked/assets/vfx/vfx_boss_hit.png",
    "vfx/vfx_boss_break.png": STAGE / "vfx_batch_10_checked/assets/vfx/vfx_boss_break.png",
    "vfx/vfx_explosion_small.png": STAGE / "vfx_batch_10_checked/assets/vfx/vfx_explosion_small.png",
    "vfx/vfx_explosion_large.png": STAGE / "vfx_batch_10_checked/assets/vfx/vfx_explosion_large.png",
    "vfx/vfx_graze.png": STAGE / "vfx_batch_10_checked/assets/vfx/vfx_graze.png",
    "vfx/vfx_clear_bullets.png": STAGE / "vfx_batch_10_checked/assets/vfx/vfx_clear_bullets.png",

    "enemies/nun_spirit_idle.png": STAGE / "enemies_nun_spirit_batch_4/assets/enemies/nun_spirit_idle.png",
    "enemies/nun_spirit_attack.png": STAGE / "enemies_nun_spirit_batch_4/assets/enemies/nun_spirit_attack.png",
    "enemies/nun_spirit_hit.png": STAGE / "enemies_nun_spirit_batch_4/assets/enemies/nun_spirit_hit.png",
    "enemies/nun_spirit_death.png": STAGE / "enemies_nun_spirit_batch_4/assets/enemies/nun_spirit_death.png",
}

SKIPPED = [
    ("characters/*.png in characters_batch_missing_6.zip", "lower-quality placeholder style than the current in-game character sprites"),
    ("characters/player_witch_idle.png in moon_bullet_asset_pack_v0_1.zip", "opaque crop from a multi-image sheet with frame-line residue, not a clean battle sprite"),
    ("bosses/*.png in bosses_batch_10.zip", "simplified placeholder style; current boss artwork is higher quality"),
    ("backgrounds/*.png in backgrounds_batch_5.zip", "visible preview/checker/line residue and lower scene quality than the current background"),
    ("bat_familiar_*.png in moon_bullet_asset_pack_v0_1.zip", "opaque crops from a source grid, not clean transparent sprites"),
    ("orb_drone_*.png", "not present in the provided ZIP batches; existing game assets retained"),
]


def backup(paths: list[Path]) -> Path:
    stamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_dir = ASSETS / "_backup_before_user_import" / stamp
    for path in paths:
        if path.exists():
            target = backup_dir / path.relative_to(ASSETS)
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(path, target)
    return backup_dir


def validate_source(path: Path) -> dict:
    if not path.exists():
        raise FileNotFoundError(path)
    img = Image.open(path).convert("RGBA")
    alpha = img.getchannel("A")
    corners = [
        alpha.getpixel((0, 0)),
        alpha.getpixel((img.width - 1, 0)),
        alpha.getpixel((0, img.height - 1)),
        alpha.getpixel((img.width - 1, img.height - 1)),
    ]
    return {
        "size": f"{img.width}x{img.height}",
        "alpha_extrema": alpha.getextrema(),
        "corner_alpha": corners,
    }


def update_manifest(changed: list[Path]) -> None:
    manifest_path = ASSETS / "asset_manifest.json"
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    changed_rel = {p.relative_to(ASSETS).as_posix() for p in changed}
    for category in ["enemies", "ui", "bullets", "vfx"]:
        for filename, meta in manifest.get(category, {}).items():
            rel = f"{category}/{filename}"
            if rel not in changed_rel:
                continue
            img = Image.open(ASSETS / rel)
            meta["size"] = f"{img.width}x{img.height}"
            meta["source"] = "user provided ZIP batch, curated import with duplicate filtering"
            meta["license"] = "user-provided AI-generated project asset"
            meta["commercial_use"] = True
            meta["transparent_background"] = category in {"enemies", "bullets", "vfx"} or filename.startswith("ui_skill")
    notes = manifest.get("notes", "")
    addendum = "Curated ZIP import retained higher-quality existing character, boss, background, bat, and orb drone assets where supplied ZIP entries were missing, duplicate, opaque, or lower quality."
    if addendum not in notes:
        manifest["notes"] = (notes.rstrip() + "\n" + addendum).strip()
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def write_report(backup_dir: Path, changed: list[Path], source_meta: dict[str, dict]) -> None:
    report = OUT / "ASSET_IMPORT_REPORT_20260618.md"
    lines = [
        "# V3.6 ZIP Asset Import Report - 2026-06-18",
        "",
        "## Imported",
    ]
    for path in changed:
        rel = path.relative_to(ASSETS).as_posix()
        meta = source_meta[rel]
        lines.append(f"- `{rel}` from `{meta['source']}` ({meta['size']}, alpha={meta['alpha_extrema']})")
    lines.extend([
        "",
        "## Skipped / Retained Existing",
    ])
    for item, reason in SKIPPED:
        lines.append(f"- `{item}`: {reason}.")
    lines.extend([
        "",
        "## Missing From ZIP Batches",
        "- `enemies/orb_drone_idle.png`",
        "- `enemies/orb_drone_attack.png`",
        "- `enemies/orb_drone_hit.png`",
        "- `enemies/orb_drone_death.png`",
        "",
        "These four files are still present in the game package from the previous V3.6 build, so the playable build is not missing files. They are only missing from the new ZIP batches.",
        "",
        f"Backup directory: `{backup_dir}`",
    ])
    report.write_text("\n".join(lines) + "\n", encoding="utf-8")


def main() -> None:
    if not STAGE.exists():
        raise FileNotFoundError(f"staging folder not found: {STAGE}")
    planned = [ASSETS / rel for rel in CURATED_IMPORTS]
    backup_dir = backup(planned)
    changed: list[Path] = []
    source_meta: dict[str, dict] = {}
    for rel, src in CURATED_IMPORTS.items():
        meta = validate_source(src)
        dest = ASSETS / rel
        dest.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(src, dest)
        changed.append(dest)
        source_meta[rel] = {**meta, "source": src.relative_to(STAGE).as_posix()}
    update_manifest(changed)
    write_report(backup_dir, changed, source_meta)
    print(json.dumps({
        "backup": str(backup_dir),
        "changed": [p.relative_to(OUT).as_posix() for p in changed],
        "skipped": SKIPPED,
        "report": str(OUT / "ASSET_IMPORT_REPORT_20260618.md"),
    }, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
