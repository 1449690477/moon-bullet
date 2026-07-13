#!/usr/bin/env python3
"""Build the small, high-readability Dream-mode bullet texture set.

The inputs stay untouched in the user-provided barrage library. Outputs are
deterministic, padded RGBA sprites with a baked dark collision edge so mobile
rendering only needs one image draw per bullet.
"""
from __future__ import annotations

import hashlib
import json
from dataclasses import dataclass
from pathlib import Path

import numpy as np
from PIL import Image, ImageChops, ImageDraw, ImageEnhance, ImageFilter, ImageFont


ROOT = Path(__file__).resolve().parents[1]
SOURCE_DIR = (
    ROOT
    / "素材文件夹 一定优先使用！"
    / "sprites_png/source_barrage/bulletsource/texture/barragetex/barragetexinfo"
)
OUTPUT_DIR = ROOT / "assets" / "bullets_dream"
MANIFEST_PATH = OUTPUT_DIR / "dream_bullet_manifest.json"
CONTACT_SHEET_PATH = ROOT / "tools" / "dream_bullet_assets_contact.png"


@dataclass(frozen=True)
class AssetSpec:
    source: str
    output: str
    canvas: int
    role: str
    motion_hint: str


ASSETS = (
    AssetSpec(
        "1007_N__Sprite.png",
        "tri_blade_violet.png",
        112,
        "three-prong rotating cutter",
        "counter-rotating blade wheel",
    ),
    AssetSpec(
        "1019_N_2__Sprite.png",
        "spiral_halo_gold.png",
        112,
        "spiral halo pressure node",
        "pulsing halo / orbit release",
    ),
    AssetSpec(
        "1030_N__Sprite.png",
        "galaxy_vortex_white.png",
        112,
        "vortex attractor core",
        "slow drift with tangent release",
    ),
    AssetSpec(
        "gw01__Sprite.png",
        "trinity_orb_violet.png",
        96,
        "three-core delayed orb",
        "brake, split, then chase",
    ),
    AssetSpec(
        "Boss11_timgxx__Sprite.png",
        "skull_sigil_white.png",
        112,
        "telegraphed curse marker",
        "hold, flash, then charge",
    ),
    AssetSpec(
        "Boss19_hs_sk01__Sprite.png",
        "chain_link_steel.png",
        96,
        "linked moving gate segment",
        "sine chain wall",
    ),
    AssetSpec(
        "Boss03_Z_qidai01__Sprite.png",
        "tentacle_shard_crimson.png",
        96,
        "segmented crimson ribbon",
        "twin snake / curved pursuit",
    ),
    AssetSpec(
        "ray04_lj_djs__Sprite.png",
        "wire_orb_silver.png",
        112,
        "wireframe orbit anchor",
        "nested orbit, then radial release",
    ),
)


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def alpha_bbox(image: Image.Image, threshold: int = 4) -> tuple[int, int, int, int] | None:
    alpha = np.asarray(image.convert("RGBA"), dtype=np.uint8)[..., 3]
    ys, xs = np.where(alpha > threshold)
    if not len(xs):
        return None
    return int(xs.min()), int(ys.min()), int(xs.max() + 1), int(ys.max() + 1)


def residue_stats(image: Image.Image) -> dict[str, int]:
    rgba = np.asarray(image.convert("RGBA"), dtype=np.uint8)
    r = rgba[..., 0].astype(np.int16)
    g = rgba[..., 1].astype(np.int16)
    b = rgba[..., 2].astype(np.int16)
    visible = rgba[..., 3] > 16
    green = visible & (g > 76) & (g > r * 1.22 + 8) & (g > b * 1.14 + 8)
    cyan = visible & (g > 84) & (b > 84) & (g > r * 1.24 + 8) & (b > r * 1.24 + 8)
    return {
        "visible_pixels": int(visible.sum()),
        "green_residue_pixels": int(green.sum()),
        "cyan_residue_pixels": int(cyan.sum()),
    }


def clean_transparency_and_despill(image: Image.Image) -> Image.Image:
    rgba = np.asarray(image.convert("RGBA"), dtype=np.uint8).copy()
    r = rgba[..., 0].astype(np.int16)
    g = rgba[..., 1].astype(np.int16)
    b = rgba[..., 2].astype(np.int16)
    a = rgba[..., 3]

    # Chroma contamination is redirected into a cool violet-steel highlight.
    # None of the selected subjects uses green as a design colour.
    green = (a > 3) & (g > 76) & (g > r * 1.22 + 8) & (g > b * 1.14 + 8)
    cyan = (a > 3) & (g > 84) & (b > 84) & (g > r * 1.24 + 8) & (b > r * 1.24 + 8)
    spill = green | cyan
    value = np.maximum.reduce((r, g, b))
    rgba[..., 0][spill] = np.clip(np.maximum(r[spill], value[spill] * 0.68), 0, 255)
    rgba[..., 1][spill] = np.clip(np.minimum(g[spill], value[spill] * 0.54), 0, 255)
    rgba[..., 2][spill] = np.clip(np.maximum(b[spill], value[spill] * 0.80), 0, 255)

    rgba[..., 3][a <= 3] = 0
    rgba[..., :3][rgba[..., 3] == 0] = 0
    return Image.fromarray(rgba, "RGBA")


def fit_subject(image: Image.Image, canvas_size: int) -> Image.Image:
    bbox = alpha_bbox(image, threshold=5)
    if bbox is None:
        raise ValueError("source has no visible pixels")
    left, top, right, bottom = bbox
    image = image.crop(
        (
            max(0, left - 2),
            max(0, top - 2),
            min(image.width, right + 2),
            min(image.height, bottom + 2),
        )
    )
    padding = 12 if canvas_size == 112 else 10
    inner = canvas_size - padding * 2
    scale = min(inner / image.width, inner / image.height)
    size = (max(1, round(image.width * scale)), max(1, round(image.height * scale)))
    image = image.resize(size, Image.Resampling.LANCZOS)

    # Recover line and texture definition after normalization without sharpening
    # the alpha fringe into a light rectangle.
    rgb = image.convert("RGB")
    rgb = ImageEnhance.Contrast(rgb).enhance(1.06)
    rgb = rgb.filter(ImageFilter.UnsharpMask(radius=0.75, percent=120, threshold=3))
    rgb.putalpha(image.getchannel("A"))
    image = clean_transparency_and_despill(rgb)

    canvas = Image.new("RGBA", (canvas_size, canvas_size), (0, 0, 0, 0))
    offset = ((canvas_size - image.width) // 2, (canvas_size - image.height) // 2)
    canvas.alpha_composite(image, offset)
    return canvas


def add_collision_outline(subject: Image.Image) -> Image.Image:
    alpha = subject.getchannel("A")
    solid = alpha.point(lambda value: 255 if value >= 24 else 0)
    expanded = solid.filter(ImageFilter.MaxFilter(7)).filter(ImageFilter.GaussianBlur(0.7))
    outer = ImageChops.subtract(expanded, solid.filter(ImageFilter.GaussianBlur(0.35)))
    outer = outer.point(lambda value: min(220, round(value * 0.86)))

    outline = Image.new("RGBA", subject.size, (7, 9, 24, 0))
    outline.putalpha(outer)
    outline.alpha_composite(subject)
    return clean_transparency_and_despill(outline)


def process(spec: AssetSpec) -> tuple[Image.Image, dict[str, object]]:
    source_path = SOURCE_DIR / spec.source
    if not source_path.is_file():
        raise FileNotFoundError(f"missing source asset: {source_path}")

    source = Image.open(source_path).convert("RGBA")
    source_stats = residue_stats(source)
    subject = fit_subject(clean_transparency_and_despill(source), spec.canvas)
    output = add_collision_outline(subject)
    output_stats = residue_stats(output)
    if output_stats["green_residue_pixels"] or output_stats["cyan_residue_pixels"]:
        raise RuntimeError(f"despill failed for {spec.output}: {output_stats}")

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    output_path = OUTPUT_DIR / spec.output
    output.save(output_path, "PNG", optimize=True, compress_level=9)

    return output, {
        "key": Path(spec.output).stem,
        "source": source_path.relative_to(ROOT).as_posix(),
        "source_sha256": sha256(source_path),
        "source_size": [source.width, source.height],
        "source_alpha_bbox": list(alpha_bbox(source) or ()),
        "source_residue": source_stats,
        "output": output_path.relative_to(ROOT).as_posix(),
        "output_sha256": sha256(output_path),
        "canvas": [spec.canvas, spec.canvas],
        "output_alpha_bbox": list(alpha_bbox(output) or ()),
        "output_residue": output_stats,
        "transparent_padding_px": 12 if spec.canvas == 112 else 10,
        "collision_outline_px": 3,
        "role": spec.role,
        "motion_hint": spec.motion_hint,
    }


def build_contact_sheet(images: list[tuple[AssetSpec, Image.Image]]) -> None:
    columns = 4
    tile_w, tile_h = 252, 218
    rows = (len(images) + columns - 1) // columns
    sheet = Image.new("RGB", (columns * tile_w, rows * tile_h), (17, 20, 32))
    draw = ImageDraw.Draw(sheet)
    font = ImageFont.load_default()
    for index, (spec, image) in enumerate(images):
        x = index % columns * tile_w
        y = index // columns * tile_h
        preview = image.resize((168, 168), Image.Resampling.NEAREST)
        backdrop = Image.new("RGBA", preview.size, (35, 39, 56, 255))
        backdrop.alpha_composite(preview)
        sheet.paste(backdrop.convert("RGB"), (x + 42, y + 4))
        draw.text((x + 10, y + 178), Path(spec.output).stem, font=font, fill=(246, 247, 255))
        draw.text((x + 10, y + 194), spec.motion_hint, font=font, fill=(177, 188, 225))
    sheet.save(CONTACT_SHEET_PATH, "PNG", optimize=True, compress_level=9)


def main() -> None:
    built: list[tuple[AssetSpec, Image.Image]] = []
    entries: list[dict[str, object]] = []
    for spec in ASSETS:
        image, entry = process(spec)
        built.append((spec, image))
        entries.append(entry)

    manifest = {
        "schema": "moon-bullet/dream-bullet-assets/v1",
        "pipeline": "tools/process_dream_bullet_assets.py",
        "source_policy": "user-provided barrage sprites; inputs are read-only",
        "render_policy": "single-draw RGBA with baked 3px dark collision edge",
        "asset_count": len(entries),
        "assets": entries,
    }
    MANIFEST_PATH.write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )
    build_contact_sheet(built)

    total_bytes = sum((OUTPUT_DIR / spec.output).stat().st_size for spec in ASSETS)
    print(f"built {len(entries)} Dream bullet sprites ({total_bytes} bytes)")
    print(MANIFEST_PATH.relative_to(ROOT))
    print(CONTACT_SHEET_PATH.relative_to(ROOT))


if __name__ == "__main__":
    main()
