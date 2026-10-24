#!/usr/bin/env python3
"""Build the local, Vercel-ready preview bundle from the current desktop source."""

from __future__ import annotations

import argparse
import json
import os
import re
import shutil
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlsplit


REQUIRED_SOURCE_FILES = (
    "0xshinky.spec",
    "launcher_core.py",
    "app.py",
    "game_manager.py",
    "cachestore.py",
    "translations.py",
    "updater.py",
    "index.html",
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source-root", type=Path)
    parser.add_argument("--output-dir", type=Path)
    return parser.parse_args()


def is_desktop_source(path: Path) -> bool:
    return path.is_dir() and all((path / name).is_file() for name in REQUIRED_SOURCE_FILES)


def find_source_root(explicit: Path | None, project_root: Path) -> Path:
    configured = explicit or os.environ.get("0XSHINKY_SOURCE_DIR")
    if configured:
        source = Path(configured).expanduser().resolve()
        if not is_desktop_source(source):
            missing = [name for name in REQUIRED_SOURCE_FILES if not (source / name).is_file()]
            raise SystemExit(f"Desktop source is incomplete at {source}: missing {', '.join(missing)}")
        return source

    candidates: list[Path] = []
    parent = project_root.parent
    try:
        candidates.extend(path for path in parent.iterdir() if path.is_dir())
    except OSError as error:
        raise SystemExit(f"Could not inspect sibling source folders near {project_root}: {error}") from error

    matches = sorted((path.resolve() for path in candidates if is_desktop_source(path)), key=lambda path: str(path).casefold())
    if len(matches) == 1:
        return matches[0]
    if not matches:
        raise SystemExit(
            "Could not find the desktop 0xshinky source automatically. "
            "Set 0XSHINKY_SOURCE_DIR or pass --source-root."
        )
    names = ", ".join(str(path) for path in matches)
    raise SystemExit(f"Found more than one desktop source ({names}); choose one with --source-root.")


def set_base_href(html: str, href: str) -> str:
    base_tag = f'<base href="{href}">'
    base_pattern = re.compile(r"<base\b[^>]*>", re.IGNORECASE)
    if base_pattern.search(html):
        return base_pattern.sub(base_tag, html, count=1)

    head_pattern = re.compile(r"(<head(?:\s[^>]*)?>)", re.IGNORECASE)
    html, count = head_pattern.subn(lambda match: f"{match.group(1)}\n  {base_tag}", html, count=1)
    if count != 1:
        raise SystemExit("No <head> element found while setting the preview asset base.")
    return html


def copy_web_assets(source_root: Path, android_dir: Path, web_dir: Path) -> set[str]:
    files: dict[str, Path | bytes] = {}
    for path in android_dir.rglob("*"):
        if path.is_file() and not path.is_symlink():
            relative = path.relative_to(android_dir).as_posix()
            # Game and translation data are fetched from desktop-configured feeds at runtime.
            if relative in {"catalog.json", "translations.json"}:
                continue
            files[relative] = path

    html = (source_root / "index.html").read_text(encoding="utf-8-sig")
    referenced_root_files = set()
    for match in re.finditer(r"""(?:src|href|poster)\s*=\s*["']([^"']+)["']""", html, re.IGNORECASE):
        value = match.group(1).strip()
        parsed = urlsplit(value)
        candidate = parsed.path
        if not candidate or parsed.scheme or parsed.netloc or candidate.startswith(("/", "#")) or "/" in candidate or "\\" in candidate:
            continue
        if (source_root / candidate).is_file():
            referenced_root_files.add(candidate)
    referenced_root_files.add("Halloween Pirate Skull Poster.png")
    for name in referenced_root_files:
        path = source_root / name
        if path.is_file():
            files[name] = path

    web_html = set_base_href(html, "/products/web/")
    web_css_tag = '<link rel="stylesheet" href="/products/web-preview.css">'
    if web_css_tag not in web_html:
        base_pattern = re.compile(r"(<base\b[^>]*>)", re.IGNORECASE)
        web_html, count = base_pattern.subn(
            lambda match: f"{match.group(1)}\n  {web_css_tag}", web_html, count=1
        )
        if count != 1:
            raise SystemExit(f"No <base> element found in {source_root / 'index.html'}")

    bridge_tag = '<script src="/products/preview_bridge.js"></script>'
    if bridge_tag not in web_html:
        base_pattern = re.compile(r"(<base\b[^>]*>)", re.IGNORECASE)
        web_html, count = base_pattern.subn(
            lambda match: f"{match.group(1)}\n  {bridge_tag}", web_html, count=1
        )
        if count != 1:
            raise SystemExit(f"No <base> element found in {source_root / 'index.html'}")

    product_links = (
        '<a class="ft-link" href="/desktop/">0xshinky Windows</a>\n'
        '            <a class="ft-link" href="/android/">0xshinky Android</a>'
    )
    footer_column = re.compile(r'(<div class="ft-col">\s*<h3>0xshinky</h3>)', re.IGNORECASE)
    web_html, footer_count = footer_column.subn(r'\1\n            ' + product_links, web_html, count=1)
    if footer_count != 1:
        raise SystemExit(f"Could not find the 0xshinky footer column in {source_root / 'index.html'}")

    web_only_script = '<script src="/products/web-preview.js"></script>'
    if web_only_script not in web_html:
        body_end = re.compile(r"</body\s*>", re.IGNORECASE)
        web_html, script_count = body_end.subn(
            f"  {web_only_script}\n</body>", web_html, count=1
        )
        if script_count != 1:
            raise SystemExit(f"No closing body tag found in {source_root / 'index.html'}")

    files["index.html"] = web_html.encode("utf-8")

    previous_manifest = web_dir.parent / "web-files.manifest.json"
    old_files: set[str] = set()
    if previous_manifest.is_file():
        try:
            old_files = set(json.loads(previous_manifest.read_text(encoding="utf-8")))
        except (OSError, json.JSONDecodeError, TypeError):
            old_files = set()

    web_dir.mkdir(parents=True, exist_ok=True)
    current_files = set(files)
    resolved_web_dir = web_dir.resolve()
    for relative in sorted(old_files - current_files):
        stale = (web_dir / relative).resolve()
        if resolved_web_dir in stale.parents and stale.is_file():
            stale.unlink()

    for relative, value in files.items():
        destination = web_dir / relative
        destination.parent.mkdir(parents=True, exist_ok=True)
        if isinstance(value, bytes):
            destination.write_bytes(value)
        else:
            shutil.copy2(value, destination)

    previous_manifest.write_text(json.dumps(sorted(current_files), indent=2), encoding="utf-8")
    return current_files


def main() -> None:
    args = parse_args()
    project_root = Path(__file__).resolve().parents[1]
    source_root = find_source_root(args.source_root, project_root)
    output_dir = (args.output_dir or Path(__file__).resolve().parent / "public").resolve()
    site_root = Path(__file__).resolve().parent
    output_dir.mkdir(parents=True, exist_ok=True)
    for name in ("index.html",):
        shutil.copy2(site_root / name, output_dir / name)

    products_dir = output_dir / "products"
    android_dir = products_dir / "android"
    web_dir = products_dir / "web"
    bridge_source = Path(__file__).resolve().parent / "public" / "products" / "preview_bridge.js"
    android_assets = project_root / "app" / "src" / "main" / "assets"
    sync_script = project_root / "tools" / "sync_desktop_sources.py"
    python = os.environ.get("0XSHINKY_PYTHON", sys.executable)

    subprocess.run(
        [
            python,
            str(sync_script),
            "--source-root",
            str(source_root),
            "--android-assets",
            str(android_assets),
            "--output",
            str(android_dir),
        ],
        cwd=project_root,
        check=True,
    )

    android_index_path = android_dir / "index.html"
    android_html = android_index_path.read_text(encoding="utf-8")
    android_html = set_base_href(android_html, "/products/android/")
    android_bridge_tag = '<script src="android_bridge.js"></script>'
    preview_bridge_tag = '<script src="/products/preview_bridge.js"></script>'
    if preview_bridge_tag not in android_html:
        if android_bridge_tag not in android_html:
            raise SystemExit("Android source preview is missing the Android bridge script injection.")
        android_html = android_html.replace(android_bridge_tag, android_bridge_tag + "\n  " + preview_bridge_tag, 1)
    deep_link_script = """<script>
  (() => {
    const gameId = new URLSearchParams(window.location.search).get('game');
    if (!/^\\d+$/.test(gameId || '')) return;
    let attempt = 0;
    const openGame = () => {
      const cards = Array.from(document.querySelectorAll('.game-card[data-appid]'));
      if (cards.some(card => card.dataset.appid === gameId) && typeof window.openGameModalByAppId === 'function') {
        window.openGameModalByAppId(gameId);
        return;
      }
      if (attempt++ < 20) window.setTimeout(openGame, 500);
    };
    openGame();
  })();
</script>"""
    if "new URLSearchParams(window.location.search).get('game')" not in android_html:
        android_html = android_html.replace("</body>", deep_link_script + "\n</body>", 1)
    android_index_path.write_text(android_html, encoding="utf-8")

    web_files = copy_web_assets(source_root, android_dir, web_dir)
    preview_bridge_target = products_dir / "preview_bridge.js"
    preview_bridge_target.parent.mkdir(parents=True, exist_ok=True)
    if bridge_source.resolve() != preview_bridge_target.resolve():
        shutil.copy2(bridge_source, preview_bridge_target)

    metadata = {
        "generatedAt": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "products": ["web", "android"],
        "webFileCount": len(web_files),
    }
    (products_dir / "preview-meta.json").write_text(
        json.dumps(metadata, ensure_ascii=False, separators=(",", ":")),
        encoding="utf-8",
    )

    print(
        f"Prepared the shared preview from {source_root.name}: "
        f"web files={len(web_files)}, Android files={sum(1 for p in android_dir.rglob('*') if p.is_file())}."
    )


if __name__ == "__main__":
    main()
