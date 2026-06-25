#!/usr/bin/env python3
"""分析素材库中的敌人、Boss、背景、弹幕，输出尺寸与内容边界信息。"""
import os
from PIL import Image

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def content_bbox(img):
    """返回非透明内容的边界框比例（用于判断素材是否居中/有效）。"""
    if img.mode != 'RGBA':
        img = img.convert('RGBA')
    bbox = img.getbbox()
    if not bbox:
        return None
    w, h = img.size
    l, t, r, b = bbox
    return {
        'bbox': bbox,
        'content_w': r - l,
        'content_h': b - t,
        'fill_ratio': round((r - l) * (b - t) / (w * h), 2),
    }

def scan_dir(label, root, limit=None):
    print(f"\n{'='*60}\n{label}: {root}\n{'='*60}")
    if not os.path.isdir(root):
        print("  (目录不存在)")
        return
    entries = sorted(os.listdir(root))
    count = 0
    for name in entries:
        sub = os.path.join(root, name)
        if os.path.isdir(sub):
            # 找子目录中的png
            pngs = [f for f in os.listdir(sub) if f.lower().endswith('.png')]
            if not pngs:
                continue
            f = os.path.join(sub, pngs[0])
        elif name.lower().endswith('.png'):
            f = sub
        else:
            continue
        try:
            img = Image.open(f)
            info = content_bbox(img)
            fr = info['fill_ratio'] if info else 0
            print(f"  {name:40s} {str(img.size):14s} fill={fr}")
            count += 1
            if limit and count >= limit:
                print(f"  ... (已显示{limit}个)")
                break
        except Exception as e:
            print(f"  {name}: ERROR {e}")

if __name__ == '__main__':
    scan_dir("敌人(enemy)", os.path.join(BASE, '素材/sprites_png/source_avatar/enemy'), limit=40)
    scan_dir("Boss(enemy_big)", os.path.join(BASE, '素材/sprites_png/source_avatar/enemy_big'))
    scan_dir("战斗背景", os.path.join(BASE, '素材/sprites_png/source_home/fight/background'), limit=20)
