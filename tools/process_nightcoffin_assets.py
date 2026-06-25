# -*- coding: utf-8 -*-
"""
夜棺巡礼·八芒浮骸 浮游炮僚机 —— 素材加工脚本
- 源图本身已是透明背景，主要问题是特效边缘的"绿色溢色/光晕"（绿幕抠图残留）。
- 处理：despill 去绿溢色 + 对纯绿光晕降 alpha + 连通域切分大图 + 自动裁剪。
- 输出：assets/companions/night_coffin_array/{body,laser,impact,trail}/*.png
依赖：Pillow, numpy, scipy
"""
import os
import numpy as np
from PIL import Image
from scipy import ndimage

SRC = "浮游炮僚机素材"
OUT = "assets/companions/night_coffin_array"


def load(name):
    return np.asarray(Image.open(os.path.join(SRC, name)).convert("RGBA")).astype(np.float32)


def save(arr, rel, maxdim=512):
    path = os.path.join(OUT, rel)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    a = np.clip(arr, 0, 255).astype(np.uint8)
    im = Image.fromarray(a, "RGBA")
    if max(im.size) > maxdim:
        s = maxdim / max(im.size)
        im = im.resize((max(1, round(im.width * s)), max(1, round(im.height * s))), Image.LANCZOS)
    im.save(path)
    print(f"  -> {rel}  ({im.width}x{im.height})")


def despill(arr, kill=0.85):
    """去绿溢色：把绿色分量压到 max(r,b)；纯绿光晕按绿度削 alpha。"""
    out = arr.copy()
    r, g, b, al = out[..., 0], out[..., 1], out[..., 2], out[..., 3]
    mrb = np.maximum(r, b)
    green_excess = np.clip(g - mrb, 0, 255)
    # 1) 标准 despill：绿通道封顶到 max(r,b)
    out[..., 1] = np.minimum(g, mrb)
    # 2) 纯绿光晕（绿度高且 r,b 较暗）按比例削 alpha，彻底消除绿边
    halo = np.clip(green_excess / 90.0, 0, 1)
    darkish = np.clip(1.0 - mrb / 140.0, 0, 1)
    out[..., 3] = al * (1.0 - kill * halo * darkish)
    return out


def trim(arr, pad=6, athr=8):
    al = arr[..., 3]
    ys, xs = np.where(al > athr)
    if len(xs) == 0:
        return arr
    x0, x1 = max(0, xs.min() - pad), min(arr.shape[1], xs.max() + 1 + pad)
    y0, y1 = max(0, ys.min() - pad), min(arr.shape[0], ys.max() + 1 + pad)
    return arr[y0:y1, x0:x1]


def components(arr, athr=18, min_area=2500, merge=9):
    """连通域切分：alpha 二值化 + 膨胀合并碎片 → 标注 → 返回按面积降序的 bbox。"""
    mask = arr[..., 3] > athr
    mask = ndimage.binary_dilation(mask, iterations=merge)
    lab, n = ndimage.label(mask)
    boxes = []
    for i in range(1, n + 1):
        ys, xs = np.where(lab == i)
        area = len(xs)
        if area < min_area:
            continue
        boxes.append((xs.min(), ys.min(), xs.max() + 1, ys.max() + 1, area))
    boxes.sort(key=lambda b: -b[4])
    return boxes


def rotate90(arr):
    return np.ascontiguousarray(np.rot90(arr, k=-1))  # 顺时针：竖直光束转为水平


def main():
    os.makedirs(OUT, exist_ok=True)

    # ===== 1. 浮游炮本体（统一外观，蓝色水晶尖端=炮口方向，朝下） =====
    print("[body] 机身模型贴图正面.png")
    body = trim(despill(load("机身模型贴图正面.png"), kill=0.6))
    save(body, "body/drone_body.png", maxdim=420)

    # ===== 2. 激光纹理（普通：水平紫束） =====
    print("[laser] 浮游炮模式激光贴图 2.png")
    ln = trim(despill(load("浮游炮模式激光贴图 2.png")))
    save(ln, "laser/laser_tex_normal.png")

    # ===== 3. 激光纹理（暴走：竖直撕裂束 → 转水平） =====
    print("[laser] 浮游炮模式 暴走加强激光束贴图.png")
    lo = trim(despill(load("浮游炮模式 暴走加强激光束贴图.png")))
    save(rotate90(lo), "laser/laser_tex_overdrive.png")

    # ===== 4. 激光三联（蓝箭束 / 紫蓝厚束 / 紫电裂纹）按行切 =====
    print("[laser] 浮游炮模式激光贴图.png (3 rows)")
    l3 = despill(load("浮游炮模式激光贴图.png"))
    boxes = components(l3, min_area=8000, merge=11)
    # 按 y 中心从上到下排序，取前三
    rows = sorted(boxes, key=lambda b: (b[1] + b[3]) / 2)[:3]
    names = ["laser_tex_blue", "laser_tex_thick", "laser_tex_crack"]
    for (x0, y0, x1, y1, _), nm in zip(rows, names):
        save(trim(l3[y0:y1, x0:x1]), f"laser/{nm}.png")

    # ===== 5. 特效合集切分 → 语义命名（命中爆点/减速领域/裂纹/碎片/星爆/暗雾等） =====
    # 切片按面积降序稳定输出；下方 map 是对照预览图人工指认的语义映射。
    print("[impact] 特效等纹理贴图.png")
    fx = despill(load("特效等纹理贴图.png"), kill=0.9)
    fxb = components(fx, min_area=6000, merge=13)
    impact_map = {
        0: "impact_burst",    # 大型爆裂（碎片向上喷发）
        1: "slow_field",      # 仪式环/椭圆减速领域地贴
        2: "spark_cluster",   # 小星+碎刃簇
        3: "dark_smoke",      # 暗紫烟雾残留
        4: "impact_shards",   # 玻璃碎片爆裂
        5: "orbit_ring",      # 环形轨道（激光阵列环）
        6: "impact_crack",    # 地面裂纹
        7: "star_flash",      # 八芒星爆（模式切换/炮口闪光）
        8: "spark",           # 小四芒星点（粒子）
    }
    for idx, (x0, y0, x1, y1, area) in enumerate(fxb):
        nm = impact_map.get(idx, f"fx_{idx:02d}")
        save(trim(fx[y0:y1, x0:x1]), f"impact/{nm}.png")
    print(f"   ({len(fxb)} fx pieces)")

    # ===== 6. 拖尾纹理（可选 overlay）：按行分带切分，取一条干净能量流 =====
    def row_bands(arr, athr=18, gap=12, min_h=30):
        rowmass = (arr[..., 3] > athr).sum(axis=1)
        active = rowmass > (rowmass.max() * 0.04)
        bands, s = [], None
        for y, on in enumerate(active):
            if on and s is None:
                s = y
            elif not on and s is not None:
                if y - s >= min_h:
                    bands.append((s, y))
                s = None
        if s is not None and len(active) - s >= min_h:
            bands.append((s, len(active)))
        return bands

    for src, nm, pick in [("普通形态：不暴走➕暴走 冲刺光效拖尾.png", "trail_overdrive", 2),
                          ("冲撞模式 加速拖尾贴图.png", "trail_normal", 0)]:
        print(f"[trail] {src}")
        t = despill(load(src), kill=0.95)
        bands = row_bands(t)
        if not bands:
            continue
        idx = min(pick, len(bands) - 1)
        y0, y1 = bands[idx]
        strip = trim(t[y0:y1])
        cut = int(strip.shape[1] * 0.22)  # 裁掉左侧浮游炮本体，仅保留能量流
        save(trim(strip[:, cut:]), f"trail/{nm}.png")

    print("\nDONE.")


if __name__ == "__main__":
    main()
