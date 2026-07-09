#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
仅导入已目视确认的竖版战斗场景。

禁止：
  - source_home/fight/background（关卡横幅 / 掉落 UI / Boss 头像）
  - banner_* / img_yitiao_* / 带大字标题的 CG
  - 3D PBR (*_col/*_nrm/*_mos) / lightmap

允许：
  - source_home/img_bg_* 竖版场景
  - source_common/bg 与同类竖版插画
  - prefab_scene/fightsceneprefab 分层合成
"""
from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageEnhance

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "素材文件夹 一定优先使用！" / "textures_png"
OUT = ROOT / "assets" / "backgrounds"
TW, TH = 720, 1280

# 已目视确认：完整竖版环境插画（无 UI 大字 / 掉落图标）
SCENES = {
    "source_home/img_bg_youanmijing/Img_BG_YouAnMiJing__Texture2D.png": "bg_scene_dark_hall.png",
    "source_common/bg/bg_qiyin_bj/bg_qiyin_bj__Texture2D.png": "bg_scene_ember_cavern.png",
    "source_common/bg/bg_renxiaoguida_mengyan/bg_renxiaoguida_mengyan__Texture2D.png": "bg_scene_moon_library.png",
    "source_common/bg/bg_xinian_erjijiemian_bj/bg_xinian_erjijiemian_bj__Texture2D.png": "bg_scene_night_carnival.png",
    "source_common/bg/img_myj_beijing/img_myj_beijing__Texture2D.png": "bg_scene_snow_lantern.png",
    "source_common/bg/89/89__Texture2D.png": "bg_scene_crimson_hall.png",
    "source_common/treasurelottery/bg_zhanxing/bg_zhanxing__Texture2D.png": "bg_scene_gothic_castle.png",
    "source_common/treasurelottery/bg_zhanxing2/bg_zhanxing2__Texture2D.png": "bg_scene_crystal_forest.png",
    "source_common/activitylevel/img_myj_yugao_beijing/img_myj_yugao_beijing__Texture2D.png": "bg_scene_vault_corridor.png",
    "source_common/bg_xinnian_denglu/bg_xinnian_denglu__Texture2D.png": "bg_scene_castle_night.png",
    "source_common/activitylevel/img_myj_yugao_beijing02/img_myj_yugao_beijing02__Texture2D.png": "bg_scene_vault_deep.png",
}

WRONG_LEGACY = [
    "bg_coral_reef.png",
    "bg_moonlit_bay.png",
    "bg_storm_cliff.png",
    "bg_storm_cliff_a.png",
    "bg_storm_cliff_b.png",
    "bg_storm_cliff_c.png",
    "bg_storm_cliff_d.png",
    "bg_memory_gate_a.png",
    "bg_memory_gate_b.png",
    "bg_memory_gate_c.png",
    "bg_memory_gate_d.png",
]


def cover(img: Image.Image, tw: int = TW, th: int = TH) -> Image.Image:
    img = img.convert("RGBA")
    w, h = img.size
    s = max(tw / w, th / h)
    img = img.resize((int(w * s), int(h * s)), Image.Resampling.LANCZOS)
    l = (img.width - tw) // 2
    t = (img.height - th) // 2
    return img.crop((l, t, l + tw, t + th))


def save_rgb(img: Image.Image, name: str) -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    path = OUT / name
    img.convert("RGB").save(path, "PNG", optimize=True)
    print(f"  -> {name}  {img.size}")


def load(rel: str):
    p = SRC / rel
    if not p.exists():
        print(f"  MISSING {rel}")
        return None
    return Image.open(p).convert("RGBA")


def gen_fightscene(scene: str, name: str, tint=None) -> None:
    base = load(f"prefab_scene/fightsceneprefab/{scene}/SKY_04__Texture2D.png")
    if base is None:
        base = load(f"prefab_scene/fightsceneprefab/{scene}/LYH_Sky__Texture2D.png")
    if base is None:
        print(f"  ✗ {scene} SKY missing")
        return
    canvas = cover(base)
    for hill, yoff, alpha in [
        ("P_Hill_02__Texture2D.png", 0, 235),
        ("P_Hill_01__Texture2D.png", 60, 255),
        ("Parkour_Castle_06__Texture2D.png", 30, 245),
    ]:
        h = load(f"prefab_scene/fightsceneprefab/{scene}/{hill}")
        if not h:
            continue
        hw = TW
        hh = int(h.height * (hw / h.width))
        h = h.resize((hw, hh), Image.Resampling.LANCZOS)
        if alpha < 255:
            a = h.split()[-1].point(lambda v, aa=alpha: int(v * aa / 255))
            h.putalpha(a)
        canvas.alpha_composite(h, (0, TH - hh + yoff))
    cloud = load(f"prefab_scene/fightsceneprefab/{scene}/P_cloud_01__Texture2D.png")
    if cloud:
        cw = TW
        ch = int(cloud.height * (cw / cloud.width))
        cloud = cloud.resize((cw, ch), Image.Resampling.LANCZOS)
        a = cloud.split()[-1].point(lambda v: int(v * 0.5))
        cloud.putalpha(a)
        canvas.alpha_composite(cloud, (0, int(TH * 0.28)))
    if tint:
        canvas = Image.alpha_composite(canvas, Image.new("RGBA", canvas.size, tint))
    save_rgb(canvas, name)


def main() -> None:
    print("=== remove wrong fight/background imports ===")
    for name in WRONG_LEGACY:
        p = OUT / name
        if p.exists():
            p.unlink()
            print(f"  deleted {name}")

    print("\n=== verified vertical scenes ===")
    for rel, out_name in SCENES.items():
        img = load(rel)
        if img:
            save_rgb(cover(img), out_name)

    print("\n=== fightsceneprefab composites ===")
    gen_fightscene("scene1", "bg_scene_sky_hills.png", tint=(20, 30, 60, 50))
    gen_fightscene("scene2", "bg_scene_sky_castle.png", tint=(40, 20, 50, 55))
    gen_fightscene("scene3", "bg_scene_sky_castle_b.png", tint=(30, 40, 70, 55))

    abyss = load("source_common/bg/Img_shenyuan_boss_bg/Img_shenyuan_boss_bg__Texture2D.png")
    if abyss:
        img = cover(abyss)
        img = ImageEnhance.Contrast(img).enhance(1.08)
        save_rgb(img, "bg_scene_abyss_core.png")

    print("\nDONE")


if __name__ == "__main__":
    main()
