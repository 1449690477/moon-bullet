from __future__ import annotations

import json
import re
import sys
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_OUT = ROOT if ROOT.name == "moon_bullet_demo_v3_6" else ROOT / "moon_bullet_demo_v3_6"
ASSET_RE = re.compile(r"['\"](assets/[^'\"]+)['\"]")
LARGE_TRANSPARENT_ALLOWED = {
    "assets/vfx/vfx_clear_bullets.png",
    "assets/vfx/vfx_player_ultimate_circle.png",
}


def fail(report: dict[str, object], category: str, message: str) -> None:
    report.setdefault(category, []).append(message)


def alpha_stats(path: Path) -> dict[str, object]:
    img = Image.open(path).convert("RGBA")
    alpha = img.getchannel("A")
    data = list(alpha.getdata())
    total = len(data)
    corners = [
        alpha.getpixel((0, 0)),
        alpha.getpixel((img.width - 1, 0)),
        alpha.getpixel((0, img.height - 1)),
        alpha.getpixel((img.width - 1, img.height - 1)),
    ]
    transparent_ratio = sum(1 for value in data if value < 10) / total
    opaque_ratio = sum(1 for value in data if value > 245) / total
    bbox = alpha.getbbox()
    return {
        "size": f"{img.width}x{img.height}",
        "corners": corners,
        "transparent_ratio": transparent_ratio,
        "opaque_ratio": opaque_ratio,
        "bbox": bbox,
    }


def referenced_assets(html: str) -> set[str]:
    return {m.group(1) for m in ASSET_RE.finditer(html) if not m.group(1).endswith(".json")}


def main() -> int:
    out = Path(sys.argv[1]).resolve() if len(sys.argv) > 1 else DEFAULT_OUT
    html_path = out / "index.html"
    manifest_path = out / "assets" / "asset_manifest.json"
    report: dict[str, object] = {
        "root": str(out),
        "errors": [],
        "warnings": [],
        "checked_pngs": 0,
        "referenced_assets": 0,
    }

    if not html_path.exists():
        fail(report, "errors", f"Missing index.html: {html_path}")
        print(json.dumps(report, ensure_ascii=False, indent=2))
        return 1
    if not manifest_path.exists():
        fail(report, "errors", f"Missing manifest: {manifest_path}")
        print(json.dumps(report, ensure_ascii=False, indent=2))
        return 1

    html = html_path.read_text(encoding="utf-8")
    refs = referenced_assets(html)
    report["referenced_assets"] = len(refs)
    for ref in sorted(refs):
        path = out / ref
        if not path.exists():
            fail(report, "errors", f"HTML references missing file: {ref}")

    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    manifest_files: dict[str, dict[str, object]] = {}
    for category in ["characters", "enemies", "bosses", "backgrounds", "ui", "bullets", "vfx"]:
        for name, meta in manifest.get(category, {}).items():
            manifest_files[f"assets/{category}/{name}"] = dict(meta)
            path = out / "assets" / category / name
            if not path.exists():
                fail(report, "errors", f"Manifest entry missing file: assets/{category}/{name}")
                continue
            try:
                stats = alpha_stats(path)
            except Exception as exc:
                fail(report, "errors", f"PNG decode failed: assets/{category}/{name}: {exc}")
                continue
            report["checked_pngs"] = int(report["checked_pngs"]) + 1
            if stats["size"] != meta.get("size"):
                fail(report, "errors", f"Manifest size mismatch for assets/{category}/{name}: manifest {meta.get('size')} actual {stats['size']}")
            if meta.get("transparent_background"):
                if max(stats["corners"]) > 8:
                    fail(report, "errors", f"Transparent asset has opaque corner(s): assets/{category}/{name} corners={stats['corners']}")
                rel = f"assets/{category}/{name}"
                if rel not in LARGE_TRANSPARENT_ALLOWED and category in {"characters", "enemies", "bosses", "bullets", "vfx"} and stats["transparent_ratio"] < 0.25:
                    fail(report, "warnings", f"Transparent asset may fill too much canvas: assets/{category}/{name} transparent_ratio={stats['transparent_ratio']:.3f}")
            if category == "backgrounds":
                img = Image.open(path).convert("RGBA")
                lum = [
                    (sum(pixel[:3]) / 3) * (pixel[3] / 255)
                    for pixel in img.resize((72, 128), Image.Resampling.BILINEAR).getdata()
                    if pixel[3] > 20
                ]
                if lum and sum(lum) / len(lum) > 82:
                    fail(report, "warnings", f"Background may be too bright for bullet readability: assets/{category}/{name}")

    for ref in sorted(refs):
        if ref.startswith("assets/") and ref not in manifest_files and not ref.startswith("assets/audio/"):
            fail(report, "warnings", f"HTML reference is not listed in manifest: {ref}")

    for category in ["audio"]:
        for name in manifest.get(category, {}):
            path = out / "assets" / category / name
            if not path.exists():
                fail(report, "errors", f"Manifest audio entry missing file: assets/{category}/{name}")

    print(json.dumps(report, ensure_ascii=False, indent=2))
    return 1 if report["errors"] else 0


if __name__ == "__main__":
    raise SystemExit(main())
