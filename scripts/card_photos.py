#!/usr/bin/env python3
"""Build the card photographs in public/images/cards/ (numpy + Pillow).

NEXTPredict has no photography of its own yet (the 2026 summit runs 22-23
October 2026), so every card picture is one of:
- NEXT's own New York 2026 event photography: the originals in the sibling
  repo (next-summit-new-york/public/images, the files named "shaunspiteri")
  and the NEXT Summit New York 2026 "No Watermarks" set on SharePoint
  (set NY_2026_SET to the folder holding the files named below);
- Convene's published imagery of 30 Hudson Yards, the 2026 venue (set
  CONVENE to a folder of the files in CONVENE_URLS, from Convene's site).
Each is cropped, and the 2026 stage and hub partners' logos on the stage
walls are softened out (SOFTEN: the wall's shading is fitted to the box and
the logo filled from the wall around it, heads and hair protected), so no
2026 sponsor reads as a NEXTPredict partner. Output: 960px webp, plus a
1600px -wide copy for the three full-row cards.

    NY_2026_SET=/path/to/set CONVENE=/path/to/convene python3 scripts/card_photos.py [key ...]

With keys, only those photos are rebuilt.
"""
import os
import sys

import numpy as np
from PIL import Image, ImageOps

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
OUT = os.path.join(ROOT, 'public', 'images', 'cards') + os.sep
NY = os.environ.get('NY_PHOTOS', os.path.join(ROOT, '..', 'next-summit-new-york', 'public', 'images')) + os.sep
SP = os.environ.get('NY_2026_SET', '') + os.sep
CV = os.environ.get('CONVENE', '') + os.sep
CONVENE_URLS = 'https://images.ctfassets.net/rpinqlxtcitg/ (Convene, 30 Hudson Yards venue pages; one asset path per file)'

# key: (source, crop as fractions x0, y0, x1, y1, a PIX key, or None, full-row card)
JOBS = {
  'main-hall-side':   (SP + 'd1-047-main-hall-side.jpg', (0, 0.49, 0.62, 1), True),
  'main-hall-stage':  (SP + 'd1-045-main-hall-wide.jpg', (0.28, 0.47, 1, 1), True),
  'nw-packed':        (SP + 'nw1-049-networking-packed.jpg', None, True),
  'nw-bar':           (SP + 'nw2-009-bar-packed.jpg', None, False),
  'nw-smiles':        (SP + 'nw1-030-networking-smiles.jpg', None, False),
  'vip':              (NY + '051- shaunspiteri - 2. Networking Drinks - Emerging Verticals - SSR10428.jpg', None, False),
  'leadership-speaker': (SP + 'd1-022-leadership-speaker.jpg', (0.43, 0.1, 1, 1), False),
  'panel-five':       (NY + '036- shaunspiteri - 5. Day 1 Summit - SSR12932.jpg', (0.38, 0, 1, 1), False),
  'main-panel-4':     (SP + 'd2-127-SSR19393-main-panel-4.jpg', (0.27, 0.14, 1, 0.84), False),
  'main-panel-wide':  (SP + 'd1-055-SSR13086-main-panel-wide.jpg', (0, 0.2, 1, 0.9), False),
  'hub-room':         (SP + 'd2-018-investment-hub-room.jpg', None, False),
  'solo-presenter':   (SP + 'd1-111-solo-presenter.jpg', 'ny111', False),
  'hub-mic':          (SP + 'd1-149-SSR14256-hub-mic.jpg', None, False),
  'hub-mic-2':        (SP + 'd1-173-SSR14559-hub-mic-2.jpg', None, False),
  'hub-stage':        (SP + 'd1-105-investment-stage.jpg', 'ny105', False),
  'crowd':            (NY + '037- shaunspiteri - 5. Day 1 Summit - SSR12940.jpg', None, False),
  'audience-smile':   (SP + 'd1-065-audience-smile.jpg', None, False),
  'audience-red':     (SP + 'd0-188-focus-audience.jpg', None, False),
  'intros':           (SP + 'pre-043-sofa-handshake.jpg', 'ny043', False),
  'table-talk':       (SP + 'nw2-059-table-talk.jpg', None, False),
  'media-camera':     (SP + 'd2-076-media-camera.jpg', 'ny076', False),
  'venue-theatre':    (CV + '30_Hudson_Yards_Highline_Hall_set_in_Theatre.jpeg', None, False),
  'venue-hall':       (CV + '30_Hudson_Yards_-_Highline_Hall.jpg', None, False),
  'venue-hub':        (CV + '30_Hudson_Yards_Hudson_Hub.jpeg', None, False),
  'venue-studio':     (CV + '30_Hudson_Yards_Pier_Studio_set_in_Cresent_Rounds.jpeg', None, False),
  'venue-boardroom':  (CV + '30_Hudson_Yards_-_River_Park_Boardroom.jpg', None, False),
  'venue-boardroom-long': (CV + '30_Hudson_Yards_River_Park_Boardroom__4.jpeg', None, False),
  'venue-boardroom-round': (CV + '30_Hudson_Yards_River_Walk_Boardroom.jpeg', None, False),
  'venue-boardroom-four': (CV + '30_Hudson_Yards_River_Walk_Boardroom_5.jpeg', None, False),
  'venue-gallery':    (CV + '30_Hudson_Yards_-_Gallery.jpg', None, False),
  'venue-library':    (CV + '30_Hudson_Yards_Chelsea_Library.jpeg', None, False),
  'venue-lounge':     (CV + '30_Library.jpg', None, False),
  'venue-walkway':    (CV + '30_Hudson_Yards_-_Walkway_to_Highline_Hall.jpg', None, False),
  'venue-entrance':   (CV + '30_Hudson_Yards_-_Entrance.jpg', None, False),
  'venue-welcome':    (CV + '30_Hudson_Yards_-_Welcome_Desk.jpg', None, False),
}

# measured crops of portrait originals, in source pixels
PIX = {'ny111': (0, 880, 1998, 2212), 'ny105': (450, 300, 2550, 1700), 'ny043': (200, 850, 2000, 2050), 'ny076': (0, 950, 2000, 2283)}

SOFTEN = {
  'main-hall-side': [
    ((250, 74, 322, 126), [], {}), ((332, 76, 438, 115), [], {}), ((694, 84, 762, 109), [], {}),
    ((630, 106, 694, 164), [(600, 134, 650, 190, 'warm')], {}),
    ((688, 116, 826, 154), [(742, 114, 770, 190, 'warm')], {}),
  ],
  'main-hall-stage': [
    ((1006, 30, 1064, 50), [], {}),
    ((948, 52, 1122, 99), [('e', 1097, 89, 11.5, 18), (1080, 96, 1125, 110)], {}),
    ((1357, 27, 1416, 61), [], {}), ((1430, 23, 1522, 52), [], {}), ((1826, 0, 1912, 22), [], {}),
    ((1738, 36, 1816, 128), [], {}), ((1810, 54, 2008, 118), [], {}),
  ],
  'main-panel-4': [
    ((0, 185, 566, 326), [], {}),
    ((1925, 338, 2190, 642), [(1890, 556, 1962, 642, 'warm')], {}),
  ],
  'hub-room': [((1245, 792, 1590, 868), [], {})],
  'hub-stage': [((1052, 611, 1116, 640), [], {}), ((1140, 611, 1251, 642), [], {})],
  'main-panel-wide': [
    ((858, 271, 1040, 299), [], {}), ((858, 316, 1168, 414), [], {}), ((1316, 261, 1810, 379), [], {}),
  ],
}


def _plane(ys, xs, vals):
    A = np.c_[xs, ys, np.ones_like(xs)]
    coef, *_ = np.linalg.lstsq(A, vals, rcond=None)
    return coef


def soften(im, box, protect=(), T=12.0, grow=3, iters=1200, seed=7, grain=0.5):
    """Soften a logo on a plain wall. Fit the wall's shading to the box border,
    mark what differs from it by more than T, and fill those pixels by harmonic
    (Laplace) interpolation from the untouched wall around them, with a little
    of the wall's own grain. Protected shapes (a head, hair) are never touched:
    a rectangle, a rectangle whose 'warm' pixels only are kept, or an ellipse
    ('e', cx, cy, rx, ry). Boxes are in the pixels of the cropped image."""
    a = np.asarray(im).astype(np.float64)
    x0, y0, x1, y1 = box
    m = 3  # margin that holds the boundary values
    X0, Y0, X1, Y1 = max(0, x0 - m), max(0, y0 - m), min(a.shape[1], x1 + m), min(a.shape[0], y1 + m)
    sub = a[Y0:Y1, X0:X1].copy()
    h, w = sub.shape[:2]
    yy, xx = np.mgrid[0:h, 0:w]
    inner = (xx >= x0 - X0) & (xx < x1 - X0) & (yy >= y0 - Y0) & (yy < y1 - Y0)
    ring = ~inner
    prot = np.zeros((h, w), bool)
    warm = (sub[..., 0] - sub[..., 2]) > 8  # skin and hair: redder than blue
    for pr in protect:
        if pr[0] == 'e':  # ('e', cx, cy, rx, ry): an ellipse, kept whole (a head)
            _, cx, cy, rx, ry = pr
            prot |= (((xx + X0 - cx) / rx) ** 2 + ((yy + Y0 - cy) / ry) ** 2) <= 1.0
            continue
        px0, py0, px1, py1 = pr[:4]
        r = (xx >= px0 - X0) & (xx < px1 - X0) & (yy >= py0 - Y0) & (yy < py1 - Y0)
        # a fifth item 'warm' protects only the warm pixels in the rectangle,
        # so a neutral or blue logo behind a head can still go
        prot |= (r & warm) if len(pr) > 4 and pr[4] == 'warm' else r
    use = ring & ~prot
    # robust plane fit of the wall per channel, from the ring
    bg = np.zeros_like(sub)
    for ch in range(3):
        v = sub[..., ch][use]; ys = yy[use].astype(float); xs = xx[use].astype(float)
        keep = np.ones(v.shape, bool)
        for _ in range(3):
            coef = _plane(ys[keep], xs[keep], v[keep])
            res = v - (coef[0] * xs + coef[1] * ys + coef[2])
            s = np.std(res[keep]) + 1e-6
            keep = np.abs(res) < 2.5 * s
        bg[..., ch] = coef[0] * xx + coef[1] * yy + coef[2]
    dist = np.sqrt(((sub - bg) ** 2).mean(axis=-1))
    mask = inner & (dist > T) & ~prot
    for _ in range(grow):
        g = mask.copy()
        g[1:] |= mask[:-1]; g[:-1] |= mask[1:]; g[:, 1:] |= mask[:, :-1]; g[:, :-1] |= mask[:, 1:]
        mask = g & inner & ~prot
    out = sub.copy()
    out[mask] = bg[mask]
    # a protected pixel (a head, a jacket) is not a boundary value: the fill
    # reads only the wall around it, so nothing smears in from a person
    v = (~prot).astype(float)[..., None]
    den = np.roll(v, 1, 0) + np.roll(v, -1, 0) + np.roll(v, 1, 1) + np.roll(v, -1, 1)
    ok = mask & (den[..., 0] > 0)
    for _ in range(iters):
        ov = out * v
        num = np.roll(ov, 1, 0) + np.roll(ov, -1, 0) + np.roll(ov, 1, 1) + np.roll(ov, -1, 1)
        out[ok] = (num / np.maximum(den, 1e-9))[ok]
    # the wall's grain, from the ring's residual
    res = (sub - bg)[use & (dist < T)]
    sd = 1.4826 * np.median(np.abs(res - np.median(res, axis=0)), axis=0) if res.size else np.zeros(3)
    rng = np.random.default_rng(seed)
    noise = rng.normal(0, 1, (h, w, 1)) * float(sd.mean()) * grain
    out[mask] += noise[mask]
    a[Y0:Y1, X0:X1] = out
    return Image.fromarray(np.clip(a, 0, 255).astype(np.uint8)), int(mask.sum())


def save(im, path, width, q=72, cap=160_000):
    if im.width > width:
        im = im.resize((width, round(im.height * width / im.width)), Image.LANCZOS)
    for quality in (q, 66, 60, 54):
        im.save(path, 'WEBP', quality=quality, method=6)
        if os.path.getsize(path) <= cap: break
    return im.size, os.path.getsize(path), quality


def main(only):
    for key, (src, box, featured) in JOBS.items():
        if only and key not in only:
            continue
        im = ImageOps.exif_transpose(Image.open(src)).convert('RGB')
        if isinstance(box, str):
            im = im.crop(PIX[box])
        elif box:
            w, h = im.size
            im = im.crop((round(box[0] * w), round(box[1] * h), round(box[2] * w), round(box[3] * h)))
        for sbox, prot, opts in SOFTEN.get(key, []):
            im, _ = soften(im, sbox, prot, **opts)
        size, n, q = save(im, OUT + key + '.webp', 960)
        line = f'{key:24s} {size} {n / 1024:6.1f} KB q{q}'
        if featured:
            size2, n2, q2 = save(im, OUT + key + '-wide.webp', 1600, cap=260_000)
            line += f' | wide {size2} {n2 / 1024:6.1f} KB q{q2}'
        print(line)


if __name__ == '__main__':
    sys.dont_write_bytecode = True
    main(set(sys.argv[1:]))
