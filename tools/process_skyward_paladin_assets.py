#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
苍穹圣巡 Skyward Paladin 6号战机素材处理脚本。
Entry: process_skyward_paladin_assets.py

源素材位于「苍穹 战机开发/」，多数已经带 alpha，但边缘存在绿幕残留。
本脚本按稳定的连通域切分顺序抽取运行时资源，并做去绿边、透明边清理、
尺寸约束、预览 sheet 和残留绿色报告。
"""

from __future__ import annotations

import json
import os
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from scipy import ndimage


ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "苍穹 战机开发"
if not SRC.exists():
    SRC = ROOT / "moon-bullet-main" / "苍穹 战机开发"
OUT = ROOT / "assets/player/skyward_paladin"
PREVIEW = ROOT / "tools/skyward_paladin_asset_preview"


def load(name: str) -> np.ndarray:
    return np.asarray(Image.open(SRC / name).convert("RGBA")).astype(np.float32)


def trim(arr: np.ndarray, pad: int = 14, athr: int = 8) -> np.ndarray:
    alpha = arr[..., 3]
    ys, xs = np.where(alpha > athr)
    if len(xs) == 0:
        return arr
    x0, x1 = max(0, xs.min() - pad), min(arr.shape[1], xs.max() + 1 + pad)
    y0, y1 = max(0, ys.min() - pad), min(arr.shape[0], ys.max() + 1 + pad)
    return arr[y0:y1, x0:x1]


def pad_rgba(arr: np.ndarray, pad: int = 8) -> np.ndarray:
    if pad <= 0:
        return arr
    return np.pad(arr, ((pad, pad), (pad, pad), (0, 0)), mode="constant")


def alpha_feather(arr: np.ndarray, radius: float = 0.55) -> np.ndarray:
    """Slightly feather alpha after chroma cleanup to hide hard green-screen cuts."""
    if radius <= 0:
        return arr
    out = arr.copy()
    alpha = Image.fromarray(np.clip(out[..., 3], 0, 255).astype(np.uint8), "L")
    soft = np.asarray(alpha.filter(ImageFilter.GaussianBlur(radius))).astype(np.float32)
    out[..., 3] = np.minimum(out[..., 3], np.maximum(soft, out[..., 3] * 0.92))
    return out


def remove_green_edge_pixels(arr: np.ndarray) -> np.ndarray:
    out = arr.copy()
    r, g, b, a = out[..., 0], out[..., 1], out[..., 2], out[..., 3]
    max_rb = np.maximum(r, b)
    green_edge = (a > 0) & (g > 118) & (g > r + 34) & (g > b + 26) & (r < 150)
    hard_green = (a > 0) & (g > 150) & (r < 112) & (b < 132) & (g > r + 48) & (g > b + 42)
    strength = np.clip((g - max_rb) / 110.0, 0, 1)
    out[..., 1] = np.where(green_edge, max_rb + 8, g)
    out[..., 3] = np.where(green_edge, a * (1.0 - 0.90 * strength), a)
    out[..., 3] = np.where(green_edge & (out[..., 3] < 24), 0, out[..., 3])
    out[..., 3] = np.where(hard_green, 0, out[..., 3])
    return out


def keep_major_alpha_islands(arr: np.ndarray, min_ratio: float = 0.035, min_area: int = 1400) -> np.ndarray:
    """Drop detached tiny islands that came from nearby sheet fragments.

    Runtime body sprites should be one clean silhouette. Small detached alpha
    islands were responsible for the overdrive lower-right ring/shard artifact.
    """
    mask = arr[..., 3] > 10
    lab, n = ndimage.label(mask)
    if n <= 1:
        return arr
    areas = np.bincount(lab.ravel())
    if len(areas) <= 1:
        return arr
    largest = areas[1:].max()
    keep = np.zeros_like(mask)
    for i in range(1, n + 1):
        area = areas[i]
        if area >= max(min_area, largest * min_ratio):
            keep |= lab == i
    out = arr.copy()
    out[..., 3] = np.where(keep, out[..., 3], 0)
    return trim(out, pad=18)


def despill(arr: np.ndarray) -> np.ndarray:
    """压掉纯绿边缘，不伤主体的蓝青水晶。"""
    out = arr.copy()
    r, g, b, a = out[..., 0], out[..., 1], out[..., 2], out[..., 3]
    max_rb = np.maximum(r, b)
    green_excess = np.clip(g - max_rb, 0, 255)
    pure_green = (g > 138) & (r < 126) & (b < 190) & (green_excess > 18)
    edge_strength = np.clip(green_excess / 130.0, 0, 1)
    dark_or_edge = np.clip(1.0 - max_rb / 245.0, 0, 1)
    out[..., 1] = np.where(pure_green, np.minimum(g, max_rb + 10), g)
    out[..., 3] = np.where(pure_green, a * (1.0 - 0.94 * edge_strength * (0.42 + dark_or_edge)), a)
    out[..., 3] = np.where((pure_green & (out[..., 3] < 18)), 0, out[..., 3])
    return out


def components(name: str, min_area: int = 600, merge: int = 3, athr: int = 10, pad: int = 14) -> list[np.ndarray]:
    arr = load(name)
    mask = arr[..., 3] > athr
    mask = ndimage.binary_dilation(mask, iterations=merge)
    lab, n = ndimage.label(mask)
    boxes = []
    for i in range(1, n + 1):
        ys, xs = np.where(lab == i)
        if len(xs) < min_area:
            continue
        boxes.append((xs.min(), ys.min(), xs.max() + 1, ys.max() + 1, len(xs)))
    boxes.sort(key=lambda b: (b[1] // 80, b[0], b[2] - b[0]))
    return [pad_rgba(remove_green_edge_pixels(alpha_feather(remove_green_edge_pixels(trim(despill(arr[y0:y1, x0:x1]), pad=pad)))), 6) for x0, y0, x1, y1, _ in boxes]


def save_piece(arr: np.ndarray, rel: str, maxdim: int = 520, major_islands: bool = False) -> dict:
    path = OUT / rel
    path.parent.mkdir(parents=True, exist_ok=True)
    if major_islands:
        arr = keep_major_alpha_islands(arr)
    arr = remove_green_edge_pixels(alpha_feather(remove_green_edge_pixels(arr), 0.45))
    im = Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8), "RGBA")
    if max(im.size) > maxdim:
        scale = maxdim / max(im.size)
        im = im.resize((max(1, round(im.width * scale)), max(1, round(im.height * scale))), Image.LANCZOS)
        arr2 = np.asarray(im).astype(np.float32)
        im = Image.fromarray(np.clip(remove_green_edge_pixels(arr2), 0, 255).astype(np.uint8), "RGBA")
    im.save(path)
    return {"file": str(path.relative_to(ROOT)), "w": im.width, "h": im.height}


def make_crystal_glow_layer(src_rel: str, dst_rel: str, manifest: dict, tint=(118, 230, 255)) -> None:
    """Create a conservative blue/cyan emissive layer.

    The source art mixes white armor, sacred-gold metal, and blue crystal. This
    mask intentionally ignores most low-chroma whites and warm gold pixels so
    the runtime can bloom only the crystal material instead of whitening the
    whole ship.
    """
    src_info = manifest.get(src_rel)
    if not src_info:
        print(f"[WARN] cannot derive glow layer, missing {src_rel}")
        return
    src_path = ROOT / src_info["file"]
    im = Image.open(src_path).convert("RGBA")
    arr = np.asarray(im).astype(np.float32)
    r, g, b, a = arr[..., 0], arr[..., 1], arr[..., 2], arr[..., 3]
    mx = np.maximum.reduce([r, g, b])
    mn = np.minimum.reduce([r, g, b])
    chroma = mx - mn
    cool = (b > 92) & (g > 82) & (b + g > r * 1.62) & (chroma > 16)
    electric = (b > 150) & (g > 125) & (b > r * 0.92)
    warm_gold = (r > 132) & (g > 96) & (b < 96) & (r > b * 1.25)
    pure_white_metal = (r > 205) & (g > 205) & (b > 205) & (chroma < 22)
    mask = (a > 10) & (cool | electric) & (~warm_gold) & (~pure_white_metal)
    strength = np.clip((b * 0.62 + g * 0.42 - r * 0.46 - 52) / 170, 0, 1)
    strength *= np.clip(chroma / 86, 0.25, 1.0)
    alpha = np.where(mask, a * strength, 0)
    out = np.zeros_like(arr)
    out[..., 0] = tint[0]
    out[..., 1] = tint[1]
    out[..., 2] = tint[2]
    out[..., 3] = np.clip(alpha, 0, 210)
    glow = Image.fromarray(np.clip(out, 0, 255).astype(np.uint8), "RGBA")
    glow = glow.filter(ImageFilter.GaussianBlur(0.45))
    dst_path = OUT / dst_rel
    dst_path.parent.mkdir(parents=True, exist_ok=True)
    glow.save(dst_path)
    manifest[dst_rel] = {"file": str(dst_path.relative_to(ROOT)), "w": glow.width, "h": glow.height}
    print(f"  -> {dst_rel} {glow.width}x{glow.height} [derived crystal glow]")


def derive_material_layers(manifest: dict) -> None:
    derive_pairs = [
        ("body/skyward_body_normal.png", "body/skyward_body_normal_glow.png"),
        ("body/skyward_body_overdrive.png", "body/skyward_body_overdrive_glow.png"),
        ("body/skyward_body_overdrive_small.png", "body/skyward_body_overdrive_small_glow.png"),
        ("body/skyward_core_orb.png", "body/skyward_core_orb_glow.png"),
        ("modules/skyward_halo_ring.png", "modules/skyward_halo_ring_glow.png"),
    ]
    for n in range(1, 7):
        derive_pairs.append((f"modules/skyward_hover_module_{n}.png", f"modules/skyward_hover_module_{n}_glow.png"))
        derive_pairs.append((f"modules/skyward_crystal_wing_{n}.png", f"modules/skyward_crystal_wing_{n}_glow.png"))
    for name in [
        "skyward_lance_s", "skyward_lance_m", "skyward_lance_l", "skyward_lance_heavy",
        "skyward_crystal_shard_s", "skyward_crystal_shard_m", "skyward_halo_orb",
        "skyward_wing_blade_1", "skyward_wing_blade_2", "skyward_wing_blade_3",
        "skyward_feather_blade_1", "skyward_feather_blade_2", "skyward_module_blade",
        "skyward_module_blade_pair", "skyward_arc_blade",
        "skyward_chain_lance_s", "skyward_chain_lance_m", "skyward_chain_lance_overdrive",
    ]:
        derive_pairs.append((f"bullets/{name}.png", f"bullets/{name}_glow.png"))
    for name in [
        "skyward_blink_sword_body", "skyward_blink_sword_streak",
        "skyward_blink_dash_trail", "skyward_blink_sword_trail",
        "skyward_blink_wing_open_1", "skyward_blink_wing_open_2",
        "skyward_blink_wing_open_3", "skyward_blink_wing_open_4",
        "skyward_blink_wing_burst", "skyward_blink_dash_wisp_s",
        "skyward_blink_dash_wisp_m", "skyward_blink_dash_wisp_l",
    ]:
        derive_pairs.append((f"skill/{name}.png", f"skill/{name}_glow.png"))
    for name in [
        "skyward_blink_float_charge_1", "skyward_blink_float_charge_2",
        "skyward_blink_float_charge_3", "skyward_blink_float_charge_4",
        "skyward_blink_float_charge_5", "skyward_blink_float_empty",
        "skyward_blink_charge_glow_1", "skyward_blink_charge_glow_2",
        "skyward_blink_charge_glow_3",
    ]:
        derive_pairs.append((f"ui/{name}.png", f"ui/{name}_glow.png"))
    for name in [
        "skyward_aegis_barrier_panel", "skyward_aegis_barrier_panel_small",
        "skyward_aegis_hex_texture", "skyward_aegis_flow_strip",
        "skyward_aegis_edge_strip", "skyward_aegis_ring",
        "skyward_aegis_core", "skyward_aegis_projector_1",
        "skyward_aegis_projector_2", "skyward_aegis_projector_3",
        "skyward_aegis_projector_4", "skyward_aegis_burst_s",
        "skyward_aegis_burst_m", "skyward_aegis_burst_l",
    ]:
        derive_pairs.append((f"ultimate/{name}.png", f"ultimate/{name}_glow.png"))
    for src, dst in derive_pairs:
        make_crystal_glow_layer(src, dst, manifest)


def save_from(pieces: list[np.ndarray], idx: int, rel: str, maxdim: int, manifest: dict, major_islands: bool = False) -> None:
    if idx >= len(pieces):
        print(f"[WARN] missing component {idx} for {rel}")
        return
    manifest[rel] = save_piece(pieces[idx], rel, maxdim, major_islands=major_islands)
    print(f"  -> {rel} {manifest[rel]['w']}x{manifest[rel]['h']}")


def residual_green_score(path: Path) -> int:
    im = np.asarray(Image.open(path).convert("RGBA"))
    if im.size == 0:
        return 0
    r, g, b, a = [im[..., i].astype(np.int16) for i in range(4)]
    # Do not count intentional cyan crystal highlights as green spill.
    mask = (a > 12) & (g > 150) & (r < 112) & (b < 132) & (g > r + 48) & (g > b + 42)
    return int(mask.sum())


def make_preview(manifest: dict) -> None:
    PREVIEW.mkdir(parents=True, exist_ok=True)
    thumbs = []
    for rel in sorted(manifest):
        p = ROOT / manifest[rel]["file"]
        im = Image.open(p).convert("RGBA")
        im.thumbnail((116, 116), Image.LANCZOS)
        thumbs.append((rel, im.copy()))
    cols, cell_w, cell_h = 5, 190, 160
    rows = max(1, (len(thumbs) + cols - 1) // cols)
    sheet = Image.new("RGBA", (cols * cell_w, rows * cell_h), (12, 16, 26, 255))
    draw = ImageDraw.Draw(sheet)
    for i, (name, im) in enumerate(thumbs):
        x = (i % cols) * cell_w
        y = (i // cols) * cell_h
        sheet.alpha_composite(im, (x + (cell_w - im.width) // 2, y + 8))
        draw.text((x + 8, y + 128), name.split("/")[-1][:26], fill=(220, 242, 255, 255))
    sheet.save(PREVIEW / "skyward_paladin_preview.png")


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    manifest: dict[str, dict] = {}

    look = components("外观贴图.png", min_area=600, merge=3)
    normal = components("普通 长毛弹幕 和打击贴图.png", min_area=600, merge=3)
    over = components("暴走状态光翼展开机身贴图 和光刃弹幕 暴走弹幕贴图.png", min_area=600, merge=3)
    lance = components("更详细的 长矛弹幕细节贴图.png", min_area=600, merge=3)
    laser = components("激光弹幕 贴图 悬浮体.png", min_area=600, merge=3)
    chain = components("连锁特效 题图 拖尾素材.png", min_area=350, merge=2)
    blink_portal = components("空格小技能 穿梭 /用于穿梭的特效 开传送门等.png", min_area=350, merge=2)
    blink_trail = components("空格小技能 穿梭 /飞机穿梭时候的 拖尾 粒子效果 也可以用于飞剑飞出去的拖尾特效 命中效果.png", min_area=350, merge=2)
    blink_sword = components("空格小技能 穿梭 /飞剑 本体 特效 光效 音速遮罩 打击效果.png", min_area=350, merge=2)
    blink_ui = components("空格小技能 穿梭 /技能 和 五次存储图标、.png", min_area=350, merge=2)
    blink_wing = components("空格小技能 穿梭 /穿梭特效 光翼和拖尾.png", min_area=350, merge=2)
    blink_orbit_ui = components("空格小技能 穿梭 /穿梭技能层数提示Ui.png", min_area=350, merge=2)
    aegis_main = components("大招开发/大招护盾主贴图素材.png", min_area=600, merge=3)
    aegis_panel = components("大招开发/大招护盾贴图.png", min_area=500, merge=3)
    aegis_detail = components("大招开发/护盾细节 纹理贴图.png", min_area=260, merge=2)
    aegis_projector = components("大招开发/护盾释放时 释放护盾的僚机贴图.png", min_area=350, merge=2)
    fx = components("特效贴图.png", min_area=600, merge=3)
    particles = components("粒子特效 打击特效 光效图.png", min_area=600, merge=3)

    print("[body/modules]")
    # Use the full front-facing winged silhouette as the runtime normal body.
    # The earlier first component is a narrower vertical variant; it reads too
    # much like a thin spear in-game and misses the concept sheet's broad
    # crystal-paladin profile.
    save_from(look, 2, "body/skyward_body_normal.png", 520, manifest)
    # over[0] is wider but contains a detached lower-right fragment on the
    # source sheet; over[1] is the clean integrated overdrive silhouette.
    save_from(over, 1, "body/skyward_body_overdrive.png", 620, manifest, major_islands=True)
    save_from(over, 10, "body/skyward_body_overdrive_small.png", 440, manifest, major_islands=True)
    save_from(look, 17, "body/skyward_core_orb.png", 180, manifest)
    save_from(look, 18, "modules/skyward_halo_ring.png", 260, manifest)
    for n, idx in enumerate([11, 12, 13, 14, 15, 16], start=1):
        save_from(look, idx, f"modules/skyward_hover_module_{n}.png", 230, manifest)
    for n, idx in enumerate([19, 20, 22, 23, 25, 26], start=1):
        save_from(look, idx, f"modules/skyward_crystal_wing_{n}.png", 220, manifest)

    print("[ui]")
    save_from(look, 0, "ui/skyward_avatar.png", 180, manifest)
    save_from(over, 1, "ui/skyward_cutin.png", 760, manifest, major_islands=True)
    save_from(look, 17, "ui/skyward_icon.png", 128, manifest)

    print("[bullets]")
    for rel, idx, md in [
        ("bullets/skyward_lance_s.png", 9, 240),
        ("bullets/skyward_lance_m.png", 4, 300),
        ("bullets/skyward_lance_l.png", 1, 360),
        ("bullets/skyward_lance_heavy.png", 0, 390),
        ("bullets/skyward_crystal_shard_s.png", 31, 130),
        ("bullets/skyward_crystal_shard_m.png", 27, 170),
        ("bullets/skyward_halo_orb.png", 25, 160),
    ]:
        save_from(lance, idx, rel, md, manifest)
    for rel, idx, md in [
        ("bullets/skyward_wing_blade_1.png", 34, 260),
        ("bullets/skyward_wing_blade_2.png", 36, 280),
        ("bullets/skyward_wing_blade_3.png", 38, 300),
        ("bullets/skyward_feather_blade_1.png", 74, 120),
        ("bullets/skyward_feather_blade_2.png", 77, 130),
    ]:
        save_from(over, idx, rel, md, manifest)
    for rel, idx, md in [
        ("bullets/skyward_module_blade.png", 14, 160),
        ("bullets/skyward_module_blade_pair.png", 17, 160),
        ("bullets/skyward_arc_blade.png", 35, 180),
    ]:
        save_from(normal, idx, rel, md, manifest)
    for rel, idx, md in [
        ("bullets/skyward_chain_lance_s.png", 6, 240),
        ("bullets/skyward_chain_lance_m.png", 7, 280),
        ("bullets/skyward_chain_lance_overdrive.png", 3, 420),
    ]:
        save_from(chain, idx, rel, md, manifest)

    print("[beams/vfx]")
    for rel, idx, md in [
        ("beams/skyward_beam_thin.png", 0, 620),
        ("beams/skyward_beam_mid.png", 1, 680),
        ("beams/skyward_beam_wide.png", 2, 760),
        ("beams/skyward_beam_overdrive.png", 3, 820),
        ("vfx/skyward_flow_strip.png", 37, 760),
    ]:
        save_from(laser, idx, rel, md, manifest)
    for rel, idx, md in [
        ("vfx/skyward_chain_flow_short.png", 17, 680),
        ("vfx/skyward_chain_flow_long.png", 22, 760),
        ("vfx/skyward_chain_flow_overdrive.png", 26, 820),
        ("vfx/skyward_chain_burst.png", 42, 220),
    ]:
        save_from(chain, idx, rel, md, manifest)
    for rel, idx, md in [
        ("vfx/skyward_hit_s.png", 41, 220),
        ("vfx/skyward_hit_m.png", 49, 260),
        ("vfx/skyward_hit_l.png", 52, 320),
        ("vfx/skyward_hit_ring.png", 24, 190),
        ("vfx/skyward_charge_ring.png", 25, 190),
    ]:
        save_from(normal, idx, rel, md, manifest)
    for rel, idx, md in [
        ("vfx/skyward_overdrive_aura.png", 14, 560),
        ("vfx/skyward_overdrive_ring.png", 8, 360),
        ("vfx/skyward_crystal_burst.png", 10, 380),
        ("vfx/skyward_gold_burst.png", 15, 320),
    ]:
        save_from(fx, idx, rel, md, manifest)
    for rel, idx, md in [
        ("vfx/skyward_blue_spark.png", 3, 120),
        ("vfx/skyward_gold_spark.png", 5, 120),
        ("vfx/skyward_crystal_shatter.png", 15, 280),
        ("vfx/skyward_light_wing_trail.png", 23, 340),
    ]:
        save_from(particles, idx, rel, md, manifest)

    print("[stellar blink skill]")
    for rel, idx, md in [
        ("skill/skyward_blink_portal_ring.png", 0, 320),
        ("skill/skyward_blink_rift.png", 10, 260),
        ("skill/skyward_blink_flash.png", 22, 220),
    ]:
        save_from(blink_portal, idx, rel, md, manifest)
    for rel, idx, md in [
        ("skill/skyward_blink_dash_trail.png", 0, 760),
        ("skill/skyward_blink_sword_trail.png", 6, 760),
        ("skill/skyward_blink_hit_burst.png", 34, 260),
    ]:
        save_from(blink_trail, idx, rel, md, manifest)
    for rel, idx, md in [
        ("skill/skyward_blink_sword_body.png", 0, 320),
        ("skill/skyward_blink_sword_streak.png", 2, 320),
        ("skill/skyward_blink_sonic_cone.png", 22, 420),
    ]:
        save_from(blink_sword, idx, rel, md, manifest)
    for n, idx in enumerate([2, 3, 4, 5, 6], start=1):
        save_from(blink_ui, idx, f"ui/skyward_blink_charge_{n}.png", 190, manifest)
    for n, idx in enumerate([7, 8, 9, 10, 11], start=1):
        save_from(blink_ui, idx, f"ui/skyward_blink_empty_{n}.png", 190, manifest)
    save_from(blink_ui, 20, "ui/skyward_blink_ready_glow.png", 140, manifest)
    save_from(blink_ui, 23, "skill/skyward_blink_ready_flash.png", 170, manifest)
    for n, idx in enumerate([0, 1, 2, 15], start=1):
        save_from(blink_wing, idx, f"skill/skyward_blink_wing_open_{n}.png", 360, manifest)
    save_from(blink_wing, 20, "skill/skyward_blink_wing_burst.png", 460, manifest)
    for rel, idx, md in [
        ("skill/skyward_blink_dash_wisp_s.png", 16, 180),
        ("skill/skyward_blink_dash_wisp_m.png", 18, 360),
        ("skill/skyward_blink_dash_wisp_l.png", 20, 500),
    ]:
        save_from(blink_wing, idx, rel, md, manifest)
    for n, idx in enumerate([8, 7, 5, 3, 0], start=1):
        save_from(blink_orbit_ui, idx, f"ui/skyward_blink_float_charge_{n}.png", 140, manifest)
    save_from(blink_orbit_ui, 40, "ui/skyward_blink_float_empty.png", 140, manifest)
    for n, idx in enumerate([55, 55, 55, 50, 58, 41]):
        save_from(blink_orbit_ui, idx, f"ui/skyward_blink_charge_bar_{n}.png", 520, manifest)
    for n, idx in enumerate([38, 28, 29], start=1):
        save_from(blink_orbit_ui, idx, f"ui/skyward_blink_charge_glow_{n}.png", 150, manifest)

    print("[ultimate aegis]")
    # 圣域折光壁：使用素材表中的弧形光学护盾作为基底，运行时只做裁切/遮罩/流光增强。
    # 这些索引对应 V1 文档素材表中的：完整屏障、小屏障、流光条、细节纹理、金色环核、投射僚机和爆发星芒。
    save_from(aegis_panel, 14, "ultimate/skyward_aegis_barrier_panel.png", 740, manifest, major_islands=True)
    save_from(aegis_panel, 13, "ultimate/skyward_aegis_barrier_panel_small.png", 520, manifest, major_islands=True)
    save_from(aegis_detail, 5, "ultimate/skyward_aegis_hex_texture.png", 620, manifest, major_islands=True)
    save_from(aegis_detail, 0, "ultimate/skyward_aegis_flow_strip.png", 760, manifest)
    save_from(aegis_detail, 1, "ultimate/skyward_aegis_edge_strip.png", 760, manifest)
    save_from(aegis_panel, 0, "ultimate/skyward_aegis_ring.png", 260, manifest)
    save_from(aegis_panel, 1, "ultimate/skyward_aegis_core.png", 240, manifest)
    for n, idx in enumerate([0, 1, 2, 3], start=1):
        save_from(aegis_projector, idx, f"ultimate/skyward_aegis_projector_{n}.png", 260, manifest, major_islands=True)
    for rel, idx, md in [
        ("ultimate/skyward_aegis_burst_s.png", 33, 220),
        ("ultimate/skyward_aegis_burst_m.png", 34, 280),
        ("ultimate/skyward_aegis_burst_l.png", 35, 340),
    ]:
        save_from(aegis_projector, idx, rel, md, manifest)
    if len(aegis_main) > 0:
        save_from(aegis_main, 0, "ultimate/skyward_aegis_reference_full.png", 760, manifest, major_islands=True)

    print("[derived material layers]")
    derive_material_layers(manifest)

    report = []
    for rel, info in manifest.items():
        score = residual_green_score(ROOT / info["file"])
        if score:
            report.append({"asset": rel, "green_pixels": score})
    (PREVIEW).mkdir(parents=True, exist_ok=True)
    with open(PREVIEW / "skyward_manifest.json", "w", encoding="utf-8") as f:
        json.dump(manifest, f, ensure_ascii=False, indent=2)
    with open(PREVIEW / "residual_green_report.json", "w", encoding="utf-8") as f:
        json.dump(report, f, ensure_ascii=False, indent=2)
    make_preview(manifest)
    print(f"[done] assets={len(manifest)} residual_green_items={len(report)} preview={PREVIEW / 'skyward_paladin_preview.png'}")


if __name__ == "__main__":
    main()
