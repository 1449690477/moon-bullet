#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
月蚀弹幕 - 素材库批处理脚本 (V3.13)
从「素材」文件夹中提取并加工：新敌人、新Boss、新背景、新弹幕。

处理方式：
- 敌人/Boss立绘：裁剪透明边 → 等比缩放 → 居中放到透明正方形画布
- 背景：横版场景 → cover 缩放裁切到 720x1280 竖版
- 弹幕：裁剪透明边 → 等比缩放到目标尺寸
"""
import os
from PIL import Image, ImageEnhance, ImageFilter

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(BASE, '素材/sprites_png')
APP = os.path.join(BASE, '桌面版/app')
OUT_ENEMY = os.path.join(APP, 'assets/enemies')
OUT_BOSS = os.path.join(APP, 'assets/bosses')
OUT_BG = os.path.join(APP, 'assets/backgrounds')
OUT_BULLET = os.path.join(APP, 'assets/bullets')

# ─────────────────────────────────────────────────────────────
# 选材清单
# ─────────────────────────────────────────────────────────────

# 新敌人：(原始ID, 新名称)  来自 source_avatar/enemy
ENEMIES = [
    ('body_10100007', 'wraith'),     # 怨灵
    ('body_10100009', 'shade'),      # 暗影
    ('body_10101008', 'specter'),    # 幽魂
    ('body_10102002', 'reaper'),     # 死神
    ('body_10102009', 'phantom'),    # 幻影
    ('body_10103003', 'banshee'),    # 女妖
    ('body_10103008', 'cultist'),    # 邪教徒
    ('body_10104010', 'fiend'),      # 恶鬼
    ('body_10105008', 'warlock'),    # 术士
    ('body_10105020', 'archfiend'),  # 大恶魔
]

# 新Boss：(原始ID, 新名称)  来自 source_avatar/enemy_big
BOSSES = [
    ('body_10103030', 'voidlord'),     # 虚空领主
    ('body_10104020', 'abysswalker'),  # 深渊行者
    ('body_10105020', 'voidtitan'),    # 虚空泰坦
    ('body_11003001', 'ancientone'),   # 古神
    ('body_10125020', 'darkqueen'),    # 暗黑女王
]

# 新背景：(相对source_home/fight/background路径, 新名称)
BACKGROUNDS = [
    ('1', 'bg_void_realm'),
    ('3', 'bg_shadow_depths'),
    ('5', 'bg_abyss_core'),
    ('6', 'bg_chaos_rift'),
    ('8', 'bg_dark_sanctum'),
]

# 新弹幕：(相对bulletsource路径, 新名称, 目标尺寸)
BULLET_DIR = os.path.join(SRC, 'source_barrage/bulletsource/texture/barragetex/barragetexinfo')
BULLETS = [
    # 基础形状
    ('1001_N__Sprite.png', 'orb_basic', 40),
    ('1003_N__Sprite.png', 'needle_blue', 40),
    ('1006_N__Sprite.png', 'diamond_gold', 40),
    ('1011_N__Sprite.png', 'crescent_silver', 44),
    ('1013_N2__Sprite.png', 'star_purple', 44),
    ('1020_N__Sprite.png', 'heart_pink', 44),
    ('1028_N__Sprite.png', 'pentagon_cyan', 42),
    ('1030_N__Sprite.png', 'hexagon_yellow', 42),
    # 自然元素
    ('1003_2_xuehua__Sprite.png', 'snowflake', 44),
    ('1021_2_taohua__Sprite.png', 'petal_pink', 44),
    ('huaduo01__Sprite.png', 'flower_bloom', 46),
    ('z_bing03__Sprite.png', 'ice_shard', 42),
    ('z_huoqiu01__Sprite.png', 'fireball', 46),
    ('z_dianqiu01__Sprite.png', 'lightning_orb', 44),
    ('guangqiu07__Sprite.png', 'light_orb', 44),
    # 魔法/水晶
    ('Boss28_ShuiJIng01_01__Sprite.png', 'crystal_blue', 44),
    ('Boss29_ShuiJing02_01__Sprite.png', 'crystal_purple', 44),
    ('Boss12_GuangQiu01__Sprite.png', 'energy_red', 44),
    ('Boss13_GuangQiu02__Sprite.png', 'energy_blue', 44),
    ('Boss14_GuangQiu03__Sprite.png', 'energy_gold', 44),
    # 特殊形状
    ('tanguo01-b__Sprite.png', 'candy_blue', 42),
    ('tanguo01-p__Sprite.png', 'candy_pink', 42),
    ('yinfu__Sprite.png', 'music_note', 44),
    ('z_yumao01__Sprite.png', 'feather_dark', 46),
    ('z_hua01__Sprite.png', 'flower_single', 44),
    # Boss专用刀光/特殊
    ('Boss09_DaoGuang01__Sprite.png', 'boss_slash_1', 60),
    ('Boss10_DaoGuang02__Sprite.png', 'boss_slash_2', 60),
    ('Boss31_Zid_sanjiao__Sprite.png', 'boss_triangle', 44),
    ('Boss33_Zid_wj__Sprite.png', 'boss_pentagon', 44),
    ('T_soul03_0__Sprite.png', 'soul_orb', 46),
]


def find_sprite(folder):
    """在敌人/Boss子目录中找到png文件"""
    if not os.path.isdir(folder):
        return None
    for f in os.listdir(folder):
        if f.lower().endswith('.png'):
            return os.path.join(folder, f)
    return None


def trim_and_square(img, target, pad=0.04):
    """裁剪透明边，等比缩放，居中放到 target×target 透明画布"""
    img = img.convert('RGBA')
    bbox = img.getbbox()
    if bbox:
        img = img.crop(bbox)
    # 等比缩放使最长边 = target*(1-2pad)
    inner = int(target * (1 - 2 * pad))
    w, h = img.size
    scale = inner / max(w, h)
    nw, nh = max(1, int(w * scale)), max(1, int(h * scale))
    img = img.resize((nw, nh), Image.Resampling.LANCZOS)
    canvas = Image.new('RGBA', (target, target), (0, 0, 0, 0))
    canvas.paste(img, ((target - nw) // 2, (target - nh) // 2), img)
    return canvas


def clean_alpha(img, threshold=8):
    """清除伪透明（接近透明的像素归零）"""
    img = img.convert('RGBA')
    px = img.load()
    for y in range(img.height):
        for x in range(img.width):
            r, g, b, a = px[x, y]
            if a < threshold:
                px[x, y] = (r, g, b, 0)
    return img


def make_variants(base_img, out_prefix):
    """从idle生成 attack/hit/death 变体并保存"""
    # idle
    base_img.save(out_prefix + '_idle.png', 'PNG', optimize=True)
    # attack: 增亮 + 轻微放大已由绘制处理，这里增亮
    atk = ImageEnhance.Brightness(base_img).enhance(1.18)
    atk = ImageEnhance.Color(atk).enhance(1.15)
    atk.save(out_prefix + '_attack.png', 'PNG', optimize=True)
    # hit: 红色叠加
    overlay = Image.new('RGBA', base_img.size, (255, 90, 90, 0))
    # 仅在不透明区域叠加红色
    r, g, b, a = base_img.split()
    red = Image.new('RGBA', base_img.size, (255, 80, 80, 255))
    hit = Image.composite(red, base_img, Image.new('L', base_img.size, 110))
    hit.putalpha(a)
    hit.save(out_prefix + '_hit.png', 'PNG', optimize=True)
    # death: 半透明 + 模糊
    death = base_img.filter(ImageFilter.GaussianBlur(radius=2))
    da = death.split()[-1].point(lambda v: int(v * 0.55))
    death.putalpha(da)
    death.save(out_prefix + '_death.png', 'PNG', optimize=True)


def process_enemies():
    print('\n=== 处理敌人 ===')
    os.makedirs(OUT_ENEMY, exist_ok=True)
    root = os.path.join(SRC, 'source_avatar/enemy')
    for eid, name in ENEMIES:
        src = find_sprite(os.path.join(root, eid))
        if not src:
            print(f'  ✗ 未找到 {eid}')
            continue
        img = Image.open(src)
        sq = trim_and_square(img, 192, pad=0.06)
        sq = clean_alpha(sq)
        make_variants(sq, os.path.join(OUT_ENEMY, name))
        print(f'  ✓ {name} (来自 {eid})  4个状态')


def process_bosses():
    print('\n=== 处理Boss ===')
    os.makedirs(OUT_BOSS, exist_ok=True)
    root = os.path.join(SRC, 'source_avatar/enemy_big')
    for bid, name in BOSSES:
        src = find_sprite(os.path.join(root, bid))
        if not src:
            print(f'  ✗ 未找到 {bid}')
            continue
        img = Image.open(src)
        sq = trim_and_square(img, 768, pad=0.05)
        sq = clean_alpha(sq)
        # Boss需要多个phase态：idle/phase1/phase2/rage/hit/death
        sq.save(os.path.join(OUT_BOSS, f'{name}_idle.png'), 'PNG', optimize=True)
        sq.save(os.path.join(OUT_BOSS, f'{name}_phase1.png'), 'PNG', optimize=True)
        # phase2: 增加冷色调
        p2 = ImageEnhance.Color(sq).enhance(1.2)
        p2.save(os.path.join(OUT_BOSS, f'{name}_phase2.png'), 'PNG', optimize=True)
        # rage: 增亮+暖红
        rage = ImageEnhance.Brightness(sq).enhance(1.15)
        r, g, b, a = sq.split()
        red = Image.new('RGBA', sq.size, (255, 120, 120, 255))
        rage = Image.composite(red, rage, Image.new('L', sq.size, 70))
        rage.putalpha(a)
        rage.save(os.path.join(OUT_BOSS, f'{name}_rage.png'), 'PNG', optimize=True)
        # hit
        hit = Image.composite(Image.new('RGBA', sq.size, (255, 80, 80, 255)), sq, Image.new('L', sq.size, 120))
        hit.putalpha(a)
        hit.save(os.path.join(OUT_BOSS, f'{name}_hit.png'), 'PNG', optimize=True)
        # death
        death = sq.filter(ImageFilter.GaussianBlur(radius=3))
        da = death.split()[-1].point(lambda v: int(v * 0.5))
        death.putalpha(da)
        death.save(os.path.join(OUT_BOSS, f'{name}_death.png'), 'PNG', optimize=True)
        print(f'  ✓ {name} (来自 {bid})  6个状态')


def process_backgrounds():
    print('\n=== 处理背景 ===')
    os.makedirs(OUT_BG, exist_ok=True)
    root = os.path.join(SRC, 'source_home/fight/background')
    TW, TH = 720, 1280
    for folder, name in BACKGROUNDS:
        src = find_sprite(os.path.join(root, folder))
        if not src:
            print(f'  ✗ 未找到 {folder}')
            continue
        img = Image.open(src).convert('RGB')
        # cover: 缩放到覆盖 720x1280，居中裁切
        w, h = img.size
        scale = max(TW / w, TH / h)
        nw, nh = int(w * scale), int(h * scale)
        img = img.resize((nw, nh), Image.Resampling.LANCZOS)
        left = (nw - TW) // 2
        top = (nh - TH) // 2
        img = img.crop((left, top, left + TW, top + TH))
        img.save(os.path.join(OUT_BG, f'{name}.png'), 'PNG', optimize=True)
        print(f'  ✓ {name} (来自 background/{folder})')


def process_bullets():
    print('\n=== 处理弹幕 ===')
    os.makedirs(OUT_BULLET, exist_ok=True)
    for fname, name, size in BULLETS:
        src = os.path.join(BULLET_DIR, fname)
        if not os.path.exists(src):
            print(f'  ✗ 未找到 {fname}')
            continue
        img = Image.open(src)
        sq = trim_and_square(img, size, pad=0.02)
        sq = clean_alpha(sq, threshold=12)
        out = os.path.join(OUT_BULLET, f'bullet_{name}.png')
        sq.save(out, 'PNG', optimize=True)
        print(f'  ✓ bullet_{name} ({size}px)')


if __name__ == '__main__':
    process_enemies()
    process_bosses()
    process_backgrounds()
    process_bullets()
    print('\n全部处理完成！')
