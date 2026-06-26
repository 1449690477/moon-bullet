# -*- coding: utf-8 -*-
"""Extract and clean the Mother of Life game assets from the supplied sheets."""

from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageEnhance, ImageFilter, ImageOps
from scipy import ndimage


ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "s生命之母素材"
OUT = ROOT / "assets/player/mother_life"

STRICT_EDGE_ASSETS = {
    "ribbons/ribbon_tip.png",
    "ribbons/ribbon_origin.png",
    "ribbons/ribbon_impact.png",
    "ribbons/ribbon_soft_01.png",
    "ribbons/ribbon_soft_02.png",
    "ribbons/ribbon_soft_03.png",
    "ribbons/ribbon_body_01.png",
    "ribbons/ribbon_body_02.png",
    "ribbons/ribbon_body_03.png",
    "ribbons/ribbon_orbit.png",
    "ribbons/ribbon_figure8.png",
    "ribbons/ribbon_spiral.png",
    "ribbons/ribbon_overdrive_wrap.png",
    "ribbons/ribbon_overdrive_cocoon.png",
    "ribbons/ship_side_ribbon.png",
    "ship/ship_crown.png",
    "ship/ship_heart_detail.png",
    "ultimate/start_bud.png",
    "ultimate/start_half_bloom.png",
    "ultimate/start_bloom.png",
    "ultimate/v4_start_bud.png",
    "ultimate/v4_start_half_bloom.png",
    "ultimate/v4_start_open_bloom.png",
    "ultimate/v4_final_bloom.png",
    "ultimate/v4_final_burst.png",
    "particles/v4_petal_cluster.png",
    "particles/v4_star.png",
    "ultimate/domain_lotus.png",
    "ultimate/domain_circle.png",
    "ultimate/domain_halo.png",
    "ultimate/final_bloom.png",
    "ultimate/final_afterglow.png",
    "ultimate/final_petal_burst.png",
    "ultimate/final_heart.png",
    "ultimate/final_shockwave.png",
    "ultimate/crystal_shard.png",
    "ultimate/domain_sanctuary.png",
    "ultimate/domain_inner_circle.png",
    "ultimate/afterglow_lotus.png",
}
KEEP_LARGEST_ASSETS = {
    "ship/ship_main.png",
    "ribbons/ribbon_overdrive_wrap.png",
    "ribbons/ribbon_overdrive_cocoon.png",
    "ribbons/ship_side_ribbon.png",
    "ship/ship_crown.png",
    "ship/ship_heart_detail.png",
}


ASSETS = {
    # name: (sheet, crop box, max dimension)
    "ship/ship_main.png": ("13845d42a9dd84308b15b99d75ad407f.png", (720, 15, 1235, 520), 720),
    "ship/ship_heart.png": ("机身贴图.png", (235, 925, 420, 1085), 256),
    "ship/ship_halo.png": ("机身贴图.png", (20, 930, 235, 1085), 256),
    "ship/ship_crown.png": ("机体细节部分素材.png", (5, 115, 250, 210), 320),
    "ship/ship_heart_detail.png": ("机体细节部分素材.png", (5, 195, 140, 370), 256),
    "ribbons/ribbon_tip.png": ("合集素材补充.png", (495, 0, 638, 92), 192),
    "ribbons/ribbon_origin.png": ("合集素材补充.png", (0, 140, 112, 292), 192),
    "ribbons/ribbon_impact.png": ("大招素材补充.png", (1060, 790, 1254, 1005), 256),
    "ribbons/ribbon_soft_01.png": ("合集素材补充.png", (8, 5, 625, 78), 640),
    "ribbons/ribbon_soft_02.png": ("合集素材补充.png", (8, 70, 625, 160), 640),
    "ribbons/ribbon_soft_03.png": ("合集素材补充.png", (8, 145, 625, 280), 640),
    "ribbons/ribbon_body_01.png": ("合集素材补充.png", (82, 5, 505, 78), 480),
    "ribbons/ribbon_body_02.png": ("合集素材补充.png", (82, 70, 505, 160), 480),
    "ribbons/ribbon_body_03.png": ("合集素材补充.png", (82, 145, 480, 280), 480),
    "ribbons/ribbon_orbit.png": ("飘带质感贴图补充.png", (12, 18, 374, 126), 420),
    "ribbons/ribbon_figure8.png": ("飘带质感贴图补充.png", (10, 252, 374, 554), 420),
    "ribbons/ribbon_spiral.png": ("飘带质感贴图补充.png", (392, 20, 576, 420), 420),
    "ribbons/ribbon_overdrive_wrap.png": ("54cd559e0e7e158160bb948abafe75a7.png", (735, 290, 1145, 625), 460),
    "ribbons/ribbon_overdrive_cocoon.png": ("54cd559e0e7e158160bb948abafe75a7.png", (185, 535, 575, 905), 460),
    "ribbons/ship_side_ribbon.png": ("机体细节部分素材.png", (875, 180, 1070, 515), 420),
    "skill/life_node.png": ("大招素材补充.png", (18, 370, 160, 510), 224),
    "skill/main_target.png": ("大招素材补充.png", (400, 525, 570, 708), 288),
    "skill/resonance_core.png": ("大招素材补充.png", (235, 535, 400, 705), 288),
    "icons/icon_resonance.png": ("大招 小技能 等技能图标素材.png", (620, 80, 940, 405), 256),
    "icons/icon_ultimate.png": ("大招素材补充.png", (1035, 4, 1238, 176), 256),
    "icons/icon_reverse.png": ("大招 小技能 等技能图标素材.png", (335, 455, 605, 720), 256),
    "ultimate/start_bud.png": ("afa10f843c0f4d2b81424e5953c7ad57.png", (140, 45, 495, 385), 300),
    "ultimate/start_half_bloom.png": ("afa10f843c0f4d2b81424e5953c7ad57.png", (720, 35, 1100, 385), 360),
    "ultimate/start_bloom.png": ("afa10f843c0f4d2b81424e5953c7ad57.png", (80, 425, 520, 820), 440),
    "ultimate/v4_start_bud.png": ("大招优化贴图 3-花朵.png", (90, 15, 350, 325), 360),
    "ultimate/v4_start_half_bloom.png": ("大招优化贴图 3-花朵.png", (420, 20, 815, 335), 440),
    "ultimate/v4_start_open_bloom.png": ("大招优化贴图 3-花朵.png", (830, 15, 1250, 335), 480),
    "ultimate/v4_final_bloom.png": ("大招优化贴图 3-花朵.png", (395, 340, 825, 665), 520),
    "ultimate/v4_final_burst.png": ("大招优化贴图 4-花朵爆发.png", (15, 0, 490, 315), 560),
    "ultimate/domain_lotus.png": ("大招素材补充.png", (8, 176, 226, 366), 360),
    "ultimate/domain_circle.png": ("大招素材补充.png", (866, 340, 1245, 548), 520),
    "ultimate/domain_halo.png": ("c2aedb4ac1457d08b376c1708be87d3e.png", (670, 25, 1215, 285), 560),
    "ultimate/final_bloom.png": ("afa10f843c0f4d2b81424e5953c7ad57.png", (555, 390, 1175, 840), 680),
    "ultimate/final_afterglow.png": ("afa10f843c0f4d2b81424e5953c7ad57.png", (95, 830, 525, 1215), 520),
    "ultimate/final_petal_burst.png": ("afa10f843c0f4d2b81424e5953c7ad57.png", (560, 825, 1205, 1245), 680),
    "ultimate/final_heart.png": ("大招素材补充.png", (235, 535, 400, 705), 300),
    "ultimate/final_shockwave.png": ("大招绽放花朵 特效等素材补充.png", (0, 314, 338, 552), 500),
    "ultimate/crystal_shard.png": ("大招绽放花朵 特效等素材补充.png", (15, 548, 118, 738), 220),
    "ultimate/domain_sanctuary.png": ("c2aedb4ac1457d08b376c1708be87d3e.png", (20, 670, 615, 965), 620),
    "ultimate/domain_inner_circle.png": ("c2aedb4ac1457d08b376c1708be87d3e.png", (35, 350, 605, 615), 580),
    "ultimate/afterglow_lotus.png": ("afa10f843c0f4d2b81424e5953c7ad57.png", (95, 830, 525, 1215), 520),
    "particles/petal.png": ("大招素材补充.png", (720, 704, 795, 790), 160),
    "particles/butterfly.png": ("大招素材补充.png", (1050, 702, 1140, 798), 160),
    "particles/heal_orb.png": ("大招绽放花朵 特效等素材补充.png", (825, 915, 955, 1050), 160),
    "particles/v4_petal_cluster.png": ("大招优化贴图 2 粒子贴图.png", (345, 40, 650, 285), 320),
    "particles/v4_star.png": ("大招优化贴图 2 粒子贴图.png", (700, 25, 870, 270), 220),
}


def clean_rgba(image: Image.Image, gentle: bool = False) -> Image.Image:
    src = np.asarray(image.convert("RGBA")).astype(np.float32)
    out = src.copy()
    r, g, b, alpha = (src[..., i] for i in range(4))
    max_rb = np.maximum(r, b)

    dominance = g - max_rb
    if gentle:
        hard_key = (
            (alpha > 0)
            & (g > 118)
            & (dominance > 42)
            & (g > r * 1.38)
            & (g > b * 1.28)
        )
    else:
        hard_key = (
            (alpha > 0)
            & (g > 88)
            & (dominance > 18)
            & (g > r * 1.10)
            & (g > b * 1.08)
        )

    # The supplied sheets already have alpha, but the antialiased fringe still
    # contains bright key green. Expand the key by 2px, feather it by 0.7px,
    # then contract the remaining edge by one pixel.
    expanded = ndimage.binary_dilation(hard_key, iterations=1 if gentle else 2)
    matte = ndimage.gaussian_filter(expanded.astype(np.float32), sigma=0.45 if gentle else 0.7)
    out[..., 3] = alpha * (1.0 - np.clip(matte, 0.0, 1.0))
    if not gentle:
        out[..., 3] = ndimage.minimum_filter(out[..., 3], size=3)

    # Despill every surviving translucent pixel. The source art is pink-white,
    # so redirecting residual green into red/blue preserves its intended hue.
    spill = np.clip((g - max_rb - 2.0) / 56.0, 0.0, 1.0)
    out[..., 0] = np.clip(r + spill * 30.0, 0, 255)
    out[..., 1] = np.minimum(g, max_rb + 7.0)
    out[..., 2] = np.clip(b + spill * 22.0, 0, 255)

    # Remove isolated key-colored dust without deleting authored petals.
    alive = out[..., 3] > 6
    labels, count = ndimage.label(alive)
    if count:
        sizes = np.bincount(labels.ravel())
        remove = sizes < 6
        remove[0] = False
        out[..., 3][remove[labels]] = 0

    return Image.fromarray(np.clip(out, 0, 255).astype(np.uint8), "RGBA")


def trim(image: Image.Image, pad: int = 6) -> Image.Image:
    alpha = np.asarray(image.getchannel("A"))
    ys, xs = np.where(alpha > 8)
    if len(xs) == 0:
        return image
    x0 = max(0, int(xs.min()) - pad)
    y0 = max(0, int(ys.min()) - pad)
    x1 = min(image.width, int(xs.max()) + pad + 1)
    y1 = min(image.height, int(ys.max()) + pad + 1)
    return image.crop((x0, y0, x1, y1))


def polish_ship(image: Image.Image) -> Image.Image:
    alpha = image.getchannel("A")
    rgb = image.convert("RGB")
    rgb = ImageEnhance.Brightness(rgb).enhance(0.87)
    rgb = ImageEnhance.Color(rgb).enhance(1.42)
    rgb = ImageEnhance.Contrast(rgb).enhance(1.18)
    rgb = ImageEnhance.Sharpness(rgb).enhance(1.22)
    data = np.asarray(rgb).astype(np.int16)
    data[..., 0] = np.clip(data[..., 0] + 12, 0, 255)
    data[..., 1] = np.clip(data[..., 1] - 8, 0, 255)
    data[..., 2] = np.clip(data[..., 2] + 4, 0, 255)
    result = Image.fromarray(data.astype(np.uint8), "RGB").convert("RGBA")
    result.putalpha(alpha)
    return result


def keep_largest_component(image: Image.Image) -> Image.Image:
    data = np.asarray(image.convert("RGBA")).copy()
    alpha = data[..., 3]
    mask = ndimage.binary_dilation(alpha > 8, iterations=2)
    labels, count = ndimage.label(mask)
    if count <= 1:
        return image
    sizes = np.bincount(labels.ravel())
    sizes[0] = 0
    keep = int(sizes.argmax())
    data[..., 3][labels != keep] = 0
    return Image.fromarray(data, "RGBA")


def isolate_sheet_subject(rel: str, image: Image.Image) -> Image.Image:
    data = np.asarray(image.convert("RGBA")).copy()
    h, w = data.shape[:2]
    yy, xx = np.mgrid[0:h, 0:w]
    if rel == "ribbons/ship_side_ribbon.png":
        points = np.array([
            [w * 0.78, h * 0.02],
            [w * 0.65, h * 0.15],
            [w * 0.46, h * 0.27],
            [w * 0.24, h * 0.43],
            [w * 0.50, h * 0.58],
            [w * 0.63, h * 0.70],
            [w * 0.40, h * 0.84],
            [w * 0.28, h * 0.98],
        ])
        distance = np.full((h, w), np.inf, dtype=np.float32)
        for a, b in zip(points[:-1], points[1:]):
            vx, vy = b - a
            denom = max(1.0, float(vx * vx + vy * vy))
            t = np.clip(((xx - a[0]) * vx + (yy - a[1]) * vy) / denom, 0.0, 1.0)
            px = a[0] + t * vx
            py = a[1] + t * vy
            distance = np.minimum(distance, np.hypot(xx - px, yy - py))
        feather = np.clip((w * 0.19 - distance) / max(1.0, w * 0.045), 0.0, 1.0)
        data[..., 3] = np.clip(data[..., 3].astype(np.float32) * feather, 0, 255).astype(np.uint8)
        data[..., 3][(xx < w * 0.32) & (yy < h * 0.32)] = 0
        data[..., 3][xx > w * 0.80] = 0
        data[..., 3][(xx < w * 0.16) & (yy > h * 0.72)] = 0
        data[..., 3][(xx > w * 0.67) & (yy > h * 0.76)] = 0
        return Image.fromarray(data, "RGBA")
    ellipses = {
        "ultimate/domain_sanctuary.png": (w * 0.50, h * 0.48, w * 0.495, h * 0.475),
        "ultimate/domain_inner_circle.png": (w * 0.50, h * 0.48, w * 0.48, h * 0.47),
        "ultimate/afterglow_lotus.png": (w * 0.50, h * 0.53, w * 0.48, h * 0.46),
    }
    if rel not in ellipses:
        return image
    cx, cy, rx, ry = ellipses[rel]
    distance = ((xx - cx) / rx) ** 2 + ((yy - cy) / ry) ** 2
    feather = np.clip((1.04 - distance) / 0.04, 0.0, 1.0)
    data[..., 3] = np.clip(data[..., 3].astype(np.float32) * feather, 0, 255).astype(np.uint8)
    if rel == "ultimate/domain_sanctuary.png":
        data[..., 3][(yy > h * 0.74) & (xx < w * 0.40)] = 0
        data[..., 3][(yy > h * 0.70) & (xx > w * 0.77)] = 0
    elif rel == "ultimate/domain_inner_circle.png":
        data[..., 3][xx < w * 0.035] = 0
    elif rel == "ultimate/afterglow_lotus.png":
        data[..., 3][(yy < h * 0.25) & (xx < w * 0.40)] = 0
        data[..., 3][(yy < h * 0.16) & (xx > w * 0.70)] = 0
        data[..., 3][(yy > h * 0.82) & (xx > w * 0.78)] = 0
    return Image.fromarray(data, "RGBA")


def save_asset(rel: str, sheet: str, box: tuple[int, int, int, int], max_dim: int) -> Image.Image:
    source = Image.open(SRC / sheet).convert("RGBA")
    image = clean_rgba(
        source.crop(box),
        gentle=rel in {"ship/ship_main.png", "ribbons/ship_side_ribbon.png"},
    )
    if rel in KEEP_LARGEST_ASSETS:
        image = keep_largest_component(image)
        image = isolate_sheet_subject(rel, image)
    image = trim(image)
    image = ImageOps.expand(image, border=6, fill=(0, 0, 0, 0))
    if rel == "ship/ship_main.png":
        arr = np.asarray(image).copy()
        # The source sheet places a separate side-view fragment beside the
        # main front view. It overlaps the crop only in this lower-right corner.
        yy, xx = np.mgrid[0 : arr.shape[0], 0 : arr.shape[1]]
        corner_fragment = (
            ((xx < arr.shape[1] * 0.30) | (xx > arr.shape[1] * 0.70))
            & (yy > arr.shape[0] * 0.70)
        )
        arr[corner_fragment, 3] = 0
        image = trim(Image.fromarray(arr, "RGBA"))
        image = polish_ship(image)
    if max(image.size) > max_dim:
        scale = max_dim / max(image.size)
        image = image.resize(
            (max(1, round(image.width * scale)), max(1, round(image.height * scale))),
            Image.Resampling.LANCZOS,
        )
    path = OUT / rel
    path.parent.mkdir(parents=True, exist_ok=True)
    image.save(path, optimize=True)
    print(f"{rel}: {image.width}x{image.height}")
    return image


def build_portraits(ship: Image.Image) -> None:
    # The project uses square avatars and tall skill cut-ins. Both are derived
    # from the supplied final crystal-tail front view to keep the identity exact.
    avatar = Image.new("RGBA", (256, 256), (0, 0, 0, 0))
    copy = ship.copy()
    copy.thumbnail((246, 246), Image.Resampling.LANCZOS)
    avatar.alpha_composite(copy, ((256 - copy.width) // 2, (256 - copy.height) // 2))
    avatar = ImageEnhance.Contrast(avatar).enhance(1.06)
    avatar.save(OUT / "ship/avatar.png", optimize=True)

    cutin = Image.new("RGBA", (560, 760), (0, 0, 0, 0))
    large = ship.copy()
    large.thumbnail((540, 740), Image.Resampling.LANCZOS)
    cutin.alpha_composite(large, ((560 - large.width) // 2, (760 - large.height) // 2))
    cutin = cutin.filter(ImageFilter.UnsharpMask(radius=0.8, percent=85, threshold=3))
    cutin.save(OUT / "ship/cutin.png", optimize=True)
    print("ship/avatar.png: 256x256")
    print("ship/cutin.png: 560x760")


def residual_green_ratio(image: Image.Image) -> float:
    data = np.asarray(image.convert("RGBA"))
    r, g, b, alpha = (data[..., i].astype(np.float32) for i in range(4))
    visible = alpha > 12
    green = visible & (g > 70) & (g > r * 1.12) & (g > b * 1.12)
    return float(green.sum() / max(1, visible.sum()))


def validate_asset(rel: str, image: Image.Image) -> None:
    alpha = np.asarray(image.getchannel("A"))
    border = np.concatenate((alpha[0], alpha[-1], alpha[:, 0], alpha[:, -1]))
    green_ratio = residual_green_ratio(image)
    if green_ratio >= 0.001:
        raise RuntimeError(f"{rel}: residual green {green_ratio:.3%} exceeds 0.1%")
    if rel in STRICT_EDGE_ASSETS and np.mean(border > 8) > 0.015:
        raise RuntimeError(f"{rel}: non-transparent crop border suggests a clipped sprite")


def contact_sheets() -> None:
    files = sorted(path for path in OUT.rglob("*.png") if not path.name.startswith("asset_preview_"))
    tile = 180
    cols = 5
    rows = (len(files) + cols - 1) // cols
    backgrounds = {
        "black": (12, 10, 18),
        "white": (245, 245, 245),
        "checker": None,
    }
    for label, color in backgrounds.items():
        sheet = Image.new("RGB", (cols * tile, rows * (tile + 30)), color or (30, 30, 30))
        draw = ImageDraw.Draw(sheet)
        if color is None:
            cell = 18
            for y in range(0, sheet.height, cell):
                for x in range(0, sheet.width, cell):
                    shade = 62 if ((x // cell) + (y // cell)) % 2 else 36
                    draw.rectangle((x, y, x + cell, y + cell), fill=(shade, shade, shade))
        for i, path in enumerate(files):
            image = Image.open(path).convert("RGBA")
            preview = image.copy()
            preview.thumbnail((tile - 12, tile - 12), Image.Resampling.LANCZOS)
            x = i % cols * tile + (tile - preview.width) // 2
            y = i // cols * (tile + 30) + (tile - preview.height) // 2
            tile_bg = Image.new("RGBA", preview.size, (0, 0, 0, 0))
            tile_bg.alpha_composite(preview)
            sheet.paste(tile_bg, (x, y), tile_bg)
            draw.text((i % cols * tile + 5, i // cols * (tile + 30) + tile + 4), path.name[:24], fill=(220, 220, 220) if label != "white" else (35, 35, 35))
        sheet.save(OUT / f"asset_preview_{label}.png", optimize=True)


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    built = {}
    for rel, spec in ASSETS.items():
        built[rel] = save_asset(rel, *spec)
        validate_asset(rel, built[rel])
    build_portraits(built["ship/ship_main.png"])
    validate_asset("ship/avatar.png", Image.open(OUT / "ship/avatar.png"))
    validate_asset("ship/cutin.png", Image.open(OUT / "ship/cutin.png"))
    contact_sheets()


if __name__ == "__main__":
    main()
