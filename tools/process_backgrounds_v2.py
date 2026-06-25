#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
V3.14 背景修复：用「素材」中真正的场景图替换之前误用的宣传图。
来源：
  - source_home/img_bg_youanmijing  (1080x1920 完整竖版暗黑场景)
  - prefab_scene/fightsceneprefab/scene1~3 (SKY+山丘+云 视差分层 → 合成竖版场景)
  - source_common/bg/img_shenyuan_boss_bg (深渊Boss背景)
输出：覆盖 桌面版/app/assets/backgrounds 下原有同名文件（保持代码引用不变）。
"""
import os
from PIL import Image, ImageFilter, ImageEnhance

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TX = os.path.join(BASE, '素材/textures_png')
OUT = os.path.join(BASE, '桌面版/app/assets/backgrounds')
TW, TH = 720, 1280

def cover(img, tw, th):
    img = img.convert('RGBA')
    w, h = img.size
    s = max(tw / w, th / h)
    img = img.resize((int(w*s), int(h*s)), Image.Resampling.LANCZOS)
    l = (img.width - tw)//2; t = (img.height - th)//2
    return img.crop((l, t, l+tw, t+th))

def save_rgb(img, name):
    img.convert('RGB').save(os.path.join(OUT, name), 'PNG', optimize=True)
    print(f'  ✓ {name}')

def load(p):
    fp = os.path.join(TX, p)
    return Image.open(fp).convert('RGBA') if os.path.exists(fp) else None

# 1) 幽暗秘境：完整竖版场景，直接 cover
def gen_youanmijing(name, tint=None, bright=1.0):
    src = load('source_home/img_bg_youanmijing/Img_BG_YouAnMiJing__Texture2D.png')
    if not src:
        print('  ✗ youanmijing 缺失'); return
    img = cover(src, TW, TH)
    if bright != 1.0:
        img = ImageEnhance.Brightness(img).enhance(bright)
    if tint:
        ov = Image.new('RGBA', img.size, tint)
        img = Image.alpha_composite(img, ov)
    save_rgb(img, name)

# 2) 合成视差场景：SKY 作底，山丘贴底，云飘中部
def gen_fightscene(scene, name, tint=None):
    base = load(f'prefab_scene/fightsceneprefab/{scene}/SKY_04__Texture2D.png')
    if base is None:
        base = load(f'prefab_scene/fightsceneprefab/{scene}/LYH_Sky__Texture2D.png')
    if base is None:
        print(f'  ✗ {scene} SKY 缺失'); return
    canvas = cover(base, TW, TH)
    # 山丘（贴底，全宽）
    for hill, yoff, alpha in [('P_Hill_02__Texture2D.png', 0, 235), ('P_Hill_01__Texture2D.png', 60, 255),
                              ('Parkour_Castle_06__Texture2D.png', 30, 245)]:
        h = load(f'prefab_scene/fightsceneprefab/{scene}/{hill}')
        if h:
            hw = TW
            hh = int(h.height * (hw / h.width))
            h = h.resize((hw, hh), Image.Resampling.LANCZOS)
            if alpha < 255:
                a = h.split()[-1].point(lambda v: int(v*alpha/255))
                h.putalpha(a)
            canvas.alpha_composite(h, (0, TH - hh + yoff))
    # 云（中上部，半透明）
    cloud = load(f'prefab_scene/fightsceneprefab/{scene}/P_cloud_01__Texture2D.png')
    if cloud:
        cw = TW; ch = int(cloud.height*(cw/cloud.width))
        cloud = cloud.resize((cw, ch), Image.Resampling.LANCZOS)
        a = cloud.split()[-1].point(lambda v: int(v*0.5))
        cloud.putalpha(a)
        canvas.alpha_composite(cloud, (0, int(TH*0.28)))
    if tint:
        canvas = Image.alpha_composite(canvas, Image.new('RGBA', canvas.size, tint))
    save_rgb(canvas, name)

# 3) 深渊Boss背景（512方图 → 放大模糊铺满 + 暗角）
def gen_abyss(name):
    src = load('source_common/bg/img_shenyuan_boss_bg/Img_shenyuan_boss_bg__Texture2D.png')
    if not src:
        print('  ✗ shenyuan 缺失'); return
    img = cover(src, TW, TH)
    img = ImageEnhance.Contrast(img).enhance(1.08)
    save_rgb(img, name)

if __name__ == '__main__':
    os.makedirs(OUT, exist_ok=True)
    print('=== 背景修复 V3.14 ===')
    # 覆盖之前误用宣传图的同名文件
    gen_youanmijing('bg_void_realm.png', tint=(40, 20, 70, 60))      # 虚空（紫调）
    gen_youanmijing('bg_dark_sanctum.png', tint=(20, 10, 40, 90), bright=0.85)  # 暗黑圣殿（更暗）
    gen_fightscene('scene1', 'bg_shadow_depths.png', tint=(20, 30, 60, 70))     # 暗影深渊
    gen_fightscene('scene2', 'bg_chaos_rift.png', tint=(60, 20, 40, 70))        # 混沌裂隙（红调）
    gen_abyss('bg_abyss_core.png')                                              # 深渊核心
    print('完成！')
