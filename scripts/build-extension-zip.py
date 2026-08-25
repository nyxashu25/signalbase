"""Packages extension/ into two zips under frontend/public/downloads/:

  datapit-extension.zip           -- load-unpacked build (Dashboard download).
                                     Keeps manifest.json's "key" field so it
                                     always loads with the pinned id the
                                     Dashboard detector expects.

  datapit-extension-webstore.zip  -- Chrome Web Store submission build. The
                                     store REJECTS the "key" field ("key
                                     field is not allowed in manifest"), so
                                     this build strips it. The store assigns
                                     its own id on publish — update the
                                     Dashboard detector to that id afterwards.

Vite copies public/ verbatim into dist/, so no backend/nginx change is
needed. Re-run after any change under extension/, before the next frontend
build/deploy.
"""
import json
import os
import zipfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "extension")
# The keyed load-unpacked build is served to end users (Dashboard download).
OUT_DIR = os.path.join(ROOT, "frontend", "public", "downloads")
# The keyless Web Store build is NOT served: a user who loaded a keyless
# build unpacked would get a random id the Dashboard detector can't see. It
# lives here for the maintainer to upload to the store.
STORE_OUT_DIR = os.path.join(ROOT, "extension-build")

# Everything Chrome needs to load the extension, plus its README.
INCLUDE_EXT = {".json", ".js", ".html", ".png", ".md"}
# Manifest fields the Chrome Web Store forbids in an uploaded package.
STORE_FORBIDDEN_MANIFEST_KEYS = {"key", "update_url"}

os.makedirs(OUT_DIR, exist_ok=True)
os.makedirs(STORE_OUT_DIR, exist_ok=True)


def collect_files():
    for dirpath, _dirnames, filenames in os.walk(SRC):
        for name in filenames:
            if os.path.splitext(name)[1].lower() in INCLUDE_EXT:
                yield os.path.join(dirpath, name)


def build(out_dir, out_name, strip_store_keys):
    out = os.path.join(out_dir, out_name)
    count = 0
    with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED) as zf:
        for full in collect_files():
            rel = os.path.relpath(full, SRC)
            # Nest under one clean top-level folder so "Load unpacked" gets an
            # obviously-named directory once unzipped.
            arcname = os.path.join("datapit-extension", rel)
            if strip_store_keys and rel == "manifest.json":
                manifest = json.load(open(full, encoding="utf-8"))
                for k in STORE_FORBIDDEN_MANIFEST_KEYS:
                    manifest.pop(k, None)
                zf.writestr(arcname, json.dumps(manifest, indent=2))
            else:
                zf.write(full, arcname)
            count += 1
    size_kb = os.path.getsize(out) / 1024
    print(f"wrote {out} ({count} files, {size_kb:.1f} KB)")


build(OUT_DIR, "datapit-extension.zip", strip_store_keys=False)
build(STORE_OUT_DIR, "datapit-extension-webstore.zip", strip_store_keys=True)
