#!/usr/bin/env python3
"""Build the Corruption Gun ultimate sprites from the prepared source sheets.

The source artwork is mirrored between the two local development folders but
never rewritten. Runtime files are normalized, despilled and split into metal
base and emissive energy atlases so the wheel keeps its authored texture.
"""

from __future__ import annotations

import hashlib
import json
import math
import shutil
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable

import numpy as np
from PIL import Image, ImageDraw, ImageEnhance, ImageFilter, ImageFont
from scipy import ndimage


ROOT = Path(__file__).resolve().parents[1]
DEV_SUBDIR = Path("大招 炼狱影刃 开发文件夹")
ROOT_DEV = ROOT / "7号战机 开发文件夹_副本" / DEV_SUBDIR
MAIN_DEV = ROOT / "moon-bullet-main/7号战机 开发文件夹" / DEV_SUBDIR
PHASE2_SUBDIR = Path("大招二段开发文件夹")
ROOT_PHASE2_DEV = ROOT_DEV / PHASE2_SUBDIR
MAIN_PHASE2_DEV = MAIN_DEV / PHASE2_SUBDIR
OUT = ROOT / "assets/player/corrupt_gun/ult"
PREVIEW = ROOT / "tools/corruptgun_ultimate_assets_preview"
ALPHA_THRESHOLD = 8
EDGE_ALPHA_FLOOR = 2

REQUIRED_FILES = (
    "光球细节.png",
    "光球 飞行轨迹 刀刃.png",
    "光球飞行轨迹.png",
    "光球破碎细节.png",
    "影刃漩涡形成.png",
    "漩涡形成细节.png",
    "影刃漩涡旋转.png",
    "影刃漩涡细节.png",
    "合集素材 光球 漩涡 影刃 特效.png",
    "概念图一览.png",
    "大招_暗蚀轮回_实现文档V1.md",
)

PHASE2_REQUIRED_FILES = (
    "幽魂从爆炸中心爬出.png",
    "幽魂飞行寻敌.png",
    "游魂形象.png",
    "游魂爆炸素材.png",
    "黑洞爆炸过渡特效.png",
)


@dataclass(frozen=True)
class SequenceSpec:
    name: str
    frames: tuple[Image.Image, ...]
    cols: int
    rows: int
    cell: tuple[int, int]
    anchor: str = "center"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def ensure_mirrored_files(first: Path, second: Path, names: Iterable[str], label: str) -> None:
    first.mkdir(parents=True, exist_ok=True)
    second.mkdir(parents=True, exist_ok=True)
    missing: list[str] = []
    mismatched: list[str] = []
    for name in names:
        first_file = first / name
        second_file = second / name
        if first_file.is_file() and second_file.is_file():
            if sha256(first_file) != sha256(second_file):
                mismatched.append(name)
            continue
        if first_file.is_file():
            shutil.copy2(first_file, second_file)
        elif second_file.is_file():
            shutil.copy2(second_file, first_file)
        else:
            missing.append(name)
    if missing:
        raise SystemExit(f"{label}缺失：\n" + "\n".join(missing))
    if mismatched:
        raise SystemExit(f"两份{label}哈希不一致，停止处理：" + ", ".join(mismatched))


def ensure_source_copies() -> tuple[Path, Path, Path, Path]:
    if not MAIN_DEV.is_dir() and not ROOT_DEV.is_dir():
        raise SystemExit("找不到大招开发文件夹")
    if not ROOT_DEV.is_dir():
        shutil.copytree(MAIN_DEV, ROOT_DEV)
    if not MAIN_DEV.is_dir():
        shutil.copytree(ROOT_DEV, MAIN_DEV)

    # The main-folder guide contains the user's newer V1.4 notes while the
    # historical copy still has V1.1. Neither document drives pixel output, so
    # preserve both instead of overwriting a current user edit.
    ensure_mirrored_files(ROOT_DEV, MAIN_DEV, REQUIRED_FILES[:-1], "大招素材")
    for folder in (ROOT_DEV, MAIN_DEV):
        if not (folder / REQUIRED_FILES[-1]).is_file():
            raise SystemExit(f"大招开发文档缺失：{folder.relative_to(ROOT) / REQUIRED_FILES[-1]}")
    ensure_mirrored_files(ROOT_PHASE2_DEV, MAIN_PHASE2_DEV, PHASE2_REQUIRED_FILES, "大招二段素材")
    return ROOT_DEV, MAIN_DEV, ROOT_PHASE2_DEV, MAIN_PHASE2_DEV


def grid_cells(image: Image.Image, rows: int, cols: int) -> list[Image.Image]:
    xs = np.rint(np.linspace(0, image.width, cols + 1)).astype(int)
    ys = np.rint(np.linspace(0, image.height, rows + 1)).astype(int)
    result: list[Image.Image] = []
    for row in range(rows):
        for col in range(cols):
            left, right = xs[col], xs[col + 1]
            top, bottom = ys[row], ys[row + 1]
            result.append(image.crop((left + 2, top + 2, right - 2, bottom - 2)))
    return result


def row_group_cells(image: Image.Image, counts: Iterable[int]) -> list[list[Image.Image]]:
    counts = tuple(counts)
    ys = np.rint(np.linspace(0, image.height, len(counts) + 1)).astype(int)
    rows: list[list[Image.Image]] = []
    for row, count in enumerate(counts):
        strip = image.crop((0, ys[row] + 2, image.width, ys[row + 1] - 2))
        rows.append(expected_horizontal_clusters(strip, count))
    return rows


def expected_horizontal_clusters(image: Image.Image, expected: int) -> list[Image.Image]:
    """Extract one authored sprite per horizontal slot without cutting its glow."""
    cleaned = clean_palette(image)
    alpha = np.asarray(cleaned.getchannel("A"))
    mask = alpha > ALPHA_THRESHOLD
    labels, count = ndimage.label(mask)
    objects = ndimage.find_objects(labels)
    components: list[dict] = []
    for label_index, obj in enumerate(objects, 1):
        if obj is None:
            continue
        ys, xs = obj
        area = int(np.count_nonzero(labels[ys, xs] == label_index))
        width, height = xs.stop - xs.start, ys.stop - ys.start
        if area < 18 or width < 3 or height < 3:
            continue
        components.append({
            "label": label_index,
            "area": area,
            "cx": (xs.start + xs.stop) * 0.5,
            "bbox": (xs.start, ys.start, xs.stop, ys.stop),
        })

    min_sep = image.width / max(3.2, expected * 1.72)
    anchors: list[dict] = []
    for component in sorted(components, key=lambda item: item["area"], reverse=True):
        if all(abs(component["cx"] - anchor["cx"]) >= min_sep for anchor in anchors):
            anchors.append(component)
        if len(anchors) == expected:
            break
    if len(anchors) != expected:
        return grid_cells(image, 1, expected)

    anchors.sort(key=lambda item: item["cx"])
    groups: list[list[dict]] = [[] for _ in anchors]
    for component in components:
        nearest = min(range(len(anchors)), key=lambda index: abs(component["cx"] - anchors[index]["cx"]))
        max_attach = image.width / max(2.2, expected * 2.0)
        if abs(component["cx"] - anchors[nearest]["cx"]) <= max_attach:
            groups[nearest].append(component)

    crops: list[Image.Image] = []
    for anchor, group in zip(anchors, groups):
        if not group:
            group = [anchor]
        left = min(item["bbox"][0] for item in group)
        top = min(item["bbox"][1] for item in group)
        right = max(item["bbox"][2] for item in group)
        bottom = max(item["bbox"][3] for item in group)
        pad = 8
        crops.append(cleaned.crop((
            max(0, left - pad), max(0, top - pad),
            min(cleaned.width, right + pad), min(cleaned.height, bottom + pad),
        )))
    return crops


def spill_masks(r: np.ndarray, g: np.ndarray, b: np.ndarray, a: np.ndarray) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    """Find green/cyan hues, including low-alpha matte pixels that become visible after scaling."""
    visible = a > 0
    maximum = np.maximum.reduce([r, g, b])
    minimum = np.minimum.reduce([r, g, b])
    chroma = maximum - minimum
    saturation = np.divide(chroma, np.maximum(maximum, 1), out=np.zeros_like(chroma), where=maximum > 0)
    hue = np.zeros_like(maximum)
    valid = chroma > 0.001
    red_max = valid & (maximum == r)
    green_max = valid & (maximum == g)
    blue_max = valid & (maximum == b)
    hue[red_max] = np.mod((g[red_max] - b[red_max]) / chroma[red_max], 6.0)
    hue[green_max] = (b[green_max] - r[green_max]) / chroma[green_max] + 2.0
    hue[blue_max] = (r[blue_max] - g[blue_max]) / chroma[blue_max] + 4.0
    hue *= 60.0
    hue = np.mod(hue, 360.0)
    green_hue = visible & (maximum > 10) & (saturation > 0.10) & (hue >= 43) & (hue <= 168)
    cyan_hue = visible & (maximum > 10) & (saturation > 0.10) & (hue > 168) & (hue <= 205)
    return green_hue, cyan_hue, saturation


def clean_palette(image: Image.Image) -> Image.Image:
    px = np.asarray(image.convert("RGBA"), dtype=np.float32).copy()
    r, g, b, a = (px[:, :, index] for index in range(4))
    visible = a > 0
    if not np.any(visible):
        return Image.fromarray(px.astype(np.uint8), "RGBA")

    max_rb = np.maximum(r, b)
    green_dom = g - max_rb
    cyan_dom = np.minimum(g, b) - r
    green_hue, cyan_hue, saturation = spill_masks(r, g, b, a)
    # The source sheets use a thick neon-green key matte. Treat strong key
    # pixels as transparency everywhere, not merely on the outermost 3px;
    # recolouring that matte produced the old jagged red/green sticker rim.
    key_green = green_hue & (saturation > 0.38) & (g > np.maximum(r, b) * 1.08) & (g > 28)
    key_cyan = cyan_hue & (saturation > 0.42) & (np.minimum(g, b) > r * 1.10) & (np.maximum(g, b) > 32)
    a[key_green | key_cyan] = 0
    visible = a > 0
    contaminated = visible & ((green_dom > 2) | (cyan_dom > 5) | green_hue | cyan_hue)

    edge = visible & ~ndimage.binary_erosion(visible, iterations=3, border_value=0)
    strong_spill = contaminated & edge & ((green_dom > 14) | (cyan_dom > 20) | (saturation > 0.34))
    fade = np.clip(1.0 - np.maximum(green_dom, cyan_dom) / 76.0, 0.0, 1.0)
    a[strong_spill] *= fade[strong_spill]

    energy = np.maximum.reduce([r, g, b])
    r[contaminated] = np.maximum(r[contaminated], energy[contaminated] * 0.70)
    g[contaminated] = np.minimum(g[contaminated], r[contaminated] * 0.16)
    b[contaminated] = np.clip(
        np.maximum(b[contaminated] * 0.42, r[contaminated] * 0.18),
        0,
        r[contaminated] * 0.56,
    )

    a[a <= EDGE_ALPHA_FLOOR] = 0
    solid = a > 0
    if np.any(solid):
        eroded = ndimage.binary_erosion(solid, iterations=1, border_value=0)
        a[solid & ~eroded] = 0
        a = ndimage.gaussian_filter(a, sigma=0.55)
        a[a <= EDGE_ALPHA_FLOOR] = 0

    # Final hard guarantee: no green/cyan dominant visible pixels survive.
    visible = a > 0
    max_rb = np.maximum(r, b)
    g[visible] = np.minimum(g[visible], max_rb[visible])
    cyan = visible & (g > r + 5) & (b > r + 5)
    r[cyan] = np.maximum(r[cyan], np.maximum(g[cyan], b[cyan]) * 0.72)
    g[cyan] = np.minimum(g[cyan], r[cyan] * 0.18)
    b[cyan] = np.minimum(b[cyan], r[cyan] * 0.52)

    px[:, :, 0] = r
    px[:, :, 1] = g
    px[:, :, 2] = b
    px[:, :, 3] = a
    px = np.clip(px, 0, 255).astype(np.uint8)
    px[px[:, :, 3] == 0, :3] = 0
    return Image.fromarray(px, "RGBA")


def clean_phase2_palette(image: Image.Image) -> Image.Image:
    """Turn the phase-two green key/energy into dark crimson-violet energy.

    These five sheets use green both as a generated rim and as inner flame.
    Removing every green pixel destroys the authored wisps, so the phase-two
    path recolours it before applying the same one-pixel edge contraction.
    """
    px = np.asarray(image.convert("RGBA"), dtype=np.float32).copy()
    r, g, b, a = (px[:, :, index] for index in range(4))
    a[a <= EDGE_ALPHA_FLOOR] = 0
    green, cyan, saturation = spill_masks(r, g, b, a)
    contaminated = green | cyan
    if np.any(contaminated):
        energy = np.maximum.reduce([r, g, b])
        # Keep black volume while converting the green flame into a controlled
        # red-violet rim. The green channel is deliberately bounded below the
        # final hue audit threshold.
        r[contaminated] = np.maximum(r[contaminated], energy[contaminated] * 0.72)
        g[contaminated] = np.minimum(g[contaminated] * 0.10, r[contaminated] * 0.10)
        b[contaminated] = np.minimum(
            np.maximum(b[contaminated] * 0.42, r[contaminated] * (0.30 + saturation[contaminated] * 0.12)),
            r[contaminated] * 0.62,
        )
        hard_key = contaminated & (saturation > 0.50)
        a[hard_key] *= 0.84

    solid = a > EDGE_ALPHA_FLOOR
    if np.any(solid):
        eroded = ndimage.binary_erosion(solid, iterations=1, border_value=0)
        a[solid & ~eroded] = 0
        a = ndimage.gaussian_filter(a, sigma=0.55)
        a[a <= EDGE_ALPHA_FLOOR] = 0

    visible = a > 0
    g[visible] = np.minimum(g[visible], np.maximum(r[visible], b[visible]))
    px[:, :, 0] = r
    px[:, :, 1] = g
    px[:, :, 2] = b
    px[:, :, 3] = a
    px = np.clip(px, 0, 255).astype(np.uint8)
    px[px[:, :, 3] == 0, :3] = 0
    return final_palette_guard(Image.fromarray(px, "RGBA"))


def remove_sheet_guides(image: Image.Image) -> Image.Image:
    """Remove only border/grid guide components without touching sprite wisps."""
    px = np.asarray(image.convert("RGBA")).copy()
    alpha = px[:, :, 3].copy()
    alpha[:6, :] = 0
    alpha[-6:, :] = 0
    alpha[:, :6] = 0
    alpha[:, -6:] = 0
    labels, count = ndimage.label(alpha > ALPHA_THRESHOLD)
    for label_index, obj in enumerate(ndimage.find_objects(labels), 1):
        if obj is None:
            continue
        ys, xs = obj
        width, height = xs.stop - xs.start, ys.stop - ys.start
        if min(width, height) <= 2 and max(width, height) >= 80:
            alpha[labels == label_index] = 0
    px[:, :, 3] = alpha
    px[alpha == 0, :3] = 0
    return Image.fromarray(px, "RGBA")


def phase2_component_frames(image: Image.Image, row_counts: Iterable[int]) -> list[Image.Image]:
    """Extract irregular authored sprites by connected body, not fragile grid cuts."""
    row_counts = tuple(row_counts)
    expected = sum(row_counts)
    cleaned = remove_sheet_guides(clean_phase2_palette(image))
    px = np.asarray(cleaned.convert("RGBA")).copy()
    alpha_mask = px[:, :, 3] > ALPHA_THRESHOLD
    labels, count = ndimage.label(alpha_mask)
    objects = ndimage.find_objects(labels)
    components: list[dict] = []
    for label_index, obj in enumerate(objects, 1):
        if obj is None:
            continue
        ys, xs = obj
        area = int(np.count_nonzero(labels[ys, xs] == label_index))
        if area < 12:
            continue
        components.append({
            "label": label_index,
            "area": area,
            "bbox": (xs.start, ys.start, xs.stop, ys.stop),
            "cx": (xs.start + xs.stop) * 0.5,
            "cy": (ys.start + ys.stop) * 0.5,
        })
    main = sorted(components, key=lambda item: item["area"], reverse=True)[:expected]
    if len(main) != expected:
        raise RuntimeError(f"二段素材应有 {expected} 个主体，实际仅识别 {len(main)} 个")

    ordered: list[dict] = []
    by_y = sorted(main, key=lambda item: item["cy"])
    offset = 0
    for count_in_row in row_counts:
        row = sorted(by_y[offset : offset + count_in_row], key=lambda item: item["cx"])
        ordered.extend(row)
        offset += count_in_row

    main_labels = {item["label"] for item in main}
    assignments: dict[int, list[int]] = {item["label"]: [item["label"]] for item in main}

    def bbox_distance(component: dict, target: dict) -> float:
        left, top, right, bottom = target["bbox"]
        dx = max(left - component["cx"], 0, component["cx"] - right)
        dy = max(top - component["cy"], 0, component["cy"] - bottom)
        return math.hypot(dx, dy)

    # Reattach nearby authored shards/ashes once. Large bodies remain isolated,
    # which also makes overlapping rows in the source sheet safe to extract.
    for component in components:
        if component["label"] in main_labels:
            continue
        nearest = min(main, key=lambda item: bbox_distance(component, item))
        if bbox_distance(component, nearest) <= 72:
            assignments[nearest["label"]].append(component["label"])

    frames: list[Image.Image] = []
    for item in ordered:
        selected = np.isin(labels, assignments[item["label"]])
        ys, xs = np.where(selected)
        if len(xs) == 0:
            raise RuntimeError("二段素材主体提取为空")
        left, right = max(0, int(xs.min()) - 3), min(cleaned.width, int(xs.max()) + 4)
        top, bottom = max(0, int(ys.min()) - 3), min(cleaned.height, int(ys.max()) + 4)
        isolated = px[top:bottom, left:right].copy()
        local_mask = selected[top:bottom, left:right]
        isolated[~local_mask, 3] = 0
        isolated[isolated[:, :, 3] == 0, :3] = 0
        frames.append(Image.fromarray(isolated, "RGBA"))
    return frames


def content_bbox(image: Image.Image) -> tuple[int, int, int, int]:
    alpha = np.asarray(image.getchannel("A"))
    ys, xs = np.where(alpha > ALPHA_THRESHOLD)
    if len(xs) == 0:
        return (0, 0, image.width, image.height)
    return (int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1)


def normalize_group(
    frames: Iterable[Image.Image],
    cell: tuple[int, int],
    anchor: str = "center",
    padding: int = 22,
    cleaner=clean_palette,
) -> tuple[Image.Image, ...]:
    cleaned = tuple(cleaner(frame) for frame in frames)
    bounds = tuple(content_bbox(frame) for frame in cleaned)
    max_w = max(right - left for left, _, right, _ in bounds)
    max_h = max(bottom - top for _, top, _, bottom in bounds)
    scale = min(
        (cell[0] - padding * 2) / max(1, max_w),
        (cell[1] - padding * 2) / max(1, max_h),
    )
    normalized: list[Image.Image] = []
    for frame, bounds_for_frame in zip(cleaned, bounds):
        cropped = frame.crop(bounds_for_frame)
        size = (
            max(1, round(cropped.width * scale)),
            max(1, round(cropped.height * scale)),
        )
        cropped = cropped.resize(size, Image.Resampling.LANCZOS)
        canvas = Image.new("RGBA", cell, (0, 0, 0, 0))
        if anchor == "right":
            x = cell[0] - padding - cropped.width
        else:
            x = (cell[0] - cropped.width) // 2
        if anchor == "bottom":
            y = cell[1] - padding - cropped.height
        else:
            y = (cell[1] - cropped.height) // 2
        canvas.alpha_composite(cropped, (x, y))
        normalized.append(canvas)
    return tuple(normalized)


def energy_layer(image: Image.Image) -> Image.Image:
    px = np.asarray(image.convert("RGBA"), dtype=np.float32)
    r, g, b, alpha = (px[:, :, index] for index in range(4))
    brightness = np.maximum.reduce([r, g, b]) / 255.0
    redness = np.clip((r - g * 0.55 - b * 0.18) / 210.0, 0, 1)
    # Keep only authored cracks and hot edges. A broad mask makes the full metal
    # wheel bloom and is the main reason the old 660px runtime draw looked soft.
    score = np.clip(brightness * 0.24 + redness * 1.08 - 0.27, 0, 1)
    mask = alpha * np.power(score, 1.48)
    out = np.zeros_like(px)
    out[:, :, 0] = np.maximum(r, brightness * 235)
    out[:, :, 1] = np.minimum(np.maximum(g, brightness * 24), out[:, :, 0] * 0.28)
    out[:, :, 2] = np.minimum(np.maximum(b, brightness * 72), out[:, :, 0] * 0.65)
    out[:, :, 3] = mask
    sharp = Image.fromarray(np.clip(out, 0, 255).astype(np.uint8), "RGBA")
    blurred = sharp.filter(ImageFilter.GaussianBlur(0.55))
    result = Image.alpha_composite(blurred, sharp)
    result_px = np.asarray(result).copy()
    result_px[result_px[:, :, 3] == 0, :3] = 0
    return Image.fromarray(result_px, "RGBA")


def pack_atlas(frames: Iterable[Image.Image], cols: int, rows: int) -> Image.Image:
    frames = tuple(frames)
    if len(frames) > cols * rows:
        raise ValueError("Atlas grid is too small")
    cell_w = max(frame.width for frame in frames)
    cell_h = max(frame.height for frame in frames)
    atlas = Image.new("RGBA", (cell_w * cols, cell_h * rows), (0, 0, 0, 0))
    for index, frame in enumerate(frames):
        x = (index % cols) * cell_w + (cell_w - frame.width) // 2
        y = (index // cols) * cell_h + (cell_h - frame.height) // 2
        atlas.alpha_composite(frame, (x, y))
    return atlas


def residual_counts(image: Image.Image) -> tuple[int, int]:
    px = np.asarray(image.convert("RGBA"), dtype=np.int16)
    r, g, b, a = (px[:, :, index] for index in range(4))
    green, cyan, _ = spill_masks(r.astype(np.float32), g.astype(np.float32), b.astype(np.float32), a.astype(np.float32))
    return int(green.sum()), int(cyan.sum())


def final_palette_guard(image: Image.Image) -> Image.Image:
    """Remove tiny chroma values reintroduced by Lanczos interpolation."""
    px = np.asarray(image.convert("RGBA"), dtype=np.float32).copy()
    r, g, b, a = (px[:, :, index] for index in range(4))
    a[a <= EDGE_ALPHA_FLOOR] = 0
    green, cyan, _ = spill_masks(r, g, b, a)
    contaminated = green | cyan
    if np.any(contaminated):
        energy = np.maximum.reduce([r, g, b])
        r[contaminated] = np.maximum(r[contaminated], energy[contaminated] * 0.74)
        g[contaminated] = np.minimum(g[contaminated], r[contaminated] * 0.16)
        b[contaminated] = np.minimum(
            np.maximum(b[contaminated] * 0.46, r[contaminated] * 0.18),
            r[contaminated] * 0.54,
        )
    visible = a > 0
    g[visible] = np.minimum(g[visible], np.maximum(r[visible], b[visible]))
    px[:, :, 0] = r
    px[:, :, 1] = g
    px[:, :, 2] = b
    px[:, :, 3] = a
    px = np.clip(px, 0, 255).astype(np.uint8)
    px[px[:, :, 3] == 0, :3] = 0
    return Image.fromarray(px, "RGBA")


def keep_wheel_body(image: Image.Image) -> Image.Image:
    """Remove detached chroma-key crumbs while preserving the authored wheel silhouette."""
    px = np.asarray(image.convert("RGBA")).copy()
    alpha = px[:, :, 3]
    labels, count = ndimage.label(alpha > EDGE_ALPHA_FLOOR)
    if count <= 1:
        return image
    sizes = np.bincount(labels.ravel())
    keep_labels = np.where(sizes >= max(72, int(sizes[1:].max() * 0.0025)))[0]
    keep = np.isin(labels, keep_labels) & (labels != 0)
    alpha[~keep] = 0
    px[:, :, 3] = alpha
    px[alpha == 0, :3] = 0
    return Image.fromarray(px, "RGBA")


def build_wheel_master(frame: Image.Image) -> tuple[Image.Image, Image.Image, Image.Image]:
    """Build a single high-resolution, registered wheel for the eight-second spin phase."""
    base = normalize_group((frame,), (768, 768), padding=48)[0]
    base = keep_wheel_body(final_palette_guard(base))
    alpha = base.getchannel("A")
    rgb = base.convert("RGB")
    rgb = ImageEnhance.Contrast(rgb).enhance(1.10)
    rgb = rgb.filter(ImageFilter.UnsharpMask(radius=1.15, percent=185, threshold=3))
    rgb = ImageEnhance.Sharpness(rgb).enhance(1.20)
    base = Image.merge("RGBA", (*rgb.split(), alpha))
    base = final_palette_guard(base)

    energy = final_palette_guard(energy_layer(base))
    px = np.asarray(base.convert("RGBA"), dtype=np.float32)
    r, g, b, a = (px[:, :, index] for index in range(4))
    luminance = r * 0.30 + g * 0.59 + b * 0.11
    gx = ndimage.sobel(luminance, axis=1)
    gy = ndimage.sobel(luminance, axis=0)
    edge = np.hypot(gx, gy)
    scale = max(1.0, float(np.percentile(edge[a > 12], 97.5))) if np.any(a > 12) else 1.0
    edge = np.clip(edge / scale, 0, 1)
    interior = ndimage.binary_erosion(a > 8, iterations=1, border_value=0)
    perimeter = (a > 8) & ~ndimage.binary_erosion(a > 8, iterations=3, border_value=0)
    detail_alpha = np.clip(edge * 168 + perimeter.astype(np.float32) * 92, 0, 210)
    detail_alpha *= interior.astype(np.float32) * np.clip(a / 255.0, 0, 1)
    detail = np.zeros_like(px)
    detail[:, :, 0] = 248
    detail[:, :, 1] = 18
    detail[:, :, 2] = 62
    detail[:, :, 3] = detail_alpha
    detail = final_palette_guard(Image.fromarray(np.clip(detail, 0, 255).astype(np.uint8), "RGBA"))
    return base, energy, detail


def save_asset(image: Image.Image, relative: str, records: dict[str, dict]) -> Path:
    image = final_palette_guard(image)
    target = OUT / relative
    target.parent.mkdir(parents=True, exist_ok=True)
    image.save(target, optimize=True)
    green, cyan = residual_counts(image)
    records[relative] = {
        "width": image.width,
        "height": image.height,
        "sha256": sha256(target),
        "alphaBounds": list(content_bbox(image)),
        "residualGreenPixels": green,
        "residualCyanPixels": cyan,
    }
    return target


def audit_existing_asset(path: Path, records: dict[str, dict], preserved: bool = False) -> None:
    image = Image.open(path).convert("RGBA")
    relative = path.relative_to(OUT).as_posix()
    green, cyan = residual_counts(image)
    records[relative] = {
        "width": image.width,
        "height": image.height,
        "sha256": sha256(path),
        "alphaBounds": list(content_bbox(image)),
        "residualGreenPixels": green,
        "residualCyanPixels": cyan,
        "preservedUnmodified": preserved,
    }


def tree_hashes(folder: Path) -> dict[str, str]:
    if not folder.is_dir():
        return {}
    return {
        path.relative_to(folder).as_posix(): sha256(path)
        for path in sorted(folder.rglob("*"))
        if path.is_file()
    }


def prepare_output() -> dict[str, str]:
    """Clear generator-owned outputs while preserving the user's opt pass byte-for-byte."""
    protected = OUT / "opt"
    before = tree_hashes(protected)
    if len(before) != 30:
        raise RuntimeError(f"ult/opt 应保留30件素材，当前为 {len(before)}")
    OUT.mkdir(parents=True, exist_ok=True)
    for child in OUT.iterdir():
        if child.name == "opt":
            continue
        if child.is_dir():
            shutil.rmtree(child)
        else:
            child.unlink()
    after = tree_hashes(protected)
    if after != before:
        raise RuntimeError("ult/opt 在清理阶段发生变化，已停止")
    return before


def save_sequence(spec: SequenceSpec, records: dict[str, dict], sequences: dict[str, dict]) -> None:
    frames = normalize_group(spec.frames, spec.cell, spec.anchor)
    base = pack_atlas(frames, spec.cols, spec.rows)
    energy = pack_atlas(tuple(energy_layer(frame) for frame in frames), spec.cols, spec.rows)
    base_rel = f"atlas/cg_ult_{spec.name}_base_atlas.png"
    energy_rel = f"atlas/cg_ult_{spec.name}_energy_atlas.png"
    save_asset(base, base_rel, records)
    save_asset(energy, energy_rel, records)
    sequences[spec.name] = {
        "frames": len(frames),
        "cols": spec.cols,
        "rows": spec.rows,
        "cell": list(spec.cell),
        "anchor": spec.anchor,
        "base": base_rel,
        "energy": energy_rel,
    }


PHASE2_RUNTIME_KEYS = {
    "soul_emerge": {"base": "cgUltSoulEmergeBase", "energy": "cgUltSoulEmergeEnergy"},
    "soul_flight": {"base": "cgUltSoulFlightBase", "energy": "cgUltSoulFlightEnergy"},
    "soul_variants": {"base": "cgUltSoulVariantsBase", "energy": "cgUltSoulVariantsEnergy"},
    "soul_burst": {"base": "cgUltSoulBurstBase", "energy": "cgUltSoulBurstEnergy"},
    "soul_transition": {"base": "cgUltSoulTransitionBase", "energy": "cgUltSoulTransitionEnergy"},
}


def save_phase2_sequence(spec: SequenceSpec, records: dict[str, dict], sequences: dict[str, dict]) -> tuple[Image.Image, ...]:
    frames = normalize_group(
        spec.frames,
        spec.cell,
        spec.anchor,
        padding=30,
        cleaner=lambda image: image.convert("RGBA"),
    )
    base = pack_atlas(frames, spec.cols, spec.rows)
    energy_frames = tuple(energy_layer(frame) for frame in frames)
    energy = pack_atlas(energy_frames, spec.cols, spec.rows)
    base_rel = f"phase2/atlas/cg_ult_{spec.name}_base_atlas.png"
    energy_rel = f"phase2/atlas/cg_ult_{spec.name}_energy_atlas.png"
    save_asset(base, base_rel, records)
    save_asset(energy, energy_rel, records)
    sequences[spec.name] = {
        "frames": len(frames),
        "cols": spec.cols,
        "rows": spec.rows,
        "cell": list(spec.cell),
        "anchor": spec.anchor,
        "base": base_rel,
        "energy": energy_rel,
        "runtimeKeys": PHASE2_RUNTIME_KEYS[spec.name],
    }
    return frames


def save_phase2_transition_parts(
    frames: Iterable[Image.Image],
    records: dict[str, dict],
) -> None:
    for index, frame in enumerate(frames, 1):
        save_asset(frame, f"phase2/parts/cg_ult_soul_transition_base_{index}.png", records)
        save_asset(
            energy_layer(frame),
            f"phase2/parts/cg_ult_soul_transition_energy_{index}.png",
            records,
        )


def save_loose_group(
    frames: Iterable[Image.Image],
    prefix: str,
    cell: tuple[int, int],
    records: dict[str, dict],
) -> list[Image.Image]:
    normalized = normalize_group(frames, cell)
    for index, frame in enumerate(normalized, 1):
        save_asset(frame, f"parts/cg_ult_{prefix}_{index}.png", records)
    return list(normalized)


def extract_primary_component(image: Image.Image) -> Image.Image:
    """Keep the authored main blade while dropping neighbouring blades and loose crumbs."""
    source = image.convert("RGBA")
    alpha = np.asarray(source.getchannel("A"), dtype=np.uint8)
    labels, count = ndimage.label(alpha > ALPHA_THRESHOLD)
    if count <= 0:
        raise RuntimeError("无法从优化素材提取独立刀刃")
    areas = np.bincount(labels.ravel())
    areas[0] = 0
    primary = int(np.argmax(areas))
    keep = ndimage.binary_dilation(labels == primary, iterations=5) & (alpha > 0)
    pixels = np.asarray(source, dtype=np.uint8).copy()
    pixels[:, :, 3] = np.where(keep, pixels[:, :, 3], 0).astype(np.uint8)
    isolated = Image.fromarray(pixels, "RGBA")
    bbox = content_bbox(isolated)
    pad = 12
    return isolated.crop((
        max(0, bbox[0] - pad),
        max(0, bbox[1] - pad),
        min(isolated.width, bbox[2] + pad),
        min(isolated.height, bbox[3] + pad),
    ))


def normalize_harvester_blade(image: Image.Image) -> Image.Image:
    """Orient every blade toward local +X and place it on a stable 2:1 canvas."""
    isolated = extract_primary_component(image)
    rotated = isolated.rotate(-45, resample=Image.Resampling.BICUBIC, expand=True)
    bbox = content_bbox(rotated)
    rotated = rotated.crop(bbox)
    rotated.thumbnail((336, 144), Image.Resampling.LANCZOS)
    canvas = Image.new("RGBA", (384, 192), (0, 0, 0, 0))
    canvas.alpha_composite(rotated, ((canvas.width - rotated.width) // 2, (canvas.height - rotated.height) // 2))
    return canvas


def harvester_base_layer(image: Image.Image) -> Image.Image:
    """Retain black-steel texture while leaving the brightest fissures to the energy layer."""
    pixels = np.asarray(image.convert("RGBA"), dtype=np.float32).copy()
    alpha = pixels[:, :, 3]
    visible = alpha > 0
    rgb = pixels[:, :, :3]
    luminance = rgb[:, :, 0] * 0.299 + rgb[:, :, 1] * 0.587 + rgb[:, :, 2] * 0.114
    emissive = visible & (rgb[:, :, 0] > rgb[:, :, 1] * 1.35) & (rgb[:, :, 0] > 96) & (luminance > 48)
    rgb[visible] *= 0.78
    rgb[emissive] *= 0.72
    pixels[:, :, :3] = np.clip(rgb, 0, 255)
    return Image.fromarray(pixels.astype(np.uint8), "RGBA")


def save_harvester_blades(records: dict[str, dict]) -> None:
    """Derive clean single-blade layers without modifying the protected ult/opt files."""
    sources = ("cg_ult_scythe_4.png", "cg_ult_scythe_5.png", "cg_ult_scythe_7.png")
    for index, name in enumerate(sources, 1):
        source_path = OUT / "opt" / name
        normalized = normalize_harvester_blade(Image.open(source_path).convert("RGBA"))
        # The spear source is authored tip-left; normalize it so every runtime
        # blade leads the positive local X direction used by the moving edge.
        if index == 3:
            normalized = normalized.transpose(Image.Transpose.FLIP_LEFT_RIGHT)
        base_rel = f"parts/cg_ult_harvester_base_{index}.png"
        energy_rel = f"parts/cg_ult_harvester_energy_{index}.png"
        save_asset(harvester_base_layer(normalized), base_rel, records)
        save_asset(energy_layer(normalized), energy_rel, records)
        for relative in (base_rel, energy_rel):
            records[relative]["derivedFrom"] = f"opt/{name}"
            records[relative]["sourceSha256"] = sha256(source_path)
            records[relative]["orientation"] = "tip-local-positive-x"


def build_slow_mark(rune: Image.Image, ring: Image.Image) -> Image.Image:
    canvas = Image.new("RGBA", (96, 96), (0, 0, 0, 0))
    for source, size, alpha in ((ring, 84, 190), (rune, 48, 235)):
        fitted = source.copy()
        fitted.thumbnail((size, size), Image.Resampling.LANCZOS)
        layer = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
        layer.alpha_composite(fitted, ((96 - fitted.width) // 2, (96 - fitted.height) // 2))
        px = np.asarray(layer, dtype=np.uint8).copy()
        mask = px[:, :, 3].astype(np.float32) * (alpha / 255.0)
        px[:, :, 0] = np.maximum(px[:, :, 0], 126)
        px[:, :, 1] = np.minimum(px[:, :, 1], 16)
        px[:, :, 2] = np.minimum(np.maximum(px[:, :, 2], 44), 92)
        px[:, :, 3] = np.clip(mask, 0, 255).astype(np.uint8)
        canvas = Image.alpha_composite(canvas, Image.fromarray(px, "RGBA"))
    return canvas


def build_icon(wheel: Image.Image, energy: Image.Image) -> Image.Image:
    canvas = Image.new("RGBA", (160, 160), (0, 0, 0, 0))
    draw = ImageDraw.Draw(canvas)
    draw.ellipse((8, 8, 152, 152), fill=(3, 0, 8, 244), outline=(109, 8, 35, 255), width=4)
    for source, size, alpha in ((wheel, 142, 245), (energy, 148, 155)):
        fitted = source.copy()
        fitted.thumbnail((size, size), Image.Resampling.LANCZOS)
        if alpha != 255:
            fitted.putalpha(fitted.getchannel("A").point(lambda value: value * alpha // 255))
        canvas.alpha_composite(fitted, ((160 - fitted.width) // 2, (160 - fitted.height) // 2))
    return canvas


def make_contact_sheet(
    records: dict[str, dict],
    keys: Iterable[str] | None = None,
    filename: str = "corruptgun_ultimate_contact_sheet.png",
) -> Path:
    keys = sorted(keys if keys is not None else records)
    cols, thumb_w, thumb_h = 5, 224, 186
    rows = math.ceil(len(keys) / cols)
    sheet = Image.new("RGB", (cols * thumb_w, rows * thumb_h), "#100d12")
    draw = ImageDraw.Draw(sheet)
    font = ImageFont.load_default()
    for index, key in enumerate(keys):
        image = Image.open(OUT / key).convert("RGBA")
        image.thumbnail((196, 142), Image.Resampling.LANCZOS)
        x = (index % cols) * thumb_w
        y = (index // cols) * thumb_h
        sheet.paste(image, (x + (thumb_w - image.width) // 2, y + 4 + (142 - image.height) // 2), image)
        label = key if len(key) < 34 else "..." + key[-31:]
        draw.text((x + 6, y + 151), label, fill="#f6c8d6", font=font)
    PREVIEW.mkdir(parents=True, exist_ok=True)
    target = PREVIEW / filename
    sheet.save(target, optimize=True)
    return target


def main() -> None:
    root_source, main_source, root_phase2, main_phase2 = ensure_source_copies()
    opt_hashes_before = prepare_output()
    PREVIEW.mkdir(parents=True, exist_ok=True)

    def open_sheet(name: str) -> Image.Image:
        return Image.open(root_source / name).convert("RGBA")

    def open_phase2_sheet(name: str) -> Image.Image:
        return Image.open(root_phase2 / name).convert("RGBA")

    records: dict[str, dict] = {}
    sequences: dict[str, dict] = {}

    orb_stage = grid_cells(open_sheet("光球细节.png"), 2, 3)
    grouped = row_group_cells(open_sheet("光球 飞行轨迹 刀刃.png"), (6, 5, 4, 3))
    orb_roll, orb_dart, blades, swirls = grouped
    comet = grid_cells(open_sheet("光球飞行轨迹.png"), 6, 1)
    shatter = grid_cells(open_sheet("光球破碎细节.png"), 2, 4)
    form = grid_cells(open_sheet("影刃漩涡形成.png"), 2, 4)
    form_b = grid_cells(open_sheet("漩涡形成细节.png"), 2, 4)
    wheel_sheet = open_sheet("影刃漩涡旋转.png")
    wheel_grid = grid_cells(wheel_sheet, 3, 3)
    wheel = wheel_grid[:8]
    wheel_inner = grid_cells(open_sheet("影刃漩涡细节.png"), 2, 4)

    save_sequence(SequenceSpec("orb_stage", tuple(orb_stage), 3, 2, (512, 512)), records, sequences)
    save_sequence(SequenceSpec("orb_roll", tuple(orb_roll), 3, 2, (512, 512)), records, sequences)
    save_sequence(SequenceSpec("orb_dart", tuple(orb_dart), 5, 1, (384, 256), "right"), records, sequences)
    save_sequence(SequenceSpec("comet", tuple(comet), 2, 3, (768, 256), "right"), records, sequences)
    save_sequence(SequenceSpec("shatter", tuple(shatter), 4, 2, (512, 512)), records, sequences)
    save_sequence(SequenceSpec("form", tuple(form), 4, 2, (512, 512)), records, sequences)
    save_sequence(SequenceSpec("form_b", tuple(form_b), 4, 2, (512, 512)), records, sequences)
    save_sequence(SequenceSpec("wheel", tuple(wheel), 4, 2, (512, 512)), records, sequences)
    save_sequence(SequenceSpec("wheel_inner", tuple(wheel_inner), 4, 2, (512, 512)), records, sequences)

    wheel_master_base, wheel_master_energy, wheel_master_detail = build_wheel_master(wheel[2])
    save_asset(wheel_master_base, "steady/cg_ult_wheel_steady_base.png", records)
    save_asset(wheel_master_energy, "steady/cg_ult_wheel_steady_energy.png", records)
    save_asset(wheel_master_detail, "steady/cg_ult_wheel_steady_detail.png", records)
    save_harvester_blades(records)

    blade_frames = save_loose_group(blades, "blade_a", (192, 192), records)
    save_loose_group(swirls, "swirl", (224, 224), records)

    residual = wheel_grid[8]
    residual_w, residual_h = residual.size
    dart_band = residual.crop((0, 0, residual_w, round(residual_h * 0.54)))
    ring_band = residual.crop((0, round(residual_h * 0.46), residual_w, residual_h))
    dart_frames = grid_cells(dart_band, 2, 2)
    ring_frames = expected_horizontal_clusters(ring_band, 3)
    save_loose_group(dart_frames, "dart_s", (160, 160), records)
    ring_norm = save_loose_group(ring_frames, "ring_thin", (192, 192), records)

    bundle = open_sheet("合集素材 光球 漩涡 影刃 特效.png")
    bw, bh = bundle.size
    crescent_band = bundle.crop((0, round(bh * 0.575), bw, round(bh * 0.755)))
    vortex_band = bundle.crop((0, round(bh * 0.755), bw, round(bh * 0.895)))
    rune_band = bundle.crop((round(bw * 0.39), round(bh * 0.885), bw, bh))
    crescents = expected_horizontal_clusters(crescent_band, 8)
    vortices = expected_horizontal_clusters(vortex_band, 5)[:4]
    runes = grid_cells(rune_band, 1, 6)
    save_loose_group(crescents, "crescent", (176, 176), records)
    save_loose_group(vortices, "vortex_s", (224, 160), records)
    rune_norm = save_loose_group(runes, "rune", (128, 128), records)

    wheel_frames = normalize_group(wheel, (512, 512))
    icon = build_icon(wheel_frames[2], energy_layer(wheel_frames[2]))
    slow_mark = build_slow_mark(rune_norm[2], ring_norm[1])
    save_asset(icon, "ui/cg_ult_icon.png", records)
    save_asset(slow_mark, "ui/cg_ult_slow_mark.png", records)

    concept_target = OUT / "reference/cg_ult_concept.png"
    concept_target.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(root_source / "概念图一览.png", concept_target)
    records[str(concept_target.relative_to(OUT))] = {
        "width": Image.open(concept_target).width,
        "height": Image.open(concept_target).height,
        "sha256": sha256(concept_target),
        "referenceOnly": True,
    }

    base_asset_paths = set(records)

    phase2_specs = (
        SequenceSpec(
            "soul_emerge",
            tuple(phase2_component_frames(open_phase2_sheet("幽魂从爆炸中心爬出.png"), (2, 2, 2))),
            3,
            2,
            (512, 512),
            "bottom",
        ),
        SequenceSpec(
            "soul_flight",
            tuple(phase2_component_frames(open_phase2_sheet("幽魂飞行寻敌.png"), (2, 2, 1, 1))),
            3,
            2,
            (512, 512),
        ),
        SequenceSpec(
            "soul_variants",
            tuple(phase2_component_frames(open_phase2_sheet("游魂形象.png"), (2, 2, 1, 2))),
            4,
            2,
            (512, 512),
        ),
        SequenceSpec(
            "soul_burst",
            tuple(phase2_component_frames(open_phase2_sheet("游魂爆炸素材.png"), (4, 4))),
            4,
            2,
            (512, 512),
        ),
        SequenceSpec(
            "soul_transition",
            tuple(phase2_component_frames(open_phase2_sheet("黑洞爆炸过渡特效.png"), (3, 3, 5))),
            4,
            3,
            (512, 512),
        ),
    )
    transition_frames: tuple[Image.Image, ...] = ()
    for spec in phase2_specs:
        normalized = save_phase2_sequence(spec, records, sequences)
        if spec.name == "soul_transition":
            transition_frames = normalized
    save_phase2_transition_parts(transition_frames, records)
    phase2_asset_paths = set(records) - base_asset_paths

    opt_dir = OUT / "opt"
    for path in sorted(opt_dir.glob("*.png")):
        audit_existing_asset(path, records, preserved=True)
    opt_asset_paths = {f"opt/{relative}" for relative in opt_hashes_before}
    if tree_hashes(opt_dir) != opt_hashes_before:
        raise RuntimeError("ult/opt 在素材生成阶段发生变化，已停止")

    source_hashes = {name: sha256(root_source / name) for name in REQUIRED_FILES[:-1]}
    phase2_source_hashes = {name: sha256(root_phase2 / name) for name in PHASE2_REQUIRED_FILES}
    audited_clean_paths = base_asset_paths | phase2_asset_paths
    qa_green = {
        key: records[key].get("residualGreenPixels", 0)
        for key in sorted(audited_clean_paths)
        if records[key].get("residualGreenPixels", 0)
    }
    qa_cyan = {
        key: records[key].get("residualCyanPixels", 0)
        for key in sorted(audited_clean_paths)
        if records[key].get("residualCyanPixels", 0)
    }
    opt_unchanged = tree_hashes(opt_dir) == opt_hashes_before
    payload = {
        "formatVersion": 2,
        "character": "corruptgun",
        "ultimate": "darkWheel",
        "sourceSets": {
            "base": {
                "folders": [str(root_source.relative_to(ROOT)), str(main_source.relative_to(ROOT))],
                "hashes": source_hashes,
                "documentationHashes": {
                    str((root_source / REQUIRED_FILES[-1]).relative_to(ROOT)): sha256(root_source / REQUIRED_FILES[-1]),
                    str((main_source / REQUIRED_FILES[-1]).relative_to(ROOT)): sha256(main_source / REQUIRED_FILES[-1]),
                },
            },
            "phase2": {
                "folders": [str(root_phase2.relative_to(ROOT)), str(main_phase2.relative_to(ROOT))],
                "hashes": phase2_source_hashes,
            },
        },
        "sequences": sequences,
        "assets": records,
        "assetGroups": {
            "base": {"paths": sorted(base_asset_paths)},
            "opt": {"paths": sorted(opt_asset_paths), "preservedUnmodified": True},
            "phase2": {"paths": sorted(phase2_asset_paths)},
        },
        "renderContract": {
            "baseBlend": "source-over",
            "energyBlend": "lighter",
            "spinMaster": "768px registered single frame",
            "phase2AtlasCell": [512, 512],
            "phase2TransparentPadding": 30,
            "optHashPolicy": "preserve-byte-for-byte",
            "fallbackIsVisuallyComplete": True,
            "mobileEncoding": "lossless WebP",
        },
        "qa": {
            "status": "pass" if not qa_green and not qa_cyan and opt_unchanged else "fail",
            "residualGreen": qa_green,
            "residualCyan": qa_cyan,
            "phase2ResidualGreenPixels": sum(records[key].get("residualGreenPixels", 0) for key in phase2_asset_paths),
            "phase2ResidualCyanPixels": sum(records[key].get("residualCyanPixels", 0) for key in phase2_asset_paths),
            "optPreserved": opt_unchanged,
            "optHashes": opt_hashes_before,
        },
    }
    manifest = OUT / "cg_ultimate_manifest.json"
    manifest.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    contact = make_contact_sheet(records)
    phase2_contact = make_contact_sheet(
        records,
        phase2_asset_paths,
        "corruptgun_ultimate_phase2_contact_sheet.png",
    )
    report = {
        "manifest": str(manifest.relative_to(ROOT)),
        "sourceCopiesVerified": payload["sourceSets"],
        "sequenceCount": len(sequences),
        "runtimeAssetCount": len(records),
        "assetGroupCounts": {name: len(group["paths"]) for name, group in payload["assetGroups"].items()},
        "qa": payload["qa"],
        "contactSheet": str(contact.relative_to(ROOT)),
        "phase2ContactSheet": str(phase2_contact.relative_to(ROOT)),
    }
    report_bytes = json.dumps(report, ensure_ascii=False, indent=2).encode("utf-8")
    (PREVIEW / "corruptgun_ultimate_asset_report.json").write_bytes(report_bytes)
    phase2_report = {
        "manifest": report["manifest"],
        "sourceHashes": phase2_source_hashes,
        "sequences": {spec.name: sequences[spec.name] for spec in phase2_specs},
        "runtimeAssetCount": len(phase2_asset_paths),
        "residualGreenPixels": payload["qa"]["phase2ResidualGreenPixels"],
        "residualCyanPixels": payload["qa"]["phase2ResidualCyanPixels"],
        "optPreserved": opt_unchanged,
        "optHashes": opt_hashes_before,
        "contactSheet": phase2_contact.name,
    }
    phase2_report_bytes = json.dumps(phase2_report, ensure_ascii=False, indent=2).encode("utf-8")
    (PREVIEW / "corruptgun_ultimate_phase2_asset_report.json").write_bytes(phase2_report_bytes)
    for folder in (root_phase2, main_phase2):
        (folder / "cg_ultimate_phase2_asset_report.json").write_bytes(phase2_report_bytes)
        shutil.copy2(phase2_contact, folder / phase2_contact.name)
    if payload["qa"]["status"] != "pass":
        raise SystemExit("大招素材仍有绿/青残留，请检查素材报告")
    print(
        f"[corruptgun-ultimate] sequences={len(sequences)} assets={len(records)} "
        f"phase2={len(phase2_asset_paths)} contact={contact.relative_to(ROOT)}"
    )


if __name__ == "__main__":
    main()
