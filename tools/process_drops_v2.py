#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""以用户新建的 绿色HP.png / 暴走.png 为基础，制作高辨识度掉落图标。
加：彩色高亮描边 + 柔光底盘，确保与敌弹明显区分。动态粒子在游戏内绘制。"""
import os
from PIL import Image, ImageDraw, ImageFilter
BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(BASE, '桌面版/app/assets/items')

def build(src_name, out_name, rim_rgb):
    src = os.path.join(BASE, src_name)
    if not os.path.exists(src):
        print('  ✗ 缺失', src_name); return
    im = Image.open(src).convert('RGBA')
    bb = im.getbbox()
    if bb: im = im.crop(bb)
    T = 112; inner = 84
    w, h = im.size; s = inner / max(w, h)
    im = im.resize((max(1, int(w*s)), max(1, int(h*s))), Image.Resampling.LANCZOS)
    cv = Image.new('RGBA', (T, T), (0, 0, 0, 0))
    # 柔光底盘
    glow = Image.new('RGBA', (T, T), (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow)
    gd.ellipse([10, 10, T-10, T-10], fill=rim_rgb + (170,))
    glow = glow.filter(ImageFilter.GaussianBlur(12))
    cv = Image.alpha_composite(cv, glow)
    # 居中图标
    cv.alpha_composite(im, ((T-im.width)//2, (T-im.height)//2))
    # 高亮描边圆环（双层：亮白 + 彩色）
    d = ImageDraw.Draw(cv)
    d.ellipse([6, 6, T-6, T-6], outline=(255, 255, 255, 230), width=3)
    d.ellipse([10, 10, T-10, T-10], outline=rim_rgb + (235,), width=4)
    cv.save(os.path.join(OUT, out_name), 'PNG', optimize=True)
    print('  ✓', out_name)

os.makedirs(OUT, exist_ok=True)
print('=== 掉落图标 v2（基于用户素材）===')
build('绿色HP.png', 'item_heal.png', (90, 255, 140))
build('暴走.png', 'item_berserk.png', (255, 200, 70))
print('完成！')
