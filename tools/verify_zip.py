#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import zipfile, glob, os
BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
allz = [f for f in os.listdir(BASE) if f.endswith('.zip')]
print('目录内zip:', allz)
zips = [os.path.join(BASE, f) for f in allz if 'v3.15' in f]
if not zips:
    print('找不到 v3.15 zip'); raise SystemExit
z = zipfile.ZipFile(zips[0])
names = z.namelist()
print('ZIP:', os.path.basename(zips[0]))
print('总条目:', len(names))
need = ['index.html', '双击开始游戏', '使用说明',
        'assets/items/item_heal.png', 'assets/items/item_berserk.png',
        'assets/vfx/vfx_yanu_moon.png', 'assets/bullets/bullet_blood_blade.png',
        'assets/bosses/voidlord_idle.png', 'assets/characters/player_yanuxiya_idle.png',
        'assets/audio/bgm_stage1.ogg', 'assets/ui/ui_circle_frame.png']
for n in need:
    hit = any(n in x for x in names)
    print(('  OK   ' if hit else '  MISS ') + n)
# 确认没有备份目录混入
bak = any('_backup_before_user_import' in x for x in names)
print('  备份目录已排除:' , ('是' if not bak else '否(仍存在!)'))
