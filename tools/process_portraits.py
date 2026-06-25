#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""提取爆裂魔女官方2D立绘 → 覆盖玩家角色精灵（伊丽莎白=1010, 雅努西娅=1044）。
来源 hero_big 全身立绘 + hero_main 头像。生成 idle/focus/move/hit 各状态。"""
import os
from PIL import Image, ImageEnhance
BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SP = os.path.join(BASE, '素材/sprites_png/source_avatar')
OUT = os.path.join(BASE, '桌面版/app/assets/characters')

def load(p):
    fp = os.path.join(SP, p)
    return Image.open(fp).convert('RGBA') if os.path.exists(fp) else None

def fit_portrait(img, cw=480, ch=660, pad=0.04):
    """整体fit到 cw×ch 透明画布（保持比例，底部居中对齐）"""
    bb = img.getbbox()
    if bb: img = img.crop(bb)
    w, h = img.size
    s = min(cw * (1 - pad) / w, ch * (1 - pad) / h)
    nw, nh = max(1, int(w * s)), max(1, int(h * s))
    img = img.resize((nw, nh), Image.Resampling.LANCZOS)
    cv = Image.new('RGBA', (cw, ch), (0, 0, 0, 0))
    cv.paste(img, ((cw - nw) // 2, ch - nh - int(ch * 0.02)), img)
    return cv

def variants(base, prefix):
    """生成 idle/focus/move_left/move_right/hit"""
    base.save(os.path.join(OUT, f'{prefix}_idle.png'), 'PNG', optimize=True)
    # focus：略亮
    ImageEnhance.Brightness(base).enhance(1.08).save(os.path.join(OUT, f'{prefix}_focus.png'), 'PNG', optimize=True)
    # move：轻微左右倾斜（用错切近似）
    ml = base.transform(base.size, Image.AFFINE, (1, 0.06, -16, 0, 1, 0), resample=Image.BICUBIC)
    ml.save(os.path.join(OUT, f'{prefix}_move_left.png'), 'PNG', optimize=True)
    mr = base.transform(base.size, Image.AFFINE, (1, -0.06, 16, 0, 1, 0), resample=Image.BICUBIC)
    mr.save(os.path.join(OUT, f'{prefix}_move_right.png'), 'PNG', optimize=True)
    # hit：红色叠加
    r, g, b, a = base.split()
    red = Image.new('RGBA', base.size, (255, 70, 70, 255))
    hit = Image.composite(red, base, Image.new('L', base.size, 110)); hit.putalpha(a)
    hit.save(os.path.join(OUT, f'{prefix}_hit.png'), 'PNG', optimize=True)

def avatar(head, name):
    if not head: return
    bb = head.getbbox()
    if bb: head = head.crop(bb)
    head = head.resize((128, 128), Image.Resampling.LANCZOS)
    head.save(os.path.join(OUT, name), 'PNG', optimize=True)

os.makedirs(OUT, exist_ok=True)
print('=== 官方立绘提取 ===')
# 伊丽莎白 (1010) → player_witch_*
eli = load('hero_big/body_1010/body_1010__Sprite.png')
if eli:
    variants(fit_portrait(eli), 'player_witch'); print('  ✓ 伊丽莎白 立绘×5')
    avatar(load('hero_main/head_10100001/head_10100001__Sprite.png'), 'player_witch_avatar.png'); print('  ✓ 伊丽莎白 头像')
else: print('  ✗ body_1010')
# 雅努西娅 (1044) → player_yanuxiya_*
yanu = load('hero_big/body_1044/body_1044__Sprite.png')
if yanu:
    variants(fit_portrait(yanu), 'player_yanuxiya'); print('  ✓ 雅努西娅 立绘×5')
    avatar(load('hero_main/head_10440005/head_10440005__Sprite.png'), 'player_yanuxiya_avatar.png'); print('  ✓ 雅努西娅 头像')
else: print('  ✗ body_1044')
print('完成！')
