"""Turn the raw downloads in tools/raw/ into game-ready data in public/data/.

Outputs:
  public/data/aerial.jpg   ground texture
  public/data/map.json     heightfield, roads, houses, pools, trees
  tools/raw/debug_map.jpg  everything drawn over the aerial, for eyeballing alignment
"""
import base64
import json
import math
import os
import shutil

import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage as ndi

from world import HALF_H, HALF_W, to_local

HERE = os.path.dirname(os.path.abspath(__file__))
RAW = os.path.join(HERE, "raw")
OUT = os.path.join(HERE, "..", "public", "data")
ROAD_WIDTH = {"residential": 6.4, "service": 3.4, "path": 1.6}
HEIGHT_STEP = 2  # metres between heightfield samples
rng = np.random.default_rng(1136)


# ---------------------------------------------------------------- roads
def load_roads():
    d = json.load(open(os.path.join(RAW, "osm.json")))
    nodes = {e["id"]: e for e in d["elements"] if e["type"] == "node"}
    roads = []
    for e in d["elements"]:
        tags = e.get("tags", {})
        if e["type"] != "way" or "highway" not in tags:
            continue
        kind = tags["highway"]
        if kind not in ROAD_WIDTH:
            continue
        pts = [to_local(nodes[n]["lon"], nodes[n]["lat"]) for n in e["nodes"]]
        roads.append({
            "name": tags.get("name", ""),
            "kind": kind,
            "width": ROAD_WIDTH[kind],
            "pts": [[round(x, 1), round(z, 1)] for x, z in pts],
        })
    return roads


# ------------------------------------------------------------ buildings
def convex_hull(pts):
    pts = sorted(set(map(tuple, pts)))
    if len(pts) <= 2:
        return pts

    def cross(o, a, b):
        return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])

    lower, upper = [], []
    for p in pts:
        while len(lower) >= 2 and cross(lower[-2], lower[-1], p) <= 0:
            lower.pop()
        lower.append(p)
    for p in reversed(pts):
        while len(upper) >= 2 and cross(upper[-2], upper[-1], p) <= 0:
            upper.pop()
        upper.append(p)
    return lower[:-1] + upper[:-1]


def poly_area(pts):
    a = 0
    for i in range(len(pts)):
        x1, y1 = pts[i]
        x2, y2 = pts[(i + 1) % len(pts)]
        a += x1 * y2 - x2 * y1
    return abs(a) / 2


def min_area_box(pts):
    """Minimum-area oriented bounding box: (cx, cz, half_u, half_v, angle), half_u >= half_v."""
    hull = convex_hull(pts)
    best = None
    for i in range(len(hull)):
        x1, y1 = hull[i]
        x2, y2 = hull[(i + 1) % len(hull)]
        ang = math.atan2(y2 - y1, x2 - x1)
        c, s = math.cos(ang), math.sin(ang)
        us = [x * c + y * s for x, y in hull]
        vs = [-x * s + y * c for x, y in hull]
        w, h = max(us) - min(us), max(vs) - min(vs)
        if best is None or w * h < best[0]:
            cu, cv = (max(us) + min(us)) / 2, (max(vs) + min(vs)) / 2
            best = (w * h, cu * c - cv * s, cu * s + cv * c, w / 2, h / 2, ang)
    _, cx, cz, hu, hv, ang = best
    if hv > hu:
        hu, hv, ang = hv, hu, ang + math.pi / 2
    return cx, cz, hu, hv, ang


def load_buildings():
    d = json.load(open(os.path.join(RAW, "structures.geojson")))
    out = []
    for f in d["features"]:
        g = f["geometry"]
        rings = g["coordinates"] if g["type"] == "Polygon" else g["coordinates"][0]
        pts = [to_local(lon, lat) for lon, lat in rings[0][:-1]]
        area = poly_area(pts)
        if area < 25:
            continue  # sheds
        cx, cz, hu, hv, ang = min_area_box(pts)
        if abs(cx) > HALF_W - 8 or abs(cz) > HALF_H - 8:
            continue
        # Shrink the box to the footprint's true area so L-shaped houses don't grow.
        k = math.sqrt(min(1.0, area / (4 * hu * hv)))
        hu, hv = hu * k, hv * k
        stories = 2 if (rng.random() < 0.3 and area < 260) else 1
        out.append({
            "cx": round(cx, 2), "cz": round(cz, 2),
            "hu": round(hu, 2), "hv": round(hv, 2), "ang": round(ang, 4),
            "stories": stories,
            "style": int(rng.integers(0, 6)),
        })
    return out


# ---------------------------------------------------------------- pools
def load_pools(rgb):
    """Bright cyan blobs in the aerial are swimming pools."""
    r, g, b = [rgb[..., i].astype(np.int32) for i in range(3)]
    mask = (b > 150) & (g > 140) & (b - r > 55) & (g - r > 30)
    mask = ndi.binary_closing(mask, iterations=2)
    lab, n = ndi.label(mask)
    px = (2 * HALF_W) / rgb.shape[1]
    pools = []
    for i in range(1, n + 1):
        ys, xs = np.nonzero(lab == i)
        area = len(xs) * px * px
        if area < 9:
            continue
        cx, cy = xs.mean(), ys.mean()
        cov = np.cov(np.stack([xs - cx, ys - cy]))
        ev, evec = np.linalg.eigh(cov)
        major = evec[:, 1]
        ang = math.atan2(major[1], major[0])
        # ellipse radii from the variance of a uniform ellipse (var = r^2 / 4), padded slightly
        ru = 2 * math.sqrt(ev[1]) * px + 0.4
        rv = 2 * math.sqrt(ev[0]) * px + 0.4
        if ru > 12:
            continue  # not a backyard pool
        pools.append({
            "cx": round(cx * px - HALF_W, 2), "cz": round(cy * px - HALF_H, 2),
            "ru": round(ru, 2), "rv": round(rv, 2), "ang": round(ang, 4),
        })
    return pools


# ---------------------------------------------------------------- trees
def seg_dist(px, pz, ax, az, bx, bz):
    dx, dz = bx - ax, bz - az
    L2 = dx * dx + dz * dz
    t = 0 if L2 == 0 else max(0, min(1, ((px - ax) * dx + (pz - az) * dz) / L2))
    return math.hypot(px - (ax + t * dx), pz - (az + t * dz))


def canopy_mask(rgb_small, nir):
    N, R = nir[..., 0], nir[..., 1]
    ndvi = (N - R) / (N + R + 1e-3)
    bright = rgb_small.mean(axis=2)
    m = ndi.uniform_filter(bright, 9)
    m2 = ndi.uniform_filter(bright * bright, 9)
    std = np.sqrt(np.maximum(m2 - m * m, 0))
    mask = (ndvi > 0.2) & ((m < 112) | (std > 9))
    mask = ndi.binary_opening(mask, iterations=2)
    return ndi.binary_closing(mask, iterations=3)


def place_trees(mask, roads, buildings):
    h, w = mask.shape
    px = (2 * HALF_W) / w  # metres per pixel
    dist = ndi.distance_transform_edt(mask) * px

    # where a trunk may stand: under canopy, off the pavement, outside houses
    allowed = Image.new("L", (w, h), 0)
    allowed.paste(Image.fromarray((mask * 255).astype(np.uint8)))
    draw = ImageDraw.Draw(allowed)
    to_px = lambda x, z: ((x + HALF_W) / px, (z + HALF_H) / px)
    for r in roads:
        width = int((r["width"] + 2.4) / px)
        draw.line([to_px(x, z) for x, z in r["pts"]], fill=0, width=width, joint="curve")
    for b in buildings:
        c, s = math.cos(b["ang"]), math.sin(b["ang"])
        hu, hv = b["hu"] + 1.5, b["hv"] + 1.5
        corners = [(b["cx"] + u * c - v * s, b["cz"] + u * s + v * c)
                   for u, v in ((-hu, -hv), (hu, -hv), (hu, hv), (-hu, hv))]
        draw.polygon([to_px(x, z) for x, z in corners], fill=0)
    allowed = np.array(allowed) > 0

    ys, xs = np.nonzero(allowed[::3, ::3])
    ys, xs = ys * 3 + rng.integers(0, 3, len(ys)), xs * 3 + rng.integers(0, 3, len(xs))
    ys, xs = np.clip(ys, 0, h - 1), np.clip(xs, 0, w - 1)
    keep = allowed[ys, xs]
    ys, xs = ys[keep], xs[keep]
    order = np.argsort(-(dist[ys, xs] + rng.random(len(ys)) * 0.8))

    cell = 14.0
    grid = {}
    trees = []
    for i in order:
        x, z = xs[i] * px - HALF_W, ys[i] * px - HALF_H
        if abs(x) > HALF_W - 3 or abs(z) > HALF_H - 3:
            continue
        r = float(np.clip(dist[ys[i], xs[i]] * 1.15, 2.2, 6.5))
        gx, gz = int(x // cell), int(z // cell)
        ok = True
        for ax in (gx - 1, gx, gx + 1):
            for az in (gz - 1, gz, gz + 1):
                for (tx, tz, tr) in grid.get((ax, az), ()):
                    if math.hypot(tx - x, tz - z) < 0.82 * (r + tr):
                        ok = False
                        break
                if not ok:
                    break
            if not ok:
                break
        if not ok:
            continue
        grid.setdefault((gx, gz), []).append((x, z, r))
        u = rng.random()
        if r <= 3.6 and u < 0.3:
            kind, height, bottom = 2, 2.6 + 1.8 * r + rng.random(), 1.0  # bushy, low limbs
        elif u > 0.82:
            kind, height = 1, 9 + 2.2 * r + rng.random() * 4  # pine
            bottom = height * 0.38
        else:
            kind, height = 0, 3.2 + 2.4 * r + rng.random() * 2.2  # broadleaf
            bottom = height - 1.75 * r
        trees.append([round(x, 1), round(z, 1), round(r, 1), round(height, 1), round(bottom, 1), kind])
    return trees


# ------------------------------------------------------------ heightmap
def load_height():
    el = np.array(Image.open(os.path.join(RAW, "elevation.tif"))).astype(np.float32)
    el = ndi.gaussian_filter(el, 1.2)
    grid = el[::HEIGHT_STEP, ::HEIGHT_STEP]
    lo, hi = float(grid.min()), float(grid.max())
    q = np.round((grid - lo) / (hi - lo) * 65535).astype("<u2")
    return {
        "w": grid.shape[1], "h": grid.shape[0], "step": HEIGHT_STEP,
        "min": round(lo, 3), "max": round(hi, 3),
        "data": base64.b64encode(q.tobytes()).decode("ascii"),
    }


# ---------------------------------------------------------------- debug
def debug_image(rgb_small, roads, buildings, pools, trees):
    im = Image.fromarray(rgb_small.astype(np.uint8))
    draw = ImageDraw.Draw(im)
    px = (2 * HALF_W) / im.width
    to_px = lambda x, z: ((x + HALF_W) / px, (z + HALF_H) / px)
    for r in roads:
        draw.line([to_px(x, z) for x, z in r["pts"]], fill=(255, 255, 255), width=2)
    for b in buildings:
        c, s = math.cos(b["ang"]), math.sin(b["ang"])
        corners = [(b["cx"] + u * c - v * s, b["cz"] + u * s + v * c)
                   for u, v in ((-b["hu"], -b["hv"]), (b["hu"], -b["hv"]), (b["hu"], b["hv"]), (-b["hu"], b["hv"]))]
        draw.polygon([to_px(x, z) for x, z in corners], outline=(255, 40, 40) if b["stories"] == 1 else (255, 160, 0))
    for p in pools:
        x, y = to_px(p["cx"], p["cz"])
        r = p["ru"] / px
        draw.ellipse([x - r, y - r, x + r, y + r], outline=(0, 255, 255), width=2)
    for x, z, r, hgt, bottom, kind in trees:
        cx, cy = to_px(x, z)
        rr = r / px
        col = [(120, 255, 120), (0, 140, 255), (255, 255, 0)][kind]
        draw.ellipse([cx - rr, cy - rr, cx + rr, cy + rr], outline=col)
        draw.point([cx, cy], fill=(255, 255, 255))
    im.save(os.path.join(RAW, "debug_map.jpg"), quality=88)


def main():
    os.makedirs(OUT, exist_ok=True)
    aerial = Image.open(os.path.join(RAW, "aerial.jpg")).convert("RGB")
    rgb = np.array(aerial)
    nir = np.array(Image.open(os.path.join(RAW, "nir.png")).convert("RGB")).astype(np.float32)
    rgb_small = np.array(aerial.resize((nir.shape[1], nir.shape[0]), Image.BILINEAR)).astype(np.float32)

    roads = load_roads()
    buildings = load_buildings()
    pools = load_pools(rgb)
    trees = place_trees(canopy_mask(rgb_small, nir), roads, buildings)
    height = load_height()

    data = {
        "world": {"halfW": HALF_W, "halfH": HALF_H},
        "height": height,
        "roads": roads,
        "buildings": buildings,
        "pools": pools,
        "trees": trees,
    }
    with open(os.path.join(OUT, "map.json"), "w") as f:
        json.dump(data, f, separators=(",", ":"))
    shutil.copyfile(os.path.join(RAW, "aerial.jpg"), os.path.join(OUT, "aerial.jpg"))
    debug_image(rgb_small, roads, buildings, pools, trees)
    kinds = [t[5] for t in trees]
    print(f"roads {len(roads)}  buildings {len(buildings)}  pools {len(pools)}  "
          f"trees {len(trees)} (broadleaf {kinds.count(0)}, pine {kinds.count(1)}, bushy {kinds.count(2)})")
    print(f"elevation {height['min']}..{height['max']} m, grid {height['w']}x{height['h']}")
    print(f"map.json {os.path.getsize(os.path.join(OUT, 'map.json')) / 1024:.0f} KB")
    for p in pools:
        print("pool", p)


if __name__ == "__main__":
    main()
