#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""提取伊丽莎白/雅努西娅技能真实素材：血刃(剑)、坠月(月)、白夜鸟。"""
import os
from PIL import Image, ImageEnhance
BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TX = os.path.join(BASE, '素材/textures_png/prefab_barrage')
OUT_B = os.path.join(BASE, '桌面版/app/assets/bullets')
OUT_V = os.path.join(BASE, '桌面版/app/assets/vfx')

def load(p):
    fp = os.path.join(TX, p)
    return Image.open(fp).convert('RGBA') if os.path.exists(fp) else None

def trim_square(img, target, pad=0.04):
    bb = img.getbbox()
    if bb: img = img.crop(bb)
    inner = int(target*(1-2*pad)); w,h = img.size; s = inner/max(w,h)
    img = img.resize((max(1,int(w*s)),max(1,int(h*s))), Image.Resampling.LANCZOS)
    cv = Image.new('RGBA',(target,target),(0,0,0,0))
    cv.paste(img,((target-img.width)//2,(target-img.height)//2),img); return cv

def tint(img, rgb, amount=0.6):
    r,g,b,a = img.split()
    overlay = Image.new('RGBA', img.size, rgb+(255,))
    out = Image.composite(overlay, img, Image.new('L', img.size, int(255*amount)))
    out.putalpha(a); return out

print('=== 角色技能素材 ===')
# 1) 伊丽莎白血刃（剑 → 染赤红）
sword = load('playerbarrage_1044_2/barrage_10440302/Eff_Sword_003__Texture2D.png')
if sword:
    bl = trim_square(sword, 64, pad=0.02)
    bl = tint(bl, (255,40,70), 0.5)
    bl = ImageEnhance.Brightness(bl).enhance(1.15)
    bl.save(os.path.join(OUT_B,'bullet_blood_blade.png'),'PNG',optimize=True); print('  ✓ bullet_blood_blade')
else: print('  ✗ sword')

# 2) 雅努西娅坠月（月）
moon = load('boss_skill/xueyueyanuxiya/xueyue_moon/fx_moon_01__Texture2D.png')
if moon is None:
    moon = load('playerbarrage_1044/barrage_104403/fx_moon_01__Texture2D.png')
if moon:
    mo = trim_square(moon, 256, pad=0.02)
    mo.save(os.path.join(OUT_V,'vfx_fall_moon.png'),'PNG',optimize=True); print('  ✓ vfx_fall_moon')
else: print('  ✗ moon')

# 3) 白夜鸟（飞鸟，真实素材）
bird = load('playerbarrage_1044_3/barrage_104403_xl/M2_Baiye_niao__Texture2D.png')
if bird:
    bd = trim_square(bird, 64, pad=0.04)
    bd.save(os.path.join(OUT_B,'bullet_baiye_bird.png'),'PNG',optimize=True); print('  ✓ bullet_baiye_bird')
else: print('  ✗ bird')
print('完成！')
