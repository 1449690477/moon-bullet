from __future__ import annotations

import json
import shutil
from datetime import datetime
from pathlib import Path

from PIL import Image


REPO = Path(__file__).resolve().parents[1]
PACKAGE = REPO / "moon_bullet_demo_v3_6"
STAGE = REPO / "tmp_next_asset_import_20260618"
ASSETS = PACKAGE / "assets"
BACKUP_ROOT = ASSETS / "_backup_before_user_import"
REPORT_PATH = PACKAGE / "ASSET_IMPORT_REPORT_NEXT_BATCH_20260618.md"


TARGETS: dict[str, dict[str, object]] = {
    "assets/backgrounds/bg_stage_base.png": {
        "size": (720, 1280),
        "transparent": False,
        "type": "layered background",
        "mode": "cover",
    },
    "assets/backgrounds/bg_stage_depth.png": {
        "size": (720, 1280),
        "transparent": True,
        "type": "layered background",
        "mode": "fit",
    },
    "assets/backgrounds/bg_boss_eclipse_overlay.png": {
        "size": (720, 1280),
        "transparent": True,
        "type": "layered background",
        "mode": "fit",
    },
    "assets/characters/player_witch_idle.png": {
        "size": (256, 256),
        "transparent": True,
        "type": "character/player asset",
        "mode": "copy",
    },
    "assets/characters/player_witch_move_left.png": {
        "size": (256, 256),
        "transparent": True,
        "type": "character/player asset",
        "mode": "copy",
    },
    "assets/characters/player_witch_move_right.png": {
        "size": (256, 256),
        "transparent": True,
        "type": "character/player asset",
        "mode": "copy",
    },
    "assets/characters/player_witch_focus.png": {
        "size": (256, 256),
        "transparent": True,
        "type": "character/player asset",
        "mode": "copy",
    },
    "assets/characters/player_witch_hit.png": {
        "size": (256, 256),
        "transparent": True,
        "type": "character/player asset",
        "mode": "copy",
    },
    "assets/enemies/bat_familiar_idle.png": {
        "size": (192, 192),
        "transparent": True,
        "type": "enemy sprite",
        "mode": "copy",
    },
    "assets/enemies/bat_familiar_attack.png": {
        "size": (192, 192),
        "transparent": True,
        "type": "enemy sprite",
        "mode": "copy",
    },
    "assets/enemies/bat_familiar_hit.png": {
        "size": (192, 192),
        "transparent": True,
        "type": "enemy sprite",
        "mode": "copy",
    },
    "assets/enemies/bat_familiar_death.png": {
        "size": (192, 192),
        "transparent": True,
        "type": "enemy sprite",
        "mode": "copy",
    },
    "assets/enemies/orb_drone_idle.png": {
        "size": (192, 192),
        "transparent": True,
        "type": "enemy sprite",
        "mode": "copy",
    },
    "assets/enemies/orb_drone_attack.png": {
        "size": (192, 192),
        "transparent": True,
        "type": "enemy sprite",
        "mode": "copy",
    },
    "assets/enemies/orb_drone_hit.png": {
        "size": (192, 192),
        "transparent": True,
        "type": "enemy sprite",
        "mode": "copy",
    },
    "assets/enemies/orb_drone_death.png": {
        "size": (192, 192),
        "transparent": True,
        "type": "enemy sprite",
        "mode": "copy",
    },
    "assets/bosses/eclipse_boss_idle.png": {
        "size": (768, 768),
        "transparent": True,
        "type": "boss sprite",
        "mode": "copy",
    },
    "assets/bosses/eclipse_boss_phase1.png": {
        "size": (768, 768),
        "transparent": True,
        "type": "boss sprite",
        "mode": "copy",
    },
    "assets/bosses/eclipse_boss_phase2.png": {
        "size": (768, 768),
        "transparent": True,
        "type": "boss sprite",
        "mode": "copy",
    },
    "assets/bosses/eclipse_boss_phase3.png": {
        "size": (768, 768),
        "transparent": True,
        "type": "boss sprite",
        "mode": "copy",
    },
    "assets/bosses/eclipse_boss_rage.png": {
        "size": (768, 768),
        "transparent": True,
        "type": "boss sprite",
        "mode": "copy",
    },
    "assets/bosses/eclipse_boss_hit.png": {
        "size": (768, 768),
        "transparent": True,
        "type": "boss sprite",
        "mode": "copy",
    },
    "assets/bosses/eclipse_boss_break.png": {
        "size": (768, 768),
        "transparent": True,
        "type": "boss sprite",
        "mode": "copy",
    },
    "assets/bosses/eclipse_boss_death.png": {
        "size": (768, 768),
        "transparent": True,
        "type": "boss sprite",
        "mode": "copy",
    },
    "assets/ui/ui_side_party_card.png": {
        "size": (160, 96),
        "transparent": True,
        "type": "interface side party card",
        "mode": "copy",
    },
    "assets/ui/ui_timer_panel.png": {
        "size": (220, 72),
        "transparent": True,
        "type": "interface timer panel",
        "mode": "copy",
    },
    "assets/ui/ui_damage_number_style.png": {
        "size": (512, 128),
        "transparent": True,
        "type": "interface number style reference",
        "mode": "copy",
    },
}

EXPECTED_KEEP_EXISTING = [
    "assets/characters/player_witch_avatar.png",
    "assets/characters/player_witch_skill_cutin.png",
    "assets/enemies/nun_spirit_idle.png",
    "assets/enemies/nun_spirit_attack.png",
    "assets/enemies/nun_spirit_hit.png",
    "assets/enemies/nun_spirit_death.png",
    "assets/backgrounds/bg_fog_layer.png",
    "assets/backgrounds/bg_particles_subtle.png",
    "assets/bosses/eclipse_boss_portrait.png",
    "assets/bosses/eclipse_boss_nameplate.png",
]


def find_source(rel: str) -> Path | None:
    matches = sorted(STAGE.glob(f"*/{rel}"))
    return matches[0] if matches else None


def corner_alpha(img: Image.Image) -> list[int]:
    rgba = img.convert("RGBA")
    a = rgba.getchannel("A")
    return [
        a.getpixel((0, 0)),
        a.getpixel((rgba.width - 1, 0)),
        a.getpixel((0, rgba.height - 1)),
        a.getpixel((rgba.width - 1, rgba.height - 1)),
    ]


def alpha_ratio(img: Image.Image, threshold: int = 8) -> float:
    rgba = img.convert("RGBA")
    a = rgba.getchannel("A")
    return sum(1 for v in a.getdata() if v > threshold) / (rgba.width * rgba.height)


def cover_resize(img: Image.Image, size: tuple[int, int]) -> Image.Image:
    img = img.convert("RGBA")
    tw, th = size
    scale = max(tw / img.width, th / img.height)
    nw, nh = round(img.width * scale), round(img.height * scale)
    resized = img.resize((nw, nh), Image.Resampling.LANCZOS)
    left = (nw - tw) // 2
    top = (nh - th) // 2
    return resized.crop((left, top, left + tw, top + th))


def fit_resize(img: Image.Image, size: tuple[int, int]) -> Image.Image:
    img = img.convert("RGBA")
    if img.size == size:
        return img
    out = Image.new("RGBA", size, (0, 0, 0, 0))
    temp = img.copy()
    temp.thumbnail(size, Image.Resampling.LANCZOS)
    out.alpha_composite(temp, ((size[0] - temp.width) // 2, (size[1] - temp.height) // 2))
    return out


def process_image(src: Path, target: dict[str, object]) -> Image.Image:
    img = Image.open(src).convert("RGBA")
    size = target["size"]
    assert isinstance(size, tuple)
    mode = target["mode"]
    if mode == "cover":
        return cover_resize(img, size)
    if mode == "fit":
        return fit_resize(img, size)
    if img.size != size:
        return fit_resize(img, size)
    return img


def backup_existing(path: Path, backup_dir: Path) -> Path | None:
    if not path.exists():
        return None
    rel = path.relative_to(ASSETS)
    dst = backup_dir / rel
    dst.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(path, dst)
    return dst


def update_manifest(imported: list[dict[str, object]]) -> None:
    manifest_path = ASSETS / "asset_manifest.json"
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    manifest["version"] = "v3.6-next-assets"
    manifest["notes"] = (
        "V3.6 visual asset pack with user-provided AI-generated assets, "
        "local validation, and retained procedural fallbacks where no new file was supplied."
    )
    for item in imported:
        rel = str(item["rel"])
        parts = rel.split("/")
        if len(parts) != 3 or parts[0] != "assets":
            continue
        category, name = parts[1], parts[2]
        manifest.setdefault(category, {})
        manifest[category][name] = {
            "type": item["type"],
            "size": item["size_text"],
            "transparent_background": item["transparent"],
            "source": "user provided next batch ZIP, locally validated and normalized",
            "license": "user-provided AI-generated project asset",
            "commercial_use": True,
        }
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def write_report(
    imported: list[dict[str, object]],
    skipped: list[str],
    kept_existing: list[str],
    backup_dir: Path,
) -> None:
    lines = [
        "# V3.6 Next Batch Import Report",
        "",
        f"- Import time: {datetime.now().isoformat(timespec='seconds')}",
        f"- Staging dir: `{STAGE}`",
        f"- Backup dir: `{backup_dir}`",
        "",
        "## Imported / Replaced",
        "",
    ]
    by_cat: dict[str, list[dict[str, object]]] = {}
    for item in imported:
        by_cat.setdefault(str(item["category"]), []).append(item)
    for cat in ["backgrounds", "characters", "enemies", "bosses", "ui"]:
        items = by_cat.get(cat, [])
        lines.append(f"### {cat} ({len(items)})")
        if not items:
            lines.append("")
            continue
        for item in items:
            lines.append(
                f"- `{item['rel']}`: {item['size_text']}, "
                f"transparent={str(item['transparent']).lower()}, "
                f"alpha_ratio={item['alpha_ratio']:.3f}, corners={item['corners']}"
            )
        lines.append("")
    lines.extend(["## Skipped", ""])
    if skipped:
        lines.extend(f"- {s}" for s in skipped)
    else:
        lines.append("- None.")
    lines.extend(["", "## Kept Existing Because This Batch Did Not Include Them", ""])
    lines.extend(f"- `{rel}`" for rel in kept_existing)
    lines.extend(
        [
            "",
            "## Notes",
            "",
            "- This import only overwrites cleanly named files from the new ZIP batch.",
            "- `ui_damage_number_style.png` is imported as a visual reference/manifest asset; damage text remains Canvas-drawn for readability.",
        ]
    )
    REPORT_PATH.write_text("\n".join(lines) + "\n", encoding="utf-8")


def main() -> int:
    if not STAGE.exists():
        raise SystemExit(f"Missing staging dir: {STAGE}")
    backup_dir = BACKUP_ROOT / datetime.now().strftime("%Y%m%d_%H%M%S_next_batch")
    imported: list[dict[str, object]] = []
    skipped: list[str] = []

    for rel, target in TARGETS.items():
        src = find_source(rel)
        if not src:
            skipped.append(f"missing source for `{rel}`")
            continue
        img = process_image(src, target)
        if target["transparent"] and max(corner_alpha(img)) > 8:
            skipped.append(f"opaque corner rejected for `{rel}` corners={corner_alpha(img)}")
            continue
        dst = PACKAGE / rel
        backup_existing(dst, backup_dir)
        dst.parent.mkdir(parents=True, exist_ok=True)
        img.save(dst, optimize=True)
        category = rel.split("/")[1]
        imported.append(
            {
                "rel": rel,
                "category": category,
                "type": target["type"],
                "size_text": f"{img.width}x{img.height}",
                "transparent": bool(target["transparent"]),
                "corners": corner_alpha(img),
                "alpha_ratio": alpha_ratio(img),
            }
        )

    kept_existing = [rel for rel in EXPECTED_KEEP_EXISTING if (PACKAGE / rel).exists()]
    update_manifest(imported)
    write_report(imported, skipped, kept_existing, backup_dir)
    print(json.dumps({"imported": len(imported), "skipped": skipped, "report": str(REPORT_PATH)}, ensure_ascii=False, indent=2))
    return 0 if not skipped else 1


if __name__ == "__main__":
    raise SystemExit(main())
