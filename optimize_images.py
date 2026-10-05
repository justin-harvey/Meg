#!/usr/bin/env python3
"""Generate responsive WebP derivatives for every <img>-referenced image and
rewrite index.html to use them. Grid thumbnails get the small size; data-src
(lightbox) and standalone images get the large size. Absolute meta/schema
image URLs are left untouched. No upscaling."""
import os, re, subprocess, sys, urllib.parse

ROOT = os.path.dirname(os.path.abspath(__file__))
IMG  = os.path.join(ROOT, "images")
OPT  = os.path.join(IMG, "opt")
HTML = os.path.join(ROOT, "index.html")
SM_BOX, LG_BOX = 400, 1400
SM_Q,  LG_Q   = 80, 82

os.makedirs(OPT, exist_ok=True)

def slug(path):
    """images/Foo Bar.JPG -> Foo-Bar"""
    base = os.path.basename(path)
    stem = re.sub(r'\.(jpe?g|png)$', '', base, flags=re.I)
    return re.sub(r'[^A-Za-z0-9_.-]+', '-', stem)

def disk_path(html_ref):
    """resolve an as-written HTML ref (may contain %20) to a file on disk"""
    rel = urllib.parse.unquote(html_ref)          # images/hero%20image.jpg -> images/hero image.jpg
    return os.path.join(ROOT, rel)

def opt_ref(html_ref, size):
    return "images/opt/%s-%s.webp" % (slug(html_ref), size)

def encode(src, dst, box, q):
    vf = ("scale=w='min(%d,iw)':h='min(%d,ih)':"
          "force_original_aspect_ratio=decrease" % (box, box))
    subprocess.run(
        ["ffmpeg", "-y", "-loglevel", "error", "-i", src,
         "-vf", vf, "-c:v", "libwebp", "-preset", "photo", "-quality", str(q), dst],
        check=True)

html = open(HTML, encoding="utf-8").read()

# collect every images/... ref used in src="" or data-src="" (not images/opt/)
refs = set(re.findall(r'(?:data-)?src="(images/(?!opt/)[^"]+)"', html))
missing, built = [], {}
for ref in sorted(refs):
    src = disk_path(ref)
    if not os.path.isfile(src):
        missing.append(ref); continue
    sm = os.path.join(ROOT, opt_ref(ref, "sm"))
    lg = os.path.join(ROOT, opt_ref(ref, "lg"))
    encode(src, sm, SM_BOX, SM_Q)
    encode(src, lg, LG_BOX, LG_Q)
    built[ref] = (os.path.getsize(src), os.path.getsize(sm), os.path.getsize(lg))

if missing:
    print("WARNING: referenced but not on disk (left unchanged):")
    for m in missing: print("  ", m)

# collision check
seen = {}
for ref in built:
    for size in ("sm", "lg"):
        o = opt_ref(ref, size)
        if o in seen and seen[o] != ref:
            print("COLLISION:", o, "<-", seen[o], "and", ref)
        seen[o] = ref

# ---- rewrite HTML ----
def repl_block(m):
    return (m.group(1) + opt_ref(m.group(2), "lg") + m.group(3)
            + opt_ref(m.group(4), "sm") + m.group(5))

# 1) photo-thumb blocks: div data-src -> lg, inner img src -> sm
block = re.compile(
    r'(<div class="photo-thumb[^"]*" data-src=")(images/(?!opt/)[^"]+)'
    r'(" data-label="[^"]*">\s*<img src=")(images/(?!opt/)[^"]+)(")', re.S)
html, n_block = block.subn(repl_block, html)

# 2) any remaining standalone <img src="images/..."> -> lg
html, n_img = re.subn(
    r'(<img[^>]*\bsrc=")(images/(?!opt/)[^"]+)(")',
    lambda m: m.group(1) + opt_ref(m.group(2), "lg") + m.group(3), html)

# 3) any remaining data-src="images/..." -> lg
html, n_ds = re.subn(
    r'(\bdata-src=")(images/(?!opt/)[^"]+)(")',
    lambda m: m.group(1) + opt_ref(m.group(2), "lg") + m.group(3), html)

open(HTML, "w", encoding="utf-8").write(html)

# ---- report ----
tot_src = sum(v[0] for v in built.values())
tot_sm  = sum(v[1] for v in built.values())
tot_lg  = sum(v[2] for v in built.values())
print("\nimages converted : %d" % len(built))
print("rewrites         : %d thumb-blocks, %d standalone <img>, %d data-src" % (n_block, n_img, n_ds))
print("originals total  : %6.1f MB" % (tot_src/1e6))
print("new -sm total    : %6.1f MB  (grid/carousel initial load)" % (tot_sm/1e6))
print("new -lg total    : %6.1f MB  (lightbox, loaded on demand)" % (tot_lg/1e6))
