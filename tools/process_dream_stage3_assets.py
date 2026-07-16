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
BOSS_DIR = OUTPUT_DIR / "boss"
UI_DIR = OUTPUT_DIR / "ui"

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
    "shark_form_detail": "鲨鱼boss开发/具体形象和特下.png",
    "shark_fx_detail": "鲨鱼boss开发/具体的技能特效.png",
    "shark_hp_detail": "鲨鱼boss开发/具体的血条素材.png",
    "shark_form_ui": "鲨鱼boss开发/形象和血条UI.png",
    "shark_ui_all": "鲨鱼boss开发/所有的Ui 和图标.png",
    "shark_fx_rough": "鲨鱼boss开发/技能特效忒土.png",
    "shark_fx_sheet": "鲨鱼boss开发/技能贴图.png",
    "shark_ui_hp": "鲨鱼boss开发/血条UI和图标.png",
    "shark_form_sheet": "鲨鱼boss开发/鲨鱼外形具体.png",
}

SOURCE_PATHS = {key: SOURCE_DIR / name for key, name in SOURCES.items()}

EXPECTED_SOURCE_SIZES = {
    **{key: (1254, 1254) for key in SOURCES if not key.startswith("shark_") and key != "room"},
    "room": (1024, 1536),
    "shark_form_ui": (1536, 1024),
    **{
        key: (1448, 1086)
        for key in SOURCES
        if key.startswith("shark_") and key != "shark_form_ui"
    },
}


@dataclass(frozen=True)
class CropSpec:
    key: str
    source: str
    crop: tuple[int, int, int, int]
    canvas: tuple[int, int]
    family: str
    protect_green: bool = False
    forward_axis: str | None = None
    file_stem: str | None = None
    keep_largest: bool = False
    treatment: str | None = None


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

# The shark references are irregular transparent collages, not frame grids.
# Keep every crop explicit so generator output remains deterministic when the
# source folder gains more concept sheets later.
SHARK_BOSS_SPECS = (
    CropSpec("dreamPlushSharkIdle", "shark_form_detail", (48, 8, 350, 258), (448, 384), "shark", file_stem="shark_idle"),
    CropSpec("dreamPlushSharkAttack", "shark_form_detail", (1202, 22, 1442, 250), (448, 384), "shark", file_stem="shark_attack"),
    CropSpec("dreamPlushSharkIce", "shark_form_detail", (925, 38, 1195, 242), (448, 384), "shark", file_stem="shark_ice"),
    CropSpec("dreamPlushSharkRage", "shark_form_detail", (46, 242, 330, 470), (448, 384), "shark", file_stem="shark_rage"),
    CropSpec("dreamPlushSharkVoid", "shark_form_detail", (672, 235, 940, 470), (448, 384), "shark", file_stem="shark_void"),
)

SHARK_BULLET_SPECS = (
    CropSpec("dreamPlushSharkIceSpear", "shark_fx_detail", (76, 15, 150, 205), (104, 176), "shark", False, "up", "shark_ice_spear"),
    CropSpec("dreamPlushSharkIceShard", "shark_fx_detail", (738, 570, 895, 670), (160, 96), "shark", False, "left", "shark_ice_shard", True),
    CropSpec("dreamPlushSharkSnowball", "shark_fx_detail", (288, 670, 380, 765), (112, 112), "shark", False, None, "shark_snowball", True, "snowball"),
    CropSpec("dreamPlushSharkBubble", "shark_fx_detail", (40, 217, 128, 306), (112, 112), "shark", False, None, "shark_bubble", True),
    CropSpec("dreamPlushSharkWaveCrescent", "shark_fx_detail", (1115, 222, 1280, 365), (176, 128), "shark", False, "left", "shark_wave_crescent"),
    CropSpec("dreamPlushSharkVoidOrb", "shark_fx_detail", (514, 662, 665, 814), (136, 136), "shark", False, None, "shark_void_orb"),
)

SHARK_VFX_SPECS = (
    CropSpec("dreamPlushSharkMuzzle", "shark_fx_detail", (690, 12, 908, 230), (256, 256), "shark", False, None, "shark_muzzle"),
    CropSpec("dreamPlushSharkIceBurst", "shark_fx_sheet", (1095, 455, 1270, 605), (288, 256), "shark", False, None, "shark_ice_burst"),
    CropSpec("dreamPlushSharkWhirlpool", "shark_fx_detail", (1098, 20, 1294, 210), (288, 256), "shark", False, None, "shark_whirlpool"),
    CropSpec("dreamPlushSharkWave", "shark_fx_sheet", (15, 445, 225, 610), (320, 256), "shark", False, None, "shark_wave"),
    CropSpec("dreamPlushSharkVoidBurst", "shark_fx_detail", (770, 668, 915, 815), (256, 256), "shark", False, None, "shark_void_burst"),
    CropSpec("dreamPlushSharkShield", "shark_fx_detail", (462, 12, 688, 234), (288, 288), "shark", False, None, "shark_shield"),
)

SHARK_UI_CROPS = {
    "dreamPlushSharkPortrait": ("shark_ui_hp", (4, 136, 164, 288), "shark_portrait.png"),
    "dreamPlushSharkBossBarFrame": ("shark_ui_hp", (158, 214, 812, 282), "shark_boss_bar_frame.png"),
    "dreamPlushSharkBossBarEmpty": ("shark_hp_detail", (1090, 48, 1382, 98), "shark_boss_bar_empty.png"),
    "dreamPlushSharkBossBarFill": ("shark_ui_hp", (170, 326, 552, 369), "shark_boss_bar_fill.png"),
    "dreamPlushSharkBossBarCritical": ("shark_ui_hp", (170, 124, 552, 166), "shark_boss_bar_critical.png"),
}

# These two source paintings include a long baked comet tail. Runtime already
# owns a transient, non-damaging speed trail, so keeping the painted tail would
# make the projectile look permanently stretched even while stopped or turning.
# Ratios are measured inside each cleaned alpha bound, from the projectile nose
# (left) toward the old tail (right).
STATIC_TAIL_SPLIT_RULES = {
    "dreamPlushIceSpear": {"fadeStart": 0.29, "fadeEnd": 0.50, "taperHalf": 0.42},
    "dreamPlushMeteorStar": {"fadeStart": 0.31, "fadeEnd": 0.59, "taperHalf": 0.34},
}

FAMILY_OUTLINE = {
    "leaf": (13, 45, 39),
    "penguin": (8, 28, 65),
    "doll": (23, 18, 67),
    "fish": (7, 34, 64),
    "star": (73, 45, 10),
    "shark": (5, 24, 52),
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


def smoothstep(low: float, high: float, values: np.ndarray) -> np.ndarray:
    t = np.clip((values - low) / max(1e-6, high - low), 0.0, 1.0)
    return t * t * (3.0 - 2.0 * t)


def make_energy_glow(image: Image.Image) -> Image.Image:
    """Extract a selective energy layer from the clean, unoutlined artwork.

    The old glow blurred every visible pixel, including the dark readability
    outline, so additive compositing lifted the whole sprite like a sticker.
    This mask keeps bright local detail, saturated energy veins, and a narrow
    lit-side edge while leaving broad plush/material regions transparent.
    """

    data = np.asarray(image.convert("RGBA"), dtype=np.float32) / 255.0
    rgb = data[..., :3]
    alpha = data[..., 3]
    visible = alpha > 0.025
    if not visible.any():
        return Image.new("RGBA", image.size)

    value = np.max(rgb, axis=2)
    minimum = np.min(rgb, axis=2)
    saturation = np.divide(value - minimum, np.maximum(value, 1e-5))
    luminance = rgb[..., 0] * 0.2126 + rgb[..., 1] * 0.7152 + rgb[..., 2] * 0.0722
    local_luminance = ndimage.gaussian_filter(luminance, sigma=2.0)
    bright_detail = np.clip((luminance - local_luminance) * 5.2, 0.0, 1.0)

    # A stable upper-left key light gives pale/white effects a selective rim
    # even when their interior has little chroma or local contrast.
    ys, xs = np.nonzero(visible)
    left, right = int(xs.min()), int(xs.max())
    top, bottom = int(ys.min()), int(ys.max())
    grid_y, grid_x = np.mgrid[0 : image.height, 0 : image.width]
    nx = (grid_x - (left + right) * 0.5) / max(1.0, (right - left + 1) * 0.5)
    ny = (grid_y - (top + bottom) * 0.5) / max(1.0, (bottom - top + 1) * 0.5)
    key_light = np.clip(0.58 - nx * 0.30 - ny * 0.38, 0.0, 1.0)
    inner_distance = ndimage.distance_transform_edt(visible)
    edge_band = np.exp(-((inner_distance - 1.7) / 1.45) ** 2)

    bright = smoothstep(0.52, 0.94, luminance)
    chroma = smoothstep(0.34, 0.82, saturation) * smoothstep(0.40, 0.86, value)
    detail = smoothstep(0.018, 0.17, bright_detail)
    lit_edge = edge_band * smoothstep(0.34, 0.82, key_light) * np.maximum(bright, chroma * 0.62)

    # Saturation alone must not light a whole painted panel. It only becomes
    # emissive when supported by local contrast or a narrow lit edge.
    score = np.maximum.reduce(
        [
            bright * detail,
            chroma * np.maximum(detail, lit_edge * 0.74),
            lit_edge,
        ]
    )
    score *= smoothstep(0.06, 0.92, alpha)

    opaque_scores = score[alpha > 0.10]
    threshold = max(0.085, float(np.quantile(opaque_scores, 0.72))) if opaque_scores.size else 0.085
    selector = smoothstep(threshold, min(1.0, threshold + 0.28), score)
    selector = np.maximum(selector, detail * bright * 0.72)
    selector = np.where(selector >= 0.10, smoothstep(0.10, 1.0, selector), 0.0)
    selector *= visible

    # Preserve the source hue, but pull only the selected hot pixels slightly
    # toward white. The transparent material body is never reintroduced here.
    energy_rgb = np.clip(rgb * 1.14 + value[..., None] * 0.08 + selector[..., None] * 0.10, 0.0, 1.0)
    core_alpha = np.clip(alpha * selector * (0.66 + bright * 0.22), 0.0, 0.88)
    core_data = np.zeros_like(data)
    core_data[..., :3] = energy_rgb
    core_data[..., 3] = core_alpha
    core = Image.fromarray(np.clip(core_data * 255.0, 0, 255).astype(np.uint8), "RGBA")

    halo = core.filter(ImageFilter.GaussianBlur(1.65))
    halo_data = np.asarray(halo, dtype=np.float32).copy()
    halo_data[..., 3] *= 0.62
    layer = Image.fromarray(np.clip(halo_data, 0, 255).astype(np.uint8), "RGBA")
    layer.alpha_composite(core)
    return layer


def make_shark_boss_energy_glow(image: Image.Image, state: str) -> Image.Image:
    """Keep additive light on crystals/energy, never on plush fabric or teeth."""

    data = np.asarray(image.convert("RGBA"), dtype=np.float32) / 255.0
    rgb = data[..., :3]
    alpha = data[..., 3]
    visible = alpha > 0.025
    if not visible.any():
        return Image.new("RGBA", image.size)

    r, g, b = (rgb[..., index] for index in range(3))
    value = np.max(rgb, axis=2)
    minimum = np.min(rgb, axis=2)
    saturation = np.divide(value - minimum, np.maximum(value, 1e-5))
    luminance = r * 0.2126 + g * 0.7152 + b * 0.0722
    local = ndimage.gaussian_filter(luminance, sigma=2.1)
    detail = smoothstep(0.018, 0.16, np.clip(luminance - local, 0.0, 1.0))
    bright = smoothstep(0.38, 0.90, luminance)

    is_void = state in {"Void", "Death"}
    if is_void:
        purple_dominance = (r + b) * 0.5 - g
        material = (
            smoothstep(0.075, 0.28, purple_dominance)
            * smoothstep(0.24, 0.72, saturation)
            * smoothstep(0.26, 0.82, value)
        )
    else:
        cool_dominance = np.maximum(b - r, g - r * 0.92)
        material = (
            smoothstep(0.09, 0.34, cool_dominance)
            * smoothstep(0.28, 0.72, saturation)
            * smoothstep(0.30, 0.88, value)
        )

    # Bright crystals and narrow painted energy veins survive; broad blue or
    # purple fabric lacks the local-detail/brightness support and stays dark.
    detail_support = detail * smoothstep(0.42, 0.76, value)
    selector = material * np.maximum(detail_support, bright * 0.56)
    selector = np.where(selector > 0.08, smoothstep(0.08, 0.72, selector), 0.0)
    if not is_void:
        ys, xs = np.nonzero(visible)
        left, right = float(xs.min()), float(xs.max() + 1)
        grid_x = np.arange(image.width, dtype=np.float32)[None, :]
        rear_bias = smoothstep(0.40, 0.66, (grid_x - left) / max(1.0, right - left))
        crystal_hot = smoothstep(0.66, 0.94, value) * smoothstep(0.16, 0.44, cool_dominance)
        selector *= np.maximum(rear_bias, crystal_hot * 0.26)
    selector *= smoothstep(0.08, 0.90, alpha) * visible

    energy_rgb = np.clip(rgb * 1.16 + selector[..., None] * 0.18, 0.0, 1.0)
    core_data = np.zeros_like(data)
    core_data[..., :3] = energy_rgb
    core_data[..., 3] = np.clip(alpha * selector * 0.76, 0.0, 0.78)
    core = Image.fromarray(np.clip(core_data * 255.0, 0, 255).astype(np.uint8), "RGBA")
    halo = core.filter(ImageFilter.GaussianBlur(1.45))
    halo_data = np.asarray(halo, dtype=np.float32).copy()
    halo_data[..., 3] *= 0.48
    layer = Image.fromarray(np.clip(halo_data, 0, 255).astype(np.uint8), "RGBA")
    layer.alpha_composite(core)
    return layer


def strip_static_tail(image: Image.Image, key: str) -> Image.Image:
    """Remove a baked long tail and recenter the retained projectile core."""

    rule = STATIC_TAIL_SPLIT_RULES.get(key)
    if not rule:
        return image

    data = np.asarray(image.convert("RGBA"), dtype=np.float32).copy()
    alpha = data[..., 3]
    source_alpha = alpha.copy()
    visible = alpha > 5
    if not visible.any():
        return image

    ys, xs = np.nonzero(visible)
    left, right = float(xs.min()), float(xs.max() + 1)
    width = max(1.0, right - left)
    fade_start = left + width * float(rule["fadeStart"])
    fade_end = left + width * float(rule["fadeEnd"])
    grid_x = np.arange(image.width, dtype=np.float32)[None, :]
    grid_y = np.arange(image.height, dtype=np.float32)[:, None]
    tail_t = np.clip((grid_x - fade_start) / max(1.0, fade_end - fade_start), 0.0, 1.0)
    tail_fade = 1.0 - tail_t * tail_t * (3.0 - 2.0 * tail_t)
    column_mass = np.sum(alpha, axis=0)
    fallback_y = float(np.sum(alpha * grid_y) / max(1.0, np.sum(alpha)))
    centerline = np.divide(
        np.sum(alpha * grid_y, axis=0),
        np.maximum(column_mass, 1.0),
        out=np.full(image.width, fallback_y, dtype=np.float32),
        where=column_mass > 1.0,
    )
    centerline = ndimage.gaussian_filter1d(centerline, sigma=1.5)
    start_half = max(3.0, (float(ys.max() - ys.min() + 1)) * float(rule["taperHalf"]))
    taper_half = 0.30 + start_half * np.power(1.0 - tail_t, 1.28)
    taper_distance = np.abs(grid_y - centerline[None, :])
    taper_edge = np.clip((taper_distance - taper_half) / 1.8, 0.0, 1.0)
    taper_keep = 1.0 - taper_edge * taper_edge * (3.0 - 2.0 * taper_edge)
    taper_keep = np.where(grid_x <= fade_start, 1.0, taper_keep)
    alpha *= tail_fade * taper_keep
    data[..., 3] = alpha
    data[alpha < 2] = 0
    stripped = Image.fromarray(np.clip(data, 0, 255).astype(np.uint8), "RGBA")

    # Keep the collision/readability anchor on the visible crystal/star core.
    bbox = stripped.getchannel("A").getbbox()
    if not bbox:
        raise RuntimeError(f"{key}: static-tail split removed the entire projectile")
    part = stripped.crop(bbox)
    core_weight = source_alpha * (grid_x <= fade_start)
    core_total = max(1.0, float(np.sum(core_weight)))
    core_x = float(np.sum(core_weight * grid_x) / core_total)
    core_y = float(np.sum(core_weight * grid_y) / core_total)
    local_core_x = core_x - bbox[0]
    local_core_y = core_y - bbox[1]
    paste_x = round((image.width - 1) * 0.5 - local_core_x)
    paste_y = round((image.height - 1) * 0.5 - local_core_y)
    paste_x = int(np.clip(paste_x, 2, image.width - part.width - 2))
    paste_y = int(np.clip(paste_y, 2, image.height - part.height - 2))
    centered = Image.new("RGBA", image.size)
    centered.alpha_composite(part, (paste_x, paste_y))
    return centered


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


def process_shark_boss(manifest_assets: dict[str, dict[str, object]]) -> list[tuple[str, Path]]:
    """Extract aligned shark forms plus derived hit/death presentation states."""

    prepared: dict[str, Image.Image] = {}
    spec_by_key = {spec.key: spec for spec in SHARK_BOSS_SPECS}
    for spec in SHARK_BOSS_SPECS:
        source = Image.open(SOURCE_PATHS[spec.source]).convert("RGBA")
        crop = clean_chroma(source.crop(spec.crop), spec.protect_green)
        prepared[spec.key] = trim(crop, padding=14)

    max_w = max(frame.width for frame in prepared.values())
    max_h = max(frame.height for frame in prepared.values())
    common_scale = min(412 / max_w, 348 / max_h)
    clean_rendered = {
        key: fit_canvas(frame, (448, 384), scale=common_scale)
        for key, frame in prepared.items()
    }
    clean_rendered["dreamPlushSharkHit"] = derive_hit(clean_rendered["dreamPlushSharkIdle"])
    clean_rendered["dreamPlushSharkDeath"] = derive_death(clean_rendered["dreamPlushSharkVoid"])

    states = {
        "dreamPlushSharkIdle": "Idle",
        "dreamPlushSharkAttack": "Attack",
        "dreamPlushSharkIce": "Ice",
        "dreamPlushSharkRage": "Rage",
        "dreamPlushSharkVoid": "Void",
        "dreamPlushSharkHit": "Hit",
        "dreamPlushSharkDeath": "Death",
    }
    contact: list[tuple[str, Path]] = []
    for key, state in states.items():
        clean = clean_rendered[key]
        file_stem = spec_by_key[key].file_stem if key in spec_by_key else f"shark_{state.lower()}"
        assert file_stem is not None
        path = BOSS_DIR / f"{file_stem}.png"
        glow_path = BOSS_DIR / f"{file_stem}_glow.png"
        glow_key = f"{key}Glow"
        save_png(add_readability_outline(clean, "shark"), path)
        save_png(make_shark_boss_energy_glow(clean, state), glow_path)

        if key in spec_by_key:
            spec = spec_by_key[key]
            source_meta: dict[str, object] = {
                "source": SOURCES[spec.source],
                "crop": list(spec.crop),
            }
        else:
            source_key = "dreamPlushSharkIdle" if state == "Hit" else "dreamPlushSharkVoid"
            source_meta = {"derivedFrom": source_key, "treatment": state.lower()}

        manifest_assets[key] = asset_record(
            path,
            category="boss",
            family="shark",
            state=state,
            anchor=[224, 192],
            muzzle=[164, 188],
            glowKey=glow_key,
            glowFile=str(glow_path.relative_to(ROOT)),
            glowSha256=sha256(glow_path),
            glowTreatment="shark-crystal-and-energy-mask-before-outline",
            collision="body-only",
            **source_meta,
        )
        manifest_assets[glow_key] = asset_record(
            glow_path,
            category="boss-glow",
            family="shark",
            state=state,
            baseOf=key,
            blendMode="lighter",
            sourceStage="clean-fitted-before-outline",
            maskTreatment="crystal+energy-veins only; plush fabric and teeth excluded",
            collision="none",
            **source_meta,
        )
        contact.append((key, path))
    return contact


def apply_crop_treatment(image: Image.Image, treatment: str | None) -> Image.Image:
    if treatment != "snowball":
        return image
    data = np.asarray(image.convert("RGBA"), dtype=np.float32).copy()
    alpha = data[..., 3]
    rgb = data[..., :3]
    luminance = rgb[..., 0] * 0.2126 + rgb[..., 1] * 0.7152 + rgb[..., 2] * 0.0722
    cool = np.stack(
        [luminance * 0.70 + 102, luminance * 0.82 + 104, luminance * 0.96 + 106],
        axis=2,
    )
    rgb[:] = np.clip(rgb * 0.30 + cool * 0.70, 0, 255)
    data[..., 3] = alpha
    data[alpha < 2] = 0
    return Image.fromarray(data.astype(np.uint8), "RGBA")


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
        if spec.keep_largest:
            crop = keep_largest_component(crop)
        crop = apply_crop_treatment(crop, spec.treatment)
        inner_padding = 4 if spec.keep_largest else 12
        fit_padding = 8 if spec.keep_largest else 12
        crop = trim(crop, padding=inner_padding)
        if spec.keep_largest:
            upscale = min((spec.canvas[0] - fit_padding * 2) / crop.width, (spec.canvas[1] - fit_padding * 2) / crop.height)
            clean_fitted = fit_canvas(crop, spec.canvas, scale=upscale)
        else:
            clean_fitted = fit_canvas(crop, spec.canvas, padding=fit_padding)
        clean_fitted = strip_static_tail(clean_fitted, spec.key)
        fitted = add_readability_outline(clean_fitted, spec.family)
        file_stem = spec.file_stem or slug_from_key(spec.key)
        path = destination / f"{file_stem}.png"
        glow_path = destination / f"{file_stem}_glow.png"
        glow_key = f"{spec.key}Glow"
        save_png(fitted, path)
        save_png(make_energy_glow(clean_fitted), glow_path)
        manifest_assets[spec.key] = asset_record(
            path,
            category=category,
            family=spec.family,
            source=SOURCES[spec.source],
            crop=list(spec.crop),
            glowKey=glow_key,
            glowFile=str(glow_path.relative_to(ROOT)),
            glowSha256=sha256(glow_path),
            glowTreatment="selective-energy-mask-before-outline",
            forwardAxis=spec.forward_axis,
            collision="body-only" if category == "bullet" else "none",
            **({"treatment": spec.treatment} if spec.treatment else {}),
            **({"staticTailTreatment": "runtime-transient-trail-only"} if spec.key in STATIC_TAIL_SPLIT_RULES else {}),
        )
        manifest_assets[glow_key] = asset_record(
            glow_path,
            category=f"{category}-glow",
            family=spec.family,
            source=SOURCES[spec.source],
            baseOf=spec.key,
            blendMode="lighter",
            sourceStage="clean-fitted-before-outline",
            maskTreatment="bright-detail+saturated-veins+lit-edge",
            collision="none",
            **({"staticTailTreatment": "removed-before-energy-mask"} if spec.key in STATIC_TAIL_SPLIT_RULES else {}),
        )
        contact.append((spec.key, path))
    return contact


def stretch_ui_strip(image: Image.Image, size: tuple[int, int] = (640, 48)) -> Image.Image:
    """Nine-slice a prepared HP strip so end caps stay crisp at HUD width."""

    bbox = image.getchannel("A").getbbox()
    if not bbox:
        raise RuntimeError("empty shark HP strip")
    part = image.crop(bbox)
    out_w, out_h = size
    pad_x, pad_y = 10, 7
    draw_h = out_h - pad_y * 2
    source_cap = max(4, min(24, part.width // 5))
    dest_cap = min(30, (out_w - pad_x * 2) // 5)
    center_w = out_w - pad_x * 2 - dest_cap * 2
    left = part.crop((0, 0, source_cap, part.height)).resize((dest_cap, draw_h), Image.Resampling.LANCZOS)
    center = part.crop((source_cap, 0, part.width - source_cap, part.height)).resize(
        (center_w, draw_h), Image.Resampling.LANCZOS
    )
    right = part.crop((part.width - source_cap, 0, part.width, part.height)).resize(
        (dest_cap, draw_h), Image.Resampling.LANCZOS
    )
    canvas = Image.new("RGBA", size)
    canvas.alpha_composite(left, (pad_x, pad_y))
    canvas.alpha_composite(center, (pad_x + dest_cap, pad_y))
    canvas.alpha_composite(right, (pad_x + dest_cap + center_w, pad_y))
    return canvas


def make_ui_frame_overlay(image: Image.Image) -> Image.Image:
    """Remove the baked empty track so dynamic fill can show under the frame."""

    data = np.asarray(image.convert("RGBA"), dtype=np.uint8).copy()
    height, width = data.shape[:2]
    left, right = round(width * 0.075), round(width * 0.94)
    top, bottom = round(height * 0.34), round(height * 0.70)
    data[top:bottom, left:right] = 0
    cut = Image.fromarray(data, "RGBA")
    return fit_canvas(trim(cut, padding=8), (720, 96), padding=10)


def make_ui_gloss(fill: Image.Image) -> Image.Image:
    data = np.asarray(fill.convert("RGBA"), dtype=np.float32) / 255.0
    rgb = data[..., :3]
    alpha = data[..., 3]
    luminance = rgb[..., 0] * 0.2126 + rgb[..., 1] * 0.7152 + rgb[..., 2] * 0.0722
    grid_y = np.linspace(0.0, 1.0, fill.height, dtype=np.float32)[:, None]
    upper_band = np.exp(-((grid_y - 0.33) / 0.17) ** 2)
    detail = smoothstep(0.42, 0.90, luminance)
    gloss_alpha = alpha * upper_band * (0.18 + detail * 0.38)
    out = np.zeros_like(data)
    out[..., :3] = np.array([1.0, 0.94, 0.82], dtype=np.float32)
    out[..., 3] = np.clip(gloss_alpha, 0.0, 0.52)
    return Image.fromarray(np.clip(out * 255.0, 0, 255).astype(np.uint8), "RGBA")


def tint_empty_track_ice(image: Image.Image) -> Image.Image:
    data = np.asarray(image.convert("RGBA"), dtype=np.float32).copy()
    rgb = data[..., :3]
    alpha = data[..., 3]
    luminance = rgb[..., 0] * 0.2126 + rgb[..., 1] * 0.7152 + rgb[..., 2] * 0.0722
    rgb[..., 0] = luminance * 0.15 + 4
    rgb[..., 1] = luminance * 0.43 + 12
    rgb[..., 2] = luminance * 0.72 + 24
    data[..., 3] = alpha
    data[alpha < 2] = 0
    return Image.fromarray(np.clip(data, 0, 255).astype(np.uint8), "RGBA")


def process_shark_ui(manifest_assets: dict[str, dict[str, object]]) -> list[tuple[str, Path]]:
    contact: list[tuple[str, Path]] = []
    rendered: dict[str, Image.Image] = {}
    for key, (source_key, crop_box, _filename) in SHARK_UI_CROPS.items():
        source = Image.open(SOURCE_PATHS[source_key]).convert("RGBA")
        crop = clean_chroma(source.crop(crop_box), False)
        if key == "dreamPlushSharkPortrait":
            crop = keep_largest_component(crop)
            image = fit_canvas(trim(crop, padding=10), (192, 192), padding=12)
        elif key == "dreamPlushSharkBossBarFrame":
            image = make_ui_frame_overlay(crop)
        else:
            if key == "dreamPlushSharkBossBarEmpty":
                crop = tint_empty_track_ice(crop)
            image = stretch_ui_strip(crop)
        rendered[key] = image

    rendered["dreamPlushSharkBossBarGloss"] = make_ui_gloss(rendered["dreamPlushSharkBossBarFill"])
    filenames = {
        key: filename
        for key, (_source_key, _crop_box, filename) in SHARK_UI_CROPS.items()
    }
    filenames["dreamPlushSharkBossBarGloss"] = "shark_boss_bar_gloss.png"
    roles = {
        "dreamPlushSharkPortrait": "portrait",
        "dreamPlushSharkBossBarFrame": "frame-overlay",
        "dreamPlushSharkBossBarEmpty": "empty-track",
        "dreamPlushSharkBossBarFill": "live-fill",
        "dreamPlushSharkBossBarCritical": "critical-fill",
        "dreamPlushSharkBossBarGloss": "gloss-overlay",
    }

    for key, image in rendered.items():
        path = UI_DIR / filenames[key]
        save_png(image, path)
        if key in SHARK_UI_CROPS:
            source_key, crop_box, _filename = SHARK_UI_CROPS[key]
            source_meta: dict[str, object] = {"source": SOURCES[source_key], "crop": list(crop_box)}
        else:
            source_meta = {
                "derivedFrom": "dreamPlushSharkBossBarFill",
                "treatment": "upper-band selective gloss",
            }
        manifest_assets[key] = asset_record(
            path,
            category="boss-ui",
            family="shark",
            role=roles[key],
            collision="none",
            **source_meta,
        )
        contact.append((key, path))
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
            for category in (
                "background", "background-light", "enemy", "boss", "boss-glow", "bullet", "bullet-glow",
                "vfx", "vfx-glow", "boss-ui",
            )
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
            "- Bullet/VFX glow is extracted from clean pre-outline art; broad material and dark readability outlines stay non-emissive.",
            "- The selective additive mask keeps bright local detail, saturated energy veins, and a narrow lit-side edge.",
            "- Ice spear and meteor star retain only a centered core plus short material taper; long zero-damage trails are runtime-only.",
            "- Shark boss forms share a stable 448x384 anchor; phase glow is a separate additive energy-only layer.",
            "- Shark HP frame, track, live fill, critical fill, portrait, and gloss remain independent for real-time clipping.",
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
            expected = EXPECTED_SOURCE_SIZES[key]
            if image.size != expected:
                raise RuntimeError(f"unexpected source size for {path.name}: {image.size}; expected {expected}")


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
        OUTPUT_DIR / "dream_stage3_shark_boss_contact.png",
        OUTPUT_DIR / "dream_stage3_shark_ui_contact.png",
    }
    for definition in ENEMY_DEFS.values():
        base_key = str(definition["base_key"])
        for state in ("Idle", "Attack", "Hit", "Death", "MoveL", "MoveR"):
            paths.add(ENEMY_DIR / f"{slug_from_key(f'{base_key}{state}')}.png")
    for spec in SHARK_BOSS_SPECS:
        assert spec.file_stem is not None
        paths.add(BOSS_DIR / f"{spec.file_stem}.png")
        paths.add(BOSS_DIR / f"{spec.file_stem}_glow.png")
    for state in ("hit", "death"):
        paths.add(BOSS_DIR / f"shark_{state}.png")
        paths.add(BOSS_DIR / f"shark_{state}_glow.png")
    for specs, destination in (
        (BULLET_SPECS, BULLET_DIR),
        (VFX_SPECS, VFX_DIR),
        (SHARK_BULLET_SPECS, BULLET_DIR),
        (SHARK_VFX_SPECS, VFX_DIR),
    ):
        for spec in specs:
            slug = spec.file_stem or slug_from_key(spec.key)
            paths.add(destination / f"{slug}.png")
            paths.add(destination / f"{slug}_glow.png")
    for _key, (_source_key, _crop_box, filename) in SHARK_UI_CROPS.items():
        paths.add(UI_DIR / filename)
    paths.add(UI_DIR / "shark_boss_bar_gloss.png")
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
    for folder in (BACKGROUND_DIR, ENEMY_DIR, BULLET_DIR, VFX_DIR, BOSS_DIR, UI_DIR):
        folder.mkdir(parents=True, exist_ok=True)
    preserved_files = snapshot_unowned_files()

    manifest_assets: dict[str, dict[str, object]] = {}
    background_contact = process_backgrounds(manifest_assets)
    enemy_contact = process_enemies(manifest_assets)
    shark_boss_contact = process_shark_boss(manifest_assets)
    bullet_contact = process_crop_assets(BULLET_SPECS, BULLET_DIR, "bullet", manifest_assets)
    bullet_contact.extend(process_crop_assets(SHARK_BULLET_SPECS, BULLET_DIR, "bullet", manifest_assets))
    vfx_contact = process_crop_assets(VFX_SPECS, VFX_DIR, "vfx", manifest_assets)
    vfx_contact.extend(process_crop_assets(SHARK_VFX_SPECS, VFX_DIR, "vfx", manifest_assets))
    shark_ui_contact = process_shark_ui(manifest_assets)

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
            "bullet": "dark outline/base in source-over -> selective pre-outline energy mask in lighter",
            "trailCollision": False,
            "vfxCollision": False,
            "stageLoad": "lazy on Dream Level 3 only",
            "glowAssets": "independent selective-energy manifest keys with collision none",
            "bossGlow": "all seven shark boss states have independent additive glow keys",
            "bossHpUi": "portrait/frame/empty/fill/critical/gloss are separate live-composition assets",
            "bakedLongTrails": "removed from IceSpear/MeteorStar; runtime transient trail only",
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
    build_contact_sheet(shark_boss_contact, OUTPUT_DIR / "dream_stage3_shark_boss_contact.png", 4, (270, 235))
    build_contact_sheet(shark_ui_contact, OUTPUT_DIR / "dream_stage3_shark_ui_contact.png", 2, (390, 180))
    validate_unowned_files(preserved_files)
    write_report(manifest, preserved_files)

    print(
        f"Dream Stage 3 assets generated: {len(manifest_assets)} keys, "
        f"{len(enemy_contact)} enemy states, {len(bullet_contact)} bullets, {len(vfx_contact)} VFX"
    )


if __name__ == "__main__":
    main()
