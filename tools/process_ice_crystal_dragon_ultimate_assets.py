#!/usr/bin/env python3
"""Build audited runtime sprites for Ice Crystal Dragon's ultimate.

The supplied 1448x1086 sheets are irregular reference layouts rather than
flipbooks.  This processor crops every logical frame independently, removes
green spill, feathers alpha, and places each sequence on a stable transparent
canvas.  Runtime code combines these hard-surface/crystal anchors with Canvas
fog, snow, refraction, breath ribbons, and impact particles.
"""

from __future__ import annotations

import argparse
import hashlib
import json
from dataclasses import dataclass
from pathlib import Path

from PIL import Image, ImageDraw

from process_ice_crystal_dragon_assets import (
    GREEN_RATIO_LIMIT,
    background_for,
    despill_and_feather,
    final_green_clamp,
    green_metrics,
    make_glow,
    place_on_fixed_canvas,
    save_png,
    sha256,
    validate_png,
)


ROOT = Path(__file__).resolve().parents[1]
SOURCE_CANDIDATES = (
    ROOT / "龙僚机大招开发",
    ROOT / "moon-bullet-main" / "龙僚机大招开发",
)
OUT = ROOT / "assets" / "companions" / "ice_crystal_dragon" / "ultimate"
AUDIT_OUTPUT = OUT / "asset_audit.json"
PIPELINE_VERSION = "ice-crystal-dragon-ultimate-assets-v4-phase2-main-body"
TRANSPARENT_PAD = 16
ALL_SOURCE_SHEETS = (
    "冰法阵 冰龙细节 冰龙主体.png",
    "冰陨石 砸地爆炸 冰晶效果.png",
    "冰陨石详细素材.png",
    "冰龙 打击特效 光效例子 陨石.png",
    "冰龙主体 和 细节零件.png",
    "冰龙主体 打击特效 .png",
    "拖尾 光效 冰.png",
    "法阵 冰.png",
    "法阵 龙本体 冰冰.png",
    "爆炸特效 光效 粒子拖尾.png",
    "龙 动画帧.png",
    "龙素材.png",
)


@dataclass(frozen=True)
class FrameSpec:
    key: str
    source: str
    rect: tuple[int, int, int, int]
    output: str
    canvas_size: tuple[int, int]
    preserve_islands: bool = False
    full_emissive: bool = False
    erode_pixels: int = 1

    @property
    def base_path(self) -> Path:
        return OUT / self.output

    @property
    def glow_path(self) -> Path:
        path = Path(self.output)
        return OUT / path.with_name(f"{path.stem}_glow.png")


def frame_group(
    prefix: str,
    source: str,
    boxes: tuple[tuple[int, int, int, int], ...],
    directory: str,
    canvas_size: tuple[int, int],
    *,
    preserve_islands: bool = False,
    full_emissive: bool = False,
    erode_pixels: int = 1,
) -> tuple[FrameSpec, ...]:
    return tuple(
        FrameSpec(
            f"{prefix}_{index}", source, rect,
            f"{directory}/{prefix}_{index}.png", canvas_size,
            preserve_islands, full_emissive, erode_pixels,
        )
        for index, rect in enumerate(boxes)
    )


# BBoxes are audited connected-component bounds from the transparent source
# sheets.  They remain independent because no source row is a regular grid.
FRAMES = (
    # Phase-one deity body material anchors. The full pose contributes the
    # supplied hard-surface anatomy; the isolated spine and fin are mounted
    # independently at runtime so the rear body can flex without flattening the
    # metal and crystal materials into the energy tail.
    FrameSpec(
        "dragon_deity", "冰法阵 冰龙细节 冰龙主体.png",
        (879, 681, 550, 168), "dragon/dragon_deity.png", (620, 240),
        erode_pixels=0,
    ),
    FrameSpec(
        "dragon_spine_segment", "冰龙主体 和 细节零件.png",
        (4, 855, 140, 100), "dragon/dragon_spine_segment.png", (180, 120),
        erode_pixels=0,
    ),
    FrameSpec(
        "dragon_tail_fin", "冰龙主体 和 细节零件.png",
        (892, 740, 120, 120), "dragon/dragon_tail_fin.png", (150, 140),
        erode_pixels=0,
    ),
    *frame_group(
        "dragon_flight", "龙 动画帧.png",
        (
            (18, 25, 291, 195), (295, 12, 191, 217), (502, 16, 180, 210),
            (690, 15, 191, 192), (885, 19, 243, 187), (1132, 44, 298, 156),
        ),
        "dragon", (400, 280),
    ),
    *frame_group(
        "dragon_coil", "龙 动画帧.png",
        (
            (20, 237, 233, 202), (266, 249, 211, 183), (485, 246, 234, 195),
            (707, 212, 214, 233), (951, 222, 185, 224), (1157, 243, 261, 196),
        ),
        "dragon", (400, 300),
    ),
    *frame_group(
        "dragon_breath", "龙 动画帧.png",
        (
            (13, 457, 366, 139), (422, 460, 391, 136),
            (828, 447, 302, 135), (1075, 458, 362, 192),
        ),
        "breath", (470, 250), preserve_islands=True, erode_pixels=0,
    ),
    *frame_group(
        "breath_flow", "拖尾 光效 冰.png",
        (
            (26, 115, 1387, 88),
            (26, 211, 1383, 95),
            (30, 319, 1355, 65),
        ),
        "breath", (1420, 140), preserve_islands=True, erode_pixels=0,
    ),
    *frame_group(
        "frost_array", "法阵 冰.png",
        (
            (91, 60, 64, 39), (172, 54, 76, 47),
            (265, 46, 99, 62), (379, 35, 143, 87),
            (538, 20, 189, 119), (749, 14, 197, 128),
            (955, 29, 188, 109), (1161, 16, 265, 139),
        ),
        "field", (300, 180), preserve_islands=True, full_emissive=True, erode_pixels=0,
    ),
    *frame_group(
        "frost_field", "拖尾 光效 冰.png",
        (
            (27, 816, 166, 84), (218, 818, 164, 79),
            (414, 822, 145, 76), (586, 827, 152, 74),
            (744, 824, 168, 81), (930, 825, 159, 80),
            (1096, 826, 160, 80), (1266, 822, 161, 84),
        ),
        "field", (220, 130), preserve_islands=True, full_emissive=True, erode_pixels=0,
    ),
    *frame_group(
        "frost_burst", "拖尾 光效 冰.png",
        (
            (24, 927, 168, 133), (219, 943, 133, 110),
            (373, 954, 97, 84), (490, 953, 76, 82),
            (581, 984, 56, 45),
        ),
        "field", (240, 190), preserve_islands=True, full_emissive=True, erode_pixels=0,
    ),
    *frame_group(
        "summon_circle", "法阵 龙本体 冰冰.png",
        (
            (33, 65, 76, 60), (122, 49, 124, 92), (258, 43, 134, 105),
            (404, 24, 164, 142), (579, 14, 178, 155),
        ),
        "circle", (280, 280), preserve_islands=True, full_emissive=True, erode_pixels=0,
    ),
    *frame_group(
        "meteor", "冰陨石 砸地爆炸 冰晶效果.png",
        (
            (504, 12, 171, 118), (625, 8, 256, 160),
            (815, 19, 291, 163), (1049, 11, 339, 223),
        ),
        # The source row contains neighbouring-sheet islands.  Keep only the
        # meteor body; detached fragments are emitted independently at runtime.
        "meteor", (420, 300), preserve_islands=False, erode_pixels=0,
    ),
    *frame_group(
        "impact_bloom", "冰陨石 砸地爆炸 冰晶效果.png",
        (
            (385, 349, 166, 142), (577, 363, 180, 122), (784, 363, 205, 124),
            (1005, 349, 239, 154), (1257, 365, 174, 124),
        ),
        "impact", (400, 280), preserve_islands=True, full_emissive=True, erode_pixels=0,
    ),
    *frame_group(
        "impact_crater", "冰陨石 砸地爆炸 冰晶效果.png",
        (
            (14, 636, 271, 155), (296, 636, 268, 154), (584, 602, 254, 195),
            (860, 654, 275, 132), (1154, 669, 274, 134),
        ),
        "impact", (420, 280), preserve_islands=True, full_emissive=True, erode_pixels=0,
    ),
)

ICON_OUTPUT = OUT / "ui" / "ice_dragon_ultimate_icon.png"
CONTACT_OUTPUTS = {
    mode: OUT / f"contact_sheet_{mode}.png" for mode in ("black", "white", "checker")
}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", type=Path)
    parser.add_argument("--verify-only", action="store_true")
    return parser.parse_args()


def resolve_source(override: Path | None) -> Path | None:
    candidates = (override,) if override else SOURCE_CANDIDATES
    for candidate in candidates:
        if candidate and candidate.is_dir():
            return candidate.resolve()
    return None


def make_icon(dragon: Image.Image, meteor: Image.Image) -> Image.Image:
    size = 256
    icon = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    dragon_copy = dragon.copy()
    dragon_copy.thumbnail((232, 170), Image.Resampling.LANCZOS)
    meteor_copy = meteor.copy()
    meteor_copy.thumbnail((112, 90), Image.Resampling.LANCZOS)
    icon.alpha_composite(dragon_copy, ((size - dragon_copy.width) // 2 - 9, 61))
    icon.alpha_composite(meteor_copy, (size - meteor_copy.width - 12, 12))
    return final_green_clamp(icon)


def make_contact_sheets() -> None:
    entries = [(frame.key, frame.base_path, frame.glow_path) for frame in FRAMES]
    entries.append(("ultimate_icon", ICON_OUTPUT, None))
    columns = 4
    cell_w, cell_h = 320, 230
    rows = (len(entries) + columns - 1) // columns
    for mode, output in CONTACT_OUTPUTS.items():
        sheet = background_for(mode, (columns * cell_w, rows * cell_h))
        draw = ImageDraw.Draw(sheet)
        fg = (230, 239, 255) if mode == "black" else (25, 35, 55)
        subdued = (117, 146, 183) if mode == "black" else (96, 108, 128)
        for index, (key, base_path, glow_path) in enumerate(entries):
            x = (index % columns) * cell_w
            y = (index // columns) * cell_h
            base = Image.open(base_path).convert("RGBA")
            base.thumbnail((144 if glow_path else 224, 176), Image.Resampling.LANCZOS)
            bx = x + (12 if glow_path else (cell_w - base.width) // 2)
            by = y + 28 + (172 - base.height) // 2
            sheet.paste(base.convert("RGB"), (bx, by), base.getchannel("A"))
            if glow_path:
                glow = Image.open(glow_path).convert("RGBA")
                glow.thumbnail((144, 176), Image.Resampling.LANCZOS)
                gx = x + cell_w - glow.width - 12
                gy = y + 28 + (172 - glow.height) // 2
                sheet.paste(glow.convert("RGB"), (gx, gy), glow.getchannel("A"))
                draw.text((x + 58, y + 204), "base", fill=subdued)
                draw.text((x + 226, y + 204), "glow", fill=subdued)
            draw.text((x + 10, y + 8), key, fill=fg)
            draw.rectangle((x, y, x + cell_w - 1, y + cell_h - 1), outline=subdued, width=1)
        output.parent.mkdir(parents=True, exist_ok=True)
        sheet.save(output, format="PNG", optimize=True)


def source_inventory(source: Path | None) -> list[dict]:
    used = {frame.source for frame in FRAMES}
    inventory: list[dict] = []
    for name in ALL_SOURCE_SHEETS:
        path = source / name if source else None
        record = {"file": name, "runtime_crop_source": name in used, "role": "runtime crop source" if name in used else "reference-only visual study"}
        if path and path.is_file():
            image = Image.open(path)
            record.update({"present": True, "width": image.width, "height": image.height, "sha256": sha256(path)})
        else:
            record["present"] = False
        inventory.append(record)
    return inventory


def build_audit(source: Path | None, source_records: dict[str, dict] | None = None) -> dict:
    records = source_records or {}
    assets: list[dict] = []
    errors: list[str] = []
    for frame in FRAMES:
        base, base_errors = validate_png(frame.base_path, minimum_margin=TRANSPARENT_PAD)
        glow, glow_errors = validate_png(frame.glow_path, minimum_margin=TRANSPARENT_PAD)
        errors.extend(base_errors)
        errors.extend(glow_errors)
        assets.append({
            "key": frame.key,
            "source": frame.source,
            "source_rect": list(frame.rect),
            "canvas_size": list(frame.canvas_size),
            "source_audit": records.get(frame.key),
            "base": base,
            "glow": glow,
        })
    icon, icon_errors = validate_png(ICON_OUTPUT, minimum_margin=10)
    errors.extend(icon_errors)
    assets.append({"key": "ultimate_icon", "derived_from": ["dragon_flight_0", "meteor_3"], "base": icon})
    if errors:
        raise ValueError("\n".join(errors))
    ratios = [float(item["base"]["green_residue_ratio"]) for item in assets]
    glow_ratios = [float(item["glow"]["green_residue_ratio"]) for item in assets if item.get("glow")]
    return {
        "pipeline": PIPELINE_VERSION,
        "source_folder": str(source.relative_to(ROOT)) if source and source.is_relative_to(ROOT) else (str(source) if source else None),
        "source_available": source is not None,
        "source_inventory": source_inventory(source),
        "runtime_contract": "irregular-sheet crops -> despill -> feather -> stable canvases -> base/glow split",
        "reference_sheets_runtime": False,
        "assets": assets,
        "contacts": {mode: str(path.relative_to(ROOT)) for mode, path in CONTACT_OUTPUTS.items()},
        "summary": {
            "base_asset_count": len(assets),
            "glow_asset_count": len(glow_ratios),
            "max_green_residue_ratio": round(max(ratios, default=0), 8),
            "max_glow_green_residue_ratio": round(max(glow_ratios, default=0), 8),
            "green_residue_limit": GREEN_RATIO_LIMIT,
            "validation_errors": [],
        },
    }


def required_paths() -> list[Path]:
    paths = [ICON_OUTPUT]
    for frame in FRAMES:
        paths.extend((frame.base_path, frame.glow_path))
    return paths


def verify_existing(source: Path | None) -> dict:
    missing = [str(path.relative_to(ROOT)) for path in required_paths() if not path.is_file()]
    if missing:
        raise SystemExit("Ice Dragon ultimate generated assets are incomplete:\n- " + "\n- ".join(missing))
    if any(not path.is_file() for path in CONTACT_OUTPUTS.values()):
        make_contact_sheets()
    audit = build_audit(source)
    if not AUDIT_OUTPUT.is_file():
        AUDIT_OUTPUT.write_text(json.dumps(audit, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return audit


def process(source: Path) -> dict:
    OUT.mkdir(parents=True, exist_ok=True)
    rendered: dict[str, Image.Image] = {}
    records: dict[str, dict] = {}
    source_hashes: dict[str, str] = {}
    for frame in FRAMES:
        source_path = source / frame.source
        if frame.source not in source_hashes:
            source_hashes[frame.source] = sha256(source_path)
        sheet = Image.open(source_path).convert("RGBA")
        x, y, width, height = frame.rect
        if x < 0 or y < 0 or x + width > sheet.width or y + height > sheet.height:
            raise ValueError(f"source rectangle outside {frame.source}: {frame.rect}")
        crop = sheet.crop((x, y, x + width, y + height))
        source_metrics = green_metrics(crop)
        cleaned, content_box = despill_and_feather(
            crop,
            preserve_islands=frame.preserve_islands,
            erode_pixels=frame.erode_pixels,
        )
        stable, placement = place_on_fixed_canvas(cleaned, frame.canvas_size)
        stable = final_green_clamp(stable)
        glow = make_glow(stable, frame.full_emissive)
        save_png(stable, frame.base_path)
        save_png(glow, frame.glow_path)
        rendered[frame.key] = stable
        records[frame.key] = {
            "sheet_size": [sheet.width, sheet.height],
            "sheet_sha256": source_hashes[frame.source],
            "crop_content_box_before_padding": list(content_box),
            "fixed_canvas_placement": list(placement),
            "preserve_islands": frame.preserve_islands,
            "alpha_erosion_pixels": frame.erode_pixels,
            **source_metrics,
        }
    save_png(make_icon(rendered["dragon_flight_0"], rendered["meteor_3"]), ICON_OUTPUT)
    make_contact_sheets()
    audit = build_audit(source, records)
    AUDIT_OUTPUT.write_text(json.dumps(audit, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return audit


def print_summary(audit: dict, mode: str) -> None:
    summary = audit["summary"]
    print(f"[{mode}] {PIPELINE_VERSION}")
    print(f"base={summary['base_asset_count']} glow={summary['glow_asset_count']}")
    print(f"maxGreen={summary['max_green_residue_ratio']:.6%}")
    print(f"maxGlowGreen={summary['max_glow_green_residue_ratio']:.6%}")
    print(f"audit={AUDIT_OUTPUT.relative_to(ROOT)}")
    for mode_name, path in CONTACT_OUTPUTS.items():
        print(f"contact[{mode_name}]={path.relative_to(ROOT)}")


def main() -> None:
    args = parse_args()
    source = resolve_source(args.source)
    required_sources = sorted({frame.source for frame in FRAMES})
    missing_sources = required_sources if source is None else [name for name in required_sources if not (source / name).is_file()]
    if args.verify_only or missing_sources:
        reason = "verify-only" if args.verify_only else f"source missing: {', '.join(missing_sources)}"
        audit = verify_existing(source)
        print_summary(audit, f"VERIFIED, rebuild skipped ({reason})")
        return
    if source is None:
        raise SystemExit("Ice Dragon ultimate source folder not found")
    audit = process(source)
    print_summary(audit, "BUILT")


if __name__ == "__main__":
    main()
