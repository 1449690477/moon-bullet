#!/usr/bin/env python3
"""Generate deterministic Corrupt Gun VFX v2 fallback atlases.

The runtime uses two layers for every effect:

* ``base`` is drawn with ``source-over`` and carries black/red material volume.
* ``energy`` is drawn with ``lighter`` and carries only flow, sparks and cores.

The generator deliberately derives detail masks from the prepared Corrupt Gun
art instead of replacing the user's concepts with generic stock particles.  It
also writes lossless WebP mirrors, a runtime manifest, visual contact sheets and
strict alpha/green-edge/anchor QA results.
"""

from __future__ import annotations

import hashlib
import json
import math
import shutil
from dataclasses import dataclass
from pathlib import Path
from typing import Callable

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont
from scipy import ndimage


ROOT = Path(__file__).resolve().parents[1]
CG_ROOT = ROOT / "assets/player/corrupt_gun"
OUT = CG_ROOT / "vfx_v2"
PREVIEW = ROOT / "tools/corruptgun_vfx_v2_preview"
MANIFEST = CG_ROOT / "cg_vfx_v2_manifest.json"
SEED = 0xC07A11
SS = 2
ALPHA_EPS = 3

PALETTE = {
    "void": (5, 2, 10),
    "shadow": (14, 3, 18),
    "metal": (42, 8, 24),
    "deep_red": (94, 5, 28),
    "red": (232, 24, 74),
    "hot_red": (255, 48, 102),
    "magenta": (244, 64, 178),
    "white": (255, 232, 246),
}


@dataclass(frozen=True)
class AtlasSpec:
    key: str
    frames: int
    frame_size: tuple[int, int]
    columns: int
    anchor: tuple[float, float]
    frame_times_ms: tuple[int, ...] | None
    frame_duration_ms: int | None
    loop: bool
    orientation: str
    display_sizes: dict[str, int]
    source: str

    @property
    def rows(self) -> int:
        return math.ceil(self.frames / self.columns)


SPECS = (
    AtlasSpec(
        "mainOrb", 12, (192, 192), 4, (0.5, 0.5), None, 70, True, "radial",
        {"normal": 58, "overdrive": 74}, "bullets/cg_orb_main_1.png",
    ),
    AtlasSpec(
        "cloneOrb", 8, (128, 128), 4, (0.5, 0.5), None, 80, True, "radial",
        {"clone": 58, "cloneOverdrive": 74}, "bullets/cg_clone_orb_1.png",
    ),
    AtlasSpec(
        "trail", 8, (256, 96), 4, (0.94, 0.5), None, 60, True, "+X toward head",
        {"normalLength": 196, "overdriveLength": 244, "cloneLength": 196, "normalHeadWidth": 72, "overdriveHeadWidth": 88},
        "bullets/cg_orb_baked_2.png",
    ),
    AtlasSpec(
        "muzzle", 8, (192, 192), 4, (0.5, 0.5), (0, 25, 40, 60, 80, 105, 140, 180),
        None, False, "radial", {"normal": 112, "overdrive": 132},
        "fx/cg_muzzle_normal_3.png",
    ),
    AtlasSpec(
        "impact", 16, (256, 256), 4, (0.5, 0.5),
        (0, 24, 48, 60, 84, 108, 132, 140, 164, 188, 212, 236, 260, 300, 340, 380),
        None, False, "radial", {"normal": 124, "overdrive": 144, "clone": 84},
        "fx/cg_hit_spark_4.png",
    ),
    AtlasSpec(
        "mark", 8, (128, 128), 4, (0.5, 0.5), None, 90, True, "radial",
        {"enemy": 62}, "fx/cg_mark_5.png",
    ),
    AtlasSpec(
        "cloneField", 8, (256, 256), 4, (0.5, 0.5), None, 85, True, "radial",
        {"field": 132}, "clone/cg_clone_noise.png",
    ),
)


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def smoothstep(edge0: float, edge1: float, value: np.ndarray) -> np.ndarray:
    t = np.clip((value - edge0) / max(1e-9, edge1 - edge0), 0.0, 1.0)
    return t * t * (3.0 - 2.0 * t)


def make_grid(size: tuple[int, int]) -> tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray]:
    width, height = size
    yy, xx = np.mgrid[0:height, 0:width].astype(np.float32)
    x = (xx + 0.5 - width / 2) / (min(width, height) / 2)
    y = (yy + 0.5 - height / 2) / (min(width, height) / 2)
    return x, y, np.hypot(x, y), np.arctan2(y, x)


def rgba_image(rgb: np.ndarray, alpha: np.ndarray) -> Image.Image:
    alpha_u8 = np.clip(alpha * 255.0, 0, 255).astype(np.uint8)
    rgb_u8 = np.clip(rgb, 0, 255).astype(np.uint8)
    rgba = np.dstack((rgb_u8, alpha_u8))
    rgba[alpha_u8 <= ALPHA_EPS, :3] = 0
    rgba[alpha_u8 <= ALPHA_EPS, 3] = 0
    return Image.fromarray(rgba, "RGBA")


def resize_down(image: Image.Image, size: tuple[int, int]) -> Image.Image:
    image = image.resize(size, Image.Resampling.LANCZOS)
    px = np.asarray(image.convert("RGBA"), dtype=np.uint8).copy()
    px[px[:, :, 3] <= ALPHA_EPS, :3] = 0
    px[px[:, :, 3] <= ALPHA_EPS, 3] = 0
    return Image.fromarray(px, "RGBA")


def source_detail(relative: str, size: tuple[int, int]) -> np.ndarray:
    path = CG_ROOT / relative
    if not path.is_file():
        raise FileNotFoundError(f"required Corrupt Gun source is missing: {path}")
    source = Image.open(path).convert("RGBA")
    bbox = source.getbbox()
    source = source.crop(bbox) if bbox else source
    target_w, target_h = size
    scale = min(target_w / source.width, target_h / source.height)
    resized = source.resize(
        (max(1, round(source.width * scale)), max(1, round(source.height * scale))),
        Image.Resampling.LANCZOS,
    )
    canvas = Image.new("RGBA", size, (0, 0, 0, 0))
    canvas.alpha_composite(resized, ((target_w - resized.width) // 2, (target_h - resized.height) // 2))
    data = np.asarray(canvas, dtype=np.float32)
    luminance = (0.30 * data[:, :, 0] + 0.59 * data[:, :, 1] + 0.11 * data[:, :, 2]) / 255.0
    luminance *= data[:, :, 3] / 255.0
    blur = ndimage.gaussian_filter(luminance, sigma=max(1.0, min(size) * 0.018))
    detail = np.clip((luminance - blur) * 2.2 + luminance * 0.45, 0.0, 1.0)
    return detail


def source_pixels(relative: str, size: tuple[int, int], occupancy: float = 0.86) -> np.ndarray:
    """Fit a prepared concept frame into a transparent normalized canvas."""
    path = CG_ROOT / relative
    source = Image.open(path).convert("RGBA")
    bbox = source.getbbox()
    source = source.crop(bbox) if bbox else source
    target_w, target_h = size
    fit_w = max(1, round(target_w * occupancy))
    fit_h = max(1, round(target_h * occupancy))
    scale = min(fit_w / source.width, fit_h / source.height)
    resized = source.resize(
        (max(1, round(source.width * scale)), max(1, round(source.height * scale))),
        Image.Resampling.LANCZOS,
    )
    canvas = Image.new("RGBA", size, (0, 0, 0, 0))
    canvas.alpha_composite(resized, ((target_w - resized.width) // 2, (target_h - resized.height) // 2))
    return np.asarray(canvas, dtype=np.float32) / 255.0


def symmetric_particles(
    x: np.ndarray,
    y: np.ndarray,
    phase: float,
    radius: float,
    count: int,
    size: float,
) -> np.ndarray:
    result = np.zeros_like(x)
    pairs = max(1, count // 2)
    for index in range(pairs):
        angle = phase + index * math.tau / pairs
        wobble = 0.025 * math.sin(phase * 2.0 + index * 1.7)
        px = math.cos(angle) * (radius + wobble)
        py = math.sin(angle) * (radius + wobble)
        dot_a = np.exp(-((x - px) ** 2 + (y - py) ** 2) / max(1e-6, size**2))
        dot_b = np.exp(-((x + px) ** 2 + (y + py) ** 2) / max(1e-6, size**2))
        result = np.maximum(result, np.maximum(dot_a, dot_b))
    return np.clip(result, 0.0, 1.0)


def make_orb(spec: AtlasSpec, frame_index: int, clone: bool) -> tuple[Image.Image, Image.Image]:
    width, height = (spec.frame_size[0] * SS, spec.frame_size[1] * SS)
    x, y, radius, theta = make_grid((width, height))
    phase = frame_index * math.tau / spec.frames
    detail = source_detail(spec.source, (width, height))
    source = source_pixels(spec.source, (width, height), 0.86)
    source_alpha = source[:, :, 3]
    source_luma = 0.30 * source[:, :, 0] + 0.59 * source[:, :, 1] + 0.11 * source[:, :, 2]

    sphere_r = 0.52 if clone else 0.55
    shell_r = 0.72 if clone else 0.74
    sphere = 1.0 - smoothstep(sphere_r - 0.018, sphere_r + 0.018, radius)
    z = np.sqrt(np.clip(1.0 - (radius / sphere_r) ** 2, 0.0, 1.0))
    light = np.clip((-0.48 * x - 0.56 * y + 0.82 * z), 0.0, 1.0)
    lower_ao = np.clip(0.82 - 0.32 * x - 0.38 * y, 0.25, 1.0)
    source_mod = np.clip(0.66 + 0.72 * detail, 0.55, 1.26)

    segment_count = 12 if clone else 16
    segment_gate = smoothstep(-0.32, 0.22, np.cos(theta * segment_count + phase * 0.34))
    shell = np.exp(-((radius - shell_r) / (0.070 if clone else 0.062)) ** 2) * segment_gate
    inner_shell = np.exp(-((radius - (sphere_r + 0.065)) / 0.022) ** 2)
    cardinal = np.maximum(np.abs(np.cos(theta * 2.0)) ** 32, np.abs(np.sin(theta * 2.0)) ** 32)
    blade = cardinal * smoothstep(sphere_r + 0.03, sphere_r + 0.09, radius) * (
        1.0 - smoothstep(shell_r + 0.02, shell_r + 0.18, radius)
    )

    base_alpha = np.clip(sphere * 0.98 + shell * 0.92 + inner_shell * 0.74 + blade * 0.9, 0.0, 1.0)
    base_rgb = np.zeros((height, width, 3), dtype=np.float32)
    base_rgb[:, :, 0] = (13 + 72 * light * lower_ao + 42 * detail) * source_mod
    base_rgb[:, :, 1] = 2 + 8 * light + 3 * detail
    base_rgb[:, :, 2] = 13 + 34 * light + 24 * detail
    base_rgb[:, :, 0] += shell * 72 + inner_shell * 38 + blade * 58
    base_rgb[:, :, 1] += shell * 9 + blade * 6
    base_rgb[:, :, 2] += shell * 28 + inner_shell * 18 + blade * 22
    # Preserve the lower-right void hemisphere rather than washing the whole orb red.
    void_shadow = smoothstep(0.05, 0.85, 0.55 * x + 0.66 * y) * sphere
    base_rgb *= (1.0 - void_shadow[:, :, None] * 0.56)

    # Reuse the authored mechanical ring/cardinal silhouette as dark material.
    # Its emissive pixels are extracted below; this layer remains source-over.
    source_dark = np.zeros_like(base_rgb)
    source_dark[:, :, 0] = 10 + source[:, :, 0] * 112 + source_luma * 28
    source_dark[:, :, 1] = 2 + source[:, :, 1] * 10
    source_dark[:, :, 2] = 13 + source[:, :, 2] * 48
    source_mix = np.clip(source_alpha * 0.88, 0.0, 0.88)
    base_rgb = base_rgb * (1.0 - source_mix[:, :, None]) + source_dark * source_mix[:, :, None]
    base_alpha = np.maximum(base_alpha, source_alpha * 0.96)

    warp = (
        np.sin(theta * (8 if clone else 11) + radius * 18.0 - phase * 2.1)
        + 0.65 * np.sin(theta * 5.0 - radius * 31.0 + phase * 1.35)
        + 0.35 * np.sin((x + y) * 26.0 + phase * 2.7)
    )
    flow_lines = smoothstep(0.68, 0.97, np.sin(warp * 2.3 + radius * 8.0)) * sphere
    flowing_lobes = (0.5 + 0.5 * np.sin(theta * 3.0 - phase * 1.7 + radius * 10.0)) * sphere
    fresnel = np.power(np.clip(1.0 - z, 0.0, 1.0), 2.2) * sphere
    ring_a = np.exp(-((radius - (sphere_r * 0.76)) / 0.018) ** 2)
    ring_b = np.exp(-((radius - (sphere_r * 1.10)) / 0.016) ** 2) * segment_gate
    ticks = np.exp(-((radius - (shell_r + 0.015)) / 0.012) ** 2) * smoothstep(
        0.58, 0.96, np.cos(theta * (18 if clone else 24) - phase * 1.6)
    )
    core_r = 0.052 if clone else 0.060
    core = np.exp(-(radius / core_r) ** 2)
    key_glint = np.exp(-(((x + 0.16) / 0.075) ** 2 + ((y + 0.19) / 0.055) ** 2)) * sphere
    particles = symmetric_particles(x, y, phase * 0.9, shell_r + 0.105, 4 if clone else 6, 0.012 if clone else 0.014)
    source_emit = source_alpha * smoothstep(0.22, 0.78, source_luma)
    energy_alpha = np.clip(
        flow_lines * (0.34 + 0.34 * flowing_lobes)
        + fresnel * 0.62
        + ring_a * 0.72
        + ring_b * 0.68
        + ticks * 0.9
        + core
        + key_glint * 0.8
        + particles * 0.9
        + source_emit * 0.72,
        0.0,
        1.0,
    )
    energy_rgb = np.zeros_like(base_rgb)
    heat = np.clip(flow_lines * 0.72 + fresnel * 0.55 + ring_a + ring_b + ticks, 0.0, 1.0)
    energy_rgb[:, :, 0] = 184 + 71 * heat
    energy_rgb[:, :, 1] = 8 + 38 * heat
    energy_rgb[:, :, 2] = 52 + 92 * (ring_a + key_glint + particles)
    white_mix = np.clip(core * 1.3 + key_glint * 0.75 + source_emit * smoothstep(0.68, 0.94, source_luma) * 0.52, 0.0, 1.0)
    energy_rgb = energy_rgb * (1.0 - white_mix[:, :, None]) + np.array(PALETTE["white"])[None, None, :] * white_mix[:, :, None]

    base = resize_down(rgba_image(base_rgb, base_alpha), spec.frame_size)
    energy = resize_down(rgba_image(energy_rgb, energy_alpha), spec.frame_size)
    return base, energy


def make_trail(spec: AtlasSpec, frame_index: int) -> tuple[Image.Image, Image.Image]:
    width, height = (spec.frame_size[0] * SS, spec.frame_size[1] * SS)
    yy, xx = np.mgrid[0:height, 0:width].astype(np.float32)
    u = (xx + 0.5) / width
    v = (yy + 0.5 - height / 2) / (height / 2)
    phase = frame_index * math.tau / spec.frames
    active = smoothstep(0.035, 0.10, u) * (1.0 - smoothstep(0.93, 0.97, u))
    width_env = 0.025 + 0.40 * np.power(u, 1.34)
    void_ribbon = np.exp(-np.power(np.abs(v) / width_env, 2.45)) * active
    base_alpha = np.clip(void_ribbon * (0.58 + 0.36 * u), 0.0, 0.94)
    base_rgb = np.zeros((height, width, 3), dtype=np.float32)
    base_rgb[:, :, 0] = 4 + 62 * u + 18 * np.cos(phase + u * 8.0) ** 2
    base_rgb[:, :, 1] = 1 + 3 * u
    base_rgb[:, :, 2] = 8 + 25 * u

    energy_alpha = np.zeros((height, width), dtype=np.float32)
    for lane in range(4):
        lane_phase = phase + lane * math.pi / 2
        center = (0.020 + lane * 0.008) * np.sin(u * (11.0 + lane) - lane_phase * 1.8)
        center += 0.012 * np.sin(u * 29.0 + lane_phase)
        lane_width = 0.018 + 0.008 * lane
        lane_energy = np.exp(-((v - center) / lane_width) ** 2)
        lane_energy += np.exp(-((v + center) / lane_width) ** 2)
        data_gate = smoothstep(0.15, 0.75, np.sin(u * (46 + lane * 5) - phase * 3.2 + lane))
        energy_alpha += lane_energy * active * (0.22 + 0.50 * data_gate) * (0.35 + 0.65 * u)
    bright_core = np.exp(-(v / (0.018 + 0.020 * u)) ** 2) * active * smoothstep(0.22, 0.96, u)
    energy_alpha = np.clip(energy_alpha + bright_core * 0.92, 0.0, 1.0)
    energy_rgb = np.zeros_like(base_rgb)
    energy_rgb[:, :, 0] = 228 + 27 * bright_core
    energy_rgb[:, :, 1] = 12 + 92 * bright_core
    energy_rgb[:, :, 2] = 72 + 116 * bright_core

    # Symmetric detached data motes make the trail flow without shifting its anchor.
    for index in range(4):
        px = 0.13 + ((index * 0.21 + frame_index * 0.047) % 0.72)
        py = 0.32 + 0.10 * math.sin(index * 1.7 + phase)
        dot = np.exp(-(((u - px) / 0.012) ** 2 + ((v - py) / 0.035) ** 2))
        dot += np.exp(-(((u - px) / 0.012) ** 2 + ((v + py) / 0.035) ** 2))
        energy_alpha = np.clip(energy_alpha + dot * 0.76, 0.0, 1.0)

    return (
        resize_down(rgba_image(base_rgb, base_alpha), spec.frame_size),
        resize_down(rgba_image(energy_rgb, energy_alpha), spec.frame_size),
    )


def radial_base_energy(
    size: tuple[int, int],
    base_mask: np.ndarray,
    energy_mask: np.ndarray,
    hot_mask: np.ndarray,
) -> tuple[Image.Image, Image.Image]:
    width, height = size
    base_rgb = np.zeros((height, width, 3), dtype=np.float32)
    base_rgb[:, :, 0] = 12 + 78 * np.clip(base_mask, 0.0, 1.0)
    base_rgb[:, :, 1] = 2 + 8 * base_mask
    base_rgb[:, :, 2] = 18 + 46 * base_mask
    energy_rgb = np.zeros_like(base_rgb)
    energy_rgb[:, :, 0] = 222 + 33 * np.clip(energy_mask, 0.0, 1.0)
    energy_rgb[:, :, 1] = 10 + 56 * np.clip(hot_mask, 0.0, 1.0)
    energy_rgb[:, :, 2] = 62 + 112 * np.clip(hot_mask, 0.0, 1.0)
    white = np.clip(hot_mask * 1.15, 0.0, 1.0)
    energy_rgb = energy_rgb * (1.0 - white[:, :, None]) + np.array(PALETTE["white"])[None, None, :] * white[:, :, None]
    return rgba_image(base_rgb, np.clip(base_mask, 0.0, 1.0)), rgba_image(energy_rgb, np.clip(energy_mask, 0.0, 1.0))


def make_muzzle(spec: AtlasSpec, frame_index: int) -> tuple[Image.Image, Image.Image]:
    size = (spec.frame_size[0] * SS, spec.frame_size[1] * SS)
    x, y, radius, theta = make_grid(size)
    phase = frame_index / (spec.frames - 1)
    # First and disposal frames stay above the project's 0.30 visibility
    # floor. Runtime lifetime, not an empty atlas frame, removes the effect.
    envelope = (0.34, 0.48, 0.72, 1.0, 0.92, 0.68, 0.46, 0.34)[frame_index]
    charge_radius = 0.50 - 0.25 * min(1.0, phase / 0.45)
    recoil_radius = 0.18 + 0.52 * max(0.0, (phase - 0.40) / 0.60)
    inward_ring = np.exp(-((radius - charge_radius) / 0.038) ** 2) * (1.0 - smoothstep(0.45, 0.72, phase))
    recoil_ring = np.exp(-((radius - recoil_radius) / 0.032) ** 2) * smoothstep(0.35, 0.55, phase)
    spokes = np.power(np.abs(np.cos(theta * 4.0)), 36) * (1.0 - smoothstep(0.08, 0.72, radius))
    core = np.exp(-(radius / (0.052 + 0.055 * envelope)) ** 2)
    base_mask = np.clip((inward_ring * 0.68 + recoil_ring * 0.46 + spokes * 0.24) * envelope, 0.0, 0.92)
    energy_mask = np.clip((inward_ring * 0.72 + recoil_ring * 0.82 + spokes * 0.94 + core) * envelope, 0.0, 1.0)
    base, energy = radial_base_energy(size, base_mask, energy_mask, core * envelope)
    return resize_down(base, spec.frame_size), resize_down(energy, spec.frame_size)


def make_impact(spec: AtlasSpec, frame_index: int) -> tuple[Image.Image, Image.Image]:
    size = (spec.frame_size[0] * SS, spec.frame_size[1] * SS)
    x, y, radius, theta = make_grid(size)
    t = frame_index / (spec.frames - 1)
    implode = 1.0 - smoothstep(0.00, 0.28, t)
    burst = smoothstep(0.12, 0.31, t) * (1.0 - smoothstep(0.42, 0.66, t))
    residual = smoothstep(0.30, 0.55, t) * (1.0 - smoothstep(0.78, 1.0, t))
    fade = 1.0 - smoothstep(0.78, 1.0, t)
    terminal = 0.34 * smoothstep(0.82, 1.0, t)

    implosion_radius = 0.52 - 0.30 * smoothstep(0.0, 0.30, t)
    implosion = np.exp(-((radius - implosion_radius) / 0.06) ** 2) * implode
    ring_radius = 0.16 + 0.58 * smoothstep(0.17, 0.70, t)
    ring1 = np.exp(-((radius - ring_radius) / 0.032) ** 2) * fade
    ring2 = np.exp(-((radius - ring_radius * 0.72) / 0.020) ** 2) * fade
    core = np.exp(-(radius / (0.055 + 0.14 * burst)) ** 2) * burst
    spiral = smoothstep(0.73, 0.98, np.sin(theta * 6.0 + radius * 23.0 - t * 19.0))
    spiral *= (residual + terminal) * (1.0 - smoothstep(0.16, 0.82, radius))
    spikes = np.power(np.abs(np.cos(theta * 6.0 + 0.2)), 40) * burst
    spikes *= 1.0 - smoothstep(0.13, 0.80, radius)

    shards = np.zeros_like(radius)
    for index in range(6):
        angle = index * math.pi / 6 + t * 0.55
        axial = x * math.cos(angle) + y * math.sin(angle)
        lateral = -x * math.sin(angle) + y * math.cos(angle)
        center = 0.18 + 0.52 * smoothstep(0.20, 0.78, t)
        shard = np.exp(-((axial - center) / 0.10) ** 2 - (lateral / 0.018) ** 2)
        shard += np.exp(-((axial + center) / 0.10) ** 2 - (lateral / 0.018) ** 2)
        shards = np.maximum(shards, shard)
    shards *= (burst + residual * 0.65) * fade

    terminal_ring = np.exp(-((radius - 0.36) / 0.026) ** 2) * terminal
    base_mask = np.clip(implosion * 0.82 + spiral * 0.42 + shards * 0.72 + ring1 * 0.20 + terminal_ring * 0.45, 0.0, 0.92)
    energy_mask = np.clip(core + ring1 * 0.92 + ring2 * 0.68 + spiral * 0.66 + spikes * 0.88 + shards * 0.58 + terminal_ring, 0.0, 1.0)
    base, energy = radial_base_energy(size, base_mask, energy_mask, core)
    return resize_down(base, spec.frame_size), resize_down(energy, spec.frame_size)


def make_mark(spec: AtlasSpec, frame_index: int) -> tuple[Image.Image, Image.Image]:
    size = (spec.frame_size[0] * SS, spec.frame_size[1] * SS)
    x, y, radius, theta = make_grid(size)
    phase = frame_index * math.tau / spec.frames
    lens = np.abs(y) - (0.24 * (1.0 - np.clip(np.abs(x) / 0.67, 0.0, 1.0) ** 1.55))
    eye_line = np.exp(-(lens / 0.025) ** 2) * (1.0 - smoothstep(0.60, 0.73, np.abs(x)))
    iris = np.exp(-((radius - 0.23) / 0.025) ** 2)
    pupil = np.exp(-((x / 0.055) ** 2 + (y / 0.19) ** 2))
    outer = np.exp(-((radius - 0.46) / 0.018) ** 2) * smoothstep(0.05, 0.55, np.cos(theta * 12.0 - phase))
    orbit = symmetric_particles(x, y, phase, 0.56, 4, 0.018)
    pulse = 0.76 + 0.24 * math.sin(phase) ** 2
    base_mask = np.clip((eye_line * 0.48 + iris * 0.35 + pupil * 0.64 + outer * 0.24) * pulse, 0.0, 0.88)
    energy_mask = np.clip((eye_line * 0.92 + iris * 0.80 + pupil + outer * 0.64 + orbit * 0.82) * pulse, 0.0, 1.0)
    base, energy = radial_base_energy(size, base_mask, energy_mask, pupil)
    return resize_down(base, spec.frame_size), resize_down(energy, spec.frame_size)


def make_clone_field(spec: AtlasSpec, frame_index: int) -> tuple[Image.Image, Image.Image]:
    size = (spec.frame_size[0] * SS, spec.frame_size[1] * SS)
    x, y, radius, theta = make_grid(size)
    phase = frame_index * math.tau / spec.frames
    ring1 = np.exp(-((radius - 0.46) / 0.026) ** 2) * smoothstep(-0.30, 0.24, np.cos(theta * 12.0 + phase))
    ring2 = np.exp(-((radius - 0.67) / 0.022) ** 2) * smoothstep(-0.22, 0.30, np.cos(theta * 18.0 - phase * 1.4))
    ring3 = np.exp(-((radius - 0.80) / 0.013) ** 2) * smoothstep(0.38, 0.90, np.cos(theta * 24.0 + phase * 0.7))
    scan_y = 0.50 * math.sin(phase)
    scan = np.exp(-((y - scan_y) / 0.025) ** 2) * (1.0 - smoothstep(0.15, 0.78, np.abs(x)))
    scan += np.exp(-((y + scan_y) / 0.025) ** 2) * (1.0 - smoothstep(0.15, 0.78, np.abs(x)))
    hologram = (0.5 + 0.5 * np.sin(y * 94.0 - phase * 3.0)) * (1.0 - smoothstep(0.10, 0.72, radius))
    orbit = symmetric_particles(x, y, phase * 0.8, 0.73, 6, 0.016)
    core = np.exp(-(radius / 0.095) ** 2) * (0.64 + 0.36 * math.sin(phase) ** 2)
    base_mask = np.clip(ring1 * 0.46 + ring2 * 0.58 + ring3 * 0.38 + hologram * 0.16 + core * 0.28, 0.0, 0.84)
    energy_mask = np.clip(ring1 * 0.70 + ring2 * 0.92 + ring3 * 0.76 + scan * 0.68 + hologram * 0.26 + orbit * 0.86 + core, 0.0, 1.0)
    base, energy = radial_base_energy(size, base_mask, energy_mask, core)
    return resize_down(base, spec.frame_size), resize_down(energy, spec.frame_size)


GENERATORS: dict[str, Callable[[AtlasSpec, int], tuple[Image.Image, Image.Image]]] = {
    "mainOrb": lambda spec, index: make_orb(spec, index, False),
    "cloneOrb": lambda spec, index: make_orb(spec, index, True),
    "trail": make_trail,
    "muzzle": make_muzzle,
    "impact": make_impact,
    "mark": make_mark,
    "cloneField": make_clone_field,
}


def atlas_name(key: str, layer: str, extension: str) -> str:
    names = {
        "mainOrb": "orb/cg_orb_main",
        "cloneOrb": "orb/cg_orb_clone",
        "trail": "trail/cg_trail_flow",
        "muzzle": "muzzle/cg_muzzle_flow",
        "impact": "impact/cg_impact_flow",
        "mark": "mark/cg_mark_flow",
        "cloneField": "clone/cg_clone_field",
    }
    return f"{names[key]}_{layer}_atlas.{extension}"


def pack_atlas(frames: list[Image.Image], spec: AtlasSpec) -> Image.Image:
    frame_w, frame_h = spec.frame_size
    atlas = Image.new("RGBA", (frame_w * spec.columns, frame_h * spec.rows), (0, 0, 0, 0))
    for index, frame in enumerate(frames):
        atlas.alpha_composite(frame, ((index % spec.columns) * frame_w, (index // spec.columns) * frame_h))
    return atlas


def save_atlas(image: Image.Image, relative_png: str) -> dict[str, str | int]:
    png_path = OUT / relative_png
    webp_path = png_path.with_suffix(".webp")
    png_path.parent.mkdir(parents=True, exist_ok=True)
    image.save(png_path, format="PNG", optimize=True, compress_level=9)
    image.save(webp_path, format="WEBP", lossless=True, quality=100, method=6, exact=True)
    png_px = np.asarray(Image.open(png_path).convert("RGBA"), dtype=np.int16)
    webp_px = np.asarray(Image.open(webp_path).convert("RGBA"), dtype=np.int16)
    webp_delta = int(np.abs(png_px - webp_px).max())
    if webp_delta:
        raise RuntimeError(f"lossless WebP parity failed ({webp_delta}): {webp_path.relative_to(ROOT)}")
    return {
        "png": str(png_path.relative_to(ROOT)),
        "webpLossless": str(webp_path.relative_to(ROOT)),
        "pngSha256": sha256(png_path),
        "webpSha256": sha256(webp_path),
        "width": image.width,
        "height": image.height,
        "webpMaxChannelDelta": webp_delta,
    }


def additive_composite(base: Image.Image, energy: Image.Image, background=(8, 6, 13)) -> Image.Image:
    b = np.asarray(base.convert("RGBA"), dtype=np.float32) / 255.0
    e = np.asarray(energy.convert("RGBA"), dtype=np.float32) / 255.0
    bg = np.zeros_like(b[:, :, :3])
    bg[:, :, 0] = background[0] / 255.0
    bg[:, :, 1] = background[1] / 255.0
    bg[:, :, 2] = background[2] / 255.0
    rgb = bg * (1.0 - b[:, :, 3:4]) + b[:, :, :3] * b[:, :, 3:4]
    rgb = np.clip(rgb + e[:, :, :3] * e[:, :, 3:4], 0.0, 1.0)
    result = np.dstack((rgb, np.ones_like(b[:, :, 3])))
    return Image.fromarray(np.clip(result * 255.0, 0, 255).astype(np.uint8), "RGBA")


def alpha_bbox(alpha: np.ndarray) -> tuple[int, int, int, int]:
    ys, xs = np.where(alpha > ALPHA_EPS)
    if not len(xs):
        return (0, 0, 0, 0)
    return int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1


def qa_frames(spec: AtlasSpec, base_frames: list[Image.Image], energy_frames: list[Image.Image]) -> dict:
    frame_reports = []
    max_anchor_drift = 0.0
    min_padding = 10_000
    total_green = 0
    total_edge_green = 0
    total_border_alpha = 0
    min_peak_alpha = 255
    for index, (base, energy) in enumerate(zip(base_frames, energy_frames)):
        bp = np.asarray(base.convert("RGBA"), dtype=np.int16)
        ep = np.asarray(energy.convert("RGBA"), dtype=np.int16)
        union_alpha = np.maximum(bp[:, :, 3], ep[:, :, 3])
        left, top, right, bottom = alpha_bbox(union_alpha)
        padding = min(left, top, spec.frame_size[0] - right, spec.frame_size[1] - bottom)
        min_padding = min(min_padding, padding)
        border_alpha = int(
            np.count_nonzero(union_alpha[0, :])
            + np.count_nonzero(union_alpha[-1, :])
            + np.count_nonzero(union_alpha[:, 0])
            + np.count_nonzero(union_alpha[:, -1])
        )
        total_border_alpha += border_alpha
        combined = np.maximum(bp, ep)
        rb = np.maximum(combined[:, :, 0], combined[:, :, 2])
        green = (combined[:, :, 3] > 8) & (combined[:, :, 1] > rb + 12)
        edge = (combined[:, :, 3] > 8) & (combined[:, :, 3] < 247)
        green_count = int(np.count_nonzero(green))
        edge_green_count = int(np.count_nonzero(green & edge))
        total_green += green_count
        total_edge_green += edge_green_count
        peak_alpha = int(union_alpha.max())
        min_peak_alpha = min(min_peak_alpha, peak_alpha)

        if spec.key == "trail":
            anchor_drift = abs(((top + bottom) / 2.0) - spec.frame_size[1] * spec.anchor[1])
        else:
            bbox_cx = (left + right) / 2.0
            bbox_cy = (top + bottom) / 2.0
            anchor_drift = math.hypot(
                bbox_cx - spec.frame_size[0] * spec.anchor[0],
                bbox_cy - spec.frame_size[1] * spec.anchor[1],
            )
        max_anchor_drift = max(max_anchor_drift, anchor_drift)
        frame_reports.append(
            {
                "frame": index,
                "alphaBBox": [left, top, right, bottom],
                "paddingPx": padding,
                "borderAlphaPixels": border_alpha,
                "greenPixels": green_count,
                "edgeGreenPixels": edge_green_count,
                "anchorDriftPx": round(anchor_drift, 3),
                "peakAlpha": peak_alpha,
            }
        )

    required_padding = 5 if spec.key == "trail" else 7
    allowed_drift = 2.5 if spec.key == "trail" else 4.0
    passed = (
        total_green == 0
        and total_edge_green == 0
        and total_border_alpha == 0
        and min_padding >= required_padding
        and max_anchor_drift <= allowed_drift
        and min_peak_alpha >= 76
    )
    return {
        "status": "pass" if passed else "fail",
        "limits": {
            "greenPixels": 0,
            "edgeGreenPixels": 0,
            "borderAlphaPixels": 0,
            "minimumPaddingPx": required_padding,
            "maximumAnchorDriftPx": allowed_drift,
            "minimumPeakAlpha": 76,
        },
        "summary": {
            "greenPixels": total_green,
            "edgeGreenPixels": total_edge_green,
            "borderAlphaPixels": total_border_alpha,
            "minimumPaddingPx": min_padding,
            "maximumAnchorDriftPx": round(max_anchor_drift, 3),
            "minimumPeakAlpha": min_peak_alpha,
        },
        "frames": frame_reports,
    }


def fit_preview(image: Image.Image, box: tuple[int, int]) -> Image.Image:
    width, height = box
    scale = min(width / image.width, height / image.height)
    return image.resize((max(1, round(image.width * scale)), max(1, round(image.height * scale))), Image.Resampling.LANCZOS)


def make_contact_sheet(generated: dict[str, dict]) -> Path:
    cell_w, cell_h = 250, 220
    cols = 5
    rows = len(SPECS) + 1
    sheet = Image.new("RGB", (cell_w * cols, cell_h * rows), (8, 6, 13))
    draw = ImageDraw.Draw(sheet)
    font = ImageFont.load_default()
    headers = ("SOURCE CONCEPT", "FRAME 0", "FRAME MID", "FRAME LAST", "LAYER SPLIT")
    for col, label in enumerate(headers):
        draw.text((col * cell_w + 12, 15), label, fill=(255, 215, 234), font=font)
    for row, spec in enumerate(SPECS, 1):
        entry = generated[spec.key]
        source = Image.open(CG_ROOT / spec.source).convert("RGBA")
        source_thumb = fit_preview(source, (214, 170))
        source_card = Image.new("RGBA", (214, 170), (8, 6, 13, 255))
        source_card.alpha_composite(source_thumb, ((214 - source_thumb.width) // 2, (170 - source_thumb.height) // 2))
        sheet.paste(source_card.convert("RGB"), (18, row * cell_h + 25))
        indices = (0, spec.frames // 2, spec.frames - 1)
        for col, index in enumerate(indices, 1):
            preview = fit_preview(entry["compositeFrames"][index], (214, 170))
            x = col * cell_w + (cell_w - preview.width) // 2
            y = row * cell_h + 25 + (170 - preview.height) // 2
            sheet.paste(preview.convert("RGB"), (x, y))
        layer = Image.new("RGB", (214, 170), (8, 6, 13))
        base_thumb = fit_preview(entry["baseFrames"][spec.frames // 2], (100, 100))
        energy_thumb = fit_preview(entry["energyFrames"][spec.frames // 2], (100, 100))
        layer.paste(base_thumb, (4 + (100 - base_thumb.width) // 2, 35 + (100 - base_thumb.height) // 2), base_thumb)
        layer.paste(energy_thumb, (110 + (100 - energy_thumb.width) // 2, 35 + (100 - energy_thumb.height) // 2), energy_thumb)
        ldraw = ImageDraw.Draw(layer)
        ldraw.text((24, 145), "source-over", fill=(210, 154, 178), font=font)
        ldraw.text((142, 145), "lighter", fill=(255, 108, 160), font=font)
        sheet.paste(layer, (4 * cell_w + 18, row * cell_h + 25))
        draw.text((12, row * cell_h + 4), spec.key, fill=(255, 61, 119), font=font)
    PREVIEW.mkdir(parents=True, exist_ok=True)
    target = PREVIEW / "cg_vfx_v2_contact.png"
    sheet.save(target, format="PNG", optimize=True)
    return target


def make_motion_strip(generated: dict[str, dict]) -> Path:
    tile = 144
    labels = ("mainOrb", "cloneOrb", "trail", "muzzle", "impact", "mark", "cloneField")
    sheet = Image.new("RGB", (tile * 8, tile * len(labels)), (8, 6, 13))
    draw = ImageDraw.Draw(sheet)
    font = ImageFont.load_default()
    for row, key in enumerate(labels):
        frames = generated[key]["compositeFrames"]
        for col in range(8):
            index = round(col * (len(frames) - 1) / 7)
            thumb = fit_preview(frames[index], (tile - 12, tile - 22))
            x = col * tile + (tile - thumb.width) // 2
            y = row * tile + 18 + (tile - 22 - thumb.height) // 2
            sheet.paste(thumb.convert("RGB"), (x, y))
            draw.text((col * tile + 5, row * tile + 4), f"{key} {index:02d}", fill=(243, 184, 213), font=font)
    PREVIEW.mkdir(parents=True, exist_ok=True)
    target = PREVIEW / "cg_vfx_v2_motion_strip.png"
    sheet.save(target, format="PNG", optimize=True)
    return target


def main() -> None:
    np.random.seed(SEED)
    for spec in SPECS:
        source = CG_ROOT / spec.source
        if not source.is_file():
            raise SystemExit(f"missing prepared source asset: {source.relative_to(ROOT)}")

    if OUT.exists():
        shutil.rmtree(OUT)
    OUT.mkdir(parents=True, exist_ok=True)
    PREVIEW.mkdir(parents=True, exist_ok=True)

    generated: dict[str, dict] = {}
    manifest_assets: dict[str, dict] = {}
    qa_assets: dict[str, dict] = {}
    for spec in SPECS:
        generator = GENERATORS[spec.key]
        pairs = [generator(spec, index) for index in range(spec.frames)]
        base_frames = [pair[0] for pair in pairs]
        energy_frames = [pair[1] for pair in pairs]
        composite_frames = [additive_composite(base, energy) for base, energy in pairs]
        base_atlas = pack_atlas(base_frames, spec)
        energy_atlas = pack_atlas(energy_frames, spec)
        base_files = save_atlas(base_atlas, atlas_name(spec.key, "base", "png"))
        energy_files = save_atlas(energy_atlas, atlas_name(spec.key, "energy", "png"))
        qa = qa_frames(spec, base_frames, energy_frames)
        qa_assets[spec.key] = qa
        generated[spec.key] = {
            "baseFrames": base_frames,
            "energyFrames": energy_frames,
            "compositeFrames": composite_frames,
        }
        manifest_assets[spec.key] = {
            "frames": spec.frames,
            "columns": spec.columns,
            "rows": spec.rows,
            "frameWidth": spec.frame_size[0],
            "frameHeight": spec.frame_size[1],
            "anchor": list(spec.anchor),
            "orientation": spec.orientation,
            "loop": spec.loop,
            "frameDurationMs": spec.frame_duration_ms,
            "frameTimesMs": list(spec.frame_times_ms) if spec.frame_times_ms else None,
            "displaySizes": spec.display_sizes,
            "sourceConcept": str((CG_ROOT / spec.source).relative_to(ROOT)),
            "sourceConceptSha256": sha256(CG_ROOT / spec.source),
            "layers": {
                "base": {"blend": "source-over", **base_files},
                "energy": {"blend": "lighter", **energy_files},
            },
            "qa": qa["summary"],
        }

    contact = make_contact_sheet(generated)
    motion = make_motion_strip(generated)
    qa_passed = all(report["status"] == "pass" for report in qa_assets.values())
    qa_report = {
        "generator": str(Path(__file__).resolve().relative_to(ROOT)),
        "seed": SEED,
        "status": "pass" if qa_passed else "fail",
        "checks": [
            "transparent border in every frame",
            "zero green-dominant visible pixels",
            "zero green-dominant antialiased edge pixels",
            "minimum transparent padding",
            "stable fixed-frame anchor",
            "visible alpha peak",
        ],
        "assets": qa_assets,
    }
    qa_path = PREVIEW / "cg_vfx_v2_qa.json"
    qa_path.write_text(json.dumps(qa_report, ensure_ascii=False, indent=2), encoding="utf-8")

    manifest = {
        "formatVersion": 2,
        "character": "corruptgun",
        "generator": str(Path(__file__).resolve().relative_to(ROOT)),
        "seed": SEED,
        "renderContract": {
            "atlasOrigin": "top-left",
            "baseBlend": "source-over",
            "energyBlend": "lighter",
            "alphaStorage": "straight alpha; browser performs Canvas premultiplication",
            "transparentRgbZeroed": True,
            "mobileEncoding": "lossless WebP",
            "fallbackIsVisuallyComplete": True,
        },
        "palette": {key: list(value) for key, value in PALETTE.items()},
        "assets": manifest_assets,
        "qa": {
            "status": qa_report["status"],
            "report": str(qa_path.relative_to(ROOT)),
            "contactSheet": str(contact.relative_to(ROOT)),
            "motionStrip": str(motion.relative_to(ROOT)),
        },
    }
    MANIFEST.write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
    if not qa_passed:
        failing = [key for key, value in qa_assets.items() if value["status"] != "pass"]
        raise SystemExit(f"Corrupt Gun VFX v2 QA failed: {', '.join(failing)}; see {qa_path.relative_to(ROOT)}")
    print(
        f"[corruptgun-vfx-v2] assets={len(SPECS)} qa=pass "
        f"manifest={MANIFEST.relative_to(ROOT)} contact={contact.relative_to(ROOT)}"
    )


if __name__ == "__main__":
    main()
