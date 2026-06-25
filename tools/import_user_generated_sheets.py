from __future__ import annotations

import json
import shutil
from datetime import datetime
from pathlib import Path

import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "moon_bullet_demo_v3_6"
ASSETS = OUT / "assets"

SHEETS = {
    "player_full": Path("/Users/wanghan/Downloads/ChatGPT Image 2026年6月18日 10_44_32.png"),
    "player_chibi": Path("/Users/wanghan/Downloads/ChatGPT Image 2026年6月18日 12_17_44 (2).png"),
    "boss": Path("/Users/wanghan/Downloads/ChatGPT Image 2026年6月18日 12_19_14.png"),
    "bullets": Path("/Users/wanghan/Downloads/ChatGPT Image 2026年6月18日 12_20_47.png"),
    "vfx": Path("/Users/wanghan/Downloads/ChatGPT Image 2026年6月18日 12_22_45.png"),
}


def ensure_inputs() -> None:
    missing = [str(path) for path in SHEETS.values() if not path.exists()]
    if missing:
        raise FileNotFoundError("Missing source sheet(s):\n" + "\n".join(missing))


def backup(paths: list[Path]) -> Path:
    stamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_dir = ASSETS / "_backup_before_user_import" / stamp
    for path in paths:
        if path.exists():
            rel = path.relative_to(ASSETS)
            target = backup_dir / rel
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(path, target)
    return backup_dir


def fade_alpha_edges(img: Image.Image, margin: int = 3) -> Image.Image:
    arr = np.array(img.convert("RGBA")).astype(np.float32)
    h, w = arr.shape[:2]
    yy, xx = np.mgrid[0:h, 0:w]
    dist = np.minimum.reduce([xx, yy, w - 1 - xx, h - 1 - yy])
    fade = np.clip(dist / max(1, margin), 0, 1)
    arr[:, :, 3] *= fade
    return Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8), "RGBA")


def grabcut_alpha(crop: Image.Image, mode: str) -> Image.Image:
    rgb = np.array(crop.convert("RGB"))
    h, w = rgb.shape[:2]
    mask = np.zeros((h, w), np.uint8)
    margin_x = max(4, int(w * 0.035))
    margin_y = max(4, int(h * 0.035))
    rect = (margin_x, margin_y, max(1, w - margin_x * 2), max(1, h - margin_y * 2))
    bgd = np.zeros((1, 65), np.float64)
    fgd = np.zeros((1, 65), np.float64)
    try:
        cv2.grabCut(rgb, mask, rect, bgd, fgd, 7, cv2.GC_INIT_WITH_RECT)
        fg = np.where((mask == cv2.GC_FGD) | (mask == cv2.GC_PR_FGD), 255, 0).astype(np.uint8)
    except cv2.error:
        fg = np.zeros((h, w), np.uint8)

    arr = rgb.astype(np.float32)
    border = np.concatenate([arr[:8].reshape(-1, 3), arr[-8:].reshape(-1, 3), arr[:, :8].reshape(-1, 3), arr[:, -8:].reshape(-1, 3)])
    bg = np.median(border, axis=0)
    dist = np.sqrt(((arr - bg) ** 2).sum(axis=2))
    lum = arr.mean(axis=2)
    chroma = arr.max(axis=2) - arr.min(axis=2)

    border_lum = np.median(border.mean(axis=1))
    if mode == "effect":
        soft = np.maximum(
            np.clip((lum - np.median(lum) - 20) * 7.2, 0, 255),
            np.clip((dist - 62) * 3.6, 0, 255),
        )
        alpha = soft
        dull_patch = (lum < np.median(lum) + 28) & (dist < 92)
        alpha = np.where(dull_patch, 0, alpha)
    elif mode == "dark_sprite":
        soft = np.maximum.reduce(
            [
                np.clip((dist - 20) * 4.4, 0, 255),
                np.clip((chroma - 15) * 4.0, 0, 255),
                np.clip((border_lum - lum - 22) * 3.5, 0, 255),
                np.clip((lum - border_lum - 32) * 3.2, 0, 255),
            ]
        )
        alpha = np.maximum(fg * 0.45, soft)
    else:
        soft = np.maximum.reduce(
            [
                np.clip((dist - 28) * 5.0, 0, 255),
                np.clip((chroma - 18) * 5.2, 0, 255),
                np.clip((border_lum - lum - 24) * 4.2, 0, 255),
                np.clip((lum - border_lum - 34) * 3.6, 0, 255),
            ]
        )
        alpha = np.maximum(fg * 0.18, soft)
        neutral_mid_bg = (chroma < 24) & (lum > 54) & (lum < 196)
        alpha = np.where(neutral_mid_bg, alpha * 0.08, alpha)

    alpha = np.where(alpha < (18 if mode == "effect" else 26), 0, alpha)

    alpha[:2, :] = 0
    alpha[-2:, :] = 0
    alpha[:, :2] = 0
    alpha[:, -2:] = 0
    alpha_img = Image.fromarray(np.clip(alpha, 0, 255).astype(np.uint8), "L")
    alpha_img = alpha_img.filter(ImageFilter.MedianFilter(3)).filter(ImageFilter.GaussianBlur(0.45 if mode != "effect" else 0.25))
    out = crop.convert("RGBA")
    out.putalpha(alpha_img)
    return fade_alpha_edges(out, 3)


def fit_transparent(img: Image.Image, size: tuple[int, int], fit: float = 0.84, y_offset: int = 0) -> Image.Image:
    img = img.convert("RGBA")
    alpha = img.getchannel("A")
    bbox = alpha.getbbox()
    if bbox:
        img = img.crop(bbox)
    canvas = Image.new("RGBA", size, (0, 0, 0, 0))
    max_w = int(size[0] * fit)
    max_h = int(size[1] * fit)
    scale = min(max_w / max(1, img.width), max_h / max(1, img.height))
    img = img.resize((max(1, int(img.width * scale)), max(1, int(img.height * scale))), Image.Resampling.LANCZOS)
    x = (size[0] - img.width) // 2
    y = (size[1] - img.height) // 2 + y_offset
    y = max(0, min(size[1] - img.height, y))
    canvas.alpha_composite(img, (x, y))
    return canvas


def extract_transparent(
    sheet_path: Path,
    crop_box: tuple[int, int, int, int],
    out_path: Path,
    size: tuple[int, int],
    *,
    mode: str = "sprite",
    fit: float = 0.84,
    y_offset: int = 0,
) -> None:
    sheet = Image.open(sheet_path).convert("RGB")
    crop = sheet.crop(crop_box)
    cut = grabcut_alpha(crop, mode)
    out = fit_transparent(cut, size, fit=fit, y_offset=y_offset)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out.save(out_path)


def crop_cover(src: Image.Image, size: tuple[int, int]) -> Image.Image:
    sw, sh = src.size
    tw, th = size
    scale = max(tw / sw, th / sh)
    src = src.resize((int(sw * scale), int(sh * scale)), Image.Resampling.LANCZOS)
    left = max(0, (src.width - tw) // 2)
    top = max(0, (src.height - th) // 2)
    return src.crop((left, top, left + tw, top + th))


def build_cutin() -> None:
    sheet = Image.open(SHEETS["player_full"]).convert("RGB")
    crop = sheet.crop((724, 555, 1444, 1080))
    banner = crop_cover(crop, (720, 420)).convert("RGBA")
    overlay = Image.new("RGBA", banner.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(overlay, "RGBA")
    d.rectangle((0, 0, 720, 420), fill=(0, 0, 0, 42))
    d.polygon([(0, 0), (260, 0), (120, 420), (0, 420)], fill=(6, 2, 14, 125))
    d.rectangle((0, 342, 720, 420), fill=(8, 4, 18, 96))
    banner.alpha_composite(overlay)
    banner.save(ASSETS / "characters" / "player_witch_skill_cutin.png")


def import_player() -> list[Path]:
    out = ASSETS / "characters"
    jobs = [
        ("player_witch_idle.png", (105, 28, 420, 390), 0.78, 10),
        ("player_witch_move_left.png", (510, 60, 826, 384), 0.83, 8),
        ("player_witch_move_right.png", (858, 52, 1225, 382), 0.83, 8),
        ("player_witch_focus.png", (108, 535, 410, 812), 0.79, 10),
        ("player_witch_hit.png", (520, 525, 828, 804), 0.79, 10),
    ]
    changed = []
    for name, box, fit, yoff in jobs:
        path = out / name
        extract_transparent(SHEETS["player_chibi"], box, path, (256, 256), mode="sprite", fit=fit, y_offset=yoff)
        changed.append(path)

    avatar_src = Image.open(SHEETS["player_chibi"]).convert("RGB").crop((855, 535, 1215, 820))
    avatar = crop_cover(avatar_src, (256, 256)).convert("RGBA")
    avatar.save(out / "player_witch_avatar.png")
    changed.append(out / "player_witch_avatar.png")
    build_cutin()
    changed.append(out / "player_witch_skill_cutin.png")
    return changed


def import_boss() -> list[Path]:
    out = ASSETS / "bosses"
    mapping = [
        ("eclipse_boss_idle.png", (25, 45, 505, 456), 0.9),
        ("eclipse_boss_phase1.png", (25, 45, 505, 456), 0.9),
        ("eclipse_boss_phase2.png", (520, 50, 1030, 456), 0.9),
        ("eclipse_boss_phase3.png", (1028, 40, 1530, 456), 0.92),
        ("eclipse_boss_rage.png", (1028, 40, 1530, 456), 0.92),
        ("eclipse_boss_hit.png", (24, 520, 506, 928), 0.92),
        ("eclipse_boss_break.png", (24, 520, 506, 928), 0.92),
        ("eclipse_boss_death.png", (520, 530, 1028, 930), 0.9),
    ]
    changed = []
    for name, box, fit in mapping:
        path = out / name
        extract_transparent(SHEETS["boss"], box, path, (768, 768), mode="dark_sprite", fit=fit, y_offset=18)
        changed.append(path)

    avatar = Image.open(SHEETS["boss"]).convert("RGB").crop((1060, 560, 1435, 920))
    portrait = Image.new("RGBA", (720, 900), (0, 0, 0, 0))
    art = crop_cover(avatar, (640, 640)).convert("RGBA")
    portrait.alpha_composite(art, (40, 120))
    portrait.save(out / "eclipse_boss_portrait.png")
    changed.append(out / "eclipse_boss_portrait.png")
    return changed


def import_bullets() -> list[Path]:
    out = ASSETS / "bullets"
    jobs = [
        ("bullet_purple_moon.png", (55, 82, 330, 270), 0.74),
        ("bullet_white_needle.png", (430, 84, 720, 300), 0.82),
        ("bullet_red_warning.png", (42, 500, 340, 720), 0.83),
        ("bullet_laser_core.png", (432, 460, 708, 760), 0.88),
        ("bullet_laser_glow.png", (432, 460, 708, 760), 0.94),
    ]
    changed = []
    for name, box, fit in jobs:
        path = out / name
        extract_transparent(SHEETS["bullets"], box, path, (128, 128), mode="effect", fit=fit)
        changed.append(path)
    return changed


def import_vfx() -> list[Path]:
    out = ASSETS / "vfx"
    jobs = [
        ("vfx_player_shot.png", (88, 82, 318, 278), 0.74),
        ("vfx_graze.png", (455, 92, 708, 278), 0.72),
        ("vfx_player_beam.png", (835, 38, 1038, 325), 0.95),
        ("vfx_clear_bullets.png", (1150, 82, 1490, 290), 0.93),
        ("vfx_enemy_hit.png", (65, 565, 335, 750), 0.72),
        ("vfx_boss_hit.png", (65, 565, 335, 750), 0.78),
        ("vfx_boss_break.png", (820, 515, 1110, 790), 0.92),
        ("vfx_explosion_small.png", (455, 500, 700, 790), 0.82),
        ("vfx_explosion_large.png", (820, 515, 1110, 790), 0.92),
        ("vfx_player_ultimate_circle.png", (1130, 520, 1510, 790), 0.95),
    ]
    changed = []
    for name, box, fit in jobs:
        path = out / name
        extract_transparent(SHEETS["vfx"], box, path, (256, 256), mode="effect", fit=fit)
        changed.append(path)
    return changed


def update_manifest(changed: list[Path]) -> None:
    manifest_path = ASSETS / "asset_manifest.json"
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    changed_set = {p.relative_to(ASSETS).as_posix() for p in changed}
    for category in ["characters", "bosses", "bullets", "vfx"]:
        for filename, meta in manifest.get(category, {}).items():
            rel = f"{category}/{filename}"
            if rel in changed_set:
                img = Image.open(ASSETS / rel)
                meta["size"] = f"{img.width}x{img.height}"
                meta["source"] = "user generated AI sheet import, locally cropped and background-cleaned"
                meta["license"] = "user-provided AI-generated project asset"
                meta["commercial_use"] = True
                if category in {"bosses", "bullets", "vfx"} or filename not in {"player_witch_avatar.png", "player_witch_skill_cutin.png"}:
                    meta["transparent_background"] = True
                else:
                    meta["transparent_background"] = False
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def main() -> None:
    ensure_inputs()
    planned = [
        *(ASSETS / "characters" / name for name in [
            "player_witch_idle.png",
            "player_witch_move_left.png",
            "player_witch_move_right.png",
            "player_witch_focus.png",
            "player_witch_hit.png",
            "player_witch_avatar.png",
            "player_witch_skill_cutin.png",
        ]),
        *(ASSETS / "bosses" / name for name in [
            "eclipse_boss_idle.png",
            "eclipse_boss_phase1.png",
            "eclipse_boss_phase2.png",
            "eclipse_boss_phase3.png",
            "eclipse_boss_rage.png",
            "eclipse_boss_hit.png",
            "eclipse_boss_break.png",
            "eclipse_boss_death.png",
            "eclipse_boss_portrait.png",
        ]),
        *(ASSETS / "bullets" / name for name in [
            "bullet_purple_moon.png",
            "bullet_white_needle.png",
            "bullet_red_warning.png",
            "bullet_laser_core.png",
            "bullet_laser_glow.png",
        ]),
        *(ASSETS / "vfx" / name for name in [
            "vfx_player_shot.png",
            "vfx_graze.png",
            "vfx_player_beam.png",
            "vfx_clear_bullets.png",
            "vfx_enemy_hit.png",
            "vfx_boss_hit.png",
            "vfx_boss_break.png",
            "vfx_explosion_small.png",
            "vfx_explosion_large.png",
            "vfx_player_ultimate_circle.png",
        ]),
    ]
    backup_dir = backup(planned)
    changed: list[Path] = []
    changed.extend(import_player())
    changed.extend(import_boss())
    changed.extend(import_bullets())
    changed.extend(import_vfx())
    update_manifest(changed)
    print(json.dumps({"backup": str(backup_dir), "changed": [str(p.relative_to(OUT)) for p in changed]}, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
