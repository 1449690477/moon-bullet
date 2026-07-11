#!/usr/bin/env python3
"""Import the prepared Corruption Gun sheets into runtime-ready PNG frames."""

from __future__ import annotations

import hashlib
import json
import math
import shutil
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable

import numpy as np
from PIL import Image, ImageDraw, ImageFont
from scipy import ndimage


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "assets/player/corrupt_gun"
PREVIEW = ROOT / "tools/corruptgun_asset_preview"
SOURCE_CANDIDATES = (
    ROOT / "7号战机 开发文件夹",
    ROOT / "7号战机 开发文件夹_副本",
    ROOT / "moon-bullet-main/7号战机 开发文件夹",
)

EXPECTED_SOURCE_COUNT = 38
ALPHA_THRESHOLD = 8


@dataclass(frozen=True)
class SheetSpec:
    source: str
    rows: int
    cols: int
    outputs: tuple[str, ...]
    indices: tuple[int, ...] | None = None
    hue_fix: tuple[int, ...] = ()


def numbered(prefix: str, count: int) -> tuple[str, ...]:
    return tuple(f"{prefix}_{i}.png" for i in range(1, count + 1))


SHEETS = (
    SheetSpec("、暴走引擎尾焰，长条猩红腐化喷流.png", 1, 6, numbered("fx/cg_flame_over", 6)),
    SheetSpec("中央核心脉冲，腐化心跳光效。.png", 1, 6, numbered("fx/cg_core_pulse", 6)),
    SheetSpec("分身待机循环，半透明科技投影风格.png", 2, 2, numbered("clone/cg_clone_idle", 4)),
    SheetSpec("分身投影噪声粒子，暗红像素化虚影。.png", 1, 1, ("clone/cg_clone_noise.png",)),
    SheetSpec("分身攻击姿态，锁定敌人发射腐化光球。.png", 1, 3, numbered("clone/cg_clone_attack", 3)),
    SheetSpec("分身消散，像红色数据碎片散开。.png", 2, 3, numbered("clone/cg_clone_despawn", 4), (0, 1, 2, 3)),
    SheetSpec("分身生成过程，战机从红色全息轮廓实体化。.png", 2, 3, numbered("clone/cg_clone_spawn", 5), (1, 2, 3, 4, 5), (1, 2)),
    SheetSpec("分身用小号弹幕.png", 1, 2, numbered("bullets/cg_clone_orb", 2)),
    SheetSpec("命中后施加腐化标记动画，眼形 : 圆环 : 裂纹.png", 2, 3, numbered("fx/cg_mark", 6)),
    SheetSpec("大型腐化爆炸，黑红碎片扩散。.png", 2, 5, numbered("fx/cg_death_boom", 10)),
    SheetSpec("普通主弹：科技感虚空粒子光球，圆形，不是实体球。.png", 1, 2, numbered("fx/cg_charge_orb", 2)),
    SheetSpec("普通命中火花，红色放射爆点。.png", 2, 3, numbered("fx/cg_hit_spark", 6)),
    SheetSpec("普通引擎尾焰，暗红短喷流.png", 1, 5, numbered("fx/cg_flame_normal", 5)),
    SheetSpec(
        "普通弹幕和穿透弹幕.png",
        4,
        2,
        tuple(f"bullets/cg_orb_side_{i}.png" for i in range(1, 5))
        + tuple(f"bullets/cg_orb_pierce_{i}.png" for i in range(1, 5)),
        (0, 2, 4, 6, 1, 3, 5, 7),
    ),
    SheetSpec("普通形态 和右转向.png", 1, 3, numbered("body/cg_body_alt", 3)),
    SheetSpec("普通形态右转向.png", 1, 3, numbered("body/cg_body_bankR", 3)),
    SheetSpec("普通形态左转向.png", 1, 3, numbered("body/cg_body_bankL", 3)),
    SheetSpec("普通形态贴图素材.png", 1, 1, ("body/cg_body_normal.png",)),
    SheetSpec("普通形象到暴走形态的帧序列切换动画.png", 2, 4, numbered("body/cg_form_switch", 8)),
    SheetSpec("普通枪口火光，圆形充能后发射。.png", 1, 4, numbered("fx/cg_muzzle_normal", 4)),
    SheetSpec("暴走弹幕细节.png", 1, 2, numbered("bullets/cg_orb_over", 2)),
    SheetSpec("暴走形态贴图.png", 1, 1, ("body/cg_body_over.png",)),
    SheetSpec("暴走形态转转向.png", 1, 3, numbered("body/cg_body_over_bankR", 3)),
    SheetSpec("暴走枪口火光，裂纹爆闪、强红光。.png", 1, 4, numbered("fx/cg_muzzle_over", 4)),
    SheetSpec("暴走翼刃能量延展，华丽红色裂纹光翼.png", 2, 2, numbered("body/cg_wing_blade", 4)),
    SheetSpec("机体周围暗红腐化气场，内收束边缘。.png", 2, 2, numbered("fx/cg_aura", 4)),
    SheetSpec("穿透弹幕光球细节.png", 1, 2, numbered("bullets/cg_orb_main", 2)),
    SheetSpec("红色粒子流条带，给弹幕拖尾拼接。.png", 1, 5, numbered("bullets/cg_trail_strip", 5)),
    SheetSpec("翻倍伤害触发爆发，腐化印记炸裂。.png", 2, 4, numbered("fx/cg_stack_burst", 8)),
    SheetSpec("腐化光球弹幕飞行拖尾.png", 1, 4, numbered("bullets/cg_orb_baked", 4)),
    SheetSpec("腐化冲击光环.png", 2, 3, numbered("fx/cg_shockring", 6)),
    SheetSpec("虚空粒子圆点组，红 : 粉紫 : 近白三档.png", 3, 3,
              numbered("fx/cg_dot_r", 3) + numbered("fx/cg_dot_p", 3) + numbered("fx/cg_dot_w", 3)),
)

EXTRA_SOURCES = (
    "腐化火花，短划、长划、尖刺碎光。.png",
    "腐化能量碎片，黑红晶片状。.png",
    "机身拆解细节贴图.png",
)


def required_source_names() -> tuple[str, ...]:
    return tuple(dict.fromkeys([spec.source for spec in SHEETS] + list(EXTRA_SOURCES)))


def file_digest(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def select_source() -> Path:
    valid: list[Path] = []
    signatures: dict[Path, dict[str, str]] = {}
    required = required_source_names()
    for candidate in SOURCE_CANDIDATES:
        files = [candidate / name for name in required] if candidate.is_dir() else []
        if not files or any(not path.is_file() for path in files):
            continue
        valid.append(candidate)
        signatures[candidate] = {p.name: file_digest(p) for p in files}
    if not valid:
        raise SystemExit("找不到包含全部必需 PNG 的 7号战机开发文件夹")
    first = signatures[valid[0]]
    for candidate in valid[1:]:
        if signatures[candidate] != first:
            raise SystemExit(f"素材副本内容不一致，停止导入：{valid[0]} != {candidate}")
    preferred = ROOT / "7号战机 开发文件夹_副本"
    return preferred if preferred in valid else valid[0]


def hue_green_to_red(image: Image.Image) -> Image.Image:
    rgba = np.asarray(image.convert("RGBA"), dtype=np.uint8).copy()
    rgb = rgba[:, :, :3]
    mx = np.maximum(rgb[:, :, 0], rgb[:, :, 2])
    mask = (rgba[:, :, 3] > ALPHA_THRESHOLD) & (rgb[:, :, 1].astype(np.float32) > mx.astype(np.float32) * 1.15)
    if not np.any(mask):
        return Image.fromarray(rgba, "RGBA")
    hsv = np.asarray(Image.fromarray(rgb, "RGB").convert("HSV"), dtype=np.uint8).copy()
    # C2 is a pink-red near 344 degrees rather than orange-red.
    hsv[:, :, 0][mask] = 244
    hsv[:, :, 1][mask] = np.clip(hsv[:, :, 1][mask].astype(np.float32) * 0.90, 0, 255).astype(np.uint8)
    fixed = np.asarray(Image.fromarray(hsv, "HSV").convert("RGB"), dtype=np.uint8)
    rgba[:, :, :3][mask] = fixed[mask]
    return Image.fromarray(rgba, "RGBA")


def despill_erode(image: Image.Image) -> Image.Image:
    px = np.asarray(image.convert("RGBA"), dtype=np.int16).copy()
    rgb = px[:, :, :3]
    alpha = px[:, :, 3].astype(np.float32)
    rb = np.maximum(rgb[:, :, 0], rgb[:, :, 2])
    dominance = rgb[:, :, 1] - rb

    # The prepared sheets are transparent but retain a broad chroma-green halo.
    # Fade that halo out before clamping the remaining edge color.
    green = (dominance > 10) & (rgb[:, :, 1] > 28)
    fade = np.clip(1.0 - np.maximum(0, dominance - 8) / 58.0, 0.0, 1.0)
    alpha[green] *= fade[green]
    # No prepared Corruption Gun layer contains intentional green. Clamp even
    # very dark residual spill so later Lanczos resizing cannot revive it.
    any_green = dominance > 2
    rgb[:, :, 1][any_green] = rb[any_green]
    alpha[alpha < ALPHA_THRESHOLD] = 0

    solid = alpha > 0
    if np.any(solid):
        eroded = ndimage.binary_erosion(solid, iterations=1, border_value=0)
        alpha[solid & ~eroded] = 0
        alpha = ndimage.gaussian_filter(alpha, sigma=0.55)
        alpha[alpha < ALPHA_THRESHOLD] = 0

    px[:, :, :3] = np.clip(rgb, 0, 255)
    px[:, :, 3] = np.clip(alpha, 0, 255).astype(np.int16)
    px[:, :, :3][px[:, :, 3] == 0] = 0
    return Image.fromarray(px.astype(np.uint8), "RGBA")


def isolate_trail_cluster(image: Image.Image) -> Image.Image:
    """Keep the authored spear plume while removing neighboring cell spill."""
    rgba = np.asarray(image.convert("RGBA"), dtype=np.uint8).copy()
    solid = rgba[:, :, 3] > ALPHA_THRESHOLD
    labels, count = ndimage.label(solid)
    if count <= 1:
        return Image.fromarray(rgba, "RGBA")
    sizes = ndimage.sum(solid, labels, index=np.arange(1, count + 1))
    primary = labels == (int(np.argmax(sizes)) + 1)
    # Nearby detached shards belong to the plume. Distant edge fragments are
    # bleed from the adjacent hand-painted column and would skew its anchor.
    distance = ndimage.distance_transform_edt(~primary)
    keep_distance = max(18.0, image.width * 0.19)
    keep = solid & (distance <= keep_distance)
    rgba[~keep] = 0
    return Image.fromarray(rgba, "RGBA")


def isolate_clone_palette(image: Image.Image) -> Image.Image:
    """Remove green/cyan screen remnants without making the projection brighter."""
    px = np.asarray(image.convert("RGBA"), dtype=np.float32).copy()
    r, g, b, a = (px[:, :, index] for index in range(4))
    chroma = np.maximum.reduce([r, g, b]) - np.minimum.reduce([r, g, b])
    contaminated = (
        (a > ALPHA_THRESHOLD)
        & (chroma > 5)
        & ((g > r * 1.02 + 2) | ((g > r * 0.58 + 4) & (b > r * 0.72 + 4)))
    )
    energy = np.maximum.reduce([r, g, b])
    r[contaminated] = np.maximum(r[contaminated], energy[contaminated] * 0.66)
    g[contaminated] = np.minimum(34, energy[contaminated] * 0.075)
    b[contaminated] = np.clip(
        np.maximum(b[contaminated] * 0.38, r[contaminated] * 0.20),
        0,
        r[contaminated] * 0.50,
    )

    solid = a > ALPHA_THRESHOLD
    if np.any(solid):
        edge = solid & ~ndimage.binary_erosion(solid, iterations=2, border_value=0)
        warm_green = edge & (g > b * 0.74 + 2) & (g > r * 0.46 + 3)
        edge_energy = np.maximum.reduce([r, g, b])
        r[warm_green] = np.maximum(r[warm_green], edge_energy[warm_green] * 0.70)
        g[warm_green] = np.minimum(g[warm_green], r[warm_green] * 0.16 + 2)
        b[warm_green] = np.maximum(b[warm_green] * 0.46, r[warm_green] * 0.18)

    # Projection materials deliberately avoid the main fighter's near-white and
    # hot-pink peaks. Preserve shape contrast but push the whole sprite into a
    # deeper blood-crimson / black-violet range.
    energy = np.maximum.reduce([r, g, b])
    r[:] = np.minimum(205, r * 0.62 + energy * 0.08)
    g[:] = np.minimum(38, g * 0.22)
    b[:] = np.minimum(94, b * 0.44 + r * 0.12)

    px[:, :, :3] = np.clip(px[:, :, :3], 0, 255)
    px[a <= ALPHA_THRESHOLD] = 0
    return Image.fromarray(px.astype(np.uint8), "RGBA")


def clean_body_edge_palette(image: Image.Image) -> Image.Image:
    """Convert chroma-key fringe on ship silhouettes into a red metal rim."""
    px = np.asarray(image.convert("RGBA"), dtype=np.float32).copy()
    r, g, b, a = (px[:, :, index] for index in range(4))
    solid = a > ALPHA_THRESHOLD
    if not np.any(solid):
        return image
    edge = solid & ~ndimage.binary_erosion(solid, iterations=2, border_value=0)
    fringe = edge & (g > r * 0.42 + 5) & (g > b * 0.68 + 3)
    energy = np.maximum.reduce([r, g, b])
    r[fringe] = np.maximum(r[fringe], energy[fringe] * 0.76)
    g[fringe] = np.minimum(g[fringe], r[fringe] * 0.24 + 3)
    b[fringe] = np.maximum(b[fringe] * 0.44, r[fringe] * 0.12)
    px[:, :, :3] = np.clip(px[:, :, :3], 0, 255)
    px[a <= ALPHA_THRESHOLD] = 0
    return Image.fromarray(px.astype(np.uint8), "RGBA")


def grid_cells(image: Image.Image, rows: int, cols: int) -> list[Image.Image]:
    xs = np.rint(np.linspace(0, image.width, cols + 1)).astype(int)
    ys = np.rint(np.linspace(0, image.height, rows + 1)).astype(int)
    cells: list[Image.Image] = []
    for row in range(rows):
        for col in range(cols):
            left, right = xs[col], xs[col + 1]
            top, bottom = ys[row], ys[row + 1]
            inset = 2 if min(right - left, bottom - top) > 128 else 1
            cells.append(image.crop((left + inset, top + inset, right - inset, bottom - inset)))
    return cells


def alpha_bbox(image: Image.Image) -> tuple[int, int, int, int]:
    alpha = np.asarray(image.getchannel("A"), dtype=np.uint8)
    ys, xs = np.where(alpha > ALPHA_THRESHOLD)
    if not len(xs):
        return (0, 0, image.width, image.height)
    return (int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1)


def trim_frame(image: Image.Image, margin: int = 8) -> Image.Image:
    left, top, right, bottom = alpha_bbox(image)
    left = max(0, left - margin)
    top = max(0, top - margin)
    right = min(image.width, right + margin)
    bottom = min(image.height, bottom + margin)
    return image.crop((left, top, right, bottom))


def normalize_group(frames: Iterable[Image.Image]) -> list[Image.Image]:
    trimmed = [trim_frame(frame) for frame in frames]
    width = int(math.ceil(max(frame.width for frame in trimmed) / 4) * 4)
    height = int(math.ceil(max(frame.height for frame in trimmed) / 4) * 4)
    normalized: list[Image.Image] = []
    for frame in trimmed:
        canvas = Image.new("RGBA", (width, height), (0, 0, 0, 0))
        canvas.alpha_composite(frame, ((width - frame.width) // 2, (height - frame.height) // 2))
        normalized.append(canvas)
    return normalized


def residual_green_count(image: Image.Image) -> int:
    px = np.asarray(image.convert("RGBA"), dtype=np.int16)
    rb = np.maximum(px[:, :, 0], px[:, :, 2])
    return int(np.count_nonzero((px[:, :, 3] > ALPHA_THRESHOLD) & (px[:, :, 1] > rb + 12)))


def residual_cyan_count(image: Image.Image) -> int:
    px = np.asarray(image.convert("RGBA"), dtype=np.float32)
    r, g, b, a = (px[:, :, index] for index in range(4))
    chroma = np.maximum.reduce([r, g, b]) - np.minimum.reduce([r, g, b])
    mask = (
        (a > ALPHA_THRESHOLD)
        & (chroma > 5)
        & (g > r * 0.58 + 4)
        & (b > r * 0.72 + 4)
    )
    return int(np.count_nonzero(mask))


def save_frame(image: Image.Image, relative: str, source: str, source_index: int, manifest: dict[str, dict]) -> None:
    target = OUT / relative
    target.parent.mkdir(parents=True, exist_ok=True)
    image.save(target, optimize=True)
    bbox = alpha_bbox(image)
    manifest[relative] = {
        "source": source,
        "sourceIndex": source_index,
        "width": image.width,
        "height": image.height,
        "alphaBBox": list(bbox),
        "residualGreenPixels": residual_green_count(image),
        "residualCyanPixels": residual_cyan_count(image),
        "sha256": file_digest(target),
    }


def import_sheet(src: Path, spec: SheetSpec, manifest: dict[str, dict]) -> None:
    image = Image.open(src / spec.source).convert("RGBA")
    cells = grid_cells(image, spec.rows, spec.cols)
    indices = spec.indices or tuple(range(len(spec.outputs)))
    if len(indices) != len(spec.outputs):
        raise AssertionError(f"输出映射不匹配：{spec.source}")
    selected: list[Image.Image] = []
    for index, relative in zip(indices, spec.outputs):
        frame = cells[index]
        if index in spec.hue_fix:
            frame = hue_green_to_red(frame)
        frame = despill_erode(frame)
        if spec.source == "红色粒子流条带，给弹幕拖尾拼接。.png":
            frame = isolate_trail_cluster(frame)
        if relative.startswith("clone/") or relative.startswith("bullets/cg_clone_orb"):
            frame = isolate_clone_palette(frame)
        elif relative.startswith("body/"):
            frame = clean_body_edge_palette(frame)
        selected.append(frame)
    normalized = normalize_group(selected)
    for frame, relative, source_index in zip(normalized, spec.outputs, indices):
        if relative.startswith("clone/") or relative.startswith("bullets/cg_clone_orb"):
            frame = isolate_clone_palette(frame)
        elif relative.startswith("body/"):
            frame = clean_body_edge_palette(frame)
        save_frame(frame, relative, spec.source, source_index, manifest)


def import_largest_grid_cells(
    src: Path,
    source: str,
    rows: int,
    cols: int,
    prefix: str,
    count: int,
    manifest: dict[str, dict],
) -> None:
    image = Image.open(src / source).convert("RGBA")
    processed: list[tuple[int, int, Image.Image]] = []
    for index, cell in enumerate(grid_cells(image, rows, cols)):
        frame = despill_erode(cell)
        area = int(np.count_nonzero(np.asarray(frame.getchannel("A")) > ALPHA_THRESHOLD))
        processed.append((area, index, frame))
    selected = sorted(processed, key=lambda item: item[0], reverse=True)[:count]
    normalized = normalize_group([item[2] for item in selected])
    for out_index, (frame, (_, source_index, _)) in enumerate(zip(normalized, selected), 1):
        save_frame(frame, f"fx/{prefix}_{out_index}.png", source, source_index, manifest)


def material_layers(image: Image.Image, sweep_phase: float = 0.5) -> dict[str, Image.Image]:
    rgba = np.asarray(image.convert("RGBA"), dtype=np.float32) / 255.0
    h, w = rgba.shape[:2]
    r, g, b, alpha = (rgba[:, :, index] for index in range(4))
    yy, xx = np.mgrid[0:h, 0:w]
    xn = (xx + 0.5) / max(1, w) * 2.0 - 1.0
    yn = (yy + 0.5) / max(1, h)
    lum = r * 0.30 + g * 0.58 + b * 0.12
    chroma = np.maximum.reduce([r, g, b]) - np.minimum.reduce([r, g, b])
    red_energy = np.clip((r - g * 0.58) * 2.0 + (b - g) * 0.35, 0, 1) * alpha
    red_energy *= np.clip(chroma * 2.7, 0, 1)

    def gaussian_region(cx: float, cy: float, rx: float, ry: float) -> np.ndarray:
        return np.exp(-(((xn - cx) / rx) ** 2 + ((yn - cy) / ry) ** 2) * 1.8)

    crystal_mask = red_energy * gaussian_region(0, 0.53, 0.22, 0.19)
    muzzle_mask = red_energy * gaussian_region(0, 0.16, 0.28, 0.24)
    engine_mask = red_energy * np.clip((yn - 0.58) / 0.28, 0, 1) * np.clip(1.18 - np.abs(xn), 0, 1)
    wing_mask = red_energy * np.clip((np.abs(xn) - 0.20) / 0.42, 0, 1) * np.clip((0.91 - yn) / 0.70, 0, 1)
    claimed = np.maximum.reduce([crystal_mask, muzzle_mask, engine_mask, wing_mask])
    reactor_mask = red_energy * np.clip(1.0 - claimed * 0.82, 0, 1)
    reactor_mask *= np.clip(1.0 - np.abs(yn - 0.54) / 0.34, 0, 1)

    def energy_layer(mask: np.ndarray, dark: bool = False) -> Image.Image:
        core = np.clip(mask * 1.28, 0, 1)
        glow = ndimage.gaussian_filter(core, sigma=max(0.75, min(w, h) / 420.0))
        layer_alpha = np.clip(core * 0.80 + glow * 0.34, 0, alpha)
        if dark:
            rr = np.clip(0.34 + r * 0.74, 0, 1)
            gg = np.clip(g * 0.18, 0, 0.18)
            bb = np.clip(0.08 + b * 0.40, 0, 0.42)
        else:
            rr = np.clip(0.58 + r * 0.58, 0, 1)
            gg = np.clip(0.03 + g * 0.38, 0, 0.48)
            bb = np.clip(0.12 + np.maximum(b * 0.62, r * 0.24), 0, 0.82)
        output = np.stack([rr, gg, bb, layer_alpha], axis=-1)
        output[layer_alpha <= 0.01] = 0
        return Image.fromarray(np.clip(output * 255, 0, 255).astype(np.uint8), "RGBA")

    darkness = np.clip((0.46 - lum) * 1.75, 0, 0.54)
    joint = ndimage.gaussian_filter(darkness * alpha, sigma=1.1)
    ao = np.zeros_like(rgba)
    ao[:, :, 3] = np.clip(joint * 0.62, 0, 0.46)

    metal = alpha * np.clip(1.0 - red_energy * 1.12, 0, 1)
    metal *= np.clip((lum - 0.10) * 1.65, 0, 1)
    sweep_coordinate = xn * 0.72 + yn * 0.82
    sweep_center = -0.52 + min(1.0, max(0.0, float(sweep_phase))) * 1.82
    band = np.exp(-((sweep_coordinate - sweep_center) / 0.18) ** 2)
    spec_alpha = np.clip(metal * (0.08 + band * 0.70) * (0.38 + lum), 0, 0.72)
    spec = np.zeros_like(rgba)
    spec[:, :, 0] = np.clip(0.72 + r * 0.30, 0, 1)
    spec[:, :, 1] = np.clip(0.68 + g * 0.28, 0, 1)
    spec[:, :, 2] = np.clip(0.72 + b * 0.28, 0, 1)
    spec[:, :, 3] = spec_alpha

    return {
        "ao": Image.fromarray(np.clip(ao * 255, 0, 255).astype(np.uint8), "RGBA"),
        "metal": Image.fromarray(np.clip(spec * 255, 0, 255).astype(np.uint8), "RGBA"),
        "crystal": energy_layer(crystal_mask),
        "muzzle": energy_layer(muzzle_mask, dark=True),
        "reactor": energy_layer(reactor_mask),
        "engine": energy_layer(engine_mask, dark=True),
        "wing": energy_layer(wing_mask),
    }


def make_material_assets(src: Path, manifest: dict[str, dict]) -> dict[str, object]:
    generated: list[str] = []

    def save_layer(image: Image.Image, relative: str, source: str, source_index: int) -> None:
        save_frame(image, relative, source, source_index, manifest)
        generated.append(relative)

    static_layers = ("ao", "crystal", "muzzle", "reactor", "engine", "wing")
    for form, relative, source in (
        ("normal", "body/cg_body_normal.png", "普通形态贴图素材.png"),
        ("over", "body/cg_body_over.png", "暴走形态贴图.png"),
    ):
        image = Image.open(OUT / relative).convert("RGBA")
        base_layers = material_layers(image, 0.5)
        for layer in static_layers:
            save_layer(base_layers[layer], f"body/material/cg_mat_{form}_{layer}.png", source, 0)
        for frame in range(1, 9):
            sheen = material_layers(image, (frame - 1) / 7.0)["metal"]
            save_layer(sheen, f"body/material/cg_mat_{form}_metal_{frame}.png", source, 0)

    for frame in range(1, 9):
        relative = f"body/cg_form_switch_{frame}.png"
        image = Image.open(OUT / relative).convert("RGBA")
        layers = material_layers(image, (frame - 1) / 7.0)
        for layer in (*static_layers, "metal"):
            save_layer(layers[layer], f"body/material/cg_mat_form_{layer}_{frame}.png", "普通形象到暴走形态的帧序列切换动画.png", frame - 1)

    payload = {
        "character": "corruptgun",
        "version": 1,
        "sourceHashes": {
            name: file_digest(src / name)
            for name in ("普通形态贴图素材.png", "暴走形态贴图.png", "普通形象到暴走形态的帧序列切换动画.png", "机身拆解细节贴图.png")
        },
        "layers": ["metal-base", "ambient-occlusion", "metal-sheen", "central-crystal", "muzzle", "side-reactors", "engine-ports", "wing-energy"],
        "blendModes": {"metal-base": "source-over", "ambient-occlusion": "multiply", "metal-sheen": "screen", "energy": "lighter"},
        "anchors": {
            "normal": {"muzzle": [0.5, 0.16], "crystal": [0.5, 0.53], "engine": [0.5, 0.82]},
            "over": {"muzzle": [0.5, 0.16], "crystal": [0.5, 0.53], "engine": [0.5, 0.82]},
        },
        "assets": {relative: manifest[relative] for relative in generated},
    }
    target = OUT / "cg_material_manifest.json"
    target.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    return payload


def make_portraits(manifest: dict[str, dict]) -> None:
    body = Image.open(OUT / "body/cg_body_normal.png").convert("RGBA")
    avatar = Image.new("RGBA", (256, 256), (0, 0, 0, 0))
    scale = min(216 / body.width, 216 / body.height)
    resized = body.resize((max(1, round(body.width * scale)), max(1, round(body.height * scale))), Image.Resampling.LANCZOS)
    avatar.alpha_composite(resized, ((256 - resized.width) // 2, (256 - resized.height) // 2))
    save_frame(despill_erode(avatar), "ui/cg_avatar.png", "普通形态贴图素材.png", 0, manifest)

    cutin = Image.new("RGBA", (720, 1080), (0, 0, 0, 0))
    scale = min(650 / body.width, 980 / body.height)
    resized = body.resize((max(1, round(body.width * scale)), max(1, round(body.height * scale))), Image.Resampling.LANCZOS)
    cutin.alpha_composite(resized, ((720 - resized.width) // 2, (1080 - resized.height) // 2))
    save_frame(despill_erode(cutin), "ui/cg_cutin.png", "普通形态贴图素材.png", 0, manifest)


def make_contact_sheet(manifest: dict[str, dict]) -> Path:
    keys = sorted(manifest)
    thumb_w, thumb_h = 176, 150
    cols = 6
    rows = math.ceil(len(keys) / cols)
    sheet = Image.new("RGB", (cols * thumb_w, rows * thumb_h), "#141418")
    draw = ImageDraw.Draw(sheet)
    font = ImageFont.load_default()
    for index, key in enumerate(keys):
        image = Image.open(OUT / key).convert("RGBA")
        scale = min(148 / max(1, image.width), 112 / max(1, image.height))
        preview = image.resize((max(1, round(image.width * scale)), max(1, round(image.height * scale))), Image.Resampling.LANCZOS)
        x = (index % cols) * thumb_w
        y = (index // cols) * thumb_h
        px = x + (thumb_w - preview.width) // 2
        py = y + 4 + (112 - preview.height) // 2
        sheet.paste(preview, (px, py), preview)
        label = key if len(key) <= 27 else "..." + key[-24:]
        draw.text((x + 5, y + 121), label, fill="#f1d9e5", font=font)
    PREVIEW.mkdir(parents=True, exist_ok=True)
    target = PREVIEW / "corruptgun_contact_sheet.png"
    sheet.save(target, optimize=True)
    return target


def main() -> None:
    src = select_source()
    OUT.mkdir(parents=True, exist_ok=True)
    for owned in ("body", "clone", "bullets", "fx", "ui", "reference"):
        target = OUT / owned
        if target.exists():
            shutil.rmtree(target)
    for owned_file in ("cg_manifest.json", "cg_material_manifest.json"):
        target = OUT / owned_file
        if target.exists():
            target.unlink()
    PREVIEW.mkdir(parents=True, exist_ok=True)

    manifest: dict[str, dict] = {}
    for spec in SHEETS:
        import_sheet(src, spec, manifest)
    import_largest_grid_cells(src, "腐化火花，短划、长划、尖刺碎光。.png", 5, 6, "cg_spark", 8, manifest)
    import_largest_grid_cells(src, "腐化能量碎片，黑红晶片状。.png", 5, 7, "cg_shard", 8, manifest)

    reference = despill_erode(Image.open(src / "机身拆解细节贴图.png").convert("RGBA"))
    save_frame(reference, "reference/cg_ref_parts.png", "机身拆解细节贴图.png", 0, manifest)
    material_payload = make_material_assets(src, manifest)
    make_portraits(manifest)

    disabled = [
        "fx/cg_death_boom_8.png", "fx/cg_death_boom_9.png", "fx/cg_death_boom_10.png",
        "fx/cg_stack_burst_7.png", "fx/cg_stack_burst_8.png",
    ]
    payload = {
        "character": "corruptgun",
        "source": str(src.relative_to(ROOT)),
        "sourceCount": EXPECTED_SOURCE_COUNT,
        "assetCount": len(manifest),
        "materialAssetCount": len(material_payload["assets"]),
        "materialManifest": "cg_material_manifest.json",
        "disabledRuntimeFrames": disabled,
        "assets": manifest,
    }
    manifest_path = OUT / "cg_manifest.json"
    manifest_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    contact_sheet = make_contact_sheet(manifest)

    report = {
        "source": str(src.relative_to(ROOT)),
        "sourceCopiesVerified": [str(p.relative_to(ROOT)) for p in SOURCE_CANDIDATES if p.is_dir() and all((p / name).is_file() for name in required_source_names())],
        "assetCount": len(manifest),
        "residualGreenAssets": {key: data["residualGreenPixels"] for key, data in manifest.items() if data["residualGreenPixels"]},
        "cloneResidualCyanAssets": {
            key: data["residualCyanPixels"]
            for key, data in manifest.items()
            if (key.startswith("clone/") or key.startswith("bullets/cg_clone_orb")) and data["residualCyanPixels"]
        },
        "disabledRuntimeFrames": disabled,
    }
    (PREVIEW / "corruptgun_asset_report.json").write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    if report["residualGreenAssets"] or report["cloneResidualCyanAssets"]:
        raise SystemExit("导入后仍检测到绿/青残留，请检查 corruptgun_asset_report.json")
    print(f"[corruptgun] source={report['source']} assets={len(manifest)} contact={contact_sheet.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
