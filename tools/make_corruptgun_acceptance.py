#!/usr/bin/env python3
"""Build GIFs and side-by-side review sheets from Corruption Gun captures."""

from __future__ import annotations

import shutil
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "tools/corruptgun_acceptance"
SOURCE = ROOT / "7号战机 开发文件夹_副本"
MIRROR_SOURCE = ROOT / "moon-bullet-main/7号战机 开发文件夹"
ULT_SOURCE = SOURCE / "大招 炼狱影刃 开发文件夹"
ULT_MIRROR_SOURCE = MIRROR_SOURCE / "大招 炼狱影刃 开发文件夹"
FONT = ImageFont.load_default()
QQ_TMP = Path.home() / "Library/Containers/com.tencent.qq/Data/tmp"


def make_gif(folder: Path) -> Path:
    frames = [Image.open(path).convert("P", palette=Image.Palette.ADAPTIVE, colors=128) for path in sorted(folder.glob("*.png"))]
    if not frames:
        raise RuntimeError(f"No frames in {folder}")
    target = OUT / f"{folder.name}.gif"
    duration = 90 if folder.name == "anim_ultimate_full" else 70
    frames[0].save(target, save_all=True, append_images=frames[1:], duration=duration, loop=0, optimize=False, disposal=2)
    return target


def fit(image: Image.Image, width: int, height: int) -> Image.Image:
    copy = image.copy().convert("RGBA")
    copy.thumbnail((width, height), Image.Resampling.LANCZOS)
    canvas = Image.new("RGBA", (width, height), "#141418")
    canvas.alpha_composite(copy, ((width - copy.width) // 2, (height - copy.height) // 2))
    return canvas


def comparison(reference_name: str, clean_name: str, capture_name: str, target_name: str, capture_crop: tuple[int, int, int, int] = (140, 760, 580, 1240)) -> Path:
    reference = Image.open(SOURCE / reference_name).convert("RGBA")
    clean = Image.open(ROOT / "assets/player/corrupt_gun" / clean_name).convert("RGBA")
    capture = Image.open(OUT / capture_name).convert("RGBA")
    capture_focus = capture.crop(capture_crop)
    panel = Image.new("RGB", (1440, 620), "#141418")
    panel.paste(fit(reference, 450, 560).convert("RGB"), (10, 40))
    panel.paste(fit(clean, 450, 560).convert("RGB"), (495, 40))
    panel.paste(fit(capture_focus, 450, 560).convert("RGB"), (980, 40))
    draw = ImageDraw.Draw(panel)
    draw.text((18, 14), "RAW REFERENCE", fill="#f4d9e4", font=FONT)
    draw.text((503, 14), "CLEAN RUNTIME ASSET", fill="#f4d9e4", font=FONT)
    draw.text((988, 14), "IN GAME", fill="#f4d9e4", font=FONT)
    target = OUT / target_name
    panel.save(target, optimize=True)
    return target


def impact_timeline_sheet() -> Path:
    themes = ("main", "clone")
    times = ("000ms", "045ms", "110ms", "240ms", "520ms")
    panel_w, panel_h = 260, 390
    sheet = Image.new("RGB", (panel_w * len(times), panel_h * len(themes)), "#09070d")
    draw = ImageDraw.Draw(sheet)
    for row, theme in enumerate(themes):
        folder = OUT / f"impact_timeline_{theme}"
        for column, time_name in enumerate(times):
            path = folder / f"{time_name}.png"
            if not path.is_file():
                raise RuntimeError(f"Missing impact timeline frame {path}")
            capture = Image.open(path).convert("RGBA").crop((180, 260, 540, 760))
            x, y = column * panel_w, row * panel_h
            sheet.paste(fit(capture, panel_w - 16, panel_h - 42).convert("RGB"), (x + 8, y + 8))
            draw.text((x + 12, y + panel_h - 28), f"{theme.upper()} {time_name}", fill="#f4d9e4", font=FONT)
    target = OUT / "impact_timeline_comparison.png"
    sheet.save(target, optimize=True)
    return target


def infection_comparison(theme: str, capture_name: str) -> Path:
    raw_folder = SOURCE if (SOURCE / "连锁触手贴图.png").is_file() else MIRROR_SOURCE
    reference = Image.open(raw_folder / "连锁触手贴图.png").convert("RGBA")
    clean = Image.open(ROOT / f"assets/player/corrupt_gun/infection/cg_infect_tendril_3_{theme}.png").convert("RGBA")
    capture = Image.open(OUT / capture_name).convert("RGBA").crop((30, 120, 690, 760))
    panel = Image.new("RGB", (1440, 620), "#09070d")
    panel.paste(fit(reference, 450, 560).convert("RGB"), (10, 40))
    panel.paste(fit(clean, 450, 560).convert("RGB"), (495, 40))
    panel.paste(fit(capture, 450, 560).convert("RGB"), (980, 40))
    draw = ImageDraw.Draw(panel)
    draw.text((18, 14), "PREPARED SOURCE SHEET", fill="#f4d9e4", font=FONT)
    draw.text((503, 14), f"PROCESSED {theme.upper()} TENDRIL", fill="#f4d9e4", font=FONT)
    draw.text((988, 14), "IN GAME WARPED CHAIN", fill="#f4d9e4", font=FONT)
    target = OUT / f"infection_{theme}_comparison.png"
    panel.save(target, optimize=True)
    return target


def infection_timeline_sheet() -> Path:
    themes = ("main", "clone")
    times = ("000ms", "080ms", "180ms", "380ms", "620ms", "860ms", "1050ms")
    panel_w, panel_h = 190, 350
    sheet = Image.new("RGB", (panel_w * len(times), panel_h * len(themes)), "#09070d")
    draw = ImageDraw.Draw(sheet)
    for row, theme in enumerate(themes):
        folder = OUT / f"infection_timeline_{theme}"
        for column, time_name in enumerate(times):
            path = folder / f"{time_name}.png"
            if not path.is_file():
                raise RuntimeError(f"Missing infection timeline frame {path}")
            capture = Image.open(path).convert("RGBA").crop((40, 100, 680, 780))
            x, y = column * panel_w, row * panel_h
            sheet.paste(fit(capture, panel_w - 12, panel_h - 38).convert("RGB"), (x + 6, y + 6))
            draw.text((x + 10, y + panel_h - 26), f"{theme.upper()} {time_name}", fill="#f4d9e4", font=FONT)
    target = OUT / "infection_timeline_comparison.png"
    sheet.save(target, optimize=True)
    return target


def projectile_reference_sheet() -> Path:
    before_path = QQ_TMP / "QQ_1783691626325.png"
    reference_path = QQ_TMP / "QQ_1783691708790.png"
    if not before_path.is_file():
        before_path = OUT / "23_main_clone_orb_comparison.png"
    if not reference_path.is_file():
        reference_path = SOURCE / "红色粒子流条带，给弹幕拖尾拼接。.png"
    before = Image.open(before_path).convert("RGBA")
    reference = Image.open(reference_path).convert("RGBA")
    runtime = Image.open(OUT / "35_projectile_spear_showcase.png").convert("RGBA").crop((80, 300, 640, 940))
    panel = Image.new("RGB", (1440, 660), "#09070d")
    panel.paste(fit(before, 450, 590).convert("RGB"), (10, 46))
    panel.paste(fit(reference, 450, 590).convert("RGB"), (495, 46))
    panel.paste(fit(runtime, 450, 590).convert("RGB"), (980, 46))
    draw = ImageDraw.Draw(panel)
    draw.text((18, 16), "USER BEFORE: ORB-HEAVY TADPOLE", fill="#f4d9e4", font=FONT)
    draw.text((503, 16), "SHARP MULTILAYER TRAIL REFERENCE", fill="#f4d9e4", font=FONT)
    draw.text((988, 16), "V3 RUNTIME: MAIN / CLONE / OVERDRIVE", fill="#f4d9e4", font=FONT)
    target = OUT / "projectile_reference_comparison.png"
    panel.save(target, optimize=True)
    return target


def boss_corrosion_sheet() -> Path:
    captures = (
        ("36_boss_corrosion_001.png", "001 STACK / +3%"),
        ("37_boss_corrosion_100.png", "100 STACKS / +300%"),
        ("38_boss_corrosion_200.png", "200 STACKS / +600%"),
    )
    panel = Image.new("RGB", (1440, 620), "#09070d")
    draw = ImageDraw.Draw(panel)
    for index, (name, label) in enumerate(captures):
        image = Image.open(OUT / name).convert("RGBA").crop((80, 70, 680, 720))
        x = 10 + index * 485
        panel.paste(fit(image, 450, 550).convert("RGB"), (x, 42))
        draw.text((x + 8, 14), label, fill="#f4d9e4", font=FONT)
    target = OUT / "boss_corrosion_comparison.png"
    panel.save(target, optimize=True)
    return target


def ultimate_flow_sheet() -> Path:
    reference_path = ULT_SOURCE / "概念图一览.png"
    if not reference_path.is_file():
        reference_path = ROOT / "assets/player/corrupt_gun/ult/reference/cg_ult_concept.png"
    stages = (
        ("05_flight_0280ms_a000.png", "CORRUPTION ORB"),
        ("08_burst_0120ms_a000.png", "SHATTER"),
        ("11_form_0300ms_a000.png", "WHEEL FORM"),
        ("14_spin_1700ms_a040.png", "ABSORB / SLOW"),
        ("20_finale_0160ms_a080.png", "FINALE"),
    )
    panel = Image.new("RGB", (1600, 760), "#07050a")
    draw = ImageDraw.Draw(panel)
    reference = Image.open(reference_path).convert("RGBA")
    panel.paste(fit(reference, 520, 690).convert("RGB"), (12, 48))
    draw.text((20, 16), "CONCEPT: FIVE-STAGE DARK WHEEL", fill="#f4d9e4", font=FONT)
    cell_w, cell_h = 206, 650
    for index, (file_name, label) in enumerate(stages):
        path = OUT / "ultimate_timeline" / file_name
        if not path.is_file():
            raise RuntimeError(f"Missing Dark Wheel flow frame {path}")
        image = Image.open(path).convert("RGBA").crop((55, 70, 665, 1040))
        x = 548 + index * 208
        panel.paste(fit(image, cell_w - 10, cell_h).convert("RGB"), (x + 5, 48))
        draw.text((x + 8, 710), label, fill="#f4d9e4", font=FONT)
    target = OUT / "ultimate_concept_runtime_comparison.png"
    panel.save(target, optimize=True)
    return target


def ultimate_timeline_sheet() -> Path:
    stages = (
        ("03_cast_0499ms_a000.png", "CAST 500ms"),
        ("05_flight_0280ms_a000.png", "FLIGHT"),
        ("08_burst_0120ms_a000.png", "BURST 120ms"),
        ("11_form_0300ms_a000.png", "FORM 300ms"),
        ("14_spin_1700ms_a040.png", "SPIN / 40"),
        ("17_collapse_0200ms_a080.png", "COLLAPSE"),
        ("20_finale_0160ms_a080.png", "FINALE"),
    )
    cell_w, cell_h = 225, 470
    sheet = Image.new("RGB", (cell_w * len(stages), cell_h), "#07050a")
    draw = ImageDraw.Draw(sheet)
    for index, (file_name, label) in enumerate(stages):
        path = OUT / "ultimate_timeline" / file_name
        if not path.is_file():
            raise RuntimeError(f"Missing Dark Wheel timeline frame {path}")
        image = Image.open(path).convert("RGBA").crop((70, 110, 650, 970))
        x = index * cell_w
        sheet.paste(fit(image, cell_w - 12, cell_h - 42).convert("RGB"), (x + 6, 6))
        draw.text((x + 10, cell_h - 27), label, fill="#f4d9e4", font=FONT)
    target = OUT / "ultimate_timeline_comparison.png"
    sheet.save(target, optimize=True)
    return target


def ultimate_quality_sheet() -> Path:
    qualities = (("high", "HIGH / LIVE SHADER"), ("medium", "MEDIUM / 0.7 SHADER"), ("low", "LOW / LOSSLESS ATLAS"))
    panel = Image.new("RGB", (1440, 650), "#07050a")
    draw = ImageDraw.Draw(panel)
    for index, (quality, label) in enumerate(qualities):
        path = OUT / f"ultimate_quality_{quality}.png"
        if not path.is_file():
            raise RuntimeError(f"Missing Dark Wheel quality capture {path}")
        image = Image.open(path).convert("RGBA").crop((60, 100, 660, 980))
        x = 10 + index * 480
        panel.paste(fit(image, 450, 580).convert("RGB"), (x, 42))
        draw.text((x + 8, 14), label, fill="#f4d9e4", font=FONT)
    target = OUT / "ultimate_quality_comparison.png"
    panel.save(target, optimize=True)
    return target


def ultimate_rotation_sheet() -> Path:
    times = (1200, 1320, 1440, 1560, 1680)
    folder = OUT / "ultimate_blade_rotation"
    cell_w, cell_h = 270, 520
    sheet = Image.new("RGB", (cell_w * len(times), cell_h), "#07050a")
    draw = ImageDraw.Draw(sheet)
    gif_frames: list[Image.Image] = []
    for index, elapsed_ms in enumerate(times):
        path = folder / f"spin_{elapsed_ms}ms.png"
        if not path.is_file():
            raise RuntimeError(f"Missing Dark Wheel rotation frame {path}")
        image = Image.open(path).convert("RGBA").crop((45, 100, 675, 965))
        fitted = fit(image, cell_w - 12, cell_h - 42).convert("RGB")
        x = index * cell_w
        sheet.paste(fitted, (x + 6, 6))
        draw.text((x + 10, cell_h - 27), f"SPIN {elapsed_ms}ms", fill="#f4d9e4", font=FONT)
        gif_frames.append(fit(image, 630, 865).convert("P", palette=Image.Palette.ADAPTIVE))
    target = OUT / "ultimate_blade_rotation_comparison.png"
    sheet.save(target, optimize=True)
    gif_target = OUT / "ultimate_blade_rotation.gif"
    gif_frames[0].save(gif_target, save_all=True, append_images=gif_frames[1:], duration=120, loop=0, optimize=False, disposal=2)
    return target


def contact_sheet() -> Path:
    files = sorted(path for path in OUT.glob("[0-9][0-9]_*.png"))
    thumb_w, thumb_h = 260, 420
    cols = 4
    rows = (len(files) + cols - 1) // cols
    sheet = Image.new("RGB", (cols * thumb_w, rows * thumb_h), "#141418")
    draw = ImageDraw.Draw(sheet)
    for index, path in enumerate(files):
        image = fit(Image.open(path), 244, 374).convert("RGB")
        x = (index % cols) * thumb_w + 8
        y = (index // cols) * thumb_h + 8
        sheet.paste(image, (x, y))
        draw.text((x, y + 380), path.stem[:34], fill="#f4d9e4", font=FONT)
    target = OUT / "corruptgun_acceptance_contact.png"
    sheet.save(target, optimize=True)
    return target


def sync_review_artifacts() -> None:
    files = (
        list(OUT.glob("*.gif"))
        + list(OUT.glob("*comparison*.png"))
        + list(OUT.glob("viewport_*.png"))
        + [
            OUT / "corruptgun_acceptance_contact.png",
            OUT / "capture_report.json",
            ROOT / "tools/corruptgun_vfx_v2_preview/cg_vfx_v2_contact.png",
            ROOT / "tools/corruptgun_vfx_v2_preview/cg_vfx_v2_motion_strip.png",
            ROOT / "tools/corruptgun_infection_preview/cg_infection_assets_contact.png",
        ]
    )
    for base in (SOURCE, MIRROR_SOURCE):
        if not base.is_dir():
            continue
        target_dir = base / "验收截图"
        target_dir.mkdir(parents=True, exist_ok=True)
        for source in files:
            if source.exists():
                shutil.copy2(source, target_dir / source.name)
    ultimate_files = (
        list(OUT.glob("*ultimate*.gif"))
        + list(OUT.glob("ultimate*comparison*.png"))
        + list(OUT.glob("ultimate_quality_*.png"))
        + list(OUT.glob("viewport_*_dark_wheel.png"))
        + [
            OUT / "capture_report.json",
            ROOT / "tools/corruptgun_ultimate_assets_preview/corruptgun_ultimate_contact_sheet.png",
            ROOT / "tools/corruptgun_ultimate_assets_preview/corruptgun_ultimate_asset_report.json",
        ]
    )
    for base in (ULT_SOURCE, ULT_MIRROR_SOURCE):
        if not base.is_dir():
            continue
        target_dir = base / "验收截图"
        target_dir.mkdir(parents=True, exist_ok=True)
        for source in ultimate_files:
            if source.exists():
                shutil.copy2(source, target_dir / source.name)


def main() -> None:
    for folder in sorted(path for path in OUT.glob("anim_*") if path.is_dir()):
        make_gif(folder)
    comparison("普通形态贴图素材.png", "body/cg_body_normal.png", "33_normal_material_layers.png", "normal_comparison.png")
    comparison("暴走形态贴图.png", "body/cg_body_over.png", "34_overdrive_material_layers.png", "overdrive_comparison.png")
    comparison("分身待机循环，半透明科技投影风格.png", "clone/cg_clone_idle_1.png", "09_three_clones_idle.png", "clone_comparison.png")
    comparison("普通主弹：科技感虚空粒子光球，圆形，不是实体球。.png", "bullets/cg_orb_main_1.png", "17_normal_orb_closeup.png", "orb_main_comparison.png", (150, 340, 570, 830))
    comparison("普通主弹：科技感虚空粒子光球，圆形，不是实体球。.png", "bullets/cg_orb_main_1.png", "19_clone_orb_closeup.png", "orb_clone_comparison.png", (150, 340, 570, 830))
    infection_comparison("main", "24_main_infection_tentacles.png")
    infection_comparison("clone", "25_clone_infection_tentacles.png")
    infection_timeline_sheet()
    impact_timeline_sheet()
    projectile_reference_sheet()
    boss_corrosion_sheet()
    ultimate_flow_sheet()
    ultimate_timeline_sheet()
    ultimate_quality_sheet()
    ultimate_rotation_sheet()
    contact_sheet()
    sync_review_artifacts()


if __name__ == "__main__":
    main()
