#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""提取爆裂魔女 UI 元素到 app/assets/ui：技能图标、分隔线、连击数字。"""
import os
from PIL import Image
BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SP = os.path.join(BASE, '素材/sprites_png')
OUT = os.path.join(BASE, '桌面版/app/assets/ui')

def load(p):
    fp = os.path.join(SP, p)
    return Image.open(fp).convert('RGBA') if os.path.exists(fp) else None

def trim_square(img, target, pad=0.04):
    bb = img.getbbox()
    if bb: img = img.crop(bb)
    inner = int(target*(1-2*pad)); w,h = img.size; s = inner/max(w,h)
    img = img.resize((max(1,int(w*s)),max(1,int(h*s))), Image.Resampling.LANCZOS)
    cv = Image.new('RGBA',(target,target),(0,0,0,0))
    cv.paste(img,((target-img.width)//2,(target-img.height)//2),img); return cv

def save(img, name):
    img.save(os.path.join(OUT,name),'PNG',optimize=True); print('  ✓',name)

os.makedirs(OUT, exist_ok=True)
print('=== UI 素材提取 ===')

# 技能图标（月光束 / 大招）——挑选两枚游戏内技能图标
for src, name in [('source_icon/skill/104801/104801__Sprite.png','ui_skill_beam_icon.png'),
                  ('source_icon/skill/102901/102901__Sprite.png','ui_skill_bomb_icon.png')]:
    im = load(src)
    if im: save(trim_square(im,96), name)
    else: print('  ✗', src)

# 分隔线
ln = load('source_uicomframework/frame_line/frame_line2/frame_Line2__Sprite.png')
if ln:
    ln = ln.resize((540,30), Image.Resampling.LANCZOS); save(ln,'ui_divider.png')

# 技能边框（圆形框）
fr = load('source_uicomframework/frame_ui/jx/jx__Sprite.png')
if fr:
    fr = fr.resize((96,96), Image.Resampling.LANCZOS); save(fr,'ui_circle_frame.png')

print('完成！')
