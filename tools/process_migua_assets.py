#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Extract and clean Migua theme runtime assets.

The Migua source folder contains transparent sheets with bright green separator
lines. Runtime must use individual sprites, so this script crops the pieces,
removes key-green residue, trims transparent borders, writes preview sheets, and
reports any suspicious green pixels left in the outputs.
"""

from __future__ import annotations

from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageOps


ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "moon-bullet-main" / "蜜瓜号boss 蜜瓜专属三张地图 专属小怪 开发"
PREVIEW_DIR = ROOT / "tools" / "migua_asset_preview"


MAPS: dict[str, tuple[str, str]] = {
    "backgrounds/migua/greenhouse.png": ("蜜瓜地图1.png", "梦幻温室中的果实之旅"),
    "backgrounds/migua/juice_factory.png": ("蜜瓜地图2.png", "梦幻果汁工厂内部"),
    "backgrounds/migua/floating_city.png": ("蜜瓜地图3.png", "梦幻浮空瓜果城"),
}


SPRITES: dict[str, tuple[str, tuple[int, int, int, int], int]] = {
    # Boss forms.
    "bosses/migua/idle.png": ("蜜瓜号boss多形态素材.png", (42, 70, 444, 438), 360),
    "bosses/migua/phase1.png": ("蜜瓜号boss多形态素材.png", (456, 66, 880, 432), 380),
    "bosses/migua/phase2.png": ("蜜瓜号boss多形态素材.png", (892, 52, 1432, 438), 440),
    "bosses/migua/phase3.png": ("蜜瓜号boss多形态素材.png", (20, 520, 452, 1072), 470),
    "bosses/migua/final.png": ("蜜瓜号boss多形态素材.png", (448, 482, 1038, 1080), 540),
    "bosses/migua/hit.png": ("蜜瓜号boss多形态素材.png", (892, 52, 1432, 438), 440),
    "bosses/migua/death.png": ("蜜瓜号boss多形态素材.png", (1018, 586, 1388, 958), 360),

    # Enemy units.
    "enemies/migua/drone.png": ("蜜瓜小怪.png", (152, 58, 540, 326), 190),
    "enemies/migua/slice_spider.png": ("蜜瓜小怪.png", (764, 58, 1248, 356), 230),
    "enemies/migua/turret.png": ("蜜瓜小怪.png", (130, 366, 570, 664), 220),
    "enemies/migua/jelly_mine.png": ("蜜瓜小怪.png", (778, 344, 1180, 668), 210),
    "enemies/migua/bee_stinger.png": ("蜜瓜小怪.png", (130, 666, 636, 1030), 240),
    "enemies/migua/armor_turtle.png": ("蜜瓜小怪.png", (690, 664, 1328, 1068), 270),

    # Enemy/Boss bullets and VFX.
    "bullets/migua/seed_black_small.png": ("蜜瓜小怪弹幕.png", (682, 20, 790, 152), 74),
    "bullets/migua/seed_black_heavy.png": ("蜜瓜小怪弹幕.png", (1020, 944, 1128, 1062), 104),
    "bullets/migua/seed_gold_small.png": ("蜜瓜小怪弹幕.png", (1136, 944, 1238, 1062), 74),
    "bullets/migua/seed_gold_heavy.png": ("蜜瓜小怪弹幕.png", (1136, 944, 1238, 1062), 104),
    "bullets/migua/slice_arc.png": ("蜜瓜小怪弹幕.png", (718, 724, 1120, 900), 170),
    "bullets/migua/crescent_slice.png": ("蜜瓜小怪弹幕.png", (1068, 724, 1216, 890), 180),
    "bullets/migua/bitten_melon.png": ("蜜瓜号boss弹幕.png", (552, 328, 682, 446), 180),
    "bullets/migua/juice_splash_ball.png": ("蜜瓜小怪弹幕.png", (32, 240, 188, 370), 120),
    "bullets/migua/juice_splash_large.png": ("蜜瓜小怪弹幕.png", (340, 245, 475, 388), 190),
    "bullets/migua/melon_bubble.png": ("蜜瓜号boss弹幕.png", (88, 458, 184, 550), 92),
    "bullets/migua/melon_bubble_medium.png": ("蜜瓜号boss弹幕.png", (274, 478, 358, 562), 126),
    "bullets/migua/melon_bubble_large.png": ("蜜瓜号boss弹幕.png", (376, 465, 490, 580), 158),
    "bullets/migua/ring_burst.png": ("蜜瓜号boss弹幕.png", (844, 556, 1144, 744), 180),
    "bullets/migua/melon_sun.png": ("蜜瓜号boss弹幕.png", (1140, 790, 1375, 1025), 220),
    "bullets/migua/seed_fragment.png": ("蜜瓜小怪弹幕.png", (338, 720, 560, 858), 150),
    "vfx/migua/hit_splash.png": ("蜜瓜小怪弹幕.png", (32, 702, 242, 850), 150),
    "vfx/migua/seed_halo.png": ("蜜瓜小怪弹幕.png", (715, 396, 884, 545), 210),
    "vfx/migua/juice_puddle.png": ("蜜瓜小怪弹幕.png", (47, 420, 195, 528), 240),
    "vfx/migua/pulp_bloom.png": ("蜜瓜小怪弹幕.png", (555, 704, 710, 880), 260),
    "vfx/migua/warning_ring.png": ("蜜瓜小怪弹幕.png", (846, 940, 932, 1038), 112),
    "vfx/migua/warning_triangle.png": ("蜜瓜小怪弹幕.png", (934, 940, 1032, 1038), 112),
    "vfx/migua/juice_beam_core.png": ("蜜瓜小怪弹幕.png", (610, 552, 1128, 648), 440),
    "vfx/migua/juice_beam_glow.png": ("蜜瓜小怪弹幕.png", (604, 642, 1128, 724), 460),
    "vfx/migua/juice_cloud.png": ("蜜瓜小怪弹幕.png", (34, 572, 610, 666), 320),
    "vfx/migua/fruit_pulp_cloud.png": ("蜜瓜小怪弹幕.png", (34, 552, 672, 690), 360),
    "vfx/migua/boss_bloom.png": ("蜜瓜号boss弹幕2.png", (582, 262, 842, 514), 250),
    "vfx/migua/boss_final_burst.png": ("蜜瓜号boss弹幕2.png", (1184, 66, 1438, 282), 300),

    # Dedicated boss bar UI.
    "ui/migua/boss_bar_frame.png": ("蜜瓜号boss专属血条UI.png", (0, 44, 1438, 230), 860),
    "ui/migua/boss_bar_damaged_frame.png": ("蜜瓜号boss专属血条UI.png", (0, 242, 1438, 420), 860),
    "ui/migua/boss_bar_fill_green.png": ("蜜瓜号boss专属血条UI.png", (224, 96, 1268, 176), 720),
    "ui/migua/boss_bar_fill_pink.png": ("蜜瓜号boss专属血条UI.png", (224, 292, 1268, 356), 720),
    "ui/migua/boss_bar_seed_marks.png": ("蜜瓜号boss专属血条UI.png", (320, 84, 1212, 190), 700),
    "ui/migua/boss_nameplate.png": ("蜜瓜号boss专属血条UI.png", (12, 438, 604, 612), 430),
    "ui/migua/boss_phase_warning.png": ("蜜瓜号boss专属血条UI.png", (824, 476, 1128, 626), 260),
}


MIGUA_BAR_LAYER_SRC = "ChatGPT Image 2026年6月30日 22_38_32 (2).png"
MIGUA_BAR_UI_SRC = "ChatGPT Image 2026年6月30日 22_38_31 (1).png"
MIGUA_BAR_ICON_SRC = "ChatGPT Image 2026年6月30日 22_38_32 (3).png"

BAR_LAYERS: dict[str, tuple[str, tuple[int, int, int, int], int, bool]] = {
    # Slot layers crop only the usable fill groove. The source rows also contain
    # decorative end caps and green-screen margins, which must not be rendered
    # as the dynamic fill.
    "ui/migua/migua_bar_empty.png": (MIGUA_BAR_LAYER_SRC, (455, 985, 1284, 1048), 860, True),
    "ui/migua/migua_bar_fill_green.png": (MIGUA_BAR_LAYER_SRC, (455, 90, 1284, 154), 860, True),
    "ui/migua/migua_bar_fill_red.png": (MIGUA_BAR_LAYER_SRC, (455, 218, 1284, 282), 860, True),
    "ui/migua/migua_bar_gloss.png": (MIGUA_BAR_LAYER_SRC, (455, 372, 1284, 430), 860, True),
    "ui/migua/migua_bar_seed_ticks.png": (MIGUA_BAR_LAYER_SRC, (455, 493, 1284, 548), 860, True),
    "ui/migua/migua_bar_crack.png": (MIGUA_BAR_LAYER_SRC, (455, 596, 1284, 660), 860, True),
    "ui/migua/migua_bar_mask.png": (MIGUA_BAR_LAYER_SRC, (455, 835, 1284, 895), 860, True),
    "ui/migua/migua_bar_pulse.png": (MIGUA_BAR_LAYER_SRC, (455, 730, 1284, 784), 860, True),
    "ui/migua/migua_bar_frame.png": (MIGUA_BAR_UI_SRC, (175, 300, 1325, 430), 860, False),
    "ui/migua/migua_bar_portrait_frame.png": (MIGUA_BAR_UI_SRC, (80, 460, 405, 675), 240, True),
    "ui/migua/migua_bar_nameplate.png": (MIGUA_BAR_UI_SRC, (500, 535, 990, 640), 360, True),
    "ui/migua/migua_bar_danger.png": (MIGUA_BAR_ICON_SRC, (1040, 420, 1425, 545), 320, True),
}


def ensure_source() -> None:
    if not SRC.exists():
        raise SystemExit(f"Migua source folder not found: {SRC}")


def clean_rgba(image: Image.Image) -> Image.Image:
    src = np.asarray(image.convert("RGBA")).astype(np.float32)
    out = src.copy()
    r, g, b, alpha = (src[..., i] for i in range(4))

    key_green = (alpha > 0) & (g > 160) & (r < 72) & (b < 92) & ((g - np.maximum(r, b)) > 90)
    if key_green.any():
        # Expand with a cheap 3x3 neighborhood to remove separator-line fringe.
        padded = np.pad(key_green, 1, mode="constant", constant_values=False)
        expanded = np.zeros_like(key_green)
        for oy in range(3):
            for ox in range(3):
                expanded |= padded[oy:oy + key_green.shape[0], ox:ox + key_green.shape[1]]
        out[..., 3][expanded] = 0

    # Desaturate tiny remaining green spill on semi-transparent edges only.
    spill = (alpha > 0) & (alpha < 245) & (g > r * 1.12) & (g > b * 1.08)
    max_rb = np.maximum(r, b)
    out[..., 1][spill] = np.minimum(out[..., 1][spill], max_rb[spill] + 10)

    return Image.fromarray(np.clip(out, 0, 255).astype(np.uint8), "RGBA")


def trim_alpha(image: Image.Image, pad: int = 4) -> Image.Image:
    alpha = image.getchannel("A")
    bbox = alpha.getbbox()
    if not bbox:
        return image
    x0, y0, x1, y1 = bbox
    x0 = max(0, x0 - pad)
    y0 = max(0, y0 - pad)
    x1 = min(image.width, x1 + pad)
    y1 = min(image.height, y1 + pad)
    return image.crop((x0, y0, x1, y1))


def fit_max_side(image: Image.Image, max_side: int) -> Image.Image:
    if max(image.size) <= max_side:
        return image
    out = image.copy()
    out.thumbnail((max_side, max_side), Image.Resampling.LANCZOS)
    return out


def clear_rounded_alpha(image: Image.Image, box: tuple[int, int, int, int], radius: int) -> Image.Image:
    out = image.copy()
    alpha = out.getchannel("A")
    draw = ImageDraw.Draw(alpha)
    draw.rounded_rectangle(box, radius=radius, fill=0)
    out.putalpha(alpha)
    return out


def tint_fill_yellow(image: Image.Image) -> Image.Image:
    arr = np.asarray(image.convert("RGBA")).astype(np.float32)
    alpha = arr[..., 3]
    live = alpha > 0
    target = np.array([255, 225, 82], dtype=np.float32)
    arr[..., :3][live] = arr[..., :3][live] * 0.58 + target * 0.42
    arr[..., 0][live] = np.minimum(255, arr[..., 0][live] * 1.10)
    arr[..., 1][live] = np.minimum(255, arr[..., 1][live] * 1.05)
    arr[..., 2][live] = np.minimum(255, arr[..., 2][live] * 0.72)
    return Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8), "RGBA")


def residual_green_pixels(image: Image.Image) -> int:
    arr = np.asarray(image.convert("RGBA"))
    r, g, b, a = (arr[..., i] for i in range(4))
    mask = (a > 8) & (g > 150) & (r < 76) & (b < 96) & ((g.astype(np.int16) - np.maximum(r, b).astype(np.int16)) > 82)
    return int(mask.sum())


def save_map(rel: str, src_name: str) -> tuple[str, int, tuple[int, int]]:
    src = Image.open(SRC / src_name).convert("RGB")
    out = ROOT / "assets" / rel
    out.parent.mkdir(parents=True, exist_ok=True)
    src.save(out)
    return rel, 0, src.size


def save_sprite(rel: str, src_name: str, box: tuple[int, int, int, int], max_side: int) -> tuple[str, int, tuple[int, int]]:
    src = Image.open(SRC / src_name)
    crop = src.crop(box)
    crop = clean_rgba(crop)
    crop = trim_alpha(crop)
    crop = fit_max_side(crop, max_side)
    out = ROOT / "assets" / rel
    out.parent.mkdir(parents=True, exist_ok=True)
    crop.save(out)
    return rel, residual_green_pixels(crop), crop.size


def save_bar_layer(rel: str, src_name: str, box: tuple[int, int, int, int], max_side: int, trim: bool = True) -> tuple[str, int, tuple[int, int]]:
    src = Image.open(SRC / src_name)
    crop = clean_rgba(src.crop(box))
    if rel.endswith("migua_bar_frame.png"):
        # The source frame sheet includes a pale placeholder in the slot.
        # Runtime fill must show through the slot, so cut only the interior out.
        crop = clear_rounded_alpha(crop, (34, 27, crop.width - 34, crop.height - 25), 34)
    if trim:
        crop = trim_alpha(crop)
    crop = fit_max_side(crop, max_side)
    out = ROOT / "assets" / rel
    out.parent.mkdir(parents=True, exist_ok=True)
    crop.save(out)
    return rel, residual_green_pixels(crop), crop.size


def save_yellow_fill() -> tuple[str, int, tuple[int, int]]:
    green_path = ROOT / "assets" / "ui/migua/migua_bar_fill_green.png"
    out_rel = "ui/migua/migua_bar_fill_yellow.png"
    out = ROOT / "assets" / out_rel
    yellow = tint_fill_yellow(Image.open(green_path))
    yellow.save(out)
    return out_rel, residual_green_pixels(yellow), yellow.size


def make_preview(paths: list[Path], out_name: str) -> None:
    thumbs: list[tuple[Path, Image.Image]] = []
    for p in paths:
        im = Image.open(p).convert("RGBA")
        im.thumbnail((150, 150), Image.Resampling.LANCZOS)
        thumbs.append((p, im.copy()))
    if not thumbs:
        return

    cols = 5
    cell_w, cell_h = 184, 190
    rows = (len(thumbs) + cols - 1) // cols
    sheet = Image.new("RGBA", (cols * cell_w, rows * cell_h), (18, 22, 16, 255))
    draw = ImageDraw.Draw(sheet)
    for idx, (path, im) in enumerate(thumbs):
        x = (idx % cols) * cell_w
        y = (idx // cols) * cell_h
        checker = Image.new("RGBA", (cell_w - 14, cell_h - 38), (28, 36, 28, 255))
        checker = ImageOps.expand(checker, border=1, fill=(92, 128, 92, 255))
        sheet.alpha_composite(checker, (x + 7, y + 7))
        sheet.alpha_composite(im, (x + 7 + (cell_w - 14 - im.width) // 2, y + 10 + (cell_h - 44 - im.height) // 2))
        draw.text((x + 8, y + cell_h - 28), path.name[:24], fill=(230, 255, 218, 255))
    PREVIEW_DIR.mkdir(parents=True, exist_ok=True)
    sheet.save(PREVIEW_DIR / out_name)


def main() -> None:
    ensure_source()
    written: list[Path] = []
    report: list[str] = []

    for rel, (src_name, _label) in MAPS.items():
        name, green, size = save_map(rel, src_name)
        written.append(ROOT / "assets" / name)
        report.append(f"{name}\tgreen={green}\tsize={size[0]}x{size[1]}")

    for rel, (src_name, box, max_side) in SPRITES.items():
        name, green, size = save_sprite(rel, src_name, box, max_side)
        written.append(ROOT / "assets" / name)
        report.append(f"{name}\tgreen={green}\tsize={size[0]}x{size[1]}")

    for rel, (src_name, box, max_side, trim) in BAR_LAYERS.items():
        name, green, size = save_bar_layer(rel, src_name, box, max_side, trim)
        written.append(ROOT / "assets" / name)
        report.append(f"{name}\tgreen={green}\tsize={size[0]}x{size[1]}")

    name, green, size = save_yellow_fill()
    written.append(ROOT / "assets" / name)
    report.append(f"{name}\tgreen={green}\tsize={size[0]}x{size[1]}")

    make_preview([p for p in written if "/backgrounds/" not in p.as_posix()], "migua_sprites_preview.png")
    make_preview([p for p in written if "/backgrounds/" in p.as_posix()], "migua_maps_preview.png")

    PREVIEW_DIR.mkdir(parents=True, exist_ok=True)
    (PREVIEW_DIR / "migua_residual_green_report.tsv").write_text("\n".join(report) + "\n", encoding="utf-8")
    total_green = sum(int(line.split("green=")[1].split("\t")[0]) for line in report)
    print(f"Wrote {len(written)} Migua assets. residual_green_pixels={total_green}")
    print(f"Preview: {PREVIEW_DIR}")


if __name__ == "__main__":
    main()
