#!/usr/bin/env python3
"""Generate Mother Hive Ring black-hole sequence frames.

The sequence is the large-scale deformation layer for the linked ultimate.
Realtime game code still handles bullet capture, inward energy streams,
particle flow, singularity flash, and final butterfly entities.
"""

from __future__ import annotations

import math
import shutil
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
ASSET_DIR = ROOT / "assets/companions/mother_hive_ring/ultimate_link"
OUT = ASSET_DIR / "blackhole_sequence"
SIZE = 768
C = SIZE / 2
COUNTS = {"deploy": 16, "loop": 32, "overload": 16, "collapse": 12}


def clamp(v: float, lo: float = 0.0, hi: float = 1.0) -> float:
    return max(lo, min(hi, v))


def rgba(color: tuple[int, int, int], a: float) -> tuple[int, int, int, int]:
    return (color[0], color[1], color[2], max(0, min(255, int(a * 255))))


def ease(t: float) -> float:
    t = clamp(t)
    return t * t * (3 - 2 * t)


def ease_out(t: float) -> float:
    t = clamp(t)
    return 1 - (1 - t) * (1 - t)


def open_asset(name: str) -> Image.Image | None:
    path = ASSET_DIR / name
    if not path.exists():
        return None
    return Image.open(path).convert("RGBA")


ASSETS = {
    "disk_main": open_asset("mhr_bh_disk_03.png"),
    "disk_long": open_asset("mhr_bh_disk_02.png"),
    "disk_soft": open_asset("mhr_bh_disk_01.png"),
    "arm_a": open_asset("mhr_vortex_arm_01.png"),
    "arm_b": open_asset("mhr_vortex_arm_03.png"),
    "ribbon": open_asset("mhr_flow_ribbon_01.png"),
    "trail": open_asset("mhr_butterfly_trail_fragment_01.png"),
    "shard": open_asset("mhr_crystal_shard_01.png"),
}
ASSETS = {k: v for k, v in ASSETS.items() if v is not None}


def alpha_scaled(im: Image.Image, alpha: float) -> Image.Image:
    out = im.copy()
    if alpha < 1:
        out.putalpha(out.getchannel("A").point(lambda p: int(p * clamp(alpha))))
    return out


def paste_texture(
    base: Image.Image,
    tex: Image.Image | None,
    x: float,
    y: float,
    width: float,
    alpha: float,
    rot: float = 0,
    scale_y: float = 1.0,
) -> None:
    if tex is None or alpha <= 0 or width <= 2:
        return
    w = max(2, int(width))
    h = max(2, int(w * tex.height / tex.width * scale_y))
    im = tex.resize((w, h), Image.Resampling.LANCZOS)
    im = alpha_scaled(im, alpha)
    if abs(rot) > 0.0001:
        im = im.rotate(math.degrees(rot), resample=Image.Resampling.BICUBIC, expand=True)
    base.alpha_composite(im, (int(x - im.width / 2), int(y - im.height / 2)))


def draw_blur_ellipse(
    base: Image.Image,
    cx: float,
    cy: float,
    rx: float,
    ry: float,
    color: tuple[int, int, int],
    alpha: float,
    blur: float,
) -> None:
    layer = Image.new("RGBA", base.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    d.ellipse((cx - rx, cy - ry, cx + rx, cy + ry), fill=rgba(color, alpha))
    if blur > 0:
        layer = layer.filter(ImageFilter.GaussianBlur(blur))
    base.alpha_composite(layer)


def spiral_xy(lane: float, t: float, phase: float, outer: float, inner: float, ry: float = 0.74) -> tuple[float, float]:
    e = ease(t)
    curl = 3.0 + 0.65 * math.sin(phase * 0.7 + lane * 5.1)
    a = lane * math.tau + phase + e * curl
    r = outer * (1 - e) + inner * e
    sway = math.sin(phase * 1.3 + t * math.tau * 2.0 + lane * 4.0) * 15 * math.sin(t * math.pi)
    x = C + math.cos(a) * r + math.cos(a + math.pi / 2) * sway
    y = C + math.sin(a) * r * ry + math.sin(a + math.pi / 2) * sway * 0.50
    return x, y


def draw_flow_ribbon_layer(
    base: Image.Image,
    phase_t: float,
    progress: float,
    collapse: float,
    overload: float,
    burst: float,
) -> None:
    layer = Image.new("RGBA", base.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    outer = 315 * (0.72 + progress * 0.28) * (1 - collapse * 0.58 + burst * 0.16)
    inner = 76 * (1 - collapse * 0.62) + 16 * burst
    count = 14 + int(overload * 8)
    palette = [
        ((255, 176, 236), 0.36, 7.0),
        ((255, 245, 242), 0.42, 4.2),
        ((167, 255, 196), 0.24, 8.5),
        ((221, 176, 255), 0.28, 5.4),
        ((255, 224, 184), 0.22, 3.0),
    ]
    for i in range(count):
        lane = i / count + math.sin(i * 11.7) * 0.015
        color, alpha, width = palette[i % len(palette)]
        pts = [spiral_xy(lane, s / 32, phase_t * math.tau * (0.75 + (i % 3) * 0.05) + i * 0.42, outer * (0.88 + (i % 4) * 0.035), inner) for s in range(33)]
        fade = progress * (1 - burst * 0.25)
        d.line(pts, fill=rgba(color, alpha * fade), width=max(1, int(width * (1 + overload * 0.45) * (1 - collapse * 0.25))), joint="curve")
        if i % 3 != 0:
            d.line(pts, fill=rgba((255, 252, 246), 0.18 * fade), width=max(1, int(1.5 + overload * 1.0)), joint="curve")
    layer = layer.filter(ImageFilter.GaussianBlur(0.75 + overload * 0.55))
    base.alpha_composite(layer)


def draw_flow_particles(
    base: Image.Image,
    phase_t: float,
    progress: float,
    collapse: float,
    overload: float,
    burst: float,
) -> None:
    layer = Image.new("RGBA", base.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    count = 82 + int(overload * 42)
    outer = 312 * (1 - collapse * 0.55 + burst * 0.12)
    inner = 64 * (1 - collapse * 0.58) + 10 * burst
    speed = 0.76 + overload * 0.45 + collapse * 0.82
    for i in range(count):
        seed = ((i * 37) % 101) / 101
        t = (phase_t * speed + seed + (i % 5) * 0.04) % 1
        lane = i / count + math.sin(i * 8.17) * 0.012
        x, y = spiral_xy(lane, t, phase_t * math.tau + i * 0.31, outer, inner)
        x2, y2 = spiral_xy(lane, min(1, t + 0.025), phase_t * math.tau + i * 0.31, outer, inner)
        a = math.atan2(y2 - y, x2 - x)
        glow = math.pow(t, 1.2)
        r = (1.7 + (i % 4) * 0.35 + overload * 0.65 + collapse * 0.75) * (1 - t * 0.28)
        color = (255, 238, 190) if i % 9 == 0 else ((160, 255, 198) if i % 5 == 0 else (255, 176, 236))
        alpha = progress * (0.54 + glow * 0.34) * (1 - burst * 0.15)
        d.ellipse((x - r * 3.1, y - r * 0.72, x + r * 3.1, y + r * 0.72), fill=rgba(color, alpha))
        if i % 4 == 0:
            tail_x, tail_y = spiral_xy(lane, max(0, t - 0.08), phase_t * math.tau + i * 0.31, outer, inner)
            d.line((tail_x, tail_y, x, y), fill=rgba(color, alpha * 0.32), width=max(1, int(r * 0.6)))
        if i % 23 == 0 and "shard" in ASSETS:
            paste_texture(layer, ASSETS["shard"], x, y, 18 + r * 3, 0.18 * progress, a + phase_t, 1.0)
    layer = layer.filter(ImageFilter.GaussianBlur(0.18))
    base.alpha_composite(layer)


def apply_outer_feather(im: Image.Image, strength: float = 1.0) -> None:
    alpha = im.getchannel("A")
    px = alpha.load()
    for y in range(SIZE):
        dy = (y - C) / (SIZE * 0.47)
        for x in range(SIZE):
            dx = (x - C) / (SIZE * 0.48)
            r = math.sqrt(dx * dx + dy * dy)
            if r > 0.76:
                keep = clamp((1.12 - r) / 0.36)
                keep = keep * keep * (3 - 2 * keep)
                px[x, y] = int(px[x, y] * (keep * strength + (1 - strength)))
    im.putalpha(alpha)


def erase_flower_gap(im: Image.Image, collapse: float, burst: float) -> None:
    alpha = im.getchannel("A")
    px = alpha.load()
    rx = 125 * (1 - collapse * 0.52 + burst * 0.12)
    ry = 92 * (1 - collapse * 0.44 + burst * 0.08)
    for y in range(SIZE):
        dy = (y - C + 5) / ry
        for x in range(SIZE):
            dx = (x - C) / rx
            v = math.sqrt(dx * dx + dy * dy)
            if v < 1.18:
                keep = clamp((v - 0.50) / 0.68)
                keep = keep * keep * (3 - 2 * keep)
                px[x, y] = int(px[x, y] * keep)
    im.putalpha(alpha)


def draw_core(base: Image.Image, progress: float, collapse: float, overload: float, burst: float) -> None:
    dark = 46 * (1 - collapse * 0.28) + 7 * burst
    draw_blur_ellipse(base, C, C - 5, dark * 1.16, dark * 0.72, (3, 0, 12), 0.26 * progress * (1 - burst * 0.65), 8)
    if overload > 0.05 or collapse > 0.10 or burst > 0.02:
        glow = 48 + overload * 30 + collapse * 42 + burst * 84
        draw_blur_ellipse(base, C, C - 5, glow, glow * 0.82, (255, 178, 238), (0.18 + overload * 0.16 + collapse * 0.25 + burst * 0.42) * progress, 11)
        draw_blur_ellipse(base, C, C - 5, 14 + burst * 24, 12 + burst * 22, (255, 252, 255), (0.42 + burst * 0.38) * progress, 2)


def draw_burst_shards(base: Image.Image, phase_t: float, burst: float) -> None:
    if burst <= 0.02:
        return
    layer = Image.new("RGBA", base.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    for i in range(28):
        a = i / 28 * math.tau + phase_t * 1.4
        r0 = 28 + burst * 42
        r1 = 92 + burst * (138 + (i % 4) * 18)
        x0 = C + math.cos(a) * r0
        y0 = C + math.sin(a) * r0 * 0.76
        x1 = C + math.cos(a) * r1
        y1 = C + math.sin(a) * r1 * 0.76
        color = (255, 244, 218) if i % 3 == 0 else (255, 188, 238)
        d.line((x0, y0, x1, y1), fill=rgba(color, 0.38 * burst), width=2 + i % 3)
    layer = layer.filter(ImageFilter.GaussianBlur(0.35))
    base.alpha_composite(layer)


def draw_texture_field(
    im: Image.Image,
    phase: str,
    phase_t: float,
    progress: float,
    collapse: float,
    overload: float,
    burst: float,
) -> None:
    grow = 0.58 + 0.42 * progress
    shrink = 1 - collapse * 0.56 + burst * 0.12
    width = 650 * grow * shrink
    main_alpha = (0.17 + 0.54 * progress + 0.12 * overload) * (1 - burst * 0.36)
    paste_texture(im, ASSETS.get("disk_main"), C, C - 5, width, main_alpha, phase_t * math.tau * 0.82, 0.92)
    if progress > 0.28:
        paste_texture(im, ASSETS.get("disk_long"), C - 18, C - 3, width * 0.94, 0.16 * progress * (1 - burst * 0.25), -phase_t * math.tau * 0.38, 0.58)
        paste_texture(im, ASSETS.get("disk_soft"), C + 10, C - 6, width * 0.84, 0.12 * progress * (1 + overload * 0.45), phase_t * math.tau * 0.52 + 0.4, 0.70)
    if progress > 0.48:
        edge_keys = [ASSETS.get("arm_a"), ASSETS.get("arm_b"), ASSETS.get("ribbon"), ASSETS.get("trail")]
        for i, tex in enumerate(edge_keys):
            if tex is None:
                continue
            a = phase_t * math.tau * (0.68 + i * 0.04) + i * 1.25
            rad = (168 + i * 24) * shrink
            x = C + math.cos(a) * rad * 0.80
            y = C + math.sin(a) * rad * 0.58
            paste_texture(im, tex, x, y, width * (0.36 + i * 0.05), 0.055 * progress * (1 + overload * 0.65), a + math.pi / 2, 0.62)


def make_frame(phase: str, idx: int, total: int) -> Image.Image:
    u = idx / max(1, total - 1)
    if phase == "deploy":
        progress = ease_out(u)
        collapse = 0.0
        overload = 0.0
        burst = 0.0
        phase_t = u * 0.58
    elif phase == "loop":
        progress = 1.0
        collapse = 0.0
        overload = 0.08
        burst = 0.0
        phase_t = u
    elif phase == "overload":
        progress = 1.0
        collapse = ease(u) * 0.46
        overload = ease_out(u)
        burst = 0.0
        phase_t = 1.0 + u * 0.86
    else:
        progress = 1.0
        collapse = 0.46 + ease(u) * 0.48
        overload = 1.0
        burst = ease(max(0.0, (u - 0.42) / 0.58))
        phase_t = 1.86 + u * 1.05

    im = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    draw_texture_field(im, phase, phase_t, progress, collapse, overload, burst)
    draw_flow_ribbon_layer(im, phase_t, progress, collapse, overload, burst)
    draw_flow_particles(im, phase_t, progress, collapse, overload, burst)
    apply_outer_feather(im, 1.0)
    erase_flower_gap(im, collapse, burst)
    draw_core(im, progress, collapse, overload, burst)
    draw_burst_shards(im, phase_t, burst)
    return im


def main() -> None:
    if OUT.exists():
        shutil.rmtree(OUT)
    for phase, count in COUNTS.items():
        phase_dir = OUT / phase
        phase_dir.mkdir(parents=True, exist_ok=True)
        for idx in range(count):
            frame = make_frame(phase, idx, count)
            frame.save(phase_dir / f"bh_{phase}_{idx:03d}.png", optimize=True)
    print(f"Generated {sum(COUNTS.values())} frames in {OUT}")


if __name__ == "__main__":
    main()
