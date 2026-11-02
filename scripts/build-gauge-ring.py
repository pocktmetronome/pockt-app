"""Bakes POCKT's tempo gauge into the North Star plate.

The original art carried an irregular mix of thin ticks and LED blocks around the dial. This erases
them from the bezel band and lays in 60 evenly spaced recessed LED cells, then renders the matching
lit sprites. Geometry (shared with lib/front-geometry.ts): centre (469.2, 525), cells at r 328.5,
angles -120..120 every 4 degrees, minus the one under the index pointer.
"""
import numpy as np, cv2, os
from scipy.ndimage import median_filter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'REFERENCE/POCKT_NORTH_STAR_MASTER_PLATE.png')
DST = os.path.join(ROOT, 'REFERENCE/POCKT_NORTH_STAR_MASTER_GAUGE.png')
OUT = os.path.join(ROOT, 'assets/north-star-face/gauge')
C = (469.2, 525.0); RC = 328.5
ANGLES = [a for a in range(-120, 121, 4) if a != 0]
CELL_W, CELL_L = 9.0, 30.0

def clean(im):
    H, W = im.shape[:2]; R = 380; NA = 2880
    pol = cv2.warpPolar(im, (R, NA), C, R, cv2.WARP_POLAR_LINEAR + cv2.INTER_LINEAR)
    bg = pol.copy(); win = int(14 / 360 * NA)
    for c in range(300, 358):
        for ch in range(3):
            col = pol[:, c, ch]; ext = np.concatenate([col[-win:], col, col[:win]])
            bg[:, c, ch] = median_filter(ext, size=win, mode='nearest')[win:-win]
    back = cv2.warpPolar(bg, (W, H), C, R, cv2.WARP_POLAR_LINEAR + cv2.WARP_INVERSE_MAP + cv2.INTER_LINEAR)
    yy, xx = np.mgrid[0:H, 0:W]; r = np.hypot(xx - C[0], yy - C[1]); ang = np.degrees(np.arctan2(xx - C[0], -(yy - C[1])))
    ann = (r >= 305.5) & (r <= 351.5) & (np.abs(ang) > 6.0) & (np.abs(ang) < 128)
    mask = (ann & (np.abs(im - back).max(axis=2) > 10)).astype(np.uint8)
    mask = (cv2.dilate(mask, np.ones((3, 3), np.uint8)) > 0) & ann
    soft = cv2.GaussianBlur(mask.astype(np.float32), (5, 5), 0)
    soft = np.where(ann, soft, 0)[..., None]
    return im * (1 - soft) + back * soft

def capsule_sdf(px, py, w, l):
    """Signed distance to a vertical capsule centred on the origin (width w, length l)."""
    r = w / 2; h = l / 2 - r
    qy = np.clip(py, -h, h)
    return np.hypot(px, py - qy) - r

def bake_cells(im):
    SS = 4; H, W = im.shape[:2]
    out = im.copy()
    for a in ANGLES:
        t = np.radians(a); cx = C[0] + RC * np.sin(t); cy = C[1] - RC * np.cos(t)
        x0, x1 = int(cx - 24), int(cx + 25); y0, y1 = int(cy - 24), int(cy + 25)
        ys, xs = np.mgrid[y0:y1:1 / SS, x0:x1:1 / SS] + 0.5 / SS
        dx, dy = xs - cx, ys - cy
        u = dx * np.cos(t) + dy * np.sin(t)          # across the cell
        v = -(dx * np.sin(t) - dy * np.cos(t))       # radial (outward = negative v)
        d = capsule_sdf(u, v, CELL_W, CELL_L)
        cover = np.clip(0.5 - d, 0, 1)
        rim = np.clip(1 - np.abs(d + 0.6) / 1.1, 0, 1)  # thin lip just inside the edge
        lower = np.clip(v / (CELL_L / 2), 0, 1)          # inward side catches light
        def down(x):
            return x.reshape(y1 - y0, SS, x1 - x0, SS).mean(axis=(1, 3))
        cover, rim, lower = down(cover), down(rim), down(lower * rim)
        patch = out[y0:y1, x0:x1]
        well = np.array([6, 7, 9], np.float32)  # BGR, near black with a cool cast
        patch[:] = patch * (1 - cover[..., None] * 0.92) + well * cover[..., None] * 0.92
        patch[:] = patch + np.array([60, 92, 128], np.float32) * (lower * 0.55)[..., None]
        out[y0:y1, x0:x1] = patch
    return out

def sprite(kind, scale=6):
    """Lit LED sprite, 48 x 72 master px, drawn upright (outward = up)."""
    Wm, Hm = 48, 72
    ys, xs = np.mgrid[0:Hm * scale, 0:Wm * scale] / scale + 0.5 / scale
    u, v = xs - Wm / 2, ys - Hm / 2
    d = capsule_sdf(u, v, CELL_W - 1.6, CELL_L - 1.6)
    core = np.clip(0.5 - d * 1.0, 0, 1)
    halo_r = 9.0 if kind == 'head' else 6.0
    halo = np.exp(-np.clip(d, 0, None) ** 2 / (2 * halo_r ** 2)) * (d > -0.5)
    hot = np.clip(1 - np.abs(u) / (CELL_W / 2), 0, 1) ** 1.6 * core
    if kind == 'head':
        cA, cB, haloC, ha = (255, 246, 226), (255, 176, 74), (255, 150, 46), 0.62
    else:
        cA, cB, haloC, ha = (255, 214, 150), (246, 142, 40), (255, 132, 30), 0.42
    cA, cB, haloC = [np.array(c, np.float32) for c in (cA, cB, haloC)]
    col = cB * (1 - hot[..., None]) + cA * hot[..., None]
    alpha_core = core; alpha_halo = halo * ha * (1 - core)
    a = np.clip(alpha_core + alpha_halo, 0, 1)
    rgb = (col * alpha_core[..., None] + haloC * alpha_halo[..., None]) / np.maximum(a[..., None], 1e-6)
    img = np.dstack([rgb[..., ::-1], a * 255]).astype(np.float32)
    small = cv2.resize(img, (Wm * 3, Hm * 3), interpolation=cv2.INTER_AREA)
    cv2.imwrite(os.path.join(OUT, f'led-{kind}.png'), np.clip(small, 0, 255).astype(np.uint8))

if __name__ == '__main__':
    im = cv2.imread(SRC).astype(np.float32)
    im = bake_cells(clean(im))
    cv2.imwrite(DST, np.clip(im, 0, 255).astype(np.uint8))
    os.makedirs(OUT, exist_ok=True)
    sprite('on'); sprite('head')
    print('angles', len(ANGLES))
