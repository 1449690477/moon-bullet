#!/usr/bin/env python3
"""Build a clean GitHub Pages publish directory.

The source project keeps raw imports, backups and desktop-quality assets.
This script publishes only files referenced by index.html and creates an
optional mobile WebP mirror used by the runtime on coarse-pointer devices.
"""

from __future__ import annotations

import hashlib
import json
import re
import shutil
import time
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
INDEX = ROOT / "index.html"
DIST = ROOT / "docs"
MOBILE_DIR = DIST / "assets_mobile"
IMAGE_EXTS = {".png", ".jpg", ".jpeg"}
AUDIO_EXTS = {".ogg", ".wav", ".mp3", ".m4a"}


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


def clean_dist() -> None:
    if DIST.exists():
        shutil.rmtree(DIST)
    DIST.mkdir(parents=True)
    MOBILE_DIR.mkdir(parents=True)


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


def make_mobile_variant(key: str, rel: str) -> str | None:
    src = ROOT / rel
    if src.suffix.lower() not in IMAGE_EXTS or not src.exists():
        return None

    out_rel = Path("assets_mobile") / Path(rel).with_suffix(".webp").relative_to("assets")
    out = DIST / out_rel
    out.parent.mkdir(parents=True, exist_ok=True)

    try:
      with Image.open(src) as im:
        im = im.convert("RGBA") if im.mode not in ("RGB", "RGBA") else im.copy()
        max_side = mobile_max_side(rel)
        if max(im.size) > max_side:
            im.thumbnail((max_side, max_side), Image.Resampling.LANCZOS)
        im.save(out, "WEBP", quality=72, method=4)
    except Exception:
        return None

    if out.exists() and out.stat().st_size > 0:
        return out_rel.as_posix()
    return None


def inject_pages_manifest(index_html: str) -> str:
    tag = '  <script src="./asset-mobile-manifest.js"></script>\n'
    return index_html.replace("  <script>\n(() => {", tag + "  <script>\n(() => {", 1)


def rel_url(rel: str) -> str:
    return "./" + rel.replace("\\", "/")


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
    bgm_paths = extract_const_object(source, "BGM_PATHS")
    sfx_paths = extract_const_object(source, "SFX_PATHS")

    version = hashlib.sha1(source.encode("utf-8")).hexdigest()[:12]
    clean_dist()

    referenced = dict(asset_paths)
    media_paths = set(asset_paths.values()) | set(bgm_paths.values()) | set(sfx_paths.values())
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
        variant = make_mobile_variant(key, rel)
        if variant:
            mobile_manifest[key] = variant

    manifest_js = (
        f"window.__PAGE_BUILD_VERSION__ = {json.dumps(version)};\n"
        f"window.__AVAILABLE_ASSETS__ = {json.dumps(available_assets, ensure_ascii=False, sort_keys=True)};\n"
        f"window.__MOBILE_ASSET_PATHS__ = {json.dumps(mobile_manifest, ensure_ascii=False, sort_keys=True)};\n"
    )
    (DIST / "asset-mobile-manifest.js").write_text(manifest_js, encoding="utf-8")
    (DIST / "index.html").write_text(inject_pages_manifest(source), encoding="utf-8")
    (DIST / ".nojekyll").write_text("", encoding="utf-8")

    core_keys = [
        "bgStageBase", "bgStage1", "playerAvatar", "yanuxiyaBAvatar", "annaAvatar",
        "reaverAvatar", "motherlifeAvatar", "uiSkillBeamIcon", "uiSkillBombIcon",
    ]
    core_urls = ["./", "./index.html", "./asset-mobile-manifest.js"]
    for key in core_keys:
        rel = asset_paths.get(key)
        if rel:
            core_urls.append(rel_url(rel))
        if key in mobile_manifest:
            core_urls.append(rel_url(mobile_manifest[key]))
    write_service_worker(version, core_urls)

    asset_manifest = {
        "version": version,
        "builtAt": int(time.time()),
        "referencedMedia": len(media_paths),
        "mobileVariants": len(mobile_manifest),
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
