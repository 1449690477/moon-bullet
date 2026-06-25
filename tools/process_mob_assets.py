# -*- coding: utf-8 -*-
"""
小怪强化 / 弹幕强化 —— 新素材加工脚本
从「素材文件夹 一定优先使用！」挑选未使用的海洋小怪贴图 + 弹幕贴图，
trim 透明边 + 限尺寸，输出到 assets/enemies_v2 与 assets/bullets_v2。
源图本身已是透明 PNG，无需抠绿。
"""
import os, glob
import numpy as np
from PIL import Image

ROOT = "素材文件夹 一定优先使用！/sprites_png"
ENEMY_SRC = os.path.join(ROOT, "prefab_enemeymodel/texturemodel")
BULLET_SRC = os.path.join(ROOT, "source_barrage/bulletsource/texture/barragetex/barragetexinfo")

OUT_E = "assets/enemies_v2"
OUT_B = "assets/bullets_v2"

# 小怪：folder 名 -> 游戏内 key
ENEMIES = {
    "r1_haixing": "starfish",
    "r1_shuimu": "jelly",
    "r1_zhangyu_red": "octopus",
    "r1_yu": "swordfish",
    "r1_bingxuejingling": "frostelf",
    "r1_jinbi_ysjingling": "goldelf",
    "r1_ysjingling_blue": "tideelf",
    "r1_dianyao": "voltray",
    "r1_shenyuanshuijing_red": "abysscryst",
    "r1_haikui": "anemone",
    "r1_shihuomo": "lavacrab",
    "r1_sycshapeng": "puffer",
    "r1_emozhiyan_red": "dreadeye",
}
# 弹幕：源文件名(去 __Sprite.png) -> 游戏内 key
BULLETS = {
    "1007_N": "trishuriken",
    "1003_2_xuehua": "snowflake",
    "1021_2_taohua": "blossom",
    "1019_N": "sungold",
    "1030_N": "galaxy",
    "1024_N": "crescentblue",
    "Boss36_r": "starred",
    "Boss36_y": "staryellow",
    "Boss36_z": "starpurple2",
    "Boss33_Zid_wj": "diamondknife",
    "Boss34_Zid_lj": "trianglepurple",
    "Boss32_Zid_zfang": "reddiamond",
    "Boss15_GuangQiu04_01": "ringgreen",
    "Boss24_hongdian03": "redorb",
    "tanguo01-y": "candyyellow",
    "tanguo01-b": "candyblue",
    "huaduo01": "flowerbloom2",
    "1039_N1": "musicnote2",
}


def trim(im, athr=8, pad=2):
    a = np.asarray(im)
    al = a[..., 3]
    ys, xs = np.where(al > athr)
    if len(xs) == 0:
        return im
    x0, x1 = max(0, xs.min() - pad), min(im.width, xs.max() + 1 + pad)
    y0, y1 = max(0, ys.min() - pad), min(im.height, ys.max() + 1 + pad)
    return im.crop((x0, y0, x1, y1))


def save(im, path, maxdim):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    if max(im.size) > maxdim:
        s = maxdim / max(im.size)
        im = im.resize((max(1, round(im.width * s)), max(1, round(im.height * s))), Image.LANCZOS)
    im.save(path)
    print(f"  -> {path}  ({im.width}x{im.height})")


def main():
    print("[enemies]")
    for folder, key in ENEMIES.items():
        cands = glob.glob(os.path.join(ENEMY_SRC, folder, "*.png"))
        if not cands:
            print(f"  !! missing {folder}")
            continue
        im = trim(Image.open(cands[0]).convert("RGBA"))
        save(im, os.path.join(OUT_E, key + ".png"), maxdim=150)
    print("[bullets]")
    for src, key in BULLETS.items():
        p = os.path.join(BULLET_SRC, src + "__Sprite.png")
        if not os.path.exists(p):
            print(f"  !! missing {src}")
            continue
        im = trim(Image.open(p).convert("RGBA"))
        save(im, os.path.join(OUT_B, key + ".png"), maxdim=64)
    print("DONE")


if __name__ == "__main__":
    main()
