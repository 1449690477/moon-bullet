#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Process Dragon Breath common-skill runtime sprites.

Source art is kept in moon-bullet-main/龙息弹开发. Runtime copies are despilled,
trimmed, lightly feathered, and resized into assets/common/dragon_breath.
"""

from __future__ import annotations

import json
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
SRC_CANDIDATES = [
    ROOT / "龙息弹开发",
    ROOT / "moon-bullet-main" / "龙息弹开发",
]
SRC = next((p for p in SRC_CANDIDATES if p.exists()), SRC_CANDIDATES[-1])
OUT = ROOT / "assets" / "common" / "dragon_breath"
PREVIEW = ROOT / "tools" / "dragon_breath_asset_preview"

FILES = {
    "device": ("发射装置主体.png", "device.png", 640),
    "circle": ("法阵.png", "circle.png", 720),
    "projectile_main": ("龙头弹贴图素材.png", "projectile_main.png", 980),
    "projectile_alt": ("龙息弹贴图.png", "projectile_alt.png", 920),
    "projectile_trail": ("龙头弹拖尾光效.png", "projectile_trail.png", 980),
    "hit_blast": ("命中特效 爆炸光电贴图.png", "hit_blast.png", 720),
    "particles": ("特效粒子贴图.png", "particles.png", 720),
}


def load_rgba(name: str) -> np.ndarray:
    return np.asarray(Image.open(SRC / name).convert("RGBA")).astype(np.float32)


def trim(arr: np.ndarray, pad: int = 12, alpha_threshold: int = 8) -> np.ndarray:
    alpha = arr[..., 3]
    ys, xs = np.where(alpha > alpha_threshold)
    if len(xs) == 0:
        return arr
    x0 = max(0, int(xs.min()) - pad)
    y0 = max(0, int(ys.min()) - pad)
    x1 = min(arr.shape[1], int(xs.max()) + 1 + pad)
    y1 = min(arr.shape[0], int(ys.max()) + 1 + pad)
    return arr[y0:y1, x0:x1]


def despill_green(arr: np.ndarray) -> np.ndarray:
    out = arr.copy()
    r, g, b, a = out[..., 0], out[..., 1], out[..., 2], out[..., 3]
    max_rb = np.maximum(r, b)
    diff = g - max_rb
    green = (a > 0) & (diff > 10) & (g > 96) & (r < 180) & (b < 210)
    strength = np.clip((diff - 10) / 80.0, 0, 1)
    out[..., 1] = np.where(green, max_rb + 8, g)
    out[..., 3] = np.where(green, a * (1.0 - 0.72 * strength), a)
    hard = (a > 0) & (diff > 42) & (g > 140) & (r < 130) & (b < 150)
    out[..., 3] = np.where(hard & (out[..., 3] < 62), 0, out[..., 3])
    return out


def erode_alpha(arr: np.ndarray) -> np.ndarray:
    im = Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8), "RGBA")
    alpha = im.getchannel("A")
    eroded = alpha.filter(ImageFilter.MinFilter(3))
    feather = eroded.filter(ImageFilter.GaussianBlur(0.45))
    out = np.asarray(im).astype(np.float32)
    out[..., 3] = np.minimum(out[..., 3], np.asarray(feather).astype(np.float32) * 1.08)
    return out


def save_processed(key: str, src_name: str, out_name: str, max_dim: int) -> dict:
    arr = load_rgba(src_name)
    arr = trim(despill_green(arr), pad=18)
    arr = erode_alpha(despill_green(arr))
    arr = trim(arr, pad=10, alpha_threshold=4)
    im = Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8), "RGBA")
    if max(im.size) > max_dim:
        scale = max_dim / max(im.size)
        im = im.resize((max(1, round(im.width * scale)), max(1, round(im.height * scale))), Image.LANCZOS)
        arr = despill_green(np.asarray(im).astype(np.float32))
        im = Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8), "RGBA")
    path = OUT / out_name
    path.parent.mkdir(parents=True, exist_ok=True)
    im.save(path)
    return {
        "key": key,
        "source": src_name,
        "file": str(path.relative_to(ROOT)),
        "w": im.width,
        "h": im.height,
        "green_residue_pixels": count_green_residue(im),
    }


def count_green_residue(im: Image.Image) -> int:
    arr = np.asarray(im.convert("RGBA")).astype(np.int16)
    r, g, b, a = arr[..., 0], arr[..., 1], arr[..., 2], arr[..., 3]
    residue = (a > 12) & (g > 120) & (g > r + 42) & (g > b + 34) & (r < 150)
    return int(residue.sum())


def make_icon(manifest: dict) -> dict:
    canvas = Image.new("RGBA", (512, 512), (0, 0, 0, 0))
    draw = ImageDraw.Draw(canvas)
    draw.ellipse((38, 38, 474, 474), fill=(8, 22, 28, 220), outline=(196, 168, 86, 230), width=14)
    draw.ellipse((70, 70, 442, 442), outline=(86, 245, 224, 210), width=8)
    if "device" in manifest:
        device = Image.open(ROOT / manifest["device"]["file"]).convert("RGBA")
        device.thumbnail((360, 360), Image.LANCZOS)
        canvas.alpha_composite(device, ((512 - device.width) // 2, 74))
    if "projectile_main" in manifest:
        proj = Image.open(ROOT / manifest["projectile_main"]["file"]).convert("RGBA")
        proj.thumbnail((170, 300), Image.LANCZOS)
        proj = proj.rotate(-22, resample=Image.Resampling.BICUBIC, expand=True)
        canvas.alpha_composite(proj, (258, 128))
    glow = Image.new("RGBA", (512, 512), (0, 0, 0, 0))
    gdraw = ImageDraw.Draw(glow)
    gdraw.ellipse((92, 92, 420, 420), fill=(70, 255, 210, 34))
    glow = glow.filter(ImageFilter.GaussianBlur(22))
    out = Image.alpha_composite(glow, canvas)
    path = OUT / "icon.png"
    out.save(path)
    return {"file": str(path.relative_to(ROOT)), "w": 512, "h": 512, "green_residue_pixels": count_green_residue(out)}


def make_contact_sheet(manifest: dict) -> None:
    PREVIEW.mkdir(parents=True, exist_ok=True)
    rows = []
    for key, info in manifest.items():
        if not isinstance(info, dict) or "file" not in info:
            continue
        im = Image.open(ROOT / info["file"]).convert("RGBA")
        bg = Image.new("RGBA", (220, 180), (5, 7, 8, 255))
        thumb = im.copy()
        thumb.thumbnail((188, 132), Image.LANCZOS)
        bg.alpha_composite(thumb, ((220 - thumb.width) // 2, 12))
        label = ImageDraw.Draw(bg)
        label.text((10, 150), f"{key} {info['w']}x{info['h']}", fill=(210, 250, 242, 255))
        rows.append(bg)
    sheet_w = 660
    sheet_h = max(180, ((len(rows) + 2) // 3) * 180)
    sheet = Image.new("RGBA", (sheet_w, sheet_h), (5, 7, 8, 255))
    for i, cell in enumerate(rows):
        sheet.alpha_composite(cell, ((i % 3) * 220, (i // 3) * 180))
    sheet.save(PREVIEW / "dragon_breath_contact.png")


def main() -> None:
    if not SRC.exists():
        raise SystemExit(f"Dragon Breath source folder not found: {SRC}")
    OUT.mkdir(parents=True, exist_ok=True)
    manifest: dict[str, dict] = {}
    for key, (src_name, out_name, max_dim) in FILES.items():
        manifest[key] = save_processed(key, src_name, out_name, max_dim)
    manifest["icon"] = make_icon(manifest)
    manifest["source_folder"] = str(SRC.relative_to(ROOT))
    manifest["pipeline"] = "trim-despill-erode-alpha-feather-resize"
    (OUT / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    make_contact_sheet(manifest)
    for key, info in manifest.items():
        if isinstance(info, dict) and "file" in info:
            print(f"{key}: {info['file']} {info['w']}x{info['h']} greenResidue={info['green_residue_pixels']}")
    print(f"contact: {PREVIEW / 'dragon_breath_contact.png'}")


if __name__ == "__main__":
    main()
