#!/usr/bin/env python3
"""Build runtime-ready Dream Stage 3 room, plush, bullet, and VFX assets.

The prepared 1254px sheets are concept collages rather than runtime atlases.
This script keeps the source folder read-only, extracts only the pieces used by
the stage, removes chroma-grid/edge spill, and emits padded deterministic files.
"""

from __future__ import annotations

import hashlib
import json
import math
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable

import numpy as np
from PIL import Image, ImageChops, ImageDraw, ImageEnhance, ImageFilter, ImageFont
from scipy import ndimage


ROOT = Path(__file__).resolve().parents[1]
SOURCE_DIR = ROOT / "moon-bullet-main" / "梦境第三关开发"
OUTPUT_DIR = ROOT / "assets" / "dream_stage3"
BACKGROUND_DIR = OUTPUT_DIR / "backgrounds"
ENEMY_DIR = OUTPUT_DIR / "enemies"
BULLET_DIR = OUTPUT_DIR / "bullets"
VFX_DIR = OUTPUT_DIR / "vfx"

SOURCES = {
    "room": "场景地图.png",
    "leaf_base": "新叶喵小怪.png",
    "leaf_pose": "新叶喵小怪姿态2.png",
    "leaf_fx_a": "新叶苗弹幕.png",
    "leaf_fx_b": "新叶喵弹幕2.png",
    "leaf_fx_c": "新叶喵弹幕3.png",
    "penguin_base": "企鹅小怪.png",
    "penguin_pose": "企鹅小怪姿态2.png",
    "penguin_fx_a": "企鹅弹幕.png",
    "penguin_fx_b": "企鹅弹幕2.png",
    "doll_base": "流萤小怪.png",
    "doll_pose": "流萤小怪姿态2.png",
    "doll_fx": "流萤弹幕.png",
    "fish_base": "好兄弟小怪.png",
    "fish_pose": "好兄弟小怪姿态2.png",
    "fish_fx": "好兄弟弹幕2.png",
    "mixed_fx": "星星弹幕 和 好兄弟弹幕.png",
    "star_base": "星星小怪.png",
    "star_pose": "星星小怪姿态2.png",
    "star_fx": "星星弹幕2.png",
}

SOURCE_PATHS = {key: SOURCE_DIR / name for key, name in SOURCES.items()}


@dataclass(frozen=True)
class CropSpec:
    key: str
    source: str
    crop: tuple[int, int, int, int]
    canvas: tuple[int, int]
    family: str
    protect_green: bool = False
    forward_axis: str | None = None


ENEMY_DEFS = {
    "LeafCat": {
        "base_key": "dreamPlushLeafCat",
        "base": "leaf_base",
        "pose": "leaf_pose",
        "protect_green": True,
        "muzzle": [192, 224],
    },
    "Penguin": {
        "base_key": "dreamPlushPenguin",
        "base": "penguin_base",
        "pose": "penguin_pose",
        "protect_green": False,
        "muzzle": [192, 222],
    },
    "GrayDoll": {
        "base_key": "dreamPlushGrayDoll",
        "base": "doll_base",
        "pose": "doll_pose",
        "protect_green": False,
        "muzzle": [192, 230],
    },
    "BlueFish": {
        "base_key": "dreamPlushBlueFish",
        "base": "fish_base",
        "pose": "fish_pose",
        "protect_green": False,
        "muzzle": [78, 206],
    },
    "StarPillow": {
        "base_key": "dreamPlushStarPillow",
        "base": "star_base",
        "pose": "star_pose",
        "protect_green": False,
        "muzzle": [192, 215],
    },
}

# 1254x1254 enemy sheets are exact 2x2 concept grids. The second sheet is a
# pose collection, not a flipbook; each pose is kept as a named state.
ENEMY_STATE_CELLS = {
    "Idle": ("base", 0),
    "MoveR": ("pose", 1),
    "MoveL": ("pose", 2),
    "Attack": ("pose", 3),
}

BULLET_SPECS = (
    CropSpec("dreamPlushLeafBlade", "leaf_fx_a", (298, 105, 392, 432), (96, 160), "leaf", True, "up"),
    CropSpec("dreamPlushLeafSeed", "leaf_fx_a", (190, 640, 320, 775), (112, 112), "leaf", True, "up"),
    CropSpec("dreamPlushLeafBud", "leaf_fx_c", (35, 40, 185, 420), (104, 168), "leaf", True, "up"),
    CropSpec("dreamPlushIceShard", "penguin_fx_b", (278, 105, 392, 390), (96, 160), "penguin", False, "up"),
    CropSpec("dreamPlushSnowball", "penguin_fx_b", (260, 555, 405, 785), (104, 152), "penguin", False, "up"),
    CropSpec("dreamPlushIceSpear", "penguin_fx_a", (635, 815, 1235, 1095), (208, 112), "penguin", False, "left"),
    CropSpec("dreamPlushCrystalShard", "doll_fx", (955, 20, 1038, 158), (96, 152), "doll", False, "up"),
    CropSpec("dreamPlushDollOrb", "doll_fx", (18, 895, 112, 992), (104, 104), "doll"),
    CropSpec("dreamPlushDollSigil", "doll_fx", (18, 535, 112, 635), (112, 112), "doll"),
    CropSpec("dreamPlushWaterDrop", "fish_fx", (682, 145, 790, 287), (96, 128), "fish", False, "up"),
    CropSpec("dreamPlushFishbone", "fish_fx", (14, 520, 116, 640), (144, 88), "fish", False, "right"),
    CropSpec("dreamPlushBubblePearl", "mixed_fx", (318, 8, 408, 112), (104, 104), "fish"),
    CropSpec("dreamPlushStarShot", "star_fx", (98, 32, 170, 112), (96, 96), "star"),
    CropSpec("dreamPlushMeteorStar", "star_fx", (20, 492, 210, 620), (176, 104), "star", False, "left"),
    CropSpec("dreamPlushConstellationNode", "star_fx", (526, 1028, 708, 1235), (144, 144), "star"),
)

VFX_SPECS = (
    CropSpec("dreamPlushLeafMuzzle", "leaf_fx_b", (650, 630, 1230, 1160), (256, 256), "leaf", True),
    CropSpec("dreamPlushLeafImpact", "leaf_fx_a", (650, 625, 1190, 1195), (256, 256), "leaf", True),
    CropSpec("dreamPlushPenguinMuzzle", "penguin_fx_a", (680, 65, 1235, 625), (256, 256), "penguin"),
    CropSpec("dreamPlushPenguinImpact", "penguin_fx_b", (885, 880, 1238, 1238), (256, 256), "penguin"),
    CropSpec("dreamPlushDollMuzzle", "doll_fx", (375, 530, 570, 720), (256, 256), "doll"),
    CropSpec("dreamPlushDollImpact", "doll_fx", (790, 20, 1235, 255), (256, 256), "doll"),
    CropSpec("dreamPlushFishMuzzle", "mixed_fx", (215, 0, 505, 365), (256, 256), "fish"),
    CropSpec("dreamPlushFishImpact", "fish_fx", (965, 790, 1235, 985), (256, 256), "fish"),
    CropSpec("dreamPlushStarMuzzle", "mixed_fx", (195, 650, 515, 930), (256, 256), "star"),
    CropSpec("dreamPlushStarImpact", "star_fx", (990, 1025, 1235, 1235), (256, 256), "star"),
)

FAMILY_OUTLINE = {
    "leaf": (13, 45, 39),
    "penguin": (8, 28, 65),
    "doll": (23, 18, 67),
    "fish": (7, 34, 64),
    "star": (73, 45, 10),
}


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def slug_from_key(key: str) -> str:
    chars: list[str] = []
    for index, char in enumerate(key):
        if char.isupper() and index:
            chars.append("_")
        chars.append(char.lower())
    return "".join(chars)


def alpha_bounds(image: Image.Image) -> list[int]:
    bbox = image.getchannel("A").getbbox()
    return list(bbox) if bbox else [0, 0, 0, 0]


def edge_touch_pixels(image: Image.Image) -> int:
    alpha = np.asarray(image.getchannel("A")) > 8
    return int(alpha[0].sum() + alpha[-1].sum() + alpha[:, 0].sum() + alpha[:, -1].sum())


def key_green_pixels(image: Image.Image) -> int:
    data = np.asarray(image.convert("RGBA"), dtype=np.float32)
    rgb = data[..., :3]
    alpha = data[..., 3] > 8
    delta = rgb - np.array([0, 255, 0], dtype=np.float32)
    distance = np.sqrt(np.sum(delta * delta, axis=2))
    return int(np.count_nonzero(alpha & (distance < 92)))


def clean_chroma(image: Image.Image, protect_green: bool) -> Image.Image:
    """Remove green grid/key spill while preserving intentional LeafCat greens."""

    data = np.asarray(image.convert("RGBA"), dtype=np.float32).copy()
    rgb = data[..., :3]
    alpha = data[..., 3]
    visible = alpha > 3
    r, g, b = (rgb[..., index] for index in range(3))
    key_distance = np.sqrt(r * r + (g - 255.0) ** 2 + b * b)
    exact_key = visible & (key_distance < 105)

    alpha[exact_key] = 0
    visible = alpha > 3
    if visible.any():
        edge_distance = ndimage.distance_transform_edt(visible)
        green_advantage = g - np.maximum(r, b)
        if protect_green:
            spill = visible & (edge_distance <= 3.0) & (green_advantage > 34) & (g > 115)
        else:
            # On non-leaf sheets the large saturated-green ribbons are key spill
            # around otherwise blue/yellow effects. Recolor them from the nearest
            # clean material pixel instead of punching holes in the effect.
            spill = visible & (green_advantage > 38) & (g > 115)

        safe = visible & ~spill
        if safe.any() and spill.any():
            _, indices = ndimage.distance_transform_edt(~safe, return_indices=True)
            nearest = rgb[indices[0], indices[1]]
            rgb[spill] = nearest[spill]

    # One-pixel matte contraction followed by a small feather removes the last
    # hard green rim without turning plush fur into a cardboard cutout.
    visible = alpha > 5
    if visible.any():
        eroded = ndimage.binary_erosion(visible, iterations=1, border_value=0)
        feather = ndimage.gaussian_filter(eroded.astype(np.float32), sigma=0.65)
        alpha = np.minimum(alpha, np.clip(feather * 255.0, 0, 255))

    data[..., :3] = np.clip(rgb, 0, 255)
    data[..., 3] = np.clip(alpha, 0, 255)
    data[data[..., 3] < 2] = 0
    return Image.fromarray(data.astype(np.uint8), "RGBA")


def keep_largest_component(image: Image.Image) -> Image.Image:
    data = np.asarray(image.convert("RGBA")).copy()
    labels, count = ndimage.label(data[..., 3] > 8)
    if count <= 1:
        return image
    areas = np.bincount(labels.ravel())
    keep = int(np.argmax(areas[1:]) + 1)
    data[labels != keep] = 0
    return Image.fromarray(data, "RGBA")


def trim(image: Image.Image, padding: int = 12) -> Image.Image:
    bbox = image.getchannel("A").getbbox()
    if not bbox:
        raise RuntimeError("empty Dream Stage 3 crop after chroma cleanup")
    part = image.crop(bbox)
    canvas = Image.new("RGBA", (part.width + padding * 2, part.height + padding * 2))
    canvas.alpha_composite(part, (padding, padding))
    return canvas


def fit_canvas(image: Image.Image, size: tuple[int, int], padding: int = 12, scale: float | None = None) -> Image.Image:
    width, height = size
    fitted = image.copy()
    if scale is None:
        fitted.thumbnail((width - padding * 2, height - padding * 2), Image.Resampling.LANCZOS)
    else:
        fitted = fitted.resize(
            (max(1, round(fitted.width * scale)), max(1, round(fitted.height * scale))),
            Image.Resampling.LANCZOS,
        )
    canvas = Image.new("RGBA", size)
    canvas.alpha_composite(fitted, ((width - fitted.width) // 2, (height - fitted.height) // 2))
    return canvas


def add_readability_outline(image: Image.Image, family: str) -> Image.Image:
    data = np.asarray(image.convert("RGBA"), dtype=np.uint8)
    alpha = data[..., 3].astype(np.float32)
    dilated = ndimage.maximum_filter(alpha, size=5)
    outline_alpha = np.clip((dilated - alpha) * 0.82, 0, 155).astype(np.uint8)
    color = FAMILY_OUTLINE[family]
    outline = np.zeros_like(data)
    outline[..., :3] = color
    outline[..., 3] = outline_alpha
    base = Image.fromarray(outline, "RGBA")
    base.alpha_composite(image)
    return base


def make_glow(image: Image.Image) -> Image.Image:
    data = np.asarray(image.convert("RGBA"), dtype=np.float32)
    alpha = data[..., 3] / 255.0
    luminance = np.max(data[..., :3], axis=2) / 255.0
    glow_alpha = np.clip(alpha * (0.28 + luminance * 0.72) * 205.0, 0, 205)
    glow = np.zeros_like(data)
    glow[..., :3] = np.clip(data[..., :3] * 1.08 + 8, 0, 255)
    glow[..., 3] = glow_alpha
    layer = Image.fromarray(glow.astype(np.uint8), "RGBA").filter(ImageFilter.GaussianBlur(2.2))
    core = Image.fromarray(data.astype(np.uint8), "RGBA")
    core.putalpha(Image.fromarray(np.clip(glow_alpha * 0.42, 0, 110).astype(np.uint8)))
    layer.alpha_composite(core)
    return layer


def derive_hit(image: Image.Image) -> Image.Image:
    data = np.asarray(image.convert("RGBA"), dtype=np.float32)
    alpha = data[..., 3].copy()
    rgb = data[..., :3]
    light = np.maximum.reduce(rgb, axis=2, keepdims=True)
    rgb = np.clip(rgb * 0.55 + light * 0.18 + np.array([92, 102, 118]), 0, 255)
    out = np.concatenate([rgb, alpha[..., None]], axis=2)
    return Image.fromarray(out.astype(np.uint8), "RGBA")


def derive_death(image: Image.Image) -> Image.Image:
    data = np.asarray(image.convert("RGBA"), dtype=np.float32)
    alpha = data[..., 3]
    gray = np.mean(data[..., :3], axis=2)
    rgb = np.stack([gray * 0.56 + 20, gray * 0.47 + 16, gray * 0.72 + 34], axis=2)
    out = np.concatenate([np.clip(rgb, 0, 255), np.clip(alpha * 0.72, 0, 255)[..., None]], axis=2)
    return Image.fromarray(out.astype(np.uint8), "RGBA")


def scrub_resampled_key(image: Image.Image) -> Image.Image:
    """Remove the occasional near-key pixel recreated by Lanczos resampling."""

    data = np.asarray(image.convert("RGBA"), dtype=np.float32).copy()
    rgb = data[..., :3]
    alpha = data[..., 3]
    delta = rgb - np.array([0.0, 255.0, 0.0], dtype=np.float32)
    bad = (alpha > 2) & (np.sqrt(np.sum(delta * delta, axis=2)) < 96)
    if bad.any():
        safe = (alpha > 2) & ~bad
        if safe.any():
            _, indices = ndimage.distance_transform_edt(~safe, return_indices=True)
            nearest = rgb[indices[0], indices[1]]
            rgb[bad] = nearest[bad]
        else:
            alpha[bad] = 0
    data[..., :3] = rgb
    data[..., 3] = alpha
    data[alpha < 2] = 0
    return Image.fromarray(np.clip(data, 0, 255).astype(np.uint8), "RGBA")


def save_png(image: Image.Image, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    scrub_resampled_key(image).save(path, optimize=True)


def asset_record(path: Path, **extra: object) -> dict[str, object]:
    image = Image.open(path).convert("RGBA")
    key_pixels = key_green_pixels(image)
    touches = edge_touch_pixels(image)
    if key_pixels:
        raise RuntimeError(f"{path}: {key_pixels} near-key green pixels remain")
    if touches:
        raise RuntimeError(f"{path}: {touches} visible pixels touch the canvas edge")
    return {
        "file": str(path.relative_to(ROOT)),
        "size": [image.width, image.height],
        "alphaBounds": alpha_bounds(image),
        "keyGreenPixels": key_pixels,
        "edgeTouchPixels": touches,
        "sha256": sha256(path),
        **extra,
    }


def cell_crop(image: Image.Image, cell: int) -> Image.Image:
    cell_size = 627
    x = (cell % 2) * cell_size
    y = (cell // 2) * cell_size
    return image.crop((x, y, x + cell_size, y + cell_size))


def process_enemies(manifest_assets: dict[str, dict[str, object]]) -> list[tuple[str, Path]]:
    contact: list[tuple[str, Path]] = []
    for family, definition in ENEMY_DEFS.items():
        source_images = {
            "base": Image.open(SOURCE_PATHS[str(definition["base"])]).convert("RGBA"),
            "pose": Image.open(SOURCE_PATHS[str(definition["pose"])]).convert("RGBA"),
        }
        prepared: dict[str, Image.Image] = {}
        source_state: dict[str, tuple[str, int]] = {}
        for state, (sheet_kind, cell) in ENEMY_STATE_CELLS.items():
            crop = cell_crop(source_images[sheet_kind], cell)
            crop = clean_chroma(crop, bool(definition["protect_green"]))
            crop = keep_largest_component(crop)
            prepared[state] = trim(crop, padding=10)
            source_state[state] = (sheet_kind, cell)

        max_w = max(frame.width for frame in prepared.values())
        max_h = max(frame.height for frame in prepared.values())
        common_scale = min(336 / max_w, 336 / max_h)
        rendered = {state: fit_canvas(frame, (384, 384), scale=common_scale) for state, frame in prepared.items()}
        rendered["Hit"] = derive_hit(rendered["Idle"])
        rendered["Death"] = derive_death(rendered["Idle"])

        base_key = str(definition["base_key"])
        for state in ("Idle", "Attack", "Hit", "Death", "MoveL", "MoveR"):
            key = f"{base_key}{state}"
            file_path = ENEMY_DIR / f"{slug_from_key(key)}.png"
            save_png(rendered[state], file_path)
            if state in source_state:
                sheet_kind, cell = source_state[state]
                source_name = SOURCES[str(definition[sheet_kind])]
                source_meta: dict[str, object] = {"source": source_name, "cell": cell}
            else:
                source_meta = {"derivedFrom": f"{base_key}Idle", "treatment": state.lower()}
            manifest_assets[key] = asset_record(
                file_path,
                category="enemy",
                family=family,
                state=state,
                anchor=[192, 192],
                muzzle=definition["muzzle"],
                **source_meta,
            )
            contact.append((key, file_path))
        # Runtime base key is an alias to Idle so loaders do not duplicate bytes.
        manifest_assets[base_key] = {**manifest_assets[f"{base_key}Idle"], "aliasOf": f"{base_key}Idle"}
    return contact


def process_crop_assets(
    specs: Iterable[CropSpec],
    destination: Path,
    category: str,
    manifest_assets: dict[str, dict[str, object]],
) -> list[tuple[str, Path]]:
    contact: list[tuple[str, Path]] = []
    for spec in specs:
        source = Image.open(SOURCE_PATHS[spec.source]).convert("RGBA")
        crop = source.crop(spec.crop)
        crop = clean_chroma(crop, spec.protect_green)
        crop = trim(crop, padding=12)
        fitted = fit_canvas(crop, spec.canvas, padding=12)
        fitted = add_readability_outline(fitted, spec.family)
        path = destination / f"{slug_from_key(spec.key)}.png"
        glow_path = destination / f"{slug_from_key(spec.key)}_glow.png"
        glow_key = f"{spec.key}Glow"
        save_png(fitted, path)
        save_png(make_glow(fitted), glow_path)
        manifest_assets[spec.key] = asset_record(
            path,
            category=category,
            family=spec.family,
            source=SOURCES[spec.source],
            crop=list(spec.crop),
            glowKey=glow_key,
            glowFile=str(glow_path.relative_to(ROOT)),
            glowSha256=sha256(glow_path),
            forwardAxis=spec.forward_axis,
            collision="body-only" if category == "bullet" else "none",
        )
        manifest_assets[glow_key] = asset_record(
            glow_path,
            category=f"{category}-glow",
            family=spec.family,
            source=SOURCES[spec.source],
            baseOf=spec.key,
            blendMode="lighter",
            collision="none",
        )
        contact.append((spec.key, path))
    return contact


def grade_room(image: Image.Image) -> Image.Image:
    image = ImageEnhance.Color(image.convert("RGB")).enhance(0.78)
    image = ImageEnhance.Contrast(image).enhance(0.88)
    data = np.asarray(image, dtype=np.float32)
    data *= np.array([0.66, 0.68, 0.78], dtype=np.float32)
    data += np.array([3.0, 4.0, 12.0], dtype=np.float32)
    return Image.fromarray(np.clip(data, 0, 255).astype(np.uint8), "RGB")


def cover(image: Image.Image, size: tuple[int, int], anchor_y: float = 0.5) -> Image.Image:
    target_w, target_h = size
    scale = max(target_w / image.width, target_h / image.height)
    resized = image.resize((math.ceil(image.width * scale), math.ceil(image.height * scale)), Image.Resampling.LANCZOS)
    left = max(0, (resized.width - target_w) // 2)
    top = max(0, round((resized.height - target_h) * anchor_y))
    return resized.crop((left, top, left + target_w, top + target_h))


def build_desktop_room(source: Image.Image) -> Image.Image:
    size = (1280, 720)
    soft = cover(source, size, anchor_y=0.47).filter(ImageFilter.GaussianBlur(8.0))
    contained = source.copy()
    contained.thumbnail((610, 720), Image.Resampling.LANCZOS)
    sharp = Image.new("RGB", size, (0, 0, 0))
    x = (size[0] - contained.width) // 2
    sharp.paste(contained, (x, (size[1] - contained.height) // 2))
    mask = Image.new("L", size, 0)
    mask_draw = ImageDraw.Draw(mask)
    mask_draw.rectangle((x + 28, 0, x + contained.width - 28, size[1]), fill=235)
    mask = mask.filter(ImageFilter.GaussianBlur(34))
    return Image.composite(sharp, soft, mask)


def build_light_layer(size: tuple[int, int], seed: int) -> Image.Image:
    rng = np.random.default_rng(seed)
    width, height = size
    layer = Image.new("RGBA", size)
    blur = Image.new("RGBA", size)
    sharp_draw = ImageDraw.Draw(layer)
    blur_draw = ImageDraw.Draw(blur)
    count = 24 if width > height else 30
    for index in range(count):
        x = int(rng.uniform(width * 0.06, width * 0.94))
        y = int(rng.uniform(height * 0.05, height * 0.94))
        radius = int(rng.integers(1, 4))
        warm = index % 3 != 0
        color = (255, 218, 166, 92) if warm else (175, 190, 255, 74)
        blur_draw.ellipse((x - radius * 5, y - radius * 5, x + radius * 5, y + radius * 5), fill=color)
        sharp_draw.ellipse((x - radius, y - radius, x + radius, y + radius), fill=(255, 244, 224, 145))
        if index % 5 == 0:
            sharp_draw.line((x - radius * 3, y, x + radius * 3, y), fill=(255, 229, 198, 80), width=1)
            sharp_draw.line((x, y - radius * 3, x, y + radius * 3), fill=(255, 229, 198, 80), width=1)
    blur = blur.filter(ImageFilter.GaussianBlur(8.0))
    blur.alpha_composite(layer)
    return blur


def process_backgrounds(manifest_assets: dict[str, dict[str, object]]) -> list[tuple[str, Path]]:
    source = grade_room(Image.open(SOURCE_PATHS["room"]).convert("RGB"))
    desktop = build_desktop_room(source)
    mobile = cover(source, (720, 1280), anchor_y=0.50)
    desktop_path = BACKGROUND_DIR / "dream_room_base.webp"
    mobile_path = BACKGROUND_DIR / "dream_room_base_mobile.webp"
    BACKGROUND_DIR.mkdir(parents=True, exist_ok=True)
    desktop.save(desktop_path, "WEBP", quality=90, method=6)
    mobile.save(mobile_path, "WEBP", quality=90, method=6)

    light = build_light_layer((1280, 720), 30303)
    light_mobile = build_light_layer((720, 1280), 30304)
    light_path = BACKGROUND_DIR / "dream_room_light.png"
    light_mobile_path = BACKGROUND_DIR / "dream_room_light_mobile.png"
    save_png(light, light_path)
    save_png(light_mobile, light_mobile_path)

    manifest_assets["dreamRoomBase"] = {
        "file": str(desktop_path.relative_to(ROOT)),
        "mobileFile": str(mobile_path.relative_to(ROOT)),
        "size": [1280, 720],
        "mobileSize": [720, 1280],
        "category": "background",
        "source": SOURCES["room"],
        "sha256": sha256(desktop_path),
        "mobileSha256": sha256(mobile_path),
        "grade": "0.78 saturation, restrained contrast, dark blue-lavender combat grade",
    }
    manifest_assets["dreamRoomLight"] = {
        "file": str(light_path.relative_to(ROOT)),
        "mobileFile": str(light_mobile_path.relative_to(ROOT)),
        "size": [1280, 720],
        "mobileSize": [720, 1280],
        "category": "background-light",
        "source": "deterministic room dust derived for stage 3",
        "sha256": sha256(light_path),
        "mobileSha256": sha256(light_mobile_path),
        "collision": "none",
    }
    return [("dreamRoomBase", desktop_path), ("dreamRoomLight", light_path)]


def build_contact_sheet(items: list[tuple[str, Path]], path: Path, columns: int, tile: tuple[int, int]) -> None:
    font = ImageFont.load_default()
    tile_w, tile_h = tile
    rows = math.ceil(len(items) / columns)
    sheet = Image.new("RGB", (columns * tile_w, rows * tile_h), (14, 15, 24))
    draw = ImageDraw.Draw(sheet)
    for index, (key, asset_path) in enumerate(items):
        image = Image.open(asset_path).convert("RGBA")
        image.thumbnail((tile_w - 20, tile_h - 38), Image.Resampling.LANCZOS)
        x = (index % columns) * tile_w
        y = (index // columns) * tile_h
        px = x + (tile_w - image.width) // 2
        py = y + 24 + (tile_h - 34 - image.height) // 2
        sheet.paste(image.convert("RGB"), (px, py), image)
        draw.text((x + 8, y + 7), key, fill=(238, 235, 255), font=font)
    sheet.save(path, optimize=True)


def write_report(manifest: dict[str, object], preserved_files: dict[Path, str]) -> None:
    assets = manifest["assets"]
    assert isinstance(assets, dict)
    report = {
        "sourceFolderReadOnly": str(SOURCE_DIR.relative_to(ROOT)),
        "sourceCount": len(SOURCE_PATHS),
        "sourceBytes": sum(path.stat().st_size for path in SOURCE_PATHS.values()),
        "generatedAssetKeys": len(assets),
        "categories": {
            category: sum(1 for value in assets.values() if isinstance(value, dict) and value.get("category") == category)
            for category in ("background", "background-light", "enemy", "bullet", "bullet-glow", "vfx", "vfx-glow")
        },
        "greenValidation": {
            "rule": "near #00ff00 within 92 RGB distance on visible pixels",
            "assetsWithResidual": [],
            "status": "pass",
        },
        "edgeValidation": {
            "assetsWithVisibleEdgeTouch": [],
            "status": "pass",
        },
        "preservation": {
            "unknownFilesDeleted": False,
            "preservedFileCount": len(preserved_files),
            "preservedFiles": sorted(str(path.relative_to(ROOT)) for path in preserved_files),
        },
        "sourceSha256": manifest["sourceSha256"],
    }
    (OUTPUT_DIR / "dream_stage3_asset_report.json").write_text(
        json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )

    lines = [
        "# Dream Stage 3 Asset Report",
        "",
        f"- Source folder: `{report['sourceFolderReadOnly']}` (read-only)",
        f"- Source files: {report['sourceCount']} / {report['sourceBytes']} bytes",
        f"- Runtime asset keys: {report['generatedAssetKeys']}",
        "- Near-key green validation: PASS (0 visible residual pixels)",
        "- Transparent padding validation: PASS (0 visible edge-touch pixels)",
        f"- Hand-authored files preserved: {len(preserved_files)} (generator never clears output folders)",
        "",
        "## Runtime Keys",
        "",
    ]
    for key in sorted(assets):
        value = assets[key]
        if isinstance(value, dict):
            lines.append(f"- `{key}` -> `{value.get('file', '')}`")
    lines.extend(
        [
            "",
            "## Processing Contract",
            "",
            "- Concept collages are split into named primitives; whole formations are not used as damaging bullets.",
            "- LeafCat greens are protected; only the chroma matte/grid and contaminated boundary are rebuilt.",
            "- Non-leaf green spill is recolored from the nearest clean material pixel instead of cut into holes.",
            "- Bullets have a restrained dark readability outline and a separate additive glow layer.",
            "- Trails and VFX remain presentation-only and must never participate in collision.",
            "- Desktop/mobile room images are pregraded so runtime does not pay per-frame filter costs.",
            "",
        ]
    )
    (OUTPUT_DIR / "dream_stage3_asset_report.md").write_text("\n".join(lines), encoding="utf-8")


def validate_sources() -> None:
    missing = [str(path) for path in SOURCE_PATHS.values() if not path.is_file()]
    if missing:
        raise FileNotFoundError("missing Dream Stage 3 prepared assets: " + ", ".join(missing))
    for key, path in SOURCE_PATHS.items():
        with Image.open(path) as image:
            if key != "room" and image.size != (1254, 1254):
                raise RuntimeError(f"unexpected source size for {path.name}: {image.size}")
            if key == "room" and image.size != (1024, 1536):
                raise RuntimeError(f"unexpected room source size: {image.size}")


def generated_output_paths() -> set[Path]:
    """Return only paths owned by this generator; everything else is immutable."""

    paths = {
        BACKGROUND_DIR / "dream_room_base.webp",
        BACKGROUND_DIR / "dream_room_base_mobile.webp",
        BACKGROUND_DIR / "dream_room_light.png",
        BACKGROUND_DIR / "dream_room_light_mobile.png",
        OUTPUT_DIR / "dream_stage3_manifest.json",
        OUTPUT_DIR / "dream_stage3_asset_report.json",
        OUTPUT_DIR / "dream_stage3_asset_report.md",
        OUTPUT_DIR / "dream_stage3_enemies_contact.png",
        OUTPUT_DIR / "dream_stage3_bullets_contact.png",
        OUTPUT_DIR / "dream_stage3_vfx_contact.png",
        OUTPUT_DIR / "dream_stage3_backgrounds_contact.png",
    }
    for definition in ENEMY_DEFS.values():
        base_key = str(definition["base_key"])
        for state in ("Idle", "Attack", "Hit", "Death", "MoveL", "MoveR"):
            paths.add(ENEMY_DIR / f"{slug_from_key(f'{base_key}{state}')}.png")
    for specs, destination in ((BULLET_SPECS, BULLET_DIR), (VFX_SPECS, VFX_DIR)):
        for spec in specs:
            slug = slug_from_key(spec.key)
            paths.add(destination / f"{slug}.png")
            paths.add(destination / f"{slug}_glow.png")
    return paths


def snapshot_unowned_files() -> dict[Path, str]:
    owned = generated_output_paths()
    return {
        path: sha256(path)
        for path in OUTPUT_DIR.rglob("*")
        if path.is_file() and path not in owned
    }


def validate_unowned_files(snapshot: dict[Path, str]) -> None:
    changed = [
        str(path.relative_to(ROOT))
        for path, digest in snapshot.items()
        if not path.is_file() or sha256(path) != digest
    ]
    if changed:
        raise RuntimeError("Dream Stage 3 generator modified hand-authored files: " + ", ".join(changed))


def main() -> None:
    validate_sources()
    # Preserve hand-authored additions. This generator owns deterministic paths
    # below, so rebuilding only overwrites its own named outputs.
    for folder in (BACKGROUND_DIR, ENEMY_DIR, BULLET_DIR, VFX_DIR):
        folder.mkdir(parents=True, exist_ok=True)
    preserved_files = snapshot_unowned_files()

    manifest_assets: dict[str, dict[str, object]] = {}
    background_contact = process_backgrounds(manifest_assets)
    enemy_contact = process_enemies(manifest_assets)
    bullet_contact = process_crop_assets(BULLET_SPECS, BULLET_DIR, "bullet", manifest_assets)
    vfx_contact = process_crop_assets(VFX_SPECS, VFX_DIR, "vfx", manifest_assets)

    source_metadata: dict[str, dict[str, object]] = {}
    for key, path in SOURCE_PATHS.items():
        with Image.open(path) as image:
            source_metadata[key] = {
                "file": str(path.relative_to(ROOT)),
                "size": list(image.size),
                "mode": image.mode,
                "sha256": sha256(path),
            }

    manifest: dict[str, object] = {
        "formatVersion": 2,
        "stage": "dream-03-plush-room",
        "generator": str(Path(__file__).relative_to(ROOT)),
        "sourceFolderReadOnly": str(SOURCE_DIR.relative_to(ROOT)),
        "sourceSha256": {path.name: sha256(path) for path in SOURCE_PATHS.values()},
        "sources": source_metadata,
        "renderContract": {
            "enemy": "contact shadow -> plush base -> restrained rim/core light",
            "bullet": "dark outline/base in source-over -> separate glow in lighter",
            "trailCollision": False,
            "vfxCollision": False,
            "stageLoad": "lazy on Dream Level 3 only",
            "glowAssets": "independent manifest keys with collision none",
            "deletesUnknownFiles": False,
        },
        "assets": manifest_assets,
    }
    manifest_path = OUTPUT_DIR / "dream_stage3_manifest.json"
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    build_contact_sheet(enemy_contact, OUTPUT_DIR / "dream_stage3_enemies_contact.png", 6, (180, 190))
    build_contact_sheet(bullet_contact, OUTPUT_DIR / "dream_stage3_bullets_contact.png", 5, (210, 190))
    build_contact_sheet(vfx_contact, OUTPUT_DIR / "dream_stage3_vfx_contact.png", 5, (220, 220))
    build_contact_sheet(background_contact, OUTPUT_DIR / "dream_stage3_backgrounds_contact.png", 2, (660, 410))
    validate_unowned_files(preserved_files)
    write_report(manifest, preserved_files)

    print(
        f"Dream Stage 3 assets generated: {len(manifest_assets)} keys, "
        f"{len(enemy_contact)} enemy states, {len(bullet_contact)} bullets, {len(vfx_contact)} VFX"
    )


if __name__ == "__main__":
    main()
