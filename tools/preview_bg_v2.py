#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import os
from PIL import Image
BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BG = os.path.join(BASE, '桌面版/app/assets/backgrounds')
names = ['bg_void_realm','bg_dark_sanctum','bg_shadow_depths','bg_chaos_rift','bg_abyss_core']
cell_w, cell_h = 180, 320
sheet = Image.new('RGB', (cell_w*len(names), cell_h+24), (15,15,20))
for i,n in enumerate(names):
    p = os.path.join(BG, n+'.png')
    if os.path.exists(p):
        im = Image.open(p).convert('RGB'); im.thumbnail((cell_w-6, cell_h-6), Image.Resampling.LANCZOS)
        sheet.paste(im, (i*cell_w+3, 3))
sheet.save(os.path.join(BASE,'tools/preview_backgrounds_v2.png'))
print('ok')
