#!/usr/bin/env python3
"""Extract and grade the prepared Corrupt Gun infection-chain sprite sheets."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFont
from scipy import ndimage


ROOT = Path(__file__).resolve().parents[1]
SOURCE_DIRS = (
    ROOT / "7号战机 开发文件夹_副本",
    ROOT / "moon-bullet-main" / "7号战机 开发文件夹",
)
SOURCE_DIR = SOURCE_DIRS[0]
OUTPUT_DIR = ROOT / "assets" / "player" / "corrupt_gun" / "infection"
PREVIEW_DIR = ROOT / "tools" / "corruptgun_infection_preview"

SHEETS = {
    "tentacle": SOURCE_DIR / "连锁触手贴图.png",
    "impact": SOURCE_DIR / "连锁打击特效 幅画.png",
    "reference": SOURCE_DIR / "传导 连锁腐蚀 锁链 感染特效贴图参考.png",
}

# Crops deliberately exclude neighboring concepts from the packed reference sheets.
CROPS = {
    "tendril_1": ("tentacle", (35, 15, 1230, 220)),
    "tendril_2": ("tentacle", (45, 245, 620, 490)),
    "tendril_3": ("tentacle", (25, 720, 745, 958)),
    "link": ("reference", (270, 48, 358, 92)),
    "node": ("impact", (420, 40, 765, 410)),
    "hit": ("impact", (785, 35, 1235, 420)),
    "burst": ("impact", (865, 825, 1238, 1215)),
}

# Runtime modules are deliberately small, repeatable pieces. The renderer lays
# these along a smooth curve instead of stretching a full concept into a line.
MODULE_CROPS = {
    "chain_head": ("tentacle", (25, 720, 310, 960)),
    "chain_link": ("reference", (270, 48, 358, 92)),
    "tendril_spine": ("tentacle", (430, 70, 735, 205)),
    "tendril_barb": ("reference", (145, 365, 300, 510)),
    "source_node": ("impact", (420, 40, 765, 410)),
    "target_burst": ("impact", (785, 35, 1235, 420)),
}

MODULE_SIZES = {
    "chain_head": (128, 96),
    "chain_link": (72, 36),
    "tendril_spine": (104, 46),
    "tendril_barb": (64, 48),
    "source_node": (128, 128),
    "target_burst": (160, 160),
}


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def trim_with_padding(image: Image.Image, padding: int = 18) -> Image.Image:
    alpha = image.getchannel("A")
    bbox = alpha.getbbox()
    if not bbox:
        raise RuntimeError("empty infection crop")
    cropped = image.crop(bbox)
    canvas = Image.new("RGBA", (cropped.width + padding * 2, cropped.height + padding * 2))
    canvas.alpha_composite(cropped, (padding, padding))
    return canvas


def keep_largest_component(image: Image.Image) -> Image.Image:
    data = np.asarray(image.convert("RGBA")).copy()
    labels, count = ndimage.label(data[..., 3] > 8)
    if count <= 1:
        return image
    areas = np.bincount(labels.ravel())
    keep = int(np.argmax(areas[1:]) + 1)
    data[labels != keep] = 0
    return Image.fromarray(data, "RGBA")


def fit_runtime_canvas(image: Image.Image, size: tuple[int, int], padding: int = 5) -> Image.Image:
    target_w, target_h = size
    inner_w = max(1, target_w - padding * 2)
    inner_h = max(1, target_h - padding * 2)
    fitted = image.copy()
    fitted.thumbnail((inner_w, inner_h), Image.Resampling.LANCZOS)
    canvas = Image.new("RGBA", size)
    canvas.alpha_composite(fitted, ((target_w - fitted.width) // 2, (target_h - fitted.height) // 2))
    return canvas


def alpha_bounds(image: Image.Image) -> list[int]:
    bbox = image.getchannel("A").getbbox()
    if not bbox:
        return [0, 0, 0, 0]
    return list(bbox)


def recolor_green_spill(image: Image.Image, clone: bool) -> Image.Image:
    data = np.asarray(image.convert("RGBA"), dtype=np.float32)
    rgb = data[..., :3]
    alpha = data[..., 3]
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]

    chroma = np.maximum.reduce([r, g, b]) - np.minimum.reduce([r, g, b])
    green = (
        (alpha > 0)
        & (chroma > 5)
        & ((g > r * 1.02 + 2) | ((g > r * 0.58 + 4) & (b > r * 0.72 + 4)))
    )
    energy = np.maximum.reduce([r, g, b])
    # Green-screen material is converted into blood-red corrosion rather than erased.
    r2 = np.where(green, np.maximum(r, energy * 0.82), r)
    g2 = np.where(green, energy * 0.055, np.minimum(g, np.maximum(r, b) * 0.42 + 4))
    b2 = np.where(green, np.maximum(b, energy * 0.20), b)

    if clone:
        luminance = np.maximum.reduce([r2, g2, b2])
        r2 = np.minimum(205, r2 * 0.62 + luminance * 0.06)
        g2 = np.minimum(42, g2 * 0.24)
        b2 = np.minimum(82, b2 * 0.45 + r2 * 0.10)
    else:
        r2 = np.minimum(255, r2 * 0.92 + energy * 0.10)
        g2 *= 0.62
        b2 = np.minimum(255, b2 * 0.86 + r2 * 0.035)

    out = np.stack([r2, g2, b2, alpha], axis=-1)
    out[alpha < 5] = 0
    return Image.fromarray(np.clip(out, 0, 255).astype(np.uint8), "RGBA")


def green_pixel_count(image: Image.Image) -> int:
    data = np.asarray(image.convert("RGBA"), dtype=np.int16)
    r, g, b, a = (data[..., index] for index in range(4))
    return int(np.count_nonzero((a > 8) & (g > r * 1.12 + 6) & (g > b * 1.12 + 6)))


def cyan_pixel_count(image: Image.Image) -> int:
    data = np.asarray(image.convert("RGBA"), dtype=np.float32)
    r, g, b, a = (data[..., index] for index in range(4))
    chroma = np.maximum.reduce([r, g, b]) - np.minimum.reduce([r, g, b])
    return int(np.count_nonzero((a > 8) & (chroma > 5) & (g > r * 0.58 + 4) & (b > r * 0.72 + 4)))


def build_contact_sheet(files: list[tuple[str, Path]]) -> None:
    font = ImageFont.load_default()
    tile_w, tile_h = 460, 210
    columns = 2
    rows = (len(files) + columns - 1) // columns
    contact = Image.new("RGB", (tile_w * columns, tile_h * rows), (12, 8, 15))
    draw = ImageDraw.Draw(contact)
    for index, (name, path) in enumerate(files):
        image = Image.open(path).convert("RGBA")
        image.thumbnail((tile_w - 24, tile_h - 42), Image.Resampling.LANCZOS)
        x = (index % columns) * tile_w + 12
        y = (index // columns) * tile_h + 28
        contact.paste(image, (x + (tile_w - 24 - image.width) // 2, y), image)
        draw.text((x, 8 + (index // columns) * tile_h), name, fill=(255, 211, 226), font=font)
    PREVIEW_DIR.mkdir(parents=True, exist_ok=True)
    contact.save(PREVIEW_DIR / "cg_infection_assets_contact.png", optimize=True)


def main() -> None:
    missing = [str(folder / path.name) for folder in SOURCE_DIRS for path in SHEETS.values() if not (folder / path.name).is_file()]
    if missing:
        raise FileNotFoundError("missing prepared infection sheets: " + ", ".join(missing))
    for source in SHEETS.values():
        hashes = {sha256(folder / source.name) for folder in SOURCE_DIRS}
        if len(hashes) != 1:
            raise RuntimeError(f"prepared infection sheet mismatch between demo/main folders: {source.name}")

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    generated: list[tuple[str, Path]] = []
    manifest_assets: dict[str, dict[str, object]] = {}

    definitions = {**CROPS, **MODULE_CROPS}
    for crop_name, (sheet_name, crop_box) in definitions.items():
        source = Image.open(SHEETS[sheet_name]).convert("RGBA").crop(crop_box)
        if crop_name == "tendril_2":
            source = keep_largest_component(source)
        source = trim_with_padding(source, padding=4 if crop_name in MODULE_SIZES else 18)
        if crop_name in MODULE_SIZES:
            source = fit_runtime_canvas(source, MODULE_SIZES[crop_name])
        for theme in ("main", "clone"):
            output = recolor_green_spill(source, clone=theme == "clone")
            path = OUTPUT_DIR / f"cg_infect_{crop_name}_{theme}.png"
            output.save(path, optimize=True)
            key = f"{crop_name}_{theme}"
            greens = green_pixel_count(output)
            cyans = cyan_pixel_count(output)
            if greens or (theme == "clone" and cyans):
                raise RuntimeError(f"{path}: {greens} residual green pixels, {cyans} residual cyan pixels")
            generated.append((key, path))
            manifest_assets[key] = {
                "file": str(path.relative_to(ROOT)),
                "size": [output.width, output.height],
                "alphaBounds": alpha_bounds(output),
                "greenPixels": greens,
                "cyanPixels": cyans,
                "sha256": sha256(path),
                "source": SHEETS[sheet_name].name,
                "crop": list(crop_box),
            }

    manifest = {
        "formatVersion": 1,
        "character": "corruptgun",
        "effect": "void-corrosion-infection-chain",
        "generator": str(Path(__file__).relative_to(ROOT)),
        "sourceFolders": [str(folder.relative_to(ROOT)) for folder in SOURCE_DIRS],
        "sourceSha256": {path.name: sha256(path) for path in SHEETS.values()},
        "renderContract": {
            "mainTheme": "black-red with hot crimson core",
            "cloneTheme": "deeper void-black and blood-crimson",
            "blend": "source-over body plus restrained lighter core",
            "fallbackComplete": True,
        },
        "assets": manifest_assets,
    }
    manifest_path = OUTPUT_DIR / "cg_infection_manifest.json"
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    build_contact_sheet(generated)
    print(f"Generated {len(generated)} infection assets in {OUTPUT_DIR}")


if __name__ == "__main__":
    main()
