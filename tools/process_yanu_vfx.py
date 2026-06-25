#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""提取雅努西娅「坠月之巅」整套特效贴图（来自 boss_skill/xueyueyanuxiya）。
组成：月球本体/月辉/云雾/赤红光束/放射爆/闪电/烟/光环——用于多层合成大招。"""
import os
from PIL import Image
BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(BASE, '素材/textures_png/prefab_barrage/boss_skill/xueyueyanuxiya')
OUTV = os.path.join(BASE, '桌面版/app/assets/vfx')

def load(rel):
    fp = os.path.join(SRC, rel)
    return Image.open(fp).convert('RGBA') if os.path.exists(fp) else None

def trim_square(img, target, pad=0.02):
    bb = img.getbbox()
    if bb: img = img.crop(bb)
    inner = int(target*(1-2*pad)); w,h = img.size; s = inner/max(w,h)
    img = img.resize((max(1,int(w*s)),max(1,int(h*s))), Image.Resampling.LANCZOS)
    cv = Image.new('RGBA',(target,target),(0,0,0,0))
    cv.paste(img,((target-img.width)//2,(target-img.height)//2),img); return cv

def save_keep(img, name, target):
    # 保持原比例缩放到 target 宽
    w,h = img.size; s = target / w
    img = img.resize((target, max(1,int(h*s))), Image.Resampling.LANCZOS)
    img.save(os.path.join(OUTV,name),'PNG',optimize=True); print('  ✓',name)

def save_sq(img, name, target, pad=0.02):
    trim_square(img, target, pad).save(os.path.join(OUTV,name),'PNG',optimize=True); print('  ✓',name)

os.makedirs(OUTV, exist_ok=True)
print('=== 坠月之巅 特效套件 ===')
KIT = [
  ('xueyue_moon/fx_moon_01__Texture2D.png',            'vfx_yanu_moon.png',      512, 'sq'),
  ('xueyue_moon/t_glow_03__Texture2D.png',             'vfx_yanu_moonglow.png',  512, 'sq'),
  ('xueyue_moon/Eff_Beam_02__Texture2D.png',           'vfx_yanu_moonbeam.png',  256, 'sq'),
  ('xueyue_moon_daoying/Eff_Obj_08__Texture2D.png',    'vfx_yanu_moondao.png',   256, 'sq'),
  ('xueyue_yun/Eff_yan_025__Texture2D.png',            'vfx_yanu_cloud.png',     256, 'sq'),
  ('xueyue_skill01_model/z_daoguang06__Texture2D.png', 'vfx_yanu_beam.png',      256, 'sq'),
  ('xueyue_skill01_model/t_radial_01__Texture2D.png',  'vfx_yanu_radial.png',    256, 'sq'),
  ('xueyue_skill01_model/z_lt02__Texture2D.png',       'vfx_yanu_lightning.png', 256, 'sq'),
  ('xueyue_skill01_model/Eff_Smoke_29__Texture2D.png', 'vfx_yanu_smoke.png',     256, 'sq'),
  ('xueyue_skill01_model/Eff_Beam_05__Texture2D.png',  'vfx_yanu_laserbeam.png', 128, 'keep'),
  ('xueyue_huanyingniao/Eff_Obj_05__Texture2D.png',    'vfx_yanu_birdobj.png',   256, 'sq'),
  ('xueyue_skill01_model/guangwenli_02_g__Texture2D.png','vfx_yanu_ring.png',    256, 'sq'),
]
for rel,name,tg,mode in KIT:
    im = load(rel)
    if not im: print('  ✗ 缺失', rel); continue
    if mode=='keep': save_keep(im, name, tg)
    else: save_sq(im, name, tg)
print('完成！')
