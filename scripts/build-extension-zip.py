"""Packages extension/ into frontend/public/downloads/datapit-extension.zip.

Since v0.4.0 the manifest has no "key" field (detection is id-independent —
the extension announces itself to the DataPit page via announce.js), so this
single build is BOTH the load-unpacked download served on the site AND the
zip you upload to the Chrome Web Store. One file, no variants.

Vite copies public/ verbatim into dist/, so no backend/nginx change is
needed. Re-run after any change under extension/, before the next frontend
build/deploy.
"""
import os
import zipfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "extension")
OUT_DIR = os.path.join(ROOT, "frontend", "public", "downloads")
OUT = os.path.join(OUT_DIR, "datapit-extension.zip")

# Everything Chrome needs to load the extension, plus its README.
INCLUDE_EXT = {".json", ".js", ".html", ".png", ".md"}

os.makedirs(OUT_DIR, exist_ok=True)

count = 0
with zipfile.ZipFile(OUT, "w", zipfile.ZIP_DEFLATED) as zf:
    for dirpath, _dirnames, filenames in os.walk(SRC):
        for name in filenames:
            if os.path.splitext(name)[1].lower() not in INCLUDE_EXT:
                continue
            full = os.path.join(dirpath, name)
            # Nest under one clean top-level folder so "Load unpacked" gets an
            # obviously-named directory once unzipped.
            arcname = os.path.join("datapit-extension", os.path.relpath(full, SRC))
            zf.write(full, arcname)
            count += 1

size_kb = os.path.getsize(OUT) / 1024
print(f"wrote {OUT} ({count} files, {size_kb:.1f} KB)")
