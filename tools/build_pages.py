#!/usr/bin/env python3
"""Build a clean GitHub Pages publish directory.

The source project keeps raw imports, backups and desktop-quality assets.
This script publishes files referenced by index.html plus manifest-declared
runtime groups, and creates a mobile WebP mirror for coarse-pointer devices.
"""

from __future__ import annotations

import hashlib
import json
import re
import shutil
import time
from pathlib import Path

import numpy as np
from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
INDEX = ROOT / "index.html"
DIST = ROOT / "docs"
MOBILE_DIR = DIST / "assets_mobile"
IMAGE_EXTS = {".png", ".jpg", ".jpeg"}
AUDIO_EXTS = {".ogg", ".wav", ".mp3", ".m4a"}
DREAM_STAGE3_PREPARED_MOBILE = {
    "dreamRoomBase": "assets/dream_stage3/backgrounds/dream_room_base_mobile.webp",
}
MHR_BLACKHOLE_SEQUENCE_PHASES = {"deploy": 16, "loop": 32, "overload": 16, "collapse": 12}
CORRUPTGUN_VFX_MANIFEST_REL = "assets/player/corrupt_gun/cg_vfx_v2_manifest.json"
CORRUPTGUN_VFX_BUNDLE_REL = "assets/player/corrupt_gun/vfx/cg_vfx_engine.iife.js"
CORRUPTGUN_INFECTION_MANIFEST_REL = "assets/player/corrupt_gun/infection/cg_infection_manifest.json"
CORRUPTGUN_MATERIAL_MANIFEST_REL = "assets/player/corrupt_gun/cg_material_manifest.json"
CORRUPTGUN_ULTIMATE_MANIFEST_REL = "assets/player/corrupt_gun/ult/cg_ultimate_manifest.json"
CORRUPTGUN_ULTIMATE_REFERENCE_REL = "assets/player/corrupt_gun/ult/reference/cg_ult_concept.png"
CORRUPTGUN_NOTICE_REL = "THIRD_PARTY_NOTICES.md"
CORRUPTGUN_VERSION_INPUTS = (
    CORRUPTGUN_VFX_BUNDLE_REL,
    CORRUPTGUN_VFX_MANIFEST_REL,
    CORRUPTGUN_INFECTION_MANIFEST_REL,
    CORRUPTGUN_MATERIAL_MANIFEST_REL,
    CORRUPTGUN_ULTIMATE_MANIFEST_REL,
    CORRUPTGUN_NOTICE_REL,
)
CORRUPTGUN_VFX_KEYS = {
    "mainOrb": {
        "base": "cgVfxMainOrbBase",
        "energy": "cgVfxMainOrbEnergy",
    },
    "cloneOrb": {
        "base": "cgVfxCloneOrbBase",
        "energy": "cgVfxCloneOrbEnergy",
    },
    "trail": {
        "base": "cgVfxTrailBase",
        "energy": "cgVfxTrailEnergy",
    },
    "muzzle": {
        "base": "cgVfxMuzzleBase",
        "energy": "cgVfxMuzzleEnergy",
    },
    "impact": {
        "base": "cgVfxImpactBase",
        "energy": "cgVfxImpactEnergy",
    },
    "mark": {
        "base": "cgVfxMarkBase",
        "energy": "cgVfxMarkEnergy",
    },
    "cloneField": {
        "base": "cgVfxCloneFieldBase",
        "energy": "cgVfxCloneFieldEnergy",
    },
}
CORRUPTGUN_INFECTION_KEYS = {
    f"{part}_{theme}": f"cgInfect{''.join(token.title() for token in part.split('_'))}{theme.title()}"
    for part in ("tendril_1", "tendril_2", "tendril_3", "link", "node", "hit", "burst")
    for theme in ("main", "clone")
}
CORRUPTGUN_INFECTION_KEYS.update({
    f"{part}_{theme}": f"{runtime_prefix}{theme.title()}"
    for part, runtime_prefix in (
        ("chain_head", "cgChainHead"),
        ("chain_link", "cgChainLink"),
        ("tendril_spine", "cgTendrilSpine"),
        ("tendril_barb", "cgTendrilBarb"),
        ("source_node", "cgInfectSourceNode"),
        ("target_burst", "cgInfectTargetBurst"),
    )
    for theme in ("main", "clone")
})


def read_index() -> str:
    return INDEX.read_text(encoding="utf-8")


def extract_const_object(source: str, name: str) -> dict[str, str]:
    marker = f"const {name} = {{"
    start = source.find(marker)
    if start < 0:
        raise RuntimeError(f"Cannot find {name} in index.html")
    start = source.find("{", start)
    depth = 0
    end = None
    for i in range(start, len(source)):
        ch = source[i]
        if ch == "{":
            depth += 1
        elif ch == "}":
            depth -= 1
            if depth == 0:
                end = i
                break
    if end is None:
        raise RuntimeError(f"Cannot parse {name}")
    body = source[start + 1 : end]
    pairs = re.findall(r"\n\s*([A-Za-z0-9_]+):\s*['\"]([^'\"]+)['\"]", body)
    return dict(pairs)


def augment_mother_hive_sequence_assets(asset_paths: dict[str, str]) -> None:
    base = "assets/companions/mother_hive_ring/ultimate_link/blackhole_sequence"
    for phase, count in MHR_BLACKHOLE_SEQUENCE_PHASES.items():
        cap = phase[:1].upper() + phase[1:]
        for i in range(count):
            idx = f"{i:03d}"
            key = f"mhrBhSeq{cap}{idx}"
            asset_paths[key] = f"{base}/{phase}/bh_{phase}_{idx}.png"


def augment_corruptgun_assets(asset_paths: dict[str, str]) -> dict[str, str]:
    base = "assets/player/corrupt_gun"
    asset_paths.update({
        "cgBodyNormal": f"{base}/body/cg_body_normal.png",
        "cgBodyOver": f"{base}/body/cg_body_over.png",
        "cgCloneNoise": f"{base}/clone/cg_clone_noise.png",
        "cgAvatar": f"{base}/ui/cg_avatar.png",
        "cgCutin": f"{base}/ui/cg_cutin.png",
    })
    for form in ("Normal", "Over"):
        form_file = form.lower()
        for layer in ("Ao", "Crystal", "Muzzle", "Reactor", "Engine", "Wing"):
            asset_paths[f"cgMat{form}{layer}"] = f"{base}/body/material/cg_mat_{form_file}_{layer.lower()}.png"
    groups = (
        ("cgBodyBankR", "body/cg_body_bankR", 3),
        ("cgBodyBankL", "body/cg_body_bankL", 3),
        ("cgBodyOverBankR", "body/cg_body_over_bankR", 3),
        ("cgFormSwitch", "body/cg_form_switch", 8),
        ("cgWingBlade", "body/cg_wing_blade", 4),
        ("cgCloneIdle", "clone/cg_clone_idle", 4),
        ("cgCloneAttack", "clone/cg_clone_attack", 3),
        ("cgCloneSpawn", "clone/cg_clone_spawn", 5),
        ("cgCloneDespawn", "clone/cg_clone_despawn", 4),
        ("cgCloneOrb", "bullets/cg_clone_orb", 2),
        ("cgOrbSide", "bullets/cg_orb_side", 4),
        ("cgOrbPierce", "bullets/cg_orb_pierce", 4),
        ("cgOrbMain", "bullets/cg_orb_main", 2),
        ("cgOrbOver", "bullets/cg_orb_over", 2),
        ("cgOrbBaked", "bullets/cg_orb_baked", 4),
        ("cgTrailStrip", "bullets/cg_trail_strip", 5),
        ("cgFlameOver", "fx/cg_flame_over", 6),
        ("cgCorePulse", "fx/cg_core_pulse", 6),
        ("cgMark", "fx/cg_mark", 6),
        ("cgDeathBoom", "fx/cg_death_boom", 7),
        ("cgChargeOrb", "fx/cg_charge_orb", 2),
        ("cgHitSpark", "fx/cg_hit_spark", 6),
        ("cgFlameNormal", "fx/cg_flame_normal", 5),
        ("cgMuzzleNormal", "fx/cg_muzzle_normal", 4),
        ("cgMuzzleOver", "fx/cg_muzzle_over", 4),
        ("cgAura", "fx/cg_aura", 4),
        ("cgStackBurst", "fx/cg_stack_burst", 6),
        ("cgShockring", "fx/cg_shockring", 6),
        ("cgSpark", "fx/cg_spark", 8),
        ("cgShard", "fx/cg_shard", 8),
        ("cgDotR", "fx/cg_dot_r", 3),
        ("cgDotP", "fx/cg_dot_p", 3),
        ("cgDotW", "fx/cg_dot_w", 3),
        ("cgMatNormalMetal", "body/material/cg_mat_normal_metal", 8),
        ("cgMatOverMetal", "body/material/cg_mat_over_metal", 8),
    )
    groups += tuple(
        (f"cgMatForm{layer}", f"body/material/cg_mat_form_{layer.lower()}", 8)
        for layer in ("Ao", "Metal", "Crystal", "Muzzle", "Reactor", "Engine", "Wing")
    )
    groups += (
        ("cgUltBladeA", "ult/parts/cg_ult_blade_a", 4),
        ("cgUltSwirl", "ult/parts/cg_ult_swirl", 3),
        ("cgUltDartS", "ult/parts/cg_ult_dart_s", 4),
        ("cgUltRingThin", "ult/parts/cg_ult_ring_thin", 3),
        ("cgUltCrescent", "ult/parts/cg_ult_crescent", 8),
        ("cgUltVortexS", "ult/parts/cg_ult_vortex_s", 4),
        ("cgUltRune", "ult/parts/cg_ult_rune", 6),
        ("cgUltHarvesterBase", "ult/parts/cg_ult_harvester_base", 3),
        ("cgUltHarvesterEnergy", "ult/parts/cg_ult_harvester_energy", 3),
        ("cgUltScythe", "ult/opt/cg_ult_scythe", 8),
        ("cgUltBladeWheel", "ult/opt/cg_ult_bladewheel", 8),
        ("cgUltHole", "ult/opt/cg_ult_hole", 12),
        ("cgUltRimRing", "ult/opt/cg_ult_rimring", 2),
        ("cgUltSoulTransitionBase", "ult/phase2/parts/cg_ult_soul_transition_base", 11),
        ("cgUltSoulTransitionEnergy", "ult/phase2/parts/cg_ult_soul_transition_energy", 11),
    )
    for key_prefix, path_prefix, count in groups:
        for index in range(1, count + 1):
            asset_paths[f"{key_prefix}{index}"] = f"{base}/{path_prefix}_{index}.png"

    manifest_path = ROOT / CORRUPTGUN_VFX_MANIFEST_REL
    if not manifest_path.is_file():
        raise RuntimeError(f"Missing Corrupt Gun VFX manifest: {CORRUPTGUN_VFX_MANIFEST_REL}")
    try:
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    except Exception as error:
        raise RuntimeError(f"Invalid Corrupt Gun VFX manifest: {error}") from error

    render_contract = manifest.get("renderContract", {})
    if manifest.get("formatVersion") != 2 or manifest.get("character") != "corruptgun":
        raise RuntimeError("Corrupt Gun VFX manifest has an unsupported identity or format")
    if render_contract.get("fallbackIsVisuallyComplete") is not True:
        raise RuntimeError("Corrupt Gun VFX manifest does not guarantee a complete fallback")
    if render_contract.get("mobileEncoding") != "lossless WebP":
        raise RuntimeError("Corrupt Gun VFX manifest must declare lossless WebP mobile assets")
    if manifest.get("qa", {}).get("status") != "pass":
        raise RuntimeError("Corrupt Gun VFX manifest QA is not passing")

    manifest_assets = manifest.get("assets")
    if not isinstance(manifest_assets, dict):
        raise RuntimeError("Corrupt Gun VFX manifest is missing its assets object")

    lossless_sources: dict[str, str] = {}
    allowed_prefix = "assets/player/corrupt_gun/vfx_v2/"
    for asset_name, layer_keys in CORRUPTGUN_VFX_KEYS.items():
        asset = manifest_assets.get(asset_name)
        if not isinstance(asset, dict):
            raise RuntimeError(f"Corrupt Gun VFX manifest is missing asset {asset_name}")
        layers = asset.get("layers")
        if not isinstance(layers, dict):
            raise RuntimeError(f"Corrupt Gun VFX manifest is missing layers for {asset_name}")
        for layer_name, runtime_key in layer_keys.items():
            layer = layers.get(layer_name)
            if not isinstance(layer, dict):
                raise RuntimeError(f"Corrupt Gun VFX manifest is missing {asset_name}.{layer_name}")
            png_rel = layer.get("png")
            webp_rel = layer.get("webpLossless")
            if not isinstance(png_rel, str) or not png_rel.startswith(allowed_prefix) or not png_rel.endswith(".png"):
                raise RuntimeError(f"Invalid PNG path for Corrupt Gun VFX {asset_name}.{layer_name}")
            if not isinstance(webp_rel, str) or not webp_rel.startswith(allowed_prefix) or not webp_rel.endswith(".webp"):
                raise RuntimeError(f"Invalid lossless WebP path for Corrupt Gun VFX {asset_name}.{layer_name}")
            for encoding, rel, hash_key in (
                ("PNG", png_rel, "pngSha256"),
                ("lossless WebP", webp_rel, "webpSha256"),
            ):
                source_path = ROOT / rel
                expected_hash = layer.get(hash_key)
                if not source_path.is_file():
                    raise RuntimeError(f"Missing Corrupt Gun VFX {encoding}: {rel}")
                if not isinstance(expected_hash, str) or hashlib.sha256(source_path.read_bytes()).hexdigest() != expected_hash:
                    raise RuntimeError(
                        f"Corrupt Gun VFX {asset_name}.{layer_name} {encoding} does not match its audited hash"
                    )
            declared_rel = asset_paths.get(runtime_key)
            if declared_rel is None:
                raise RuntimeError(f"index.html is missing Corrupt Gun VFX key {runtime_key}")
            if declared_rel != png_rel:
                raise RuntimeError(
                    f"index.html path for {runtime_key} does not match the audited VFX manifest"
                )
            asset_paths[runtime_key] = png_rel
            lossless_sources[png_rel] = webp_rel
    return lossless_sources


def validate_corruptgun_infection_assets(asset_paths: dict[str, str]) -> int:
    manifest_path = ROOT / CORRUPTGUN_INFECTION_MANIFEST_REL
    if not manifest_path.is_file():
        raise RuntimeError(f"Missing Corrupt Gun infection manifest: {CORRUPTGUN_INFECTION_MANIFEST_REL}")
    try:
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    except Exception as error:
        raise RuntimeError(f"Invalid Corrupt Gun infection manifest: {error}") from error
    if manifest.get("formatVersion") != 1 or manifest.get("character") != "corruptgun":
        raise RuntimeError("Corrupt Gun infection manifest has an unsupported identity or format")
    if manifest.get("renderContract", {}).get("fallbackComplete") is not True:
        raise RuntimeError("Corrupt Gun infection manifest does not guarantee a complete fallback")
    assets = manifest.get("assets")
    if not isinstance(assets, dict) or set(assets) != set(CORRUPTGUN_INFECTION_KEYS):
        raise RuntimeError("Corrupt Gun infection manifest does not contain the expected 26 assets")
    for manifest_key, runtime_key in CORRUPTGUN_INFECTION_KEYS.items():
        item = assets.get(manifest_key)
        rel = item.get("file") if isinstance(item, dict) else None
        if not isinstance(rel, str) or not rel.startswith("assets/player/corrupt_gun/infection/") or not rel.endswith(".png"):
            raise RuntimeError(f"Invalid infection asset path for {manifest_key}")
        path = ROOT / rel
        if not path.is_file():
            raise RuntimeError(f"Missing infection asset: {rel}")
        if item.get("greenPixels") != 0:
            raise RuntimeError(f"Infection asset still contains green spill: {rel}")
        if manifest_key.endswith("_clone") and item.get("cyanPixels") != 0:
            raise RuntimeError(f"Clone infection asset still contains cyan spill: {rel}")
        if hashlib.sha256(path.read_bytes()).hexdigest() != item.get("sha256"):
            raise RuntimeError(f"Infection asset hash mismatch: {rel}")
        if asset_paths.get(runtime_key) != rel:
            raise RuntimeError(f"index.html infection asset mismatch for {runtime_key}")
    return len(assets)


def validate_corruptgun_material_assets(asset_paths: dict[str, str]) -> int:
    manifest_path = ROOT / CORRUPTGUN_MATERIAL_MANIFEST_REL
    if not manifest_path.is_file():
        raise RuntimeError(f"Missing Corrupt Gun material manifest: {CORRUPTGUN_MATERIAL_MANIFEST_REL}")
    try:
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    except Exception as error:
        raise RuntimeError(f"Invalid Corrupt Gun material manifest: {error}") from error
    if manifest.get("version") != 1 or manifest.get("character") != "corruptgun":
        raise RuntimeError("Corrupt Gun material manifest has an unsupported identity or format")
    assets = manifest.get("assets")
    if not isinstance(assets, dict) or len(assets) != 84:
        raise RuntimeError("Corrupt Gun material manifest does not contain the expected 84 layers")
    declared_paths = set(asset_paths.values())
    for rel, item in assets.items():
        if not rel.startswith("body/material/") or not rel.endswith(".png"):
            raise RuntimeError(f"Invalid material asset path: {rel}")
        full_rel = f"assets/player/corrupt_gun/{rel}"
        path = ROOT / full_rel
        if not path.is_file() or full_rel not in declared_paths:
            raise RuntimeError(f"Missing or undeclared material asset: {full_rel}")
        if item.get("residualGreenPixels") != 0:
            raise RuntimeError(f"Material asset still contains green spill: {full_rel}")
        if hashlib.sha256(path.read_bytes()).hexdigest() != item.get("sha256"):
            raise RuntimeError(f"Material asset hash mismatch: {full_rel}")
    return len(assets)


def validate_corruptgun_ultimate_assets(asset_paths: dict[str, str]) -> dict[str, int]:
    manifest_path = ROOT / CORRUPTGUN_ULTIMATE_MANIFEST_REL
    if not manifest_path.is_file():
        raise RuntimeError(f"Missing Corrupt Gun ultimate manifest: {CORRUPTGUN_ULTIMATE_MANIFEST_REL}")
    try:
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    except Exception as error:
        raise RuntimeError(f"Invalid Corrupt Gun ultimate manifest: {error}") from error
    if manifest.get("formatVersion") != 2 or manifest.get("character") != "corruptgun" or manifest.get("ultimate") != "darkWheel":
        raise RuntimeError("Corrupt Gun ultimate manifest has an unsupported identity or format")
    assets = manifest.get("assets")
    if not isinstance(assets, dict) or not assets:
        raise RuntimeError("Corrupt Gun ultimate manifest has no audited assets")
    groups = manifest.get("assetGroups")
    if not isinstance(groups, dict) or set(groups) != {"base", "opt", "phase2"}:
        raise RuntimeError("Corrupt Gun ultimate manifest must declare base/opt/phase2 groups")
    grouped_paths: dict[str, str] = {}
    group_counts: dict[str, int] = {}
    for group_name, group in groups.items():
        paths = group.get("paths") if isinstance(group, dict) else None
        if not isinstance(paths, list) or not all(isinstance(path, str) for path in paths):
            raise RuntimeError(f"Corrupt Gun ultimate group {group_name} has invalid paths")
        if len(paths) != len(set(paths)):
            raise RuntimeError(f"Corrupt Gun ultimate group {group_name} contains duplicate paths")
        for path in paths:
            if path in grouped_paths:
                raise RuntimeError(f"Corrupt Gun ultimate asset belongs to multiple groups: {path}")
            grouped_paths[path] = group_name
        group_counts[group_name] = len(paths)
    if set(grouped_paths) != set(assets):
        raise RuntimeError("Corrupt Gun ultimate groups do not exactly partition the audited assets")
    if group_counts["opt"] != 30 or groups["opt"].get("preservedUnmodified") is not True:
        raise RuntimeError("Corrupt Gun ultimate opt group must preserve the current 30 assets")
    declared_paths = set(asset_paths.values())
    for relative_asset, item in assets.items():
        rel = f"assets/player/corrupt_gun/ult/{relative_asset}"
        path = ROOT / rel
        if not path.is_file():
            raise RuntimeError(f"Missing Corrupt Gun ultimate asset: {rel}")
        is_reference = relative_asset == "reference/cg_ult_concept.png"
        if not is_reference and rel not in declared_paths:
            raise RuntimeError(f"Undeclared Corrupt Gun ultimate runtime asset: {rel}")
        group_name = grouped_paths[relative_asset]
        if group_name != "opt" and not is_reference and (
            item.get("residualGreenPixels") != 0 or item.get("residualCyanPixels") != 0
        ):
            raise RuntimeError(f"Corrupt Gun ultimate asset still contains green/cyan spill: {rel}")
        if group_name == "opt" and item.get("preservedUnmodified") is not True:
            raise RuntimeError(f"Corrupt Gun ultimate opt asset is not marked preserved: {rel}")
        if hashlib.sha256(path.read_bytes()).hexdigest() != item.get("sha256"):
            raise RuntimeError(f"Corrupt Gun ultimate asset hash mismatch: {rel}")
    sequences = manifest.get("sequences")
    expected_frames = {
        "orb_stage": 6, "orb_roll": 6, "orb_dart": 5, "comet": 6,
        "shatter": 8, "form": 8, "form_b": 8, "wheel": 8, "wheel_inner": 8,
        "soul_emerge": 6, "soul_flight": 6, "soul_variants": 7,
        "soul_burst": 8, "soul_transition": 11,
    }
    if not isinstance(sequences, dict) or any(
        not isinstance(sequences.get(key), dict) or sequences[key].get("frames") != frames
        for key, frames in expected_frames.items()
    ):
        raise RuntimeError("Corrupt Gun ultimate sequence mapping does not match the audited frame contract")
    for key in ("soul_emerge", "soul_flight", "soul_variants", "soul_burst", "soul_transition"):
        sequence = sequences[key]
        for layer in ("base", "energy"):
            runtime_key = sequence.get("runtimeKeys", {}).get(layer)
            relative_asset = sequence.get(layer)
            rel = f"assets/player/corrupt_gun/ult/{relative_asset}"
            if not isinstance(runtime_key, str) or asset_paths.get(runtime_key) != rel:
                raise RuntimeError(f"Corrupt Gun ultimate {key}.{layer} runtime key is missing or mismatched")
    qa = manifest.get("qa", {})
    if qa.get("status") != "pass" or qa.get("phase2ResidualGreenPixels") != 0 or qa.get("phase2ResidualCyanPixels") != 0:
        raise RuntimeError("Corrupt Gun ultimate phase-two asset QA is not passing")
    if qa.get("optPreserved") is not True:
        raise RuntimeError("Corrupt Gun ultimate opt assets were not preserved")
    return {"total": len(assets), **group_counts}


def clean_dist() -> None:
    if DIST.exists():
        shutil.rmtree(DIST)
    DIST.mkdir(parents=True)
    MOBILE_DIR.mkdir(parents=True)


def stable_built_at(version: str) -> int:
    manifest = DIST / "pages-asset-manifest.json"
    if manifest.exists():
        try:
            previous = json.loads(manifest.read_text(encoding="utf-8"))
            if previous.get("version") == version and isinstance(previous.get("builtAt"), int):
                return previous["builtAt"]
        except Exception:
            pass
    return int(time.time())


def copy_file(rel: str) -> int:
    src = ROOT / rel
    if not src.exists() or not src.is_file():
        raise FileNotFoundError(rel)
    dst = DIST / rel
    dst.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(src, dst)
    return dst.stat().st_size


def mobile_max_side(rel: str) -> int:
    if rel.startswith("assets/backgrounds/"):
        return 1024
    if rel.startswith("assets/characters/") or rel.startswith("assets/player/"):
        return 960
    if rel.startswith("assets/saintcrown/") or rel.startswith("assets/vfx/"):
        return 896
    return 768


def clean_mobile_ultimate(image: Image.Image) -> Image.Image:
    """Reapply chroma cleanup after resize so low-alpha key green cannot bleed on phones."""
    px = np.asarray(image.convert("RGBA"), dtype=np.float32).copy()
    r, g, b, a = (px[:, :, index] for index in range(4))
    a[a <= 2] = 0
    maximum = np.maximum.reduce([r, g, b])
    minimum = np.minimum.reduce([r, g, b])
    chroma = maximum - minimum
    saturation = np.divide(chroma, np.maximum(maximum, 1), out=np.zeros_like(chroma), where=maximum > 0)
    hue = np.zeros_like(maximum)
    valid = chroma > 0.001
    red_max = valid & (maximum == r)
    green_max = valid & (maximum == g)
    blue_max = valid & (maximum == b)
    hue[red_max] = np.mod((g[red_max] - b[red_max]) / chroma[red_max], 6.0)
    hue[green_max] = (b[green_max] - r[green_max]) / chroma[green_max] + 2.0
    hue[blue_max] = (r[blue_max] - g[blue_max]) / chroma[blue_max] + 4.0
    hue = np.mod(hue * 60.0, 360.0)
    visible = a > 0
    spill = visible & (maximum > 10) & (saturation > 0.10) & (hue >= 43) & (hue <= 205)
    if np.any(spill):
        energy = maximum
        r[spill] = np.maximum(r[spill], energy[spill] * 0.82)
        g[spill] = np.minimum(g[spill], r[spill] * 0.12)
        b[spill] = np.minimum(np.maximum(b[spill] * 0.42, r[spill] * 0.20), r[spill] * 0.58)
    visible = a > 0
    g[visible] = np.minimum(g[visible], np.maximum(r[visible], b[visible]))
    px[:, :, 0] = r
    px[:, :, 1] = g
    px[:, :, 2] = b
    px[:, :, 3] = a
    px = np.clip(px, 0, 255).astype(np.uint8)
    px[px[:, :, 3] == 0, :3] = 0

    # The exact same hue audit runs on the final mobile pixels.
    check = px.astype(np.float32)
    cr, cg, cb, ca = (check[:, :, index] for index in range(4))
    cmax = np.maximum.reduce([cr, cg, cb])
    cmin = np.minimum.reduce([cr, cg, cb])
    cdelta = cmax - cmin
    csat = np.divide(cdelta, np.maximum(cmax, 1), out=np.zeros_like(cdelta), where=cmax > 0)
    chue = np.zeros_like(cmax)
    cvalid = cdelta > 0.001
    masks = (cvalid & (cmax == cr), cvalid & (cmax == cg), cvalid & (cmax == cb))
    chue[masks[0]] = np.mod((cg[masks[0]] - cb[masks[0]]) / cdelta[masks[0]], 6.0)
    chue[masks[1]] = (cb[masks[1]] - cr[masks[1]]) / cdelta[masks[1]] + 2.0
    chue[masks[2]] = (cr[masks[2]] - cg[masks[2]]) / cdelta[masks[2]] + 4.0
    chue = np.mod(chue * 60.0, 360.0)
    residual = (ca > 0) & (cmax > 10) & (csat > 0.10) & (chue >= 43) & (chue <= 205)
    if np.any(residual):
        raise RuntimeError(f"Corrupt Gun ultimate mobile asset still contains {int(residual.sum())} green/cyan pixels")
    return Image.fromarray(px, "RGBA")


def make_mobile_variant(key: str, rel: str, lossless_sources: dict[str, str]) -> str | None:
    src = ROOT / rel
    prepared_mobile_rel = DREAM_STAGE3_PREPARED_MOBILE.get(key)
    if prepared_mobile_rel:
        prepared_src = ROOT / prepared_mobile_rel
        if not prepared_src.is_file():
            raise FileNotFoundError(prepared_mobile_rel)
        out_rel = Path("assets_mobile") / Path(rel).relative_to("assets")
        out = DIST / out_rel
        out.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(prepared_src, out)
        return out_rel.as_posix()
    if src.suffix.lower() not in IMAGE_EXTS or not src.exists():
        return None

    lossless_rel = lossless_sources.get(rel)
    mobile_source_rel = lossless_rel or Path(rel).with_suffix(".webp").as_posix()
    out_rel = Path("assets_mobile") / Path(mobile_source_rel).relative_to("assets")
    out = DIST / out_rel
    out.parent.mkdir(parents=True, exist_ok=True)

    try:
        if lossless_rel:
            lossless_src = ROOT / lossless_rel
            if not lossless_src.is_file():
                raise FileNotFoundError(lossless_rel)
            # The VFX generator already produced the audited lossless-alpha file.
            # Copying it byte-for-byte avoids translucent black/red edge damage.
            shutil.copy2(lossless_src, out)
        else:
            with Image.open(src) as im:
                im = im.convert("RGBA") if im.mode not in ("RGB", "RGBA") else im.copy()
                max_side = mobile_max_side(rel)
                if max(im.size) > max_side:
                    im.thumbnail((max_side, max_side), Image.Resampling.LANCZOS)
                if rel.startswith("assets/player/corrupt_gun/ult/"):
                    im = clean_mobile_ultimate(im)
                if rel.startswith((
                    "assets/player/corrupt_gun/infection/",
                    "assets/player/corrupt_gun/body/material/",
                    "assets/player/corrupt_gun/ult/",
                )):
                    im.save(out, "WEBP", lossless=True, method=6)
                else:
                    im.save(out, "WEBP", quality=72, method=4)
    except Exception:
        if rel in lossless_sources or rel.startswith("assets/player/corrupt_gun/ult/"):
            raise
        return None

    if out.exists() and out.stat().st_size > 0:
        if rel.startswith("assets/player/corrupt_gun/ult/"):
            with Image.open(out) as encoded:
                clean_mobile_ultimate(encoded)
        return out_rel.as_posix()
    return None


def inject_pages_manifest(index_html: str) -> str:
    tag = '  <script src="./asset-mobile-manifest.js"></script>\n'
    if tag in index_html:
        return index_html
    return index_html.replace("  <script>\n(() => {", tag + "  <script>\n(() => {", 1)


def rel_url(rel: str) -> str:
    return "./" + rel.replace("\\", "/")


def build_version(source: str) -> str:
    digest = hashlib.sha1()
    digest.update(source.encode("utf-8"))
    for rel in CORRUPTGUN_VERSION_INPUTS:
        path = ROOT / rel
        if not path.is_file():
            raise FileNotFoundError(rel)
        digest.update(b"\0")
        digest.update(rel.encode("utf-8"))
        digest.update(b"\0")
        digest.update(path.read_bytes())
    return digest.hexdigest()[:12]


def write_service_worker(version: str, core_urls: list[str]) -> None:
    sw = f"""const CACHE_NAME = 'moon-bullet-pages-{version}';
const CORE_ASSETS = {json.dumps(core_urls, ensure_ascii=False, indent=2)};

self.addEventListener('install', event => {{
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(CORE_ASSETS))
      .then(() => self.skipWaiting())
  );
}});

self.addEventListener('activate', event => {{
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
}});

self.addEventListener('fetch', event => {{
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  const isAsset = url.pathname.includes('/assets/') || url.pathname.includes('/assets_mobile/');
  if (!isAsset) return;
  event.respondWith(
    caches.match(req).then(hit => hit || fetch(req).then(res => {{
      const copy = res.clone();
      caches.open(CACHE_NAME).then(cache => cache.put(req, copy));
      return res;
    }}).catch(() => hit))
  );
}});
"""
    (DIST / "sw.js").write_text(sw, encoding="utf-8")


def main() -> None:
    source = read_index()
    asset_paths = extract_const_object(source, "ASSET_PATHS")
    asset_paths.update(extract_const_object(source, "CG_ASSET_PATHS"))
    corruptgun_lossless_sources = augment_corruptgun_assets(asset_paths)
    corruptgun_infection_assets = validate_corruptgun_infection_assets(asset_paths)
    corruptgun_material_assets = validate_corruptgun_material_assets(asset_paths)
    corruptgun_ultimate_assets = validate_corruptgun_ultimate_assets(asset_paths)
    augment_mother_hive_sequence_assets(asset_paths)
    bgm_paths = extract_const_object(source, "BGM_PATHS")
    sfx_paths = extract_const_object(source, "SFX_PATHS")

    version = build_version(source)
    built_at = stable_built_at(version)
    clean_dist()

    referenced = dict(asset_paths)
    companion_webp_paths = set(corruptgun_lossless_sources.values())
    runtime_support_paths = set(CORRUPTGUN_VERSION_INPUTS) | {CORRUPTGUN_ULTIMATE_REFERENCE_REL}
    media_paths = (
        set(asset_paths.values())
        | set(bgm_paths.values())
        | set(sfx_paths.values())
        | companion_webp_paths
        | runtime_support_paths
    )
    bytes_copied = 0
    missing: list[str] = []
    for rel in sorted(media_paths):
        try:
            bytes_copied += copy_file(rel)
        except FileNotFoundError:
            missing.append(rel)
    if missing:
        raise SystemExit("Missing referenced files:\n" + "\n".join(missing))

    available_assets = {key: (ROOT / rel).exists() for key, rel in referenced.items()}
    mobile_manifest: dict[str, str] = {}
    for key, rel in referenced.items():
        variant = make_mobile_variant(key, rel, corruptgun_lossless_sources)
        if variant:
            mobile_manifest[key] = variant

    manifest_js = (
        f"window.__PAGE_BUILD_VERSION__ = {json.dumps(version)};\n"
        f"window.__AVAILABLE_ASSETS__ = {json.dumps(available_assets, ensure_ascii=False, sort_keys=True)};\n"
        f"window.__MOBILE_ASSET_PATHS__ = {json.dumps(mobile_manifest, ensure_ascii=False, sort_keys=True)};\n"
    )
    (DIST / "asset-mobile-manifest.js").write_text(manifest_js, encoding="utf-8")
    # Root index.html is also a supported local preview entry; keep its availability map fresh.
    (ROOT / "asset-mobile-manifest.js").write_text(manifest_js, encoding="utf-8")
    (DIST / "index.html").write_text(inject_pages_manifest(source), encoding="utf-8")
    (DIST / ".nojekyll").write_text("", encoding="utf-8")

    core_keys = [
        "bgStageBase", "bgStage1", "playerAvatar", "yanuxiyaBAvatar", "annaAvatar",
        "reaverAvatar", "motherlifeAvatar", "cgAvatar", "uiSkillBeamIcon", "uiSkillBombIcon",
    ]
    core_urls = [
        "./",
        "./index.html",
        "./asset-mobile-manifest.js",
        rel_url(CORRUPTGUN_VFX_BUNDLE_REL),
        rel_url(CORRUPTGUN_VFX_MANIFEST_REL),
        rel_url(CORRUPTGUN_INFECTION_MANIFEST_REL),
        rel_url(CORRUPTGUN_MATERIAL_MANIFEST_REL),
        rel_url(CORRUPTGUN_ULTIMATE_MANIFEST_REL),
        rel_url("assets/player/corrupt_gun/ult/ui/cg_ult_icon.png"),
    ]
    for key in core_keys:
        rel = asset_paths.get(key)
        if rel:
            core_urls.append(rel_url(rel))
        if key in mobile_manifest:
            core_urls.append(rel_url(mobile_manifest[key]))
    write_service_worker(version, core_urls)

    asset_manifest = {
        "version": version,
        "builtAt": built_at,
        "referencedMedia": len(media_paths),
        "mobileVariants": len(mobile_manifest),
        "losslessCorruptgunVfxVariants": len(corruptgun_lossless_sources),
        "losslessCorruptgunInfectionVariants": corruptgun_infection_assets,
        "corruptgunMaterialLayers": corruptgun_material_assets,
        "corruptgunUltimateAssets": corruptgun_ultimate_assets["total"],
        "corruptgunUltimateAssetGroups": {
            name: corruptgun_ultimate_assets[name]
            for name in ("base", "opt", "phase2")
        },
        "runtimeSupportFiles": list(CORRUPTGUN_VERSION_INPUTS),
        "copiedBytes": bytes_copied,
        "excluded": [
            "assets/_backup_before_user_import/**",
            "assets_backup_*/**",
            "unreferenced bgm_*_loop.wav",
            "asset preview sheets not referenced by index.html",
        ],
    }
    (DIST / "pages-asset-manifest.json").write_text(json.dumps(asset_manifest, ensure_ascii=False, indent=2), encoding="utf-8")

    total = sum(p.stat().st_size for p in DIST.rglob("*") if p.is_file())
    print(f"Built {DIST}")
    print(f"Referenced media: {len(media_paths)}")
    print(f"Mobile variants: {len(mobile_manifest)}")
    print(f"Publish size: {total / 1024 / 1024:.2f} MB")


if __name__ == "__main__":
    main()
