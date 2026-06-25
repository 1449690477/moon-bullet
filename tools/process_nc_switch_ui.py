# -*- coding: utf-8 -*-
"""Build cleaned Night Coffin switch VFX and compact companion skill icons."""

from pathlib import Path

import numpy as np
from PIL import Image, ImageEnhance, ImageFilter
from scipy import ndimage


ROOT = Path(__file__).resolve().parents[1]
NC_IMPACT = ROOT / "assets/companions/night_coffin_array/impact"
UI_DIR = ROOT / "assets/ui"


def clean_switch_texture(source: Path, output: Path) -> None:
    src = np.asarray(Image.open(source).convert("RGBA")).astype(np.float32)
    out = src.copy()
    r, g, b, alpha = (src[..., i] for i in range(4))

    # The supplied cutouts retain a dark green/cyan fringe. Recolor bright
    # energy into blue-violet and fade only the dark, saturated edge residue.
    green_excess = np.clip((g - np.maximum(r, b) - 3.0) / 74.0, 0.0, 1.0)
    cyan_excess = np.clip((np.minimum(g, b) - r - 5.0) / 78.0, 0.0, 1.0)
    green_presence = np.clip((g - 12.0) / 72.0, 0.0, 1.0)
    contamination = np.maximum(green_excess, cyan_excess) * green_presence

    out[..., 0] = np.clip(r + contamination * (28.0 + b * 0.28), 0, 255)
    violet_green = b * 0.42 + r * 0.20
    out[..., 1] = np.clip(g * (1.0 - contamination) + violet_green * contamination, 0, 255)
    out[..., 2] = np.clip(
        np.maximum(b, g * (0.74 + contamination * 0.24))
        + contamination * 34.0,
        0,
        255,
    )

    luminance = np.maximum.reduce([r, g, b])
    dark_edge = contamination * np.clip((145.0 - luminance) / 115.0, 0.0, 1.0)
    out[..., 3] = alpha * (1.0 - dark_edge * 0.88)

    # Contract the nearly transparent fringe by one pixel without damaging
    # the bright central energy details.
    contracted = ndimage.minimum_filter(out[..., 3], size=3)
    edge_mix = np.clip((70.0 - luminance) / 70.0, 0.0, 1.0) * contamination
    out[..., 3] = out[..., 3] * (1.0 - edge_mix * 0.55) + contracted * edge_mix * 0.55

    yy, xx = np.mgrid[0 : src.shape[0], 0 : src.shape[1]]
    border_distance = np.minimum.reduce(
        [xx, yy, src.shape[1] - 1 - xx, src.shape[0] - 1 - yy]
    ).astype(np.float32)
    border_fade = np.clip(border_distance / 18.0, 0.0, 1.0)
    border_fade = border_fade * border_fade * (3.0 - 2.0 * border_fade)
    out[..., 3] *= border_fade

    image = Image.fromarray(np.clip(out, 0, 255).astype(np.uint8), "RGBA")
    image.save(output, optimize=True)
    print(f"{source.name} -> {output.relative_to(ROOT)} {image.size}")


def build_skill_icon(source: Path, output: Path, crop_ratio: float) -> None:
    image = Image.open(source).convert("RGB")
    side = min(image.size)
    left = (image.width - side) // 2
    top = (image.height - side) // 2
    image = image.crop((left, top, left + side, top + side))

    inset = round(side * crop_ratio)
    image = image.crop((inset, inset, side - inset, side - inset))
    image = image.resize((256, 256), Image.Resampling.LANCZOS)
    image = ImageEnhance.Contrast(image).enhance(1.08)
    image = ImageEnhance.Color(image).enhance(1.06)
    image = image.filter(ImageFilter.UnsharpMask(radius=1.1, percent=115, threshold=3))

    # Gentle vignette keeps ornate square borders from competing with the
    # circular HUD frame while preserving the supplied artwork.
    yy, xx = np.mgrid[0:256, 0:256]
    distance = np.sqrt(((xx - 127.5) / 181.0) ** 2 + ((yy - 127.5) / 181.0) ** 2)
    vignette = np.clip(1.06 - np.maximum(0.0, distance - 0.48) * 0.42, 0.78, 1.06)
    arr = np.asarray(image).astype(np.float32)
    arr *= vignette[..., None]
    image = Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8), "RGB")
    image.save(output, optimize=True, quality=94)
    print(f"{source.name} -> {output.relative_to(ROOT)} {image.size}")


def main() -> None:
    UI_DIR.mkdir(parents=True, exist_ok=True)
    clean_switch_texture(NC_IMPACT / "star_flash.png", NC_IMPACT / "star_flash_clean.png")
    clean_switch_texture(NC_IMPACT / "orbit_ring.png", NC_IMPACT / "orbit_ring_clean.png")
    build_skill_icon(ROOT / "圣冕技能图标.png", UI_DIR / "ui_saint_skill_icon.png", 0.055)
    build_skill_icon(ROOT / "夜棺技能图标.png", UI_DIR / "ui_night_coffin_skill_icon.png", 0.045)


if __name__ == "__main__":
    main()
