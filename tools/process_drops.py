#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""提取掉落物图标：绿色加血(祝福·生命) / 金色暴走(祝福·攻击)，加发光底盘。"""
import os
from PIL import Image, ImageDraw, ImageFilter
BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SP = os.path.join(BASE, '素材/sprites_png')
OUT = os.path.join(BASE, '桌面版/app/assets/items')

def load(p):
    fp = os.path.join(SP, p)
    return Image.open(fp).convert('RGBA') if os.path.exists(fp) else None

def make_drop(src_rel, name, glow_rgb):
    im = load(src_rel)
    if not im:
        print('  ✗', src_rel); return
    bb = im.getbbox()
    if bb: im = im.crop(bb)
    # 缩放图标到 64 内
    T = 96
    inner = 60
    w,h = im.size; s = inner/max(w,h)
    im = im.resize((max(1,int(w*s)), max(1,int(h*s))), Image.Resampling.LANCZOS)
    canvas = Image.new('RGBA', (T,T), (0,0,0,0))
    # 发光底盘
    glow = Image.new('RGBA', (T,T), (0,0,0,0))
    gd = ImageDraw.Draw(glow)
    gd.ellipse([14,14,T-14,T-14], fill=glow_rgb+(150,))
    glow = glow.filter(ImageFilter.GaussianBlur(10))
    canvas = Image.alpha_composite(canvas, glow)
    # 图标居中
    canvas.alpha_composite(im, ((T-im.width)//2,(T-im.height)//2))
    canvas.save(os.path.join(OUT, name), 'PNG', optimize=True)
    print('  ✓', name)

os.makedirs(OUT, exist_ok=True)
print('=== 掉落物图标 ===')
make_drop('source_icon/buff/img_zhufu_shengming_1/Img_zhuFu_ShengMing_1__Sprite.png', 'item_heal.png', (90,255,140))
make_drop('source_icon/buff/img_zhufu_gongji_1/Img_zhuFu_Gongji_1__Sprite.png', 'item_berserk.png', (255,200,70))
print('完成！')
