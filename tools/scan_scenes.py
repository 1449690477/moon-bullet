#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""扫描候选「场景/背景/HUD」文件夹，递归列出所有PNG的尺寸，写入日志供挑选。"""
import os
from PIL import Image

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TX = os.path.join(BASE, '素材/textures_png')

# 候选目录（真正的场景/背景/HUD，而非宣传图）
CANDIDATES = [
    'prefab_land',                         # 3D场景贴图（城堡/地牢/沙漠/圣城/limbo/夜海...）
    'source_home/img_bg_youanmijing',      # 幽暗秘境背景
    'source_home/img_guanqia_bg_1',        # 关卡背景1
    'source_common/bg',                    # 通用背景集合
    'source_hud/ui_main',                  # 战斗主HUD
    'source_hud/ui_main_alpha',
    'source_uifight/ui_fightsource',       # 战斗UI源
    'prefab_uifight/ui_fightinfo',         # 战斗信息UI
    'prefab_scene/fightsceneprefab',       # 战斗场景预制
]

lines = []
def scan(rel):
    root = os.path.join(TX, rel)
    if not os.path.isdir(root):
        lines.append(f'[缺失] {rel}')
        return
    lines.append(f'\n==== {rel} ====')
    for dirpath, _, files in os.walk(root):
        for fn in sorted(files):
            if not fn.lower().endswith('.png'):
                continue
            fp = os.path.join(dirpath, fn)
            try:
                img = Image.open(fp)
                w, h = img.size
                # 标注：可能是竖版大背景 / 横版 / 小UI件
                tag = ''
                if w >= 600 and h >= 600:
                    tag = ' <BIG>'
                if h > w * 1.2:
                    tag += ' <PORTRAIT>'
                elif w > h * 1.6:
                    tag += ' <WIDE>'
                rel_in = os.path.relpath(fp, root)
                lines.append(f'  {rel_in:55s} {w}x{h}{tag}')
            except Exception as e:
                lines.append(f'  {fn}: ERR {e}')

for c in CANDIDATES:
    scan(c)

out = os.path.join(BASE, 'tools/scene_scan.txt')
with open(out, 'w', encoding='utf-8') as f:
    f.write('\n'.join(lines))
print(f'扫描完成，结果写入 {out}，共 {len(lines)} 行')
