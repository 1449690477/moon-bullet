#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""扫描 sprites_png 中的 UI 元素，挑选干净可用的 HUD/边框/技能图标/血条。"""
import os
from PIL import Image
BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SP = os.path.join(BASE, '素材/sprites_png')
CANDS = [
    'source_uicomframework/frame_ui',
    'source_uicomframework/frame_button',
    'source_uicomframework/frame_line',
    'source_hud/ui_main',
    'prefab_uifight/ui_totail',
    'prefab_witch/img_jineng_bg',
    'source_icon/skill',
    'source_uifight/ui_fightsource',
    'source_common/combicon',
]
lines = []
def scan(rel):
    root = os.path.join(SP, rel)
    if not os.path.isdir(root):
        lines.append(f'[缺失] {rel}'); return
    lines.append(f'\n==== {rel} ====')
    n = 0
    for dp, _, fs in os.walk(root):
        for fn in sorted(fs):
            if not fn.lower().endswith('.png'): continue
            try:
                w,h = Image.open(os.path.join(dp,fn)).size
                lines.append(f'  {os.path.relpath(os.path.join(dp,fn),root):50s} {w}x{h}')
                n+=1
                if n>40: lines.append('   ...(更多省略)'); return
            except: pass
for c in CANDS: scan(c)
open(os.path.join(BASE,'tools/ui_scan.txt'),'w',encoding='utf-8').write('\n'.join(lines))
print('done', len(lines))
