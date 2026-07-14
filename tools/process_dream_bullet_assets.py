#!/usr/bin/env python3
"""Build the small, high-readability Dream-mode bullet texture set.

The inputs stay untouched in the user-provided barrage library. Outputs are
deterministic, padded RGBA sprites with a baked dark collision edge so mobile
rendering only needs one image draw per bullet. The shared material atlases are
small, reusable layers: cache-composited volume cores, selective speed trails,
and event-only impact glints. They avoid per-bullet gradients and particles.
"""
from __future__ import annotations

import hashlib
import json
from dataclasses import dataclass
from pathlib import Path

import numpy as np
from PIL import Image, ImageChops, ImageDraw, ImageEnhance, ImageFilter, ImageFont


ROOT = Path(__file__).resolve().parents[1]
SOURCE_DIR = (
    ROOT
    / "素材文件夹 一定优先使用！"
    / "sprites_png/source_barrage/bulletsource/texture/barragetex/barragetexinfo"
)
OUTPUT_DIR = ROOT / "assets" / "bullets_dream"
MANIFEST_PATH = OUTPUT_DIR / "dream_bullet_manifest.json"
CONTACT_SHEET_PATH = ROOT / "tools" / "dream_bullet_assets_contact.png"


@dataclass(frozen=True)
class AssetSpec:
    source: str
    output: str
    canvas: int
    role: str
    motion_hint: str


@dataclass(frozen=True)
class ThemeSpec:
    key: str
    shadow: tuple[int, int, int]
    body: tuple[int, int, int]
    hot: tuple[int, int, int]
    source_keys: tuple[str, ...]


ASSETS = (
    AssetSpec(
        "1007_N__Sprite.png",
        "tri_blade_violet.png",
        112,
        "three-prong rotating cutter",
        "counter-rotating blade wheel",
    ),
    AssetSpec(
        "1019_N_2__Sprite.png",
        "spiral_halo_gold.png",
        112,
        "spiral halo pressure node",
        "pulsing halo / orbit release",
    ),
    AssetSpec(
        "1030_N__Sprite.png",
        "galaxy_vortex_white.png",
        112,
        "vortex attractor core",
        "slow drift with tangent release",
    ),
    AssetSpec(
        "gw01__Sprite.png",
        "trinity_orb_violet.png",
        96,
        "three-core delayed orb",
        "brake, split, then chase",
    ),
    AssetSpec(
        "Boss11_timgxx__Sprite.png",
        "skull_sigil_white.png",
        112,
        "telegraphed curse marker",
        "hold, flash, then charge",
    ),
    AssetSpec(
        "Boss19_hs_sk01__Sprite.png",
        "chain_link_steel.png",
        96,
        "linked moving gate segment",
        "sine chain wall",
    ),
    AssetSpec(
        "Boss03_Z_qidai01__Sprite.png",
        "tentacle_shard_crimson.png",
        96,
        "segmented crimson ribbon",
        "twin snake / curved pursuit",
    ),
    AssetSpec(
        "ray04_lj_djs__Sprite.png",
        "wire_orb_silver.png",
        112,
        "wireframe orbit anchor",
        "nested orbit, then radial release",
    ),
)


# The four palettes are sampled and visually tuned from the eight selected
# user sprites above. Keeping them fixed makes the generated atlases stable and
# lets runtime caches share one atlas across every Dream bullet family.
THEMES = (
    ThemeSpec(
        "violet",
        (8, 5, 24),
        (87, 44, 190),
        (232, 211, 255),
        ("tri_blade_violet", "trinity_orb_violet"),
    ),
    ThemeSpec(
        "crimson",
        (17, 3, 12),
        (165, 27, 63),
        (255, 210, 201),
        ("tentacle_shard_crimson",),
    ),
    ThemeSpec(
        "gold",
        (22, 12, 3),
        (201, 126, 32),
        (255, 245, 207),
        ("spiral_halo_gold",),
    ),
    ThemeSpec(
        "silver",
        (5, 10, 22),
        (105, 125, 170),
        (238, 247, 255),
        ("galaxy_vortex_white", "wire_orb_silver"),
    ),
)

VOLUME_FRAME = (48, 48)
VOLUME_PHASES = 4
SPECULAR_FRAME = (64, 24)
SPECULAR_PHASES = 4
TRAIL_FRAME = (96, 36)
TRAIL_PHASES = 4
IMPACT_FRAME = (64, 64)
IMPACT_PHASES = 6


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def alpha_bbox(image: Image.Image, threshold: int = 4) -> tuple[int, int, int, int] | None:
    alpha = np.asarray(image.convert("RGBA"), dtype=np.uint8)[..., 3]
    ys, xs = np.where(alpha > threshold)
    if not len(xs):
        return None
    return int(xs.min()), int(ys.min()), int(xs.max() + 1), int(ys.max() + 1)


def residue_stats(image: Image.Image) -> dict[str, int]:
    rgba = np.asarray(image.convert("RGBA"), dtype=np.uint8)
    r = rgba[..., 0].astype(np.int16)
    g = rgba[..., 1].astype(np.int16)
    b = rgba[..., 2].astype(np.int16)
    visible = rgba[..., 3] > 16
    green = visible & (g > 76) & (g > r * 1.22 + 8) & (g > b * 1.14 + 8)
    cyan = visible & (g > 84) & (b > 84) & (g > r * 1.24 + 8) & (b > r * 1.24 + 8)
    return {
        "visible_pixels": int(visible.sum()),
        "green_residue_pixels": int(green.sum()),
        "cyan_residue_pixels": int(cyan.sum()),
    }


def clean_transparency_and_despill(image: Image.Image) -> Image.Image:
    rgba = np.asarray(image.convert("RGBA"), dtype=np.uint8).copy()
    r = rgba[..., 0].astype(np.int16)
    g = rgba[..., 1].astype(np.int16)
    b = rgba[..., 2].astype(np.int16)
    a = rgba[..., 3]

    # Chroma contamination is redirected into a cool violet-steel highlight.
    # None of the selected subjects uses green as a design colour.
    green = (a > 3) & (g > 76) & (g > r * 1.22 + 8) & (g > b * 1.14 + 8)
    cyan = (a > 3) & (g > 84) & (b > 84) & (g > r * 1.24 + 8) & (b > r * 1.24 + 8)
    spill = green | cyan
    value = np.maximum.reduce((r, g, b))
    rgba[..., 0][spill] = np.clip(np.maximum(r[spill], value[spill] * 0.68), 0, 255)
    rgba[..., 1][spill] = np.clip(np.minimum(g[spill], value[spill] * 0.54), 0, 255)
    rgba[..., 2][spill] = np.clip(np.maximum(b[spill], value[spill] * 0.80), 0, 255)

    rgba[..., 3][a <= 3] = 0
    rgba[..., :3][rgba[..., 3] == 0] = 0
    return Image.fromarray(rgba, "RGBA")


def fit_subject(image: Image.Image, canvas_size: int) -> Image.Image:
    bbox = alpha_bbox(image, threshold=5)
    if bbox is None:
        raise ValueError("source has no visible pixels")
    left, top, right, bottom = bbox
    image = image.crop(
        (
            max(0, left - 2),
            max(0, top - 2),
            min(image.width, right + 2),
            min(image.height, bottom + 2),
        )
    )
    padding = 12 if canvas_size == 112 else 10
    inner = canvas_size - padding * 2
    scale = min(inner / image.width, inner / image.height)
    size = (max(1, round(image.width * scale)), max(1, round(image.height * scale)))
    image = image.resize(size, Image.Resampling.LANCZOS)

    # Recover line and texture definition after normalization without sharpening
    # the alpha fringe into a light rectangle.
    rgb = image.convert("RGB")
    rgb = ImageEnhance.Contrast(rgb).enhance(1.06)
    rgb = rgb.filter(ImageFilter.UnsharpMask(radius=0.75, percent=120, threshold=3))
    rgb.putalpha(image.getchannel("A"))
    image = clean_transparency_and_despill(rgb)

    canvas = Image.new("RGBA", (canvas_size, canvas_size), (0, 0, 0, 0))
    offset = ((canvas_size - image.width) // 2, (canvas_size - image.height) // 2)
    canvas.alpha_composite(image, offset)
    return canvas


def add_collision_outline(subject: Image.Image) -> Image.Image:
    alpha = subject.getchannel("A")
    solid = alpha.point(lambda value: 255 if value >= 24 else 0)
    expanded = solid.filter(ImageFilter.MaxFilter(7)).filter(ImageFilter.GaussianBlur(0.7))
    outer = ImageChops.subtract(expanded, solid.filter(ImageFilter.GaussianBlur(0.35)))
    outer = outer.point(lambda value: min(220, round(value * 0.86)))

    outline = Image.new("RGBA", subject.size, (7, 9, 24, 0))
    outline.putalpha(outer)
    outline.alpha_composite(subject)
    return clean_transparency_and_despill(outline)


def _mix_color(
    low: tuple[int, int, int], high: tuple[int, int, int], amount: np.ndarray
) -> np.ndarray:
    low_rgb = np.asarray(low, dtype=np.float32)[None, None, :]
    high_rgb = np.asarray(high, dtype=np.float32)[None, None, :]
    return low_rgb * (1.0 - amount[..., None]) + high_rgb * amount[..., None]


def _image_from_float(rgb: np.ndarray, alpha: np.ndarray) -> Image.Image:
    rgba = np.zeros((*alpha.shape, 4), dtype=np.uint8)
    rgba[..., :3] = np.clip(rgb, 0, 255).astype(np.uint8)
    rgba[..., 3] = np.clip(alpha * 255.0, 0, 255).astype(np.uint8)
    rgba[..., :3][rgba[..., 3] == 0] = 0
    return clean_transparency_and_despill(Image.fromarray(rgba, "RGBA"))


def feather_frame_edges(image: Image.Image, padding: int = 2, feather: int = 2) -> Image.Image:
    rgba = np.asarray(image.convert("RGBA"), dtype=np.uint8).copy()
    height, width = rgba.shape[:2]
    yy, xx = np.mgrid[0:height, 0:width]
    edge_distance = np.minimum.reduce((xx, yy, width - 1 - xx, height - 1 - yy))
    window = np.clip((edge_distance - padding) / max(1, feather), 0.0, 1.0)
    rgba[..., 3] = np.clip(rgba[..., 3].astype(np.float32) * window, 0, 255).astype(
        np.uint8
    )
    rgba[..., :3][rgba[..., 3] == 0] = 0
    return clean_transparency_and_despill(Image.fromarray(rgba, "RGBA"))


def build_volume_frame(theme: ThemeSpec, phase: int) -> Image.Image:
    """Bake a faux-spherical core with shadow, Fresnel rim and moving caustic."""
    width, height = VOLUME_FRAME
    scale = 2
    yy, xx = np.mgrid[0 : height * scale, 0 : width * scale].astype(np.float32)
    cx = width * scale * 0.5
    cy = height * scale * 0.5
    radius = min(width, height) * 0.34 * scale
    nx = (xx - cx) / radius
    ny = (yy - cy) / radius
    rr = np.sqrt(nx * nx + ny * ny)
    inside = np.clip(1.0 - rr, 0.0, 1.0)
    nz = np.sqrt(np.clip(1.0 - rr * rr, 0.0, 1.0))

    light = np.clip((-0.44 * nx - 0.50 * ny + 0.74 * nz + 0.16) / 1.25, 0.0, 1.0)
    fresnel = np.power(np.clip(1.0 - nz, 0.0, 1.0), 1.65)
    angle = np.arctan2(ny, nx)
    caustic = 0.5 + 0.5 * np.sin(angle * 3.0 - rr * 12.0 + phase * np.pi * 0.5)
    caustic = np.power(caustic, 5.0) * inside * 0.30
    specular = np.exp(-(((nx + 0.34) / 0.18) ** 2 + ((ny + 0.38) / 0.15) ** 2))

    body_mix = np.clip(light * 0.70 + caustic + fresnel * 0.34, 0.0, 1.0)
    rgb = _mix_color(theme.shadow, theme.body, body_mix)
    hot_mix = np.clip(specular * 0.94 + fresnel * light * 0.58, 0.0, 1.0)
    rgb = rgb * (1.0 - hot_mix[..., None]) + np.asarray(
        theme.hot, dtype=np.float32
    )[None, None, :] * hot_mix[..., None]

    sphere_alpha = np.clip((1.02 - rr) / 0.075, 0.0, 1.0) * 0.95
    glow = np.exp(-np.maximum(rr - 0.92, 0.0) * 10.0) * (rr < 1.36) * 0.26
    alpha = np.maximum(sphere_alpha, glow)
    frame = _image_from_float(rgb, alpha)
    return feather_frame_edges(frame.resize(VOLUME_FRAME, Image.Resampling.LANCZOS))


def build_specular_frame(theme: ThemeSpec, phase: int) -> Image.Image:
    """Bake a narrow traveling highlight for blades, chains and crystal edges."""
    width, height = SPECULAR_FRAME
    scale = 3
    yy, xx = np.mgrid[0 : height * scale, 0 : width * scale].astype(np.float32)
    x = xx / scale
    y = yy / scale
    u = np.clip((x - 4.0) / (width - 8.0), 0.0, 1.0)
    center = height * 0.5 + np.sin(u * np.pi * 1.35 + phase * 0.34) * 2.1
    edge_window = np.clip(np.sin(np.clip(u, 0.0, 1.0) * np.pi), 0.0, 1.0) ** 0.62
    travel_center = 0.12 + phase * 0.245
    travel = np.exp(-np.power((u - travel_center) / 0.20, 2.0))
    dark_mask = np.exp(-np.power(np.abs(y - (center + 1.8)) / 2.6, 2.0)) * edge_window
    line_mask = np.exp(-np.power(np.abs(y - center) / 0.72, 2.0)) * edge_window
    hot_mask = line_mask * (0.32 + 0.68 * travel)
    rgb = _mix_color(theme.shadow, theme.body, np.clip(dark_mask * 0.58, 0.0, 1.0))
    rgb = rgb * (1.0 - hot_mask[..., None]) + np.asarray(
        theme.hot, dtype=np.float32
    )[None, None, :] * hot_mask[..., None]
    alpha = np.clip(dark_mask * 0.44 + line_mask * 0.30 + hot_mask * 0.66, 0.0, 0.92)
    frame = _image_from_float(rgb, alpha).resize(SPECULAR_FRAME, Image.Resampling.LANCZOS)
    return feather_frame_edges(frame)


def build_trail_frame(theme: ThemeSpec, phase: int) -> Image.Image:
    """Bake a tapered mass-and-hot-edge trail without runtime gradients."""
    width, height = TRAIL_FRAME
    scale = 2
    yy, xx = np.mgrid[0 : height * scale, 0 : width * scale].astype(np.float32)
    x = xx / scale
    y = yy / scale
    travel = np.clip((x - 6.0) / (width - 18.0), 0.0, 1.0)
    phase_radians = phase * np.pi * 0.5
    center = height * 0.5 + np.sin(travel * 8.6 + phase_radians) * (1.8 - travel)
    taper = np.sin(np.clip(travel, 0.0, 1.0) * np.pi * 0.5)
    head_fade = np.clip((width - 6.0 - x) / 8.0, 0.0, 1.0)
    tail_fade = np.clip((x - 4.0) / 15.0, 0.0, 1.0)
    envelope = taper * head_fade * tail_fade

    distance = np.abs(y - center)
    outer_width = 3.2 + 9.2 * taper
    body_mask = np.exp(-np.power(distance / outer_width, 2.2)) * envelope
    hot_center = center - 2.1 * (0.35 + taper)
    hot_distance = np.abs(y - hot_center)
    hot_width = 0.7 + 2.1 * taper
    hot_mask = np.exp(-np.power(hot_distance / hot_width, 2.0)) * envelope

    upper = center - (5.0 + 3.5 * taper)
    lower = center + (4.0 + 2.5 * taper)
    filament = (
        np.exp(-np.power(np.abs(y - upper) / 0.75, 2.0))
        + np.exp(-np.power(np.abs(y - lower) / 0.65, 2.0))
    ) * envelope * (0.35 + 0.65 * np.sin(travel * 17.0 + phase_radians) ** 2)

    rgb = _mix_color(theme.shadow, theme.body, np.clip(body_mask * 0.72, 0.0, 1.0))
    hot_mix = np.clip(hot_mask * 0.92 + filament * 0.54, 0.0, 1.0)
    rgb = rgb * (1.0 - hot_mix[..., None]) + np.asarray(
        theme.hot, dtype=np.float32
    )[None, None, :] * hot_mix[..., None]
    alpha = np.clip(body_mask * 0.78 + hot_mask * 0.58 + filament * 0.34, 0.0, 0.92)
    frame = _image_from_float(rgb, alpha).resize(TRAIL_FRAME, Image.Resampling.LANCZOS)

    # Sparse baked fragments move with the four atlas phases. They are part of
    # the single trail draw, not persistent particle objects.
    draw = ImageDraw.Draw(frame)
    for fragment in range(5):
        px = 15 + ((fragment * 23 + phase * 11) % max(24, width - 30))
        py = int(height * 0.5 + ((fragment * 7 + phase * 3) % 15) - 7)
        radius = 1 if fragment % 2 else 2
        draw.ellipse(
            (px - radius, py - radius, px + radius, py + radius),
            fill=(*theme.hot, 90 if radius == 1 else 54),
        )
    return feather_frame_edges(clean_transparency_and_despill(frame))


def _colored_mask(mask: Image.Image, color: tuple[int, int, int], opacity: float) -> Image.Image:
    alpha = mask.point(lambda value: min(255, round(value * opacity)))
    layer = Image.new("RGBA", mask.size, (*color, 0))
    layer.putalpha(alpha)
    return layer


def build_impact_frame(theme: ThemeSpec, phase: int) -> Image.Image:
    """Bake a six-frame readable impact envelope for pooled hit events."""
    width, height = IMPACT_FRAME
    scale = 3
    size = (width * scale, height * scale)
    center = (size[0] // 2, size[1] // 2)
    envelopes = (0.22, 0.58, 1.00, 0.84, 0.46, 0.16)
    radii = (6, 10, 16, 21, 26, 29)
    env = envelopes[phase]
    radius = radii[phase] * scale

    glow_mask = Image.new("L", size, 0)
    glow_draw = ImageDraw.Draw(glow_mask)
    glow_draw.ellipse(
        (center[0] - radius, center[1] - radius, center[0] + radius, center[1] + radius),
        outline=round(220 * env),
        width=max(2, round((3.0 - phase * 0.22) * scale)),
    )
    glow_mask = glow_mask.filter(ImageFilter.GaussianBlur(2.3 * scale))

    crisp_mask = Image.new("L", size, 0)
    crisp = ImageDraw.Draw(crisp_mask)
    start = -30 + phase * 31
    for arc in range(3):
        inset = arc * 2.6 * scale
        box = (
            center[0] - radius + inset,
            center[1] - radius + inset,
            center[0] + radius - inset,
            center[1] + radius - inset,
        )
        crisp.arc(
            box,
            start=start + arc * 118,
            end=start + arc * 118 + 62 + phase * 3,
            fill=round(245 * env),
            width=max(2, round(1.15 * scale)),
        )
    spike_length = (8 + phase * 3.5) * scale
    for spike in range(8):
        angle = phase * 0.21 + spike * np.pi / 4.0
        inner = max(3 * scale, radius * 0.35)
        x1 = center[0] + np.cos(angle) * inner
        y1 = center[1] + np.sin(angle) * inner
        x2 = center[0] + np.cos(angle) * spike_length
        y2 = center[1] + np.sin(angle) * spike_length
        crisp.line((x1, y1, x2, y2), fill=round(220 * env), width=max(2, scale))

    core_mask = Image.new("L", size, 0)
    core_draw = ImageDraw.Draw(core_mask)
    core_radius = max(2, round((9 - phase * 0.7) * scale))
    core_draw.ellipse(
        (
            center[0] - core_radius,
            center[1] - core_radius,
            center[0] + core_radius,
            center[1] + core_radius,
        ),
        fill=round(235 * env),
    )
    core_mask = core_mask.filter(ImageFilter.GaussianBlur(1.1 * scale))

    frame = Image.new("RGBA", size, (0, 0, 0, 0))
    frame.alpha_composite(_colored_mask(glow_mask, theme.body, 0.72))
    frame.alpha_composite(_colored_mask(crisp_mask, theme.hot, 0.92))
    frame.alpha_composite(_colored_mask(core_mask, theme.shadow, 0.82))
    frame = frame.resize(IMPACT_FRAME, Image.Resampling.LANCZOS)
    return feather_frame_edges(clean_transparency_and_despill(frame))


def _atlas_entry(
    key: str,
    output_name: str,
    atlas: Image.Image,
    frame_size: tuple[int, int],
    columns: int,
    role: str,
    runtime_intent: str,
    anchor: tuple[float, float],
) -> dict[str, object]:
    output_path = OUTPUT_DIR / output_name
    atlas = clean_transparency_and_despill(atlas)
    stats = residue_stats(atlas)
    if stats["green_residue_pixels"] or stats["cyan_residue_pixels"]:
        raise RuntimeError(f"despill failed for {output_name}: {stats}")
    atlas.save(output_path, "PNG", optimize=True, compress_level=9)
    frame_bboxes: list[list[int]] = []
    frame_padding: list[int] = []
    for row in range(len(THEMES)):
        for column in range(columns):
            left = column * frame_size[0]
            top = row * frame_size[1]
            frame = atlas.crop((left, top, left + frame_size[0], top + frame_size[1]))
            bbox = alpha_bbox(frame)
            frame_bboxes.append(list(bbox or ()))
            if bbox:
                frame_padding.append(
                    min(
                        bbox[0],
                        bbox[1],
                        frame_size[0] - bbox[2],
                        frame_size[1] - bbox[3],
                    )
                )
    return {
        "key": key,
        "output": output_path.relative_to(ROOT).as_posix(),
        "output_sha256": sha256(output_path),
        "canvas": [atlas.width, atlas.height],
        "frame_size": list(frame_size),
        "grid": [columns, len(THEMES)],
        "grid_order": "phase columns, theme rows",
        "phase_count": columns,
        "theme_rows": [theme.key for theme in THEMES],
        "anchor_normalized": list(anchor),
        "minimum_frame_padding_px": min(frame_padding) if frame_padding else 0,
        "frame_alpha_bboxes": frame_bboxes,
        "palette_sources": {
            theme.key: list(theme.source_keys) for theme in THEMES
        },
        "output_alpha_bbox": list(alpha_bbox(atlas) or ()),
        "output_residue": stats,
        "file_bytes": output_path.stat().st_size,
        "decoded_rgba_bytes": atlas.width * atlas.height * 4,
        "role": role,
        "runtime_intent": runtime_intent,
        "blend_mode": "source-over",
    }


def build_material_helpers() -> tuple[list[tuple[str, Image.Image]], list[dict[str, object]]]:
    helpers: list[tuple[str, Image.Image]] = []
    entries: list[dict[str, object]] = []
    configs = (
        (
            "shared_volume_core_atlas",
            "shared_volume_core_atlas.png",
            VOLUME_FRAME,
            VOLUME_PHASES,
            build_volume_frame,
            "shadowed faux-sphere core with moving caustic and Fresnel rim",
            "pre-compose once into the per-skin cache; zero extra draws per bullet",
            (0.5, 0.5),
        ),
        (
            "shared_specular_streak_atlas",
            "shared_specular_streak_atlas.png",
            SPECULAR_FRAME,
            SPECULAR_PHASES,
            build_specular_frame,
            "narrow traveling highlight with a dark undercut for material relief",
            "pre-compose into blade/crystal caches or draw only on phase changes",
            (0.5, 0.5),
        ),
        (
            "shared_velocity_trail_atlas",
            "shared_velocity_trail_atlas.png",
            TRAIL_FRAME,
            TRAIL_PHASES,
            build_trail_frame,
            "tapered dark mass, hot edge, filaments and baked fragments",
            "one selective draw for fast or turning bullets; no trail history or particles",
            (0.94, 0.5),
        ),
        (
            "shared_impact_glint_atlas",
            "shared_impact_glint_atlas.png",
            IMPACT_FRAME,
            IMPACT_PHASES,
            build_impact_frame,
            "six-frame impact envelope with dark core, broken ring and sharp glints",
            "event-only pooled flipbook; destroy after phase six",
            (0.5, 0.5),
        ),
    )
    for key, output_name, frame_size, phases, builder, role, runtime_intent, anchor in configs:
        atlas = Image.new(
            "RGBA",
            (frame_size[0] * phases, frame_size[1] * len(THEMES)),
            (0, 0, 0, 0),
        )
        for row, theme in enumerate(THEMES):
            for phase in range(phases):
                frame = builder(theme, phase)
                atlas.alpha_composite(frame, (phase * frame_size[0], row * frame_size[1]))
        entry = _atlas_entry(
            key,
            output_name,
            atlas,
            frame_size,
            phases,
            role,
            runtime_intent,
            anchor,
        )
        helpers.append((key, atlas))
        entries.append(entry)
    return helpers, entries


def process(spec: AssetSpec) -> tuple[Image.Image, dict[str, object]]:
    source_path = SOURCE_DIR / spec.source
    if not source_path.is_file():
        raise FileNotFoundError(f"missing source asset: {source_path}")

    source = Image.open(source_path).convert("RGBA")
    source_stats = residue_stats(source)
    subject = fit_subject(clean_transparency_and_despill(source), spec.canvas)
    output = add_collision_outline(subject)
    output_stats = residue_stats(output)
    if output_stats["green_residue_pixels"] or output_stats["cyan_residue_pixels"]:
        raise RuntimeError(f"despill failed for {spec.output}: {output_stats}")

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    output_path = OUTPUT_DIR / spec.output
    output.save(output_path, "PNG", optimize=True, compress_level=9)

    return output, {
        "key": Path(spec.output).stem,
        "source": source_path.relative_to(ROOT).as_posix(),
        "source_sha256": sha256(source_path),
        "source_size": [source.width, source.height],
        "source_alpha_bbox": list(alpha_bbox(source) or ()),
        "source_residue": source_stats,
        "output": output_path.relative_to(ROOT).as_posix(),
        "output_sha256": sha256(output_path),
        "canvas": [spec.canvas, spec.canvas],
        "output_alpha_bbox": list(alpha_bbox(output) or ()),
        "output_residue": output_stats,
        "transparent_padding_px": 12 if spec.canvas == 112 else 10,
        "collision_outline_px": 3,
        "role": spec.role,
        "motion_hint": spec.motion_hint,
    }


def build_contact_sheet(
    images: list[tuple[AssetSpec, Image.Image]],
    helpers: list[tuple[str, Image.Image]],
) -> None:
    columns = 4
    tile_w, tile_h = 252, 218
    rows = (len(images) + columns - 1) // columns
    base_height = rows * tile_h
    helper_height = 310
    sheet = Image.new(
        "RGB",
        (columns * tile_w, base_height + len(helpers) * helper_height),
        (17, 20, 32),
    )
    draw = ImageDraw.Draw(sheet)
    font = ImageFont.load_default()
    for index, (spec, image) in enumerate(images):
        x = index % columns * tile_w
        y = index // columns * tile_h
        preview = image.resize((168, 168), Image.Resampling.NEAREST)
        backdrop = Image.new("RGBA", preview.size, (35, 39, 56, 255))
        backdrop.alpha_composite(preview)
        sheet.paste(backdrop.convert("RGB"), (x + 42, y + 4))
        draw.text((x + 10, y + 178), Path(spec.output).stem, font=font, fill=(246, 247, 255))
        draw.text((x + 10, y + 194), spec.motion_hint, font=font, fill=(177, 188, 225))
    for helper_index, (key, atlas) in enumerate(helpers):
        y = base_height + helper_index * helper_height
        draw.rectangle((0, y, sheet.width, y + helper_height - 1), fill=(12, 15, 27))
        draw.line((0, y, sheet.width, y), fill=(72, 80, 118), width=1)
        draw.text((18, y + 12), key, font=font, fill=(250, 225, 238))
        draw.text(
            (18, y + 28),
            "phase columns / palette rows: violet, crimson, gold, silver",
            font=font,
            fill=(177, 188, 225),
        )
        available_w = sheet.width - 36
        available_h = helper_height - 62
        scale = min(2.0, available_w / atlas.width, available_h / atlas.height)
        preview_size = (max(1, round(atlas.width * scale)), max(1, round(atlas.height * scale)))
        preview = atlas.resize(preview_size, Image.Resampling.LANCZOS)
        backdrop = Image.new("RGBA", preview.size, (35, 39, 56, 255))
        backdrop.alpha_composite(preview)
        sheet.paste(
            backdrop.convert("RGB"),
            ((sheet.width - preview.width) // 2, y + 50),
        )
    sheet.save(CONTACT_SHEET_PATH, "PNG", optimize=True, compress_level=9)


def main() -> None:
    built: list[tuple[AssetSpec, Image.Image]] = []
    entries: list[dict[str, object]] = []
    for spec in ASSETS:
        image, entry = process(spec)
        built.append((spec, image))
        entries.append(entry)

    helpers, helper_entries = build_material_helpers()

    manifest = {
        "schema": "moon-bullet/dream-bullet-assets/v2",
        "pipeline": "tools/process_dream_bullet_assets.py",
        "source_policy": "user-provided barrage sprites; inputs are read-only",
        "render_policy": "single-draw RGBA with baked 3px dark collision edge",
        "asset_count": len(entries),
        "helper_count": len(helper_entries),
        "helper_policy": (
            "small shared atlases replace per-bullet gradients, trail histories, "
            "and persistent hit particles"
        ),
        "assets": entries,
        "helpers": helper_entries,
    }
    MANIFEST_PATH.write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )
    build_contact_sheet(built, helpers)

    total_bytes = sum((OUTPUT_DIR / spec.output).stat().st_size for spec in ASSETS)
    helper_bytes = sum((OUTPUT_DIR / Path(entry["output"]).name).stat().st_size for entry in helper_entries)
    print(f"built {len(entries)} Dream bullet sprites ({total_bytes} bytes)")
    print(f"built {len(helper_entries)} shared material atlases ({helper_bytes} bytes)")
    print(MANIFEST_PATH.relative_to(ROOT))
    print(CONTACT_SHEET_PATH.relative_to(ROOT))


if __name__ == "__main__":
    main()
