#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
从「素材文件夹 一定优先使用！」批量导入尚未接入的高价值资源：
  - 弹幕 → assets/bullets_v3/
  - 海洋小怪 → assets/enemies_v2/（补齐未用变体）
  - 关卡背景 → assets/backgrounds/
  - 云层视差 → assets/backgrounds/clouds/
  - Boss 立绘 → assets/bosses/
  - 技能/命中 VFX → assets/vfx/extra/

严格按类别处理，跳过 UI / 3D PBR / FMOD。
"""
from __future__ import annotations

import os
from pathlib import Path

import numpy as np
from PIL import Image, ImageEnhance, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "素材文件夹 一定优先使用！"
SPR = SRC / "sprites_png"
TEX = SRC / "textures_png"

OUT_B = ROOT / "assets" / "bullets_v3"
OUT_E = ROOT / "assets" / "enemies_v2"
OUT_BG = ROOT / "assets" / "backgrounds"
OUT_CLOUD = OUT_BG / "clouds"
OUT_BOSS = ROOT / "assets" / "bosses"
OUT_VFX = ROOT / "assets" / "vfx" / "extra"

BARRAGE = SPR / "source_barrage/bulletsource/texture/barragetex/barragetexinfo"
ENEMY_TEX = SPR / "prefab_enemeymodel/texturemodel"
BG_FIGHT = SPR / "source_home/fight/background"
CLOUD_MAP = TEX / "cloud_map/tex"
BOSS_AV = SPR / "source_avatar/enemy_big"
VFX_DIRS = [
    SPR / "source_effect/tx_tex",
    SPR / "source_effect/tx_tex2",
    SPR / "source_effect/tx_tex3",
]

# ── 弹幕：未导入的高辨识度贴图（跳过已在 bullets / bullets_v2 的）──
BULLETS = {
    # 基础几何变体
    "1002_N": "orb_teal",
    "1004_N": "orb_lime",
    "1005_N": "orb_amber",
    "1008_N": "shuriken_cyan",
    "1009_N": "blade_cyan",
    "1012_N": "ring_violet",
    "1014_N": "star_cyan",
    "1016_N": "petal_violet",
    "1017_N": "jewel_ruby",
    "1018_N": "orb_mint",
    "1025_N": "candy_round",
    "1026_N_r": "gem_red",
    "1026_N_b": "gem_blue",
    "1026_N_lv": "gem_green",
    "1027_N": "spike_white",
    "1029_N": "orb_rose",
    "1031_N_fire": "ember_orb",
    "1031_N_zi": "ember_violet",
    # Boss 专属弹形
    "Boss01_BaoZhu01_01": "firecracker",
    "Boss02_Bullet01": "boss_pellet",
    "Boss02_Bullet01_lv": "boss_pellet_green",
    "Boss06_zidan_001": "boss_needle_gold",
    "Boss07_z_bing03": "ice_spike",
    "Boss07_z_bing04": "ice_crystal",
    "Boss16_GuangQiu04_02": "gloworb_cyan",
    "Boss17_GuangQiu04_03": "gloworb_pink",
    "Boss23_L_dian01_01": "spark_bolt",
    "Boss25_hongdian04": "dot_crimson",
    "Boss26_shetou01": "tongue_blade",
    "Boss27_shetou02": "tongue_fork",
    "Boss31_Zid_sanjiao-y": "tri_gold",
    "Boss31_Zid_sanjiao-zi": "tri_violet",
    "Boss32_Zid_lanfang": "diamond_blue",
    "Boss32_Zid_zfang_zi": "diamond_violet",
    "Boss33_Zid_wj_y": "knife_gold",
    "Boss33_Zid_wj_zi": "knife_violet",
    "Boss34_Zid_lj-y": "wedge_gold",
    "Boss34_Zid_lj-zi": "wedge_violet",
    "Boss35_b": "star_blue3",
    "Boss35_r": "star_red3",
    "Boss35_y": "star_gold3",
    "Boss35_zi": "star_violet3",
    "Boss36_b": "star_blue4",
    "boss37_sy_h": "petal_blade_cyan",
    "boss37_sy_red": "petal_blade_red",
    "boss37_sy_zi": "petal_blade_violet",
    "boss37_yh_h": "moon_blade_cyan",
    "boss37_yh_red": "moon_blade_red",
    "boss37_yh_zi": "moon_blade_violet",
    # 自然/糖果/特殊
    "huoqiu02": "fireball2",
    "z_dianqiu02": "thunder_orb2",
    "dao_red": "dao_crimson",
    "z-dao": "dao_steel",
    "T_soul03_1": "soul_cyan",
    "tanguo02-r": "candy_red2",
    "tanguo02-b": "candy_blue2",
    "tanguo02-y": "candy_yellow2",
    "tanguo02-g": "candy_green2",
    "tanguo03-1": "candy_swirl1",
    "tanguo03-2": "candy_swirl2",
    "tanguo03-3": "candy_swirl3",
    "juzi_01": "orange_orb",
    "baozi_01": "baozi_orb",
    "0729gezi0001": "dove_feather",
    "0729gezi0003": "dove_wing",
}

# ── 海洋小怪：未用变体 ──
ENEMIES = {
    "r1_emozhiyan_blue": "blueeye",
    "r1_fufen": "puffdust",
    "r1_haigui": "seaturtle",
    "r1_haitu": "searabbit",
    "r1_longxia": "lobster",
    "r1_sanyechong": "trilobite",
    "r1_shanbei": "scallop",
    "r1_shenyuanshuijing_blue": "bluecryst",
    "r1_shenzhijieming": "abysscall",
    "r1_sycshapeng_yellow": "yellowpuffer",
    "r1_ysjingling": "tidewisp",
    "r1_zhangyu_eye": "octoeye",
}

# ── 关卡背景：禁止从 fight/background 导入（那是横幅/UI，不是场景）──
# 真场景请用 tools/import_verified_scenes.py
BACKGROUNDS = {}

# ── 云层视差 ──
CLOUDS = {
    "cloud_map_01": "cloud_01",
    "cloud_map_02": "cloud_02",
    "cloud_map_03": "cloud_03",
    "cloud_map_04": "cloud_04",
    "cloud_map_05": "cloud_05",
    "cloud_map_06": "cloud_06",
    "cloud_map_07": "cloud_07",
    "cloud_map_08": "cloud_08",
    "bgr_clouds_a": "cloud_dense",
}

# ── 新 Boss（立绘）──
BOSSES = {
    "body_10100010": "nightherald",   # 夜谕使
    "body_10102030": "stormreaver",   # 风暴收割者
    "body_10103041": "crystalmatron", # 晶母
    "body_10105030": "abyssprince",   # 深渊亲王
    "body_10107000": "voidsiren",     # 虚空海妖
}

# ── VFX：命中/爆发/环/刃光 ──
VFX = {
    "DaoGuang01": "vfx_dao_glow",
    "Eff_Ring_52": "vfx_ring_burst",
    "Eff_Sword_003": "vfx_sword_slash",
    "Eff_Sword_004": "vfx_sword_heavy",
    "FireGlowC": "vfx_fire_glow",
    "Z_hit02": "vfx_hit_spark",
    "Z_qiu02": "vfx_orb_burst",
    "Z_qiu02-b": "vfx_orb_burst_b",
    "VFX_Water_01": "vfx_water_ripple",
    "VFX_Water_03": "vfx_water_splash",
    "VFX_Textures_26": "vfx_energy_flare",
    "Eff_Line_61": "vfx_line_flash",
}


def trim(im: Image.Image, athr: int = 8, pad: int = 2) -> Image.Image:
    a = np.asarray(im)
    if a.ndim < 3 or a.shape[2] < 4:
        return im
    al = a[..., 3]
    ys, xs = np.where(al > athr)
    if len(xs) == 0:
        return im
    x0, x1 = max(0, xs.min() - pad), min(im.width, xs.max() + 1 + pad)
    y0, y1 = max(0, ys.min() - pad), min(im.height, ys.max() + 1 + pad)
    return im.crop((x0, y0, x1, y1))


def fit_max(im: Image.Image, maxdim: int) -> Image.Image:
    if max(im.size) <= maxdim:
        return im
    s = maxdim / max(im.size)
    return im.resize(
        (max(1, round(im.width * s)), max(1, round(im.height * s))),
        Image.Resampling.LANCZOS,
    )


def trim_and_square(img: Image.Image, target: int, pad: float = 0.05) -> Image.Image:
    img = trim(img.convert("RGBA"))
    inner = int(target * (1 - 2 * pad))
    w, h = img.size
    scale = inner / max(w, h)
    nw, nh = max(1, int(w * scale)), max(1, int(h * scale))
    img = img.resize((nw, nh), Image.Resampling.LANCZOS)
    canvas = Image.new("RGBA", (target, target), (0, 0, 0, 0))
    canvas.paste(img, ((target - nw) // 2, (target - nh) // 2), img)
    return canvas


def cover(img: Image.Image, tw: int, th: int) -> Image.Image:
    img = img.convert("RGBA")
    w, h = img.size
    s = max(tw / w, th / h)
    img = img.resize((int(w * s), int(h * s)), Image.Resampling.LANCZOS)
    l = (img.width - tw) // 2
    t = (img.height - th) // 2
    return img.crop((l, t, l + tw, t + th))


def save_png(im: Image.Image, path: Path, rgb: bool = False) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    if rgb:
        im.convert("RGB").save(path, "PNG", optimize=True)
    else:
        im.save(path, "PNG", optimize=True)
    print(f"  -> {path.relative_to(ROOT)}  ({im.width}x{im.height})")


def make_boss_variants(base: Image.Image, out_prefix: Path) -> None:
    base.save(f"{out_prefix}_idle.png", "PNG", optimize=True)
    base.save(f"{out_prefix}_phase1.png", "PNG", optimize=True)
    p2 = ImageEnhance.Color(base).enhance(1.2)
    p2.save(f"{out_prefix}_phase2.png", "PNG", optimize=True)
    rage = ImageEnhance.Brightness(base).enhance(1.12)
    r, g, b, a = base.split()
    red = Image.new("RGBA", base.size, (255, 110, 110, 255))
    rage = Image.composite(red, rage, Image.new("L", base.size, 70))
    rage.putalpha(a)
    rage.save(f"{out_prefix}_rage.png", "PNG", optimize=True)
    hit = Image.composite(Image.new("RGBA", base.size, (255, 80, 80, 255)), base, Image.new("L", base.size, 110))
    hit.putalpha(a)
    hit.save(f"{out_prefix}_hit.png", "PNG", optimize=True)
    death = base.filter(ImageFilter.GaussianBlur(radius=2))
    da = death.split()[-1].point(lambda v: int(v * 0.55))
    death.putalpha(da)
    death.save(f"{out_prefix}_death.png", "PNG", optimize=True)


def import_bullets() -> int:
    print("\n=== bullets_v3 ===")
    n = 0
    for stem, key in BULLETS.items():
        src = BARRAGE / f"{stem}__Sprite.png"
        if not src.exists():
            print(f"  !! missing {stem}")
            continue
        im = fit_max(trim(Image.open(src).convert("RGBA")), 64)
        save_png(im, OUT_B / f"{key}.png")
        n += 1
    return n


def import_enemies() -> int:
    print("\n=== enemies_v2 (new) ===")
    n = 0
    for folder, key in ENEMIES.items():
        d = ENEMY_TEX / folder
        cands = sorted(d.glob("*.png")) if d.is_dir() else []
        if not cands:
            print(f"  !! missing {folder}")
            continue
        im = fit_max(trim(Image.open(cands[0]).convert("RGBA")), 150)
        save_png(im, OUT_E / f"{key}.png")
        n += 1
    return n


def import_backgrounds() -> int:
    print("\n=== backgrounds ===")
    print("  skipped: fight/background 是横幅/UI，请用 tools/import_verified_scenes.py")
    return 0


def import_clouds() -> int:
    print("\n=== cloud layers ===")
    n = 0
    for folder, key in CLOUDS.items():
        d = CLOUD_MAP / folder
        cands = sorted(d.glob("*.png")) if d.is_dir() else []
        if not cands:
            print(f"  !! missing cloud {folder}")
            continue
        im = fit_max(trim(Image.open(cands[0]).convert("RGBA")), 1024)
        save_png(im, OUT_CLOUD / f"{key}.png")
        n += 1
    return n


def import_bosses() -> int:
    print("\n=== bosses ===")
    n = 0
    for bid, name in BOSSES.items():
        d = BOSS_AV / bid
        cands = sorted(d.glob("*.png")) if d.is_dir() else []
        if not cands:
            print(f"  !! missing boss {bid}")
            continue
        sq = trim_and_square(Image.open(cands[0]), 768, pad=0.05)
        make_boss_variants(sq, OUT_BOSS / name)
        print(f"  -> bosses/{name}_* (6 variants)")
        n += 1
    return n


def import_vfx() -> int:
    print("\n=== vfx/extra ===")
    n = 0
    index = {}
    for d in VFX_DIRS:
        if not d.is_dir():
            continue
        for p in d.glob("*.png"):
            stem = p.name.replace("__Sprite.png", "").replace(".png", "")
            index[stem] = p
    for stem, key in VFX.items():
        src = index.get(stem)
        if not src:
            print(f"  !! missing vfx {stem}")
            continue
        im = fit_max(trim(Image.open(src).convert("RGBA")), 256)
        save_png(im, OUT_VFX / f"{key}.png")
        n += 1
    return n


def main() -> None:
    print("Import unused assets from 素材文件夹 一定优先使用！")
    counts = {
        "bullets": import_bullets(),
        "enemies": import_enemies(),
        "backgrounds": import_backgrounds(),
        "clouds": import_clouds(),
        "bosses": import_bosses(),
        "vfx": import_vfx(),
    }
    print("\nDONE:", counts)


if __name__ == "__main__":
    main()
