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
from PIL import Image, ImageDraw, ImageFilter, ImageFont
from scipy import ndimage


ROOT = Path(__file__).resolve().parents[1]
DEV_SUBDIR = Path("大招 炼狱影刃 开发文件夹")
ROOT_DEV = ROOT / "7号战机 开发文件夹_副本" / DEV_SUBDIR
MAIN_DEV = ROOT / "moon-bullet-main/7号战机 开发文件夹" / DEV_SUBDIR
OUT = ROOT / "assets/player/corrupt_gun/ult"
PREVIEW = ROOT / "tools/corruptgun_ultimate_assets_preview"
ALPHA_THRESHOLD = 8

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


def ensure_source_copies() -> tuple[Path, Path]:
    if not MAIN_DEV.is_dir() and not ROOT_DEV.is_dir():
        raise SystemExit("找不到大招开发文件夹")
    if not ROOT_DEV.is_dir():
        shutil.copytree(MAIN_DEV, ROOT_DEV)
    if not MAIN_DEV.is_dir():
        shutil.copytree(ROOT_DEV, MAIN_DEV)

    missing: list[str] = []
    for folder in (ROOT_DEV, MAIN_DEV):
        for name in REQUIRED_FILES:
            if not (folder / name).is_file():
                missing.append(f"{folder.relative_to(ROOT)}/{name}")
    if missing:
        raise SystemExit("大招素材缺失：\n" + "\n".join(missing))

    mismatched = [
        name for name in REQUIRED_FILES
        if sha256(ROOT_DEV / name) != sha256(MAIN_DEV / name)
    ]
    if mismatched:
        raise SystemExit("两份大招开发素材不一致，停止处理：" + ", ".join(mismatched))
    return ROOT_DEV, MAIN_DEV


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


def clean_palette(image: Image.Image) -> Image.Image:
    px = np.asarray(image.convert("RGBA"), dtype=np.float32).copy()
    r, g, b, a = (px[:, :, index] for index in range(4))
    visible = a > ALPHA_THRESHOLD
    if not np.any(visible):
        return Image.fromarray(px.astype(np.uint8), "RGBA")

    max_rb = np.maximum(r, b)
    green_dom = g - max_rb
    cyan_dom = np.minimum(g, b) - r
    contaminated = visible & ((green_dom > 2) | (cyan_dom > 5))

    edge = visible & ~ndimage.binary_erosion(visible, iterations=3, border_value=0)
    strong_spill = contaminated & edge & ((green_dom > 14) | (cyan_dom > 20))
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

    a[a < ALPHA_THRESHOLD] = 0
    solid = a > 0
    if np.any(solid):
        eroded = ndimage.binary_erosion(solid, iterations=1, border_value=0)
        a[solid & ~eroded] = 0
        a = ndimage.gaussian_filter(a, sigma=0.55)
        a[a < ALPHA_THRESHOLD] = 0

    # Final hard guarantee: no green/cyan dominant visible pixels survive.
    visible = a > ALPHA_THRESHOLD
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
) -> tuple[Image.Image, ...]:
    cleaned = tuple(clean_palette(frame) for frame in frames)
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
        y = (cell[1] - cropped.height) // 2
        canvas.alpha_composite(cropped, (x, y))
        normalized.append(canvas)
    return tuple(normalized)


def energy_layer(image: Image.Image) -> Image.Image:
    px = np.asarray(image.convert("RGBA"), dtype=np.float32)
    r, g, b, alpha = (px[:, :, index] for index in range(4))
    brightness = np.maximum.reduce([r, g, b]) / 255.0
    redness = np.clip((r - g * 0.55 - b * 0.18) / 210.0, 0, 1)
    score = np.clip(brightness * 0.35 + redness * 0.90 - 0.16, 0, 1)
    mask = alpha * np.power(score, 1.25)
    out = np.zeros_like(px)
    out[:, :, 0] = np.maximum(r, brightness * 235)
    out[:, :, 1] = np.minimum(np.maximum(g, brightness * 24), out[:, :, 0] * 0.28)
    out[:, :, 2] = np.minimum(np.maximum(b, brightness * 72), out[:, :, 0] * 0.65)
    out[:, :, 3] = mask
    sharp = Image.fromarray(np.clip(out, 0, 255).astype(np.uint8), "RGBA")
    blurred = sharp.filter(ImageFilter.GaussianBlur(1.2))
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
    visible = a > ALPHA_THRESHOLD
    green = visible & (g > np.maximum(r, b) + 2)
    cyan = visible & (g > r + 5) & (b > r + 5)
    return int(green.sum()), int(cyan.sum())


def final_palette_guard(image: Image.Image) -> Image.Image:
    """Remove tiny chroma values reintroduced by Lanczos interpolation."""
    px = np.asarray(image.convert("RGBA"), dtype=np.float32).copy()
    r, g, b, a = (px[:, :, index] for index in range(4))
    visible = a > ALPHA_THRESHOLD
    green = visible & (g > np.maximum(r, b) + 2)
    cyan = visible & (g > r + 5) & (b > r + 5)
    contaminated = green | cyan
    if np.any(contaminated):
        energy = np.maximum.reduce([r, g, b])
        r[contaminated] = np.maximum(r[contaminated], energy[contaminated] * 0.74)
        g[contaminated] = np.minimum(g[contaminated], r[contaminated] * 0.16)
        b[contaminated] = np.minimum(
            np.maximum(b[contaminated] * 0.46, r[contaminated] * 0.18),
            r[contaminated] * 0.54,
        )
    px[:, :, 0] = r
    px[:, :, 1] = g
    px[:, :, 2] = b
    px[:, :, 3] = a
    px = np.clip(px, 0, 255).astype(np.uint8)
    px[px[:, :, 3] == 0, :3] = 0
    return Image.fromarray(px, "RGBA")


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


def make_contact_sheet(records: dict[str, dict]) -> Path:
    keys = sorted(records)
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
    target = PREVIEW / "corruptgun_ultimate_contact_sheet.png"
    sheet.save(target, optimize=True)
    return target


def main() -> None:
    root_source, main_source = ensure_source_copies()
    if OUT.exists():
        shutil.rmtree(OUT)
    OUT.mkdir(parents=True, exist_ok=True)
    PREVIEW.mkdir(parents=True, exist_ok=True)

    def open_sheet(name: str) -> Image.Image:
        return Image.open(root_source / name).convert("RGBA")

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

    source_hashes = {name: sha256(root_source / name) for name in REQUIRED_FILES}
    qa_green = {key: value.get("residualGreenPixels", 0) for key, value in records.items() if value.get("residualGreenPixels", 0)}
    qa_cyan = {key: value.get("residualCyanPixels", 0) for key, value in records.items() if value.get("residualCyanPixels", 0)}
    payload = {
        "formatVersion": 1,
        "character": "corruptgun",
        "ultimate": "darkWheel",
        "sourceFolders": [str(root_source.relative_to(ROOT)), str(main_source.relative_to(ROOT))],
        "sourceHashes": source_hashes,
        "sequences": sequences,
        "assets": records,
        "renderContract": {
            "baseBlend": "source-over",
            "energyBlend": "lighter",
            "fallbackIsVisuallyComplete": True,
            "mobileEncoding": "lossless WebP",
        },
        "qa": {
            "status": "pass" if not qa_green and not qa_cyan else "fail",
            "residualGreen": qa_green,
            "residualCyan": qa_cyan,
        },
    }
    manifest = OUT / "cg_ultimate_manifest.json"
    manifest.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    contact = make_contact_sheet(records)
    report = {
        "manifest": str(manifest.relative_to(ROOT)),
        "sourceCopiesVerified": payload["sourceFolders"],
        "sequenceCount": len(sequences),
        "runtimeAssetCount": len(records),
        "qa": payload["qa"],
        "contactSheet": str(contact.relative_to(ROOT)),
    }
    (PREVIEW / "corruptgun_ultimate_asset_report.json").write_text(
        json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    if payload["qa"]["status"] != "pass":
        raise SystemExit("大招素材仍有绿/青残留，请检查素材报告")
    print(
        f"[corruptgun-ultimate] sequences={len(sequences)} assets={len(records)} "
        f"contact={contact.relative_to(ROOT)}"
    )


if __name__ == "__main__":
    main()
