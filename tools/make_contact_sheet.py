#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""生成素材预览拼图，便于人工检查提取效果。"""
import os
from PIL import Image

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def sheet(files, cols, cell, out, bg=(40, 30, 50, 255)):
    rows = (len(files) + cols - 1) // cols
    sheet = Image.new('RGBA', (cols * cell, rows * cell), bg)
    for i, f in enumerate(files):
        if not os.path.exists(f):
            continue
        img = Image.open(f).convert('RGBA')
        img.thumbnail((cell - 8, cell - 8), Image.Resampling.LANCZOS)
        cx = (i % cols) * cell + (cell - img.width) // 2
        cy = (i // cols) * cell + (cell - img.height) // 2
        sheet.paste(img, (cx, cy), img)
    sheet.save(out)
    print(f'  ✓ {out}  ({len(files)}项)')

# 敌人 idle
en = os.path.join(BASE, 'assets/enemies')
enemies = ['wraith', 'shade', 'specter', 'reaper', 'phantom', 'banshee', 'cultist', 'fiend', 'warlock', 'archfiend']
sheet([os.path.join(en, f'{n}_idle.png') for n in enemies], 5, 160, os.path.join(BASE, 'tools/preview_enemies.png'))

# Boss idle
bs = os.path.join(BASE, 'assets/bosses')
bosses = ['voidlord', 'abysswalker', 'voidtitan', 'ancientone', 'darkqueen']
sheet([os.path.join(bs, f'{n}_idle.png') for n in bosses], 5, 240, os.path.join(BASE, 'tools/preview_bosses.png'))

# 弹幕
bl = os.path.join(BASE, 'assets/bullets')
bullets = [f for f in sorted(os.listdir(bl)) if f.startswith('bullet_') and f.endswith('.png')]
sheet([os.path.join(bl, f) for f in bullets], 8, 64, os.path.join(BASE, 'tools/preview_bullets.png'))

# 背景
bg = os.path.join(BASE, 'assets/backgrounds')
bgs = ['bg_void_realm', 'bg_shadow_depths', 'bg_abyss_core', 'bg_chaos_rift', 'bg_dark_sanctum']
sheet([os.path.join(bg, f'{n}.png') for n in bgs], 5, 200, os.path.join(BASE, 'tools/preview_backgrounds.png'))

print('预览图已生成在 tools/ 目录')
