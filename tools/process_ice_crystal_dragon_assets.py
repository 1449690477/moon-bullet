#!/usr/bin/env python3
"""Build runtime sprites for the Ice Crystal Dragon companion.

The source sheets intentionally stay outside the runtime asset tree.  Body
crops follow section 2.3 of
``冰晶龙开发文件夹/实现文档_冰晶龙灵寒渊_v1.0.md``. The runtime registers
only separated hard-surface parts such as the dragon head, body armor, charge
core, and solid shards. Full projectile, impact, and explosion crops are kept
only as comparison artifacts; Canvas code owns every soft energy/VFX layer.
Every exported sprite is despilled, reduced to its principal alpha island,
eroded by one pixel, softly feathered, and surrounded by transparent padding.

The source folder is not required in a clean checkout once the generated PNGs
exist.  In that case this script validates the committed outputs and exits
successfully instead of trying to rebuild them.
"""

from __future__ import annotations

import argparse
import hashlib
import json
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable

import numpy as np
from PIL import Image, ImageDraw, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "assets" / "companions" / "ice_crystal_dragon"
SOURCE_CANDIDATES = (
    ROOT / "冰晶龙开发文件夹",
    ROOT / "moon-bullet-main" / "冰晶龙开发文件夹",
)
PIPELINE_VERSION = "ice-crystal-dragon-assets-v4-split-summon-sequences"
TRANSPARENT_PAD = 16
FIXED_CANVAS_SAFE_MARGIN = 18
FEATHER_RADIUS = 0.9
GREEN_RATIO_LIMIT = 0.0001


@dataclass(frozen=True)
class CropSpec:
    key: str
    source: str
    rect: tuple[int, int, int, int]
    output: str
    full_emissive: bool = False
    preserve_islands: bool = False
    erode_pixels: int = 1
    canvas_size: tuple[int, int] | None = None

    @property
    def output_path(self) -> Path:
        return OUT / self.output

    @property
    def glow_path(self) -> Path:
        path = Path(self.output)
        return OUT / path.with_name(f"{path.stem}_glow.png")


# Body/source-part rectangles from the implementation document plus comparison
# crops used by the visual audit. Reference-sheet crops are never registered in
# the runtime asset contract.
CROPS = (
    CropSpec("body_normal_head", "drg_parts_normal_main.png", (796, 58, 254, 250), "body/body_normal_head.png"),
    CropSpec("body_normal_segment", "drg_parts_normal_main.png", (1234, 402, 192, 129), "body/body_normal_segment.png"),
    CropSpec("body_normal_tail", "drg_parts_normal_alt.png", (56, 591, 401, 144), "body/body_normal_tail.png"),
    CropSpec("body_normal_core", "drg_parts_normal_main.png", (1023, 367, 183, 175), "body/body_normal_core.png", True),
    CropSpec("body_over_head", "drg_parts_over_main.png", (26, 606, 248, 269), "body/body_over_head.png"),
    CropSpec("body_over_segment", "drg_parts_over_main.png", (213, 906, 192, 131), "body/body_over_segment.png"),
    CropSpec("body_over_tail", "drg_parts_over_main.png", (403, 887, 252, 166), "body/body_over_tail.png"),
    CropSpec("body_over_core", "drg_parts_over_main.png", (20, 886, 176, 171), "body/body_over_core.png", True),
    CropSpec("bullet_main_head", "blt_parts_head_trails.png", (20, 108, 165, 123), "bullets/bullet_main_head.png"),
    CropSpec("bullet_main_stream_a", "blt_parts_split_head.png", (180, 20, 1010, 185), "bullets/bullet_main_stream_a.png", preserve_islands=True, erode_pixels=0),
    CropSpec("bullet_main_stream_b", "ref_blt_armored_full.png", (10, 325, 820, 145), "bullets/bullet_main_stream_b.png", preserve_islands=True, erode_pixels=0),
    CropSpec("bullet_main_stream_c", "ref_blt_armored_full.png", (10, 475, 855, 150), "bullets/bullet_main_stream_c.png", preserve_islands=True, erode_pixels=0),
    CropSpec("bullet_main_crystal_head", "blt_parts_split_head.png", (93, 472, 313, 225), "bullets/bullet_main_crystal_head.png"),
    CropSpec("bullet_charge_orb", "blt_parts_head_trails.png", (188, 108, 89, 110), "bullets/bullet_charge_orb.png", True),
    CropSpec("bullet_split_head", "ref_blt_armored_full.png", (1080, 385, 335, 80), "bullets/bullet_split_head.png", preserve_islands=True, erode_pixels=0),
    CropSpec("bullet_impact_0", "ref_blt_armored_full.png", (10, 625, 265, 160), "bullets/bullet_impact_0.png", True, preserve_islands=True, erode_pixels=0),
    CropSpec("bullet_impact_1", "ref_blt_armored_full.png", (270, 635, 145, 150), "bullets/bullet_impact_1.png", True, preserve_islands=True, erode_pixels=0),
    CropSpec("bullet_impact_2", "ref_blt_armored_full.png", (405, 630, 170, 160), "bullets/bullet_impact_2.png", True, preserve_islands=True, erode_pixels=0),
    CropSpec("bullet_impact_3", "ref_blt_armored_full.png", (565, 615, 200, 185), "bullets/bullet_impact_3.png", True, preserve_islands=True, erode_pixels=0),
    CropSpec("bullet_impact_4", "ref_blt_armored_full.png", (750, 605, 200, 215), "bullets/bullet_impact_4.png", True, preserve_islands=True, erode_pixels=0),
    CropSpec("bullet_explosion_0", "ref_fx_explosion.png", (35, 20, 465, 330), "bullets/bullet_explosion_0.png", True, preserve_islands=True, erode_pixels=0),
    CropSpec("bullet_explosion_1", "ref_fx_explosion.png", (535, 25, 335, 315), "bullets/bullet_explosion_1.png", True, preserve_islands=True, erode_pixels=0),
    CropSpec("bullet_explosion_2", "ref_fx_explosion.png", (875, 20, 555, 385), "bullets/bullet_explosion_2.png", True, preserve_islands=True, erode_pixels=0),
    CropSpec("bullet_explosion_3", "ref_fx_explosion.png", (500, 365, 360, 285), "bullets/bullet_explosion_3.png", True, preserve_islands=True, erode_pixels=0),
    CropSpec("bullet_shard_1", "blt_parts_head_trails.png", (832, 841, 69, 85), "bullets/bullet_shard_1.png", True),
    CropSpec("bullet_shard_2", "blt_parts_head_trails.png", (961, 854, 62, 72), "bullets/bullet_shard_2.png", True),
    CropSpec("bullet_shard_3", "blt_parts_head_trails.png", (775, 918, 38, 75), "bullets/bullet_shard_3.png", True),
    CropSpec("bullet_shard_4", "blt_parts_head_trails.png", (940, 935, 40, 57), "bullets/bullet_shard_4.png", True),
    CropSpec("bullet_shard_5", "blt_parts_head_trails.png", (1333, 838, 39, 58), "bullets/bullet_shard_5.png", True),
    # Pipeline v4: five normal and five overdrive dragon-head summon frames.
    # The supplied rows are irregularly spaced, so every logical source cell is
    # cropped independently and normalized onto the same left-anchored canvas.
    CropSpec("split_summon_normal_0", "新素材2.png", (0, 10, 129, 125), "effects/split_summon_normal_0.png", preserve_islands=True, canvas_size=(256, 160)),
    CropSpec("split_summon_normal_1", "新素材2.png", (129, 10, 127, 125), "effects/split_summon_normal_1.png", preserve_islands=True, canvas_size=(256, 160)),
    CropSpec("split_summon_normal_2", "新素材2.png", (256, 10, 145, 125), "effects/split_summon_normal_2.png", preserve_islands=True, canvas_size=(256, 160)),
    CropSpec("split_summon_normal_3", "新素材2.png", (401, 10, 165, 125), "effects/split_summon_normal_3.png", preserve_islands=True, canvas_size=(256, 160)),
    CropSpec("split_summon_normal_4", "新素材2.png", (566, 10, 182, 125), "effects/split_summon_normal_4.png", preserve_islands=True, canvas_size=(256, 160)),
    CropSpec("split_summon_over_0", "新素材1.png", (0, 20, 130, 115), "effects/split_summon_over_0.png", preserve_islands=True, canvas_size=(256, 160)),
    CropSpec("split_summon_over_1", "新素材1.png", (130, 20, 114, 115), "effects/split_summon_over_1.png", preserve_islands=True, canvas_size=(256, 160)),
    CropSpec("split_summon_over_2", "新素材1.png", (244, 20, 124, 115), "effects/split_summon_over_2.png", preserve_islands=True, canvas_size=(256, 160)),
    CropSpec("split_summon_over_3", "新素材1.png", (368, 20, 135, 115), "effects/split_summon_over_3.png", preserve_islands=True, canvas_size=(256, 160)),
    CropSpec("split_summon_over_4", "新素材1.png", (503, 20, 164, 115), "effects/split_summon_over_4.png", preserve_islands=True, canvas_size=(256, 160)),
)

OVER_BULLET_OUTPUT = OUT / "bullets" / "bullet_main_head_over.png"
OVER_BULLET_GLOW_OUTPUT = OUT / "bullets" / "bullet_main_head_over_glow.png"
UI_ICON_OUTPUT = OUT / "ui" / "ui_icon.png"
AUDIT_OUTPUT = OUT / "asset_audit.json"
CONTACT_OUTPUTS = {
    "black": OUT / "contact_sheet_black.png",
    "white": OUT / "contact_sheet_white.png",
    "checker": OUT / "contact_sheet_checker.png",
}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", type=Path, help="Override the source folder")
    parser.add_argument(
        "--verify-only",
        action="store_true",
        help="Validate generated PNGs without reading or rebuilding source sheets",
    )
    return parser.parse_args()


def resolve_source(override: Path | None) -> Path | None:
    candidates = (override,) if override is not None else SOURCE_CANDIDATES
    for candidate in candidates:
        if candidate is not None and candidate.is_dir():
            return candidate.resolve()
    return None


def rgba_array(image: Image.Image) -> np.ndarray:
    return np.asarray(image.convert("RGBA"), dtype=np.uint8).copy()


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for block in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def green_metrics(image: Image.Image) -> dict[str, int | float]:
    arr = rgba_array(image).astype(np.int16)
    r, g, b, a = (arr[..., index] for index in range(4))
    max_rb = np.maximum(r, b)
    visible = a > 12
    # This is the exact dark-green-halo predicate from the supplied document.
    strict = visible & (g > 1.45 * np.maximum(max_rb, 1)) & (max_rb < 110)
    excess = visible & (g > max_rb + 8)

    mask_image = Image.fromarray((visible.astype(np.uint8) * 255), "L")
    interior = np.asarray(mask_image.filter(ImageFilter.MinFilter(3))) > 0
    edge = visible & ~interior
    edge_strict = strict & edge

    visible_count = int(visible.sum())
    return {
        "visible_pixels": visible_count,
        "green_residue_pixels": int(strict.sum()),
        "green_residue_ratio": round(float(strict.sum()) / max(1, visible_count), 8),
        "green_excess_pixels": int(excess.sum()),
        "green_excess_ratio": round(float(excess.sum()) / max(1, visible_count), 8),
        "edge_visible_pixels": int(edge.sum()),
        "edge_green_residue_pixels": int(edge_strict.sum()),
        "edge_green_residue_ratio": round(float(edge_strict.sum()) / max(1, int(edge.sum())), 8),
    }


def largest_component(mask: np.ndarray) -> np.ndarray:
    """Return the largest 8-connected component using only numpy/Python.

    The supplied N_TAIL, O_TAIL and B_SPLIT_HEAD rectangles include detached
    sheet fragments.  A one-pixel dilation joins antialiased pixels belonging
    to the intended sprite before component selection.
    """

    seeded = np.asarray(
        Image.fromarray(mask.astype(np.uint8) * 255, "L").filter(ImageFilter.MaxFilter(3))
    ) > 0
    height, width = seeded.shape
    seen = np.zeros_like(seeded, dtype=bool)
    best: list[tuple[int, int]] = []

    for y in range(height):
        for x in range(width):
            if not seeded[y, x] or seen[y, x]:
                continue
            stack = [(y, x)]
            seen[y, x] = True
            component: list[tuple[int, int]] = []
            while stack:
                cy, cx = stack.pop()
                component.append((cy, cx))
                for ny in range(max(0, cy - 1), min(height, cy + 2)):
                    for nx in range(max(0, cx - 1), min(width, cx + 2)):
                        if seeded[ny, nx] and not seen[ny, nx]:
                            seen[ny, nx] = True
                            stack.append((ny, nx))
            if len(component) > len(best):
                best = component

    selected = np.zeros_like(seeded, dtype=np.uint8)
    for y, x in best:
        selected[y, x] = 255
    # Preserve the original soft edge around the selected opaque island.
    return np.asarray(Image.fromarray(selected, "L").filter(ImageFilter.MaxFilter(3))) > 0


def trim_and_pad(arr: np.ndarray, pad: int = TRANSPARENT_PAD) -> tuple[np.ndarray, tuple[int, int, int, int]]:
    alpha = arr[..., 3]
    ys, xs = np.where(alpha > 2)
    if len(xs) == 0:
        raise ValueError("asset became fully transparent during cleanup")
    x0, y0 = int(xs.min()), int(ys.min())
    x1, y1 = int(xs.max()) + 1, int(ys.max()) + 1
    cropped = arr[y0:y1, x0:x1]
    padded = np.pad(cropped, ((pad, pad), (pad, pad), (0, 0)), mode="constant")
    return padded, (x0, y0, x1 - x0, y1 - y0)


def place_on_fixed_canvas(
    image: Image.Image,
    size: tuple[int, int],
    *,
    safe_margin: int = FIXED_CANVAS_SAFE_MARGIN,
) -> tuple[Image.Image, tuple[int, int, int, int]]:
    """Left-anchor trimmed content on a stable, vertically centered canvas.

    The two source rows use irregular frame widths. A shared canvas prevents
    the dragon snout and collision/readability point from jumping between
    frames. Two extra pixels beyond the required 16px margin protect the glow
    blur while keeping the visible content left anchored.
    """

    rgba = image.convert("RGBA")
    alpha = np.asarray(rgba.getchannel("A"), dtype=np.uint8)
    ys, xs = np.where(alpha > 2)
    if len(xs) == 0:
        raise ValueError("fixed-canvas asset became fully transparent")
    content_box = (int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1)
    content = rgba.crop(content_box)
    width, height = size
    available_width = width - safe_margin - TRANSPARENT_PAD
    available_height = height - TRANSPARENT_PAD * 2
    if content.width > available_width or content.height > available_height:
        raise ValueError(
            f"content {content.width}x{content.height} exceeds fixed canvas {width}x{height} "
            f"with required margins"
        )

    x = safe_margin
    y = (height - content.height) // 2
    if y < TRANSPARENT_PAD or height - (y + content.height) < TRANSPARENT_PAD:
        raise ValueError(f"vertical margin below {TRANSPARENT_PAD}px on fixed canvas")
    canvas = Image.new("RGBA", size, (0, 0, 0, 0))
    canvas.alpha_composite(content, (x, y))
    return canvas, (x, y, content.width, content.height)


def despill_and_feather(
    crop: Image.Image,
    *,
    preserve_islands: bool = False,
    erode_pixels: int = 1,
) -> tuple[Image.Image, tuple[int, int, int, int]]:
    arr = rgba_array(crop).astype(np.float32)
    original_r = arr[..., 0].copy()
    original_g = arr[..., 1].copy()
    original_b = arr[..., 2].copy()
    original_a = arr[..., 3].copy()

    keep = (original_a > 8) if preserve_islands else largest_component(original_a > 8)
    arr[..., 3] = np.where(keep, arr[..., 3], 0)

    max_rb = np.maximum(original_r, original_b)
    dominance = np.maximum(original_g - max_rb, 0)
    visible = arr[..., 3] > 0

    # Required despill: no visible pixel may retain G above max(R, B).
    arr[..., 1] = np.where(visible & (original_g > max_rb), max_rb, original_g)

    # Required dark green-halo attenuation plus a stronger continuous matte
    # removal for the heavily contaminated bullet sheets.
    dark_green = visible & (original_g > 1.45 * np.maximum(max_rb, 1)) & (max_rb < 110)
    strength = np.clip((dominance - 4.0) / 72.0, 0.0, 1.0)
    matte_strength = 0.96 if preserve_islands else 0.78
    arr[..., 3] *= 1.0 - matte_strength * strength
    arr[..., 3] = np.where(dark_green, 0 if preserve_islands else arr[..., 3] * 0.2, arr[..., 3])
    hard_matte = (
        visible
        & (dominance > 54)
        & (original_g > 118)
        & (original_r < 135)
        & (original_b < 155)
    )
    arr[..., 3] = np.where(hard_matte, 0 if preserve_islands else arr[..., 3] * 0.08, arr[..., 3])

    alpha = Image.fromarray(np.clip(arr[..., 3], 0, 255).astype(np.uint8), "L")
    eroded = alpha.filter(ImageFilter.MinFilter(3)) if erode_pixels > 0 else alpha
    feathered = eroded.filter(ImageFilter.GaussianBlur(FEATHER_RADIUS))
    # Feather inward only; extending source-edge colors recreates a chroma rim.
    arr[..., 3] = np.minimum(np.asarray(alpha, dtype=np.float32), np.asarray(feathered, dtype=np.float32))
    arr[..., 3] = np.where(arr[..., 3] < 2, 0, arr[..., 3])
    arr[arr[..., 3] == 0, :3] = 0

    padded, content_box = trim_and_pad(np.clip(arr, 0, 255).astype(np.uint8))
    return Image.fromarray(padded, "RGBA"), content_box


def shift_hsl(image: Image.Image, hue_degrees: float, saturation_scale: float) -> Image.Image:
    """Vectorized HSL shift used by the documented B_HEAD_OVER recipe."""

    arr = rgba_array(image).astype(np.float32)
    rgb = arr[..., :3] / 255.0
    original_rgb = rgb.copy()
    maximum = rgb.max(axis=2)
    minimum = rgb.min(axis=2)
    delta = maximum - minimum
    lightness = (maximum + minimum) * 0.5
    saturation = np.zeros_like(lightness)
    chromatic = delta > 1e-6
    saturation[chromatic] = delta[chromatic] / np.maximum(
        1e-6, 1.0 - np.abs(2.0 * lightness[chromatic] - 1.0)
    )

    hue = np.zeros_like(lightness)
    r, g, b = (rgb[..., index] for index in range(3))
    red_max = chromatic & (maximum == r)
    green_max = chromatic & (maximum == g)
    blue_max = chromatic & (maximum == b)
    hue[red_max] = np.mod((g[red_max] - b[red_max]) / delta[red_max], 6.0)
    hue[green_max] = (b[green_max] - r[green_max]) / delta[green_max] + 2.0
    hue[blue_max] = (r[blue_max] - g[blue_max]) / delta[blue_max] + 4.0
    hue = np.mod(hue / 6.0 + hue_degrees / 360.0, 1.0)
    saturation = np.clip(saturation * saturation_scale, 0.0, 1.0)

    chroma = (1.0 - np.abs(2.0 * lightness - 1.0)) * saturation
    hp = hue * 6.0
    x = chroma * (1.0 - np.abs(np.mod(hp, 2.0) - 1.0))
    zeros = np.zeros_like(chroma)
    out = np.zeros_like(rgb)
    sectors = np.floor(hp).astype(np.int16) % 6
    choices = (
        (chroma, x, zeros),
        (x, chroma, zeros),
        (zeros, chroma, x),
        (zeros, x, chroma),
        (x, zeros, chroma),
        (chroma, zeros, x),
    )
    for sector, channels in enumerate(choices):
        selected = sectors == sector
        for channel in range(3):
            out[..., channel][selected] = channels[channel][selected]
    out += (lightness - chroma * 0.5)[..., None]
    # Gold is structural armor, not energy.  Preserve it so the documented
    # blue-to-purple overdrive shift cannot turn the metal green.
    warm_metal = (original_rgb[..., 0] > original_rgb[..., 1] * 1.08) & (
        original_rgb[..., 1] > original_rgb[..., 2] * 1.16
    )
    out[warm_metal] = original_rgb[warm_metal]
    arr[..., :3] = np.clip(out * 255.0, 0, 255)
    arr[arr[..., 3] == 0, :3] = 0
    return Image.fromarray(arr.astype(np.uint8), "RGBA")


def final_green_clamp(image: Image.Image) -> Image.Image:
    """Prevent a derived recolor from reintroducing green-screen hues."""

    arr = rgba_array(image).astype(np.float32)
    r, g, b, a = (arr[..., index] for index in range(4))
    max_rb = np.maximum(r, b)
    visible = a > 0
    arr[..., 1] = np.where(visible & (g > max_rb), max_rb, g)
    arr[arr[..., 3] == 0, :3] = 0
    return Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8), "RGBA")


def make_glow(base: Image.Image, full_emissive: bool = False) -> Image.Image:
    arr = rgba_array(base).astype(np.float32)
    r, g, b, a = (arr[..., index] for index in range(4))
    maximum = np.maximum.reduce((r, g, b))
    minimum = np.minimum.reduce((r, g, b))
    chroma = maximum - minimum
    warm_metal = (r > 112) & (r > g * 1.08) & (g > b * 1.16)
    cool_crystal = (b > 82) & (b + g > r * 1.55) & (chroma > 18)
    purple_energy = (b > 92) & (r > 58) & (b > g * 1.08) & (chroma > 20)
    bright_ice = (b > 170) & (g > 145) & (b >= r * 0.92)
    emissive = (a > 8) & ~warm_metal
    if not full_emissive:
        emissive &= cool_crystal | purple_energy | bright_ice

    energy = np.clip((maximum - 58.0) / 190.0, 0.0, 1.0)
    colorfulness = np.clip(chroma / 92.0, 0.28, 1.0)
    strength = energy * colorfulness
    if full_emissive:
        strength = np.maximum(strength, np.clip((maximum - 30.0) / 225.0, 0.15, 1.0))

    out = np.zeros_like(arr)
    # Retain local texture while biasing the emissive pass toward ice blue.
    out[..., 0] = np.maximum(r, 90)
    out[..., 1] = np.maximum(g, 142)
    out[..., 2] = np.maximum(b, 235)
    out[..., 3] = np.where(emissive, a * strength * 0.86, 0)
    out[..., 3] = np.clip(out[..., 3], 0, 220)
    out[out[..., 3] < 2, :] = 0
    glow = Image.fromarray(out.astype(np.uint8), "RGBA")
    glow.putalpha(glow.getchannel("A").filter(ImageFilter.GaussianBlur(0.55)))
    return glow


def save_png(image: Image.Image, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    image.save(path, format="PNG", optimize=True)


def validate_png(
    path: Path,
    *,
    require_padding: bool = True,
    minimum_margin: int = 12,
) -> tuple[dict, list[str]]:
    errors: list[str] = []
    if not path.is_file():
        return {}, [f"missing output: {path.relative_to(ROOT)}"]
    try:
        image = Image.open(path)
        image.load()
        image = image.convert("RGBA")
    except Exception as exc:  # pragma: no cover - exercised by corrupted files
        return {}, [f"cannot decode {path.relative_to(ROOT)}: {exc}"]

    alpha = np.asarray(image.getchannel("A"), dtype=np.uint8)
    margins = {"left": 0, "top": 0, "right": 0, "bottom": 0}
    if not np.any(alpha > 2):
        errors.append(f"fully transparent output: {path.relative_to(ROOT)}")
    else:
        ys, xs = np.where(alpha > 2)
        margins = {
            "left": int(xs.min()),
            "top": int(ys.min()),
            "right": int(image.width - 1 - xs.max()),
            "bottom": int(image.height - 1 - ys.max()),
        }
    if require_padding:
        border_max = max(
            int(alpha[0].max()),
            int(alpha[-1].max()),
            int(alpha[:, 0].max()),
            int(alpha[:, -1].max()),
        )
        if border_max != 0:
            errors.append(f"non-transparent outer border ({border_max}): {path.relative_to(ROOT)}")
        if min(margins.values()) < minimum_margin:
            errors.append(
                f"transparent margin below {minimum_margin}px {margins}: {path.relative_to(ROOT)}"
            )
    metrics = green_metrics(image)
    if float(metrics["green_residue_ratio"]) > GREEN_RATIO_LIMIT:
        errors.append(
            f"green residue {metrics['green_residue_ratio']:.6%} exceeds limit: {path.relative_to(ROOT)}"
        )
    return {
        "file": str(path.relative_to(ROOT)),
        "width": image.width,
        "height": image.height,
        "transparent_margins": margins,
        "sha256": sha256(path),
        **metrics,
    }, errors


def make_ui_icon(head: Image.Image) -> Image.Image:
    size = 256
    icon = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    head_copy = head.copy()
    head_copy.thumbnail((218, 208), Image.Resampling.LANCZOS)
    x = (size - head_copy.width) // 2
    y = (size - head_copy.height) // 2

    head_alpha = head_copy.getchannel("A")
    aura_alpha = head_alpha.filter(ImageFilter.MaxFilter(9)).filter(ImageFilter.GaussianBlur(12))
    aura = Image.new("RGBA", head_copy.size, (80, 122, 255, 0))
    aura.putalpha(aura_alpha.point(lambda value: round(value * 0.34)))
    purple_alpha = head_alpha.filter(ImageFilter.GaussianBlur(5))
    purple = Image.new("RGBA", head_copy.size, (146, 78, 235, 0))
    purple.putalpha(purple_alpha.point(lambda value: round(value * 0.16)))
    icon.alpha_composite(aura, (x, y))
    icon.alpha_composite(purple, (x, y))
    icon.alpha_composite(head_copy, (x, y))
    return final_green_clamp(icon)


def checker_background(size: tuple[int, int], cell: int = 18) -> Image.Image:
    width, height = size
    image = Image.new("RGB", size, (214, 218, 226))
    draw = ImageDraw.Draw(image)
    for y in range(0, height, cell):
        for x in range(0, width, cell):
            if (x // cell + y // cell) % 2:
                draw.rectangle((x, y, x + cell - 1, y + cell - 1), fill=(166, 173, 185))
    return image


def background_for(mode: str, size: tuple[int, int]) -> Image.Image:
    if mode == "black":
        return Image.new("RGB", size, (5, 7, 14))
    if mode == "white":
        return Image.new("RGB", size, (245, 247, 250))
    return checker_background(size)


def composite_thumbnail(background: Image.Image, image: Image.Image, box: tuple[int, int, int, int]) -> None:
    x, y, width, height = box
    thumb = image.copy()
    thumb.thumbnail((width, height), Image.Resampling.LANCZOS)
    layer = Image.new("RGBA", background.size, (0, 0, 0, 0))
    layer.alpha_composite(thumb, (x + (width - thumb.width) // 2, y + (height - thumb.height) // 2))
    background.paste(layer.convert("RGB"), (0, 0), layer.getchannel("A"))


def contact_entries() -> list[tuple[str, Path, Path | None]]:
    entries = [(spec.key, spec.output_path, spec.glow_path) for spec in CROPS]
    entries.append(("bullet_main_head_over", OVER_BULLET_OUTPUT, OVER_BULLET_GLOW_OUTPUT))
    entries.append(("ui_icon", UI_ICON_OUTPUT, None))
    return entries


def make_contact_sheets() -> None:
    entries = contact_entries()
    columns = 3
    cell_width, cell_height = 360, 238
    rows = (len(entries) + columns - 1) // columns
    sheet_size = (columns * cell_width, rows * cell_height)

    for mode, output in CONTACT_OUTPUTS.items():
        sheet = background_for(mode, sheet_size)
        draw = ImageDraw.Draw(sheet)
        foreground = (230, 239, 255) if mode == "black" else (25, 35, 55)
        subdued = (150, 172, 205) if mode == "black" else (74, 88, 112)
        for index, (key, base_path, glow_path) in enumerate(entries):
            x = (index % columns) * cell_width
            y = (index // columns) * cell_height
            base = Image.open(base_path).convert("RGBA")
            if glow_path is None:
                composite_thumbnail(sheet, base, (x + 75, y + 18, 210, 178))
            else:
                glow = Image.open(glow_path).convert("RGBA")
                composite_thumbnail(sheet, base, (x + 10, y + 24, 162, 166))
                composite_thumbnail(sheet, glow, (x + 188, y + 24, 162, 166))
                draw.text((x + 64, y + 194), "base", fill=subdued)
                draw.text((x + 238, y + 194), "glow", fill=subdued)
            draw.text((x + 10, y + 8), key, fill=foreground)
            draw.rectangle((x, y, x + cell_width - 1, y + cell_height - 1), outline=subdued, width=1)
        output.parent.mkdir(parents=True, exist_ok=True)
        sheet.save(output, format="PNG", optimize=True)


def required_runtime_paths() -> Iterable[Path]:
    for spec in CROPS:
        yield spec.output_path
        yield spec.glow_path
    yield OVER_BULLET_OUTPUT
    yield OVER_BULLET_GLOW_OUTPUT
    yield UI_ICON_OUTPUT


def build_output_audit(source: Path | None, source_records: dict[str, dict] | None = None) -> dict:
    source_records = source_records or {}
    assets: list[dict] = []
    all_errors: list[str] = []
    for spec in CROPS:
        minimum_margin = TRANSPARENT_PAD if spec.canvas_size is not None else 12
        base, base_errors = validate_png(spec.output_path, minimum_margin=minimum_margin)
        glow, glow_errors = validate_png(spec.glow_path, minimum_margin=minimum_margin)
        all_errors.extend(base_errors)
        all_errors.extend(glow_errors)
        assets.append(
            {
                "key": spec.key,
                "source": spec.source,
                "source_rect": list(spec.rect),
                "fixed_canvas": list(spec.canvas_size) if spec.canvas_size is not None else None,
                "source_audit": source_records.get(spec.key),
                "base": base,
                "glow": glow,
            }
        )

    for key, base_path, glow_path in (
        ("bullet_main_head_over", OVER_BULLET_OUTPUT, OVER_BULLET_GLOW_OUTPUT),
        ("ui_icon", UI_ICON_OUTPUT, None),
    ):
        base, base_errors = validate_png(base_path)
        all_errors.extend(base_errors)
        glow = None
        if glow_path is not None:
            glow, glow_errors = validate_png(glow_path)
            all_errors.extend(glow_errors)
        assets.append(
            {
                "key": key,
                "derived_from": "bullet_main_head" if "bullet_main" in key else "body_normal_head",
                "base": base,
                "glow": glow,
            }
        )

    if all_errors:
        raise ValueError("\n".join(all_errors))
    ratios = [float(item["base"]["green_residue_ratio"]) for item in assets]
    glow_ratios = [
        float(item["glow"]["green_residue_ratio"])
        for item in assets
        if item.get("glow") is not None
    ]
    return {
        "pipeline": PIPELINE_VERSION,
        "source_folder": str(source.relative_to(ROOT)) if source is not None and source.is_relative_to(ROOT) else (str(source) if source else None),
        "source_available": source is not None,
        "crop_contract": "实现文档_冰晶龙灵寒渊_v1.0.md section 2.3",
        "cleanup": {
            "despill": "visible G clamped to max(R,B)",
            "dark_green_alpha_multiplier": 0.2,
            "hard_green_alpha_multiplier": 0.08,
            "alpha_erosion_pixels": 1,
            "alpha_feather_radius_pixels": FEATHER_RADIUS,
            "transparent_padding_pixels": TRANSPARENT_PAD,
            "split_summon_canvas": [256, 160],
            "split_summon_anchor": "left, vertically centered",
            "principal_alpha_island_only": True,
        },
        "assets": assets,
        "contacts": {key: str(path.relative_to(ROOT)) for key, path in CONTACT_OUTPUTS.items()},
        "summary": {
            "base_asset_count": len(assets),
            "glow_asset_count": len(glow_ratios),
            "max_green_residue_ratio": round(max(ratios, default=0.0), 8),
            "max_glow_green_residue_ratio": round(max(glow_ratios, default=0.0), 8),
            "green_residue_limit": GREEN_RATIO_LIMIT,
            "validation_errors": [],
        },
    }


def validate_existing_outputs(source: Path | None) -> dict:
    errors: list[str] = []
    for path in required_runtime_paths():
        _, path_errors = validate_png(path)
        errors.extend(path_errors)
    if errors:
        raise SystemExit("Ice Crystal Dragon generated assets are incomplete:\n- " + "\n- ".join(errors))
    if any(not path.is_file() for path in CONTACT_OUTPUTS.values()):
        make_contact_sheets()
    audit = build_output_audit(source)
    # A source-less clean checkout must remain clean after verification.  Keep
    # the committed provenance audit intact instead of replacing it with a
    # reduced source_available=false report.
    if not AUDIT_OUTPUT.is_file():
        AUDIT_OUTPUT.write_text(json.dumps(audit, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return audit


def process_sources(source: Path) -> dict:
    OUT.mkdir(parents=True, exist_ok=True)
    source_records: dict[str, dict] = {}
    rendered: dict[str, Image.Image] = {}
    source_hashes: dict[str, str] = {}

    for spec in CROPS:
        source_path = source / spec.source
        if spec.source not in source_hashes:
            source_hashes[spec.source] = sha256(source_path)
        source_image = Image.open(source_path).convert("RGBA")
        x, y, width, height = spec.rect
        if x < 0 or y < 0 or x + width > source_image.width or y + height > source_image.height:
            raise ValueError(f"source rectangle outside {spec.source}: {spec.rect}")
        crop = source_image.crop((x, y, x + width, y + height))
        source_metrics = green_metrics(crop)
        processed, content_box = despill_and_feather(
            crop,
            preserve_islands=spec.preserve_islands,
            erode_pixels=spec.erode_pixels,
        )
        fixed_canvas_placement = None
        if spec.canvas_size is not None:
            processed, fixed_canvas_placement = place_on_fixed_canvas(processed, spec.canvas_size)
        save_png(processed, spec.output_path)
        glow = make_glow(processed, spec.full_emissive)
        save_png(glow, spec.glow_path)
        rendered[spec.key] = processed
        source_records[spec.key] = {
            "sheet_width": source_image.width,
            "sheet_height": source_image.height,
            "sheet_sha256": source_hashes[spec.source],
            "crop_content_box_before_padding": list(content_box),
            "principal_alpha_island_only": not spec.preserve_islands,
            "alpha_erosion_pixels": spec.erode_pixels,
            "fixed_canvas_size": list(spec.canvas_size) if spec.canvas_size is not None else None,
            "fixed_canvas_placement": list(fixed_canvas_placement) if fixed_canvas_placement else None,
            "fixed_canvas_anchor": "left, vertically centered" if spec.canvas_size is not None else None,
            **source_metrics,
        }

    over_head = final_green_clamp(shift_hsl(rendered["bullet_main_head"], 38.0, 1.12))
    save_png(over_head, OVER_BULLET_OUTPUT)
    save_png(make_glow(over_head), OVER_BULLET_GLOW_OUTPUT)
    save_png(make_ui_icon(rendered["body_normal_head"]), UI_ICON_OUTPUT)

    make_contact_sheets()
    audit = build_output_audit(source, source_records)
    AUDIT_OUTPUT.write_text(json.dumps(audit, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return audit


def print_summary(audit: dict, mode: str) -> None:
    print(f"[{mode}] {PIPELINE_VERSION}")
    for item in audit["assets"]:
        base = item["base"]
        glow = item.get("glow")
        line = (
            f"{item['key']}: {base['file']} {base['width']}x{base['height']} "
            f"green={base['green_residue_ratio']:.6%}"
        )
        if glow is not None:
            line += f" glowGreen={glow['green_residue_ratio']:.6%}"
        print(line)
    print(f"maxGreen={audit['summary']['max_green_residue_ratio']:.6%}")
    print(f"audit={AUDIT_OUTPUT.relative_to(ROOT)}")
    for key, path in CONTACT_OUTPUTS.items():
        print(f"contact[{key}]={path.relative_to(ROOT)}")


def main() -> None:
    args = parse_args()
    source = resolve_source(args.source)
    missing_sources: list[str] = []
    if source is None:
        missing_sources = sorted({spec.source for spec in CROPS})
    else:
        missing_sources = sorted({spec.source for spec in CROPS if not (source / spec.source).is_file()})

    if args.verify_only or missing_sources:
        reason = "verify-only" if args.verify_only else f"source missing: {', '.join(missing_sources)}"
        audit = validate_existing_outputs(source)
        print_summary(audit, f"VERIFIED, rebuild skipped ({reason})")
        return

    if source is None:  # Kept explicit for type checkers and future edits.
        raise SystemExit("Ice Crystal Dragon source folder not found")
    audit = process_sources(source)
    print_summary(audit, "BUILT")


if __name__ == "__main__":
    main()
