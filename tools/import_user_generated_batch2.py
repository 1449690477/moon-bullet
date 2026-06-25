from __future__ import annotations

import json
import shutil
from datetime import datetime
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter


SCRIPT_ROOT = Path(__file__).resolve().parents[1]
OUT = SCRIPT_ROOT if (SCRIPT_ROOT / "assets").exists() else SCRIPT_ROOT / "moon_bullet_demo_v3_6"
ASSETS = OUT / "assets"
DOWNLOADS = Path("/Users/wanghan/Downloads")

SOURCES = {
    "player_cutin": DOWNLOADS / "ChatGPT Image 2026年6月18日 13_11_43.png",
    "gold_blue_burst": DOWNLOADS / "ChatGPT Image 2026年6月18日 13_12_13.png",
    "clear_burst": DOWNLOADS / "ChatGPT Image 2026年6月18日 13_17_19 (1).png",
    "small_graze": DOWNLOADS / "ChatGPT Image 2026年6月18日 13_17_20 (3).png",
    "moon_circle": DOWNLOADS / "ChatGPT Image 2026年6月18日 13_17_20 (4).png",
    "boss_break_named": DOWNLOADS / "vfx_boss_break.png",
    "boss_hit_named": DOWNLOADS / "vfx_boss_hit.png",
    "enemy_hit_named": DOWNLOADS / "vfx_enemy_hit.png",
    "player_beam_named": DOWNLOADS / "vfx_player_beam.png",
    "ultimate_named": DOWNLOADS / "vfx_player_ultimate_circle.png",
    "boss_portrait": DOWNLOADS / "ChatGPT Image 2026年6月18日 13_11_49.png",
    "eclipse_burst": DOWNLOADS / "ChatGPT Image 2026年6月18日 13_17_19 (2).png",
}


def ensure_inputs() -> None:
    missing = [str(path) for path in SOURCES.values() if not path.exists()]
    if missing:
        raise FileNotFoundError("Missing source image(s):\n" + "\n".join(missing))


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
    arr[:, :, 3] *= np.clip(dist / max(1, margin), 0, 1)
    return Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8), "RGBA")


def _dominant_neutral_border_colors(rgb: np.ndarray) -> np.ndarray:
    border = np.concatenate(
        [
            rgb[:18].reshape(-1, 3),
            rgb[-18:].reshape(-1, 3),
            rgb[:, :18].reshape(-1, 3),
            rgb[:, -18:].reshape(-1, 3),
        ],
        axis=0,
    )
    chroma = border.max(axis=1) - border.min(axis=1)
    lum = border.mean(axis=1)
    border = border[(chroma < 18) & (lum > 150)]
    if len(border) == 0:
        return np.array([[240, 240, 240], [255, 255, 255]], dtype=np.float32)
    rounded = (np.round(border / 8) * 8).astype(np.uint8)
    colors, counts = np.unique(rounded, axis=0, return_counts=True)
    order = np.argsort(-counts)[:6]
    return colors[order].astype(np.float32)


def checkerboard_to_alpha(src: Image.Image, *, keep_soft: bool = True) -> Image.Image:
    rgb = np.array(src.convert("RGB")).astype(np.float32)
    bg_colors = _dominant_neutral_border_colors(rgb)
    diff = rgb[:, :, None, :] - bg_colors[None, None, :, :]
    dist_bg = np.sqrt(np.sum(diff * diff, axis=3)).min(axis=2)
    lum = rgb.mean(axis=2)
    chroma = rgb.max(axis=2) - rgb.min(axis=2)
    min_channel = rgb.min(axis=2)

    exact_bg = (dist_bg < 15) & (chroma < 16) & (lum > 150)
    alpha = np.maximum.reduce(
        [
            np.clip((dist_bg - 8) * 9.0, 0, 255),
            np.clip((chroma - 9) * 7.0, 0, 255),
            np.clip((150 - min_channel) * 1.8, 0, 255),
        ]
    )
    alpha = np.where(exact_bg, 0, alpha)
    if keep_soft:
        blue_glow = (rgb[:, :, 2] - rgb[:, :, 0] > 12) & (rgb[:, :, 2] - rgb[:, :, 1] > 6)
        gold_glow = (rgb[:, :, 0] - rgb[:, :, 2] > 22) & (rgb[:, :, 1] - rgb[:, :, 2] > 10)
        alpha = np.where((blue_glow | gold_glow) & (dist_bg > 6), np.maximum(alpha, np.clip(chroma * 6, 0, 160)), alpha)
    alpha = np.where(alpha < 20, 0, alpha)
    alpha[:2, :] = 0
    alpha[-2:, :] = 0
    alpha[:, :2] = 0
    alpha[:, -2:] = 0
    alpha_img = Image.fromarray(np.clip(alpha, 0, 255).astype(np.uint8), "L")
    alpha_img = alpha_img.filter(ImageFilter.MedianFilter(3)).filter(ImageFilter.GaussianBlur(0.35))
    out = src.convert("RGBA")
    out.putalpha(alpha_img)
    return fade_alpha_edges(out, 3)


def trim_alpha(img: Image.Image, pad: int = 0) -> Image.Image:
    img = img.convert("RGBA")
    bbox = img.getchannel("A").getbbox()
    if not bbox:
        return img
    left, top, right, bottom = bbox
    left = max(0, left - pad)
    top = max(0, top - pad)
    right = min(img.width, right + pad)
    bottom = min(img.height, bottom + pad)
    return img.crop((left, top, right, bottom))


def fit_transparent(img: Image.Image, size: tuple[int, int], fit: float = 0.9, y_offset: int = 0) -> Image.Image:
    img = trim_alpha(img)
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


def crop_cover(src: Image.Image, size: tuple[int, int], center: tuple[float, float] = (0.5, 0.5)) -> Image.Image:
    src = src.convert("RGBA")
    sw, sh = src.size
    tw, th = size
    scale = max(tw / sw, th / sh)
    src = src.resize((max(1, int(sw * scale)), max(1, int(sh * scale))), Image.Resampling.LANCZOS)
    cx = int(src.width * center[0])
    cy = int(src.height * center[1])
    left = max(0, min(src.width - tw, cx - tw // 2))
    top = max(0, min(src.height - th, cy - th // 2))
    return src.crop((left, top, left + tw, top + th))


def save_effect_from_checker(source: Path, target: Path, *, fit: float = 0.9) -> Path:
    img = checkerboard_to_alpha(Image.open(source), keep_soft=True)
    out = fit_transparent(img, (256, 256), fit=fit)
    target.parent.mkdir(parents=True, exist_ok=True)
    out.save(target)
    return target


def save_named_rgba(source: Path, target: Path, *, size: tuple[int, int] = (256, 256), fit: float = 0.94) -> Path:
    img = Image.open(source).convert("RGBA")
    out = fit_transparent(img, size, fit=fit)
    target.parent.mkdir(parents=True, exist_ok=True)
    out.save(target)
    return target


def save_player_cutin() -> Path:
    source = checkerboard_to_alpha(Image.open(SOURCES["player_cutin"]), keep_soft=False)
    subject = trim_alpha(source, pad=8)
    subject = fit_transparent(subject, (720, 420), fit=0.95, y_offset=4)

    banner = Image.new("RGBA", (720, 420), (4, 4, 12, 255))
    draw = ImageDraw.Draw(banner, "RGBA")
    for y in range(420):
        t = y / 419
        draw.line((0, y, 720, y), fill=(8, int(7 + 10 * (1 - t)), int(22 + 22 * (1 - t)), 255))
    draw.rectangle((0, 0, 720, 420), fill=(0, 0, 0, 54))
    draw.polygon([(0, 0), (210, 0), (90, 420), (0, 420)], fill=(37, 17, 66, 112))
    draw.polygon([(720, 0), (520, 0), (620, 420), (720, 420)], fill=(10, 42, 70, 72))
    draw.line((0, 36, 720, 18), fill=(159, 226, 255, 52), width=2)
    draw.line((0, 382, 720, 402), fill=(255, 218, 132, 46), width=2)
    banner.alpha_composite(subject)
    target = ASSETS / "characters" / "player_witch_skill_cutin.png"
    banner.save(target)
    return target


def save_boss_portrait() -> Path:
    img = Image.open(SOURCES["boss_portrait"]).convert("RGBA")
    img = fit_transparent(img, (720, 900), fit=0.92, y_offset=24)
    target = ASSETS / "bosses" / "eclipse_boss_portrait.png"
    target.parent.mkdir(parents=True, exist_ok=True)
    img.save(target)
    return target


def update_manifest(changed: list[Path], skipped: list[str]) -> None:
    manifest_path = ASSETS / "asset_manifest.json"
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    changed_set = {p.relative_to(ASSETS).as_posix() for p in changed}
    for category in ["characters", "bosses", "vfx"]:
        for filename, meta in manifest.get(category, {}).items():
            rel = f"{category}/{filename}"
            if rel not in changed_set:
                continue
            img = Image.open(ASSETS / rel)
            meta["size"] = f"{img.width}x{img.height}"
            meta["source"] = "user generated AI asset batch 2, locally cleaned and imported"
            meta["license"] = "user-provided AI-generated project asset"
            meta["commercial_use"] = True
            meta["transparent_background"] = category != "characters" or filename != "player_witch_skill_cutin.png"
    notes = manifest.get("notes", "")
    skip_note = "Skipped /Users/wanghan/Downloads/player_witch_idle.png from batch 2 because it was lower-quality placeholder art than the current player sprite."
    if skipped and skip_note not in notes:
        manifest["notes"] = (notes.rstrip() + "\n" + skip_note).strip()
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def main() -> None:
    ensure_inputs()
    planned = [
        ASSETS / "characters" / "player_witch_skill_cutin.png",
        ASSETS / "bosses" / "eclipse_boss_portrait.png",
        ASSETS / "vfx" / "vfx_boss_break.png",
        ASSETS / "vfx" / "vfx_boss_hit.png",
        ASSETS / "vfx" / "vfx_enemy_hit.png",
        ASSETS / "vfx" / "vfx_player_beam.png",
        ASSETS / "vfx" / "vfx_player_ultimate_circle.png",
        ASSETS / "vfx" / "vfx_explosion_large.png",
        ASSETS / "vfx" / "vfx_explosion_small.png",
        ASSETS / "vfx" / "vfx_clear_bullets.png",
        ASSETS / "vfx" / "vfx_graze.png",
    ]
    backup_dir = backup(planned)
    changed: list[Path] = []
    skipped = [str(DOWNLOADS / "player_witch_idle.png")]

    changed.append(save_player_cutin())
    changed.append(save_boss_portrait())
    changed.append(save_named_rgba(SOURCES["boss_break_named"], ASSETS / "vfx" / "vfx_boss_break.png", fit=0.96))
    changed.append(save_named_rgba(SOURCES["boss_hit_named"], ASSETS / "vfx" / "vfx_boss_hit.png", fit=0.96))
    changed.append(save_named_rgba(SOURCES["enemy_hit_named"], ASSETS / "vfx" / "vfx_enemy_hit.png", fit=0.92))
    changed.append(save_named_rgba(SOURCES["player_beam_named"], ASSETS / "vfx" / "vfx_player_beam.png", fit=0.98))
    changed.append(save_named_rgba(SOURCES["ultimate_named"], ASSETS / "vfx" / "vfx_player_ultimate_circle.png", fit=0.98))

    changed.append(save_effect_from_checker(SOURCES["eclipse_burst"], ASSETS / "vfx" / "vfx_explosion_large.png", fit=0.98))
    changed.append(save_effect_from_checker(SOURCES["gold_blue_burst"], ASSETS / "vfx" / "vfx_explosion_small.png", fit=0.8))
    changed.append(save_effect_from_checker(SOURCES["moon_circle"], ASSETS / "vfx" / "vfx_clear_bullets.png", fit=0.98))
    changed.append(save_effect_from_checker(SOURCES["small_graze"], ASSETS / "vfx" / "vfx_graze.png", fit=0.72))

    update_manifest(changed, skipped)
    print(json.dumps({
        "backup": str(backup_dir),
        "changed": [str(p.relative_to(OUT)) for p in changed],
        "skipped": skipped,
    }, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
