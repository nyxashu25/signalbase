"""Packages extension/ into frontend/public/downloads/datapit-extension.zip
so the Dashboard's "Install extension" flow can serve it as a static file
(Vite copies public/ verbatim into dist/, so no backend or nginx change is
needed). Re-run this after any change under extension/, before the next
frontend build/deploy.
"""
import os
import zipfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "extension")
OUT_DIR = os.path.join(ROOT, "frontend", "public", "downloads")
OUT = os.path.join(OUT_DIR, "datapit-extension.zip")

# Everything Chrome needs to load the extension unpacked, plus its README.
# manifest.json's "key" field pins the extension's id (see
# extension/EXTENSION_ID.md) — it must always be included so a rebuilt zip
# keeps the same id the Dashboard's detector expects.
INCLUDE_EXT = {".json", ".js", ".html", ".png", ".md"}

os.makedirs(OUT_DIR, exist_ok=True)

count = 0
with zipfile.ZipFile(OUT, "w", zipfile.ZIP_DEFLATED) as zf:
    for dirpath, dirnames, filenames in os.walk(SRC):
        for name in filenames:
            if os.path.splitext(name)[1].lower() not in INCLUDE_EXT:
                continue
            full = os.path.join(dirpath, name)
            # Arcname nests everything under one top-level folder so
            # "Load unpacked" gets a clean, obviously-named directory once
            # the user unzips it.
            rel = os.path.relpath(full, SRC)
            arcname = os.path.join("datapit-extension", rel)
            zf.write(full, arcname)
            count += 1

size_kb = os.path.getsize(OUT) / 1024
print(f"wrote {OUT} ({count} files, {size_kb:.1f} KB)")
