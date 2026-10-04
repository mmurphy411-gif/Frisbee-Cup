// Collision world built from a course layout: a uniform grid of simple colliders plus
// surface queries (pavement, sand, water, decks, out of bounds).
import { groundHeight } from './terrain.js';
import { inQuad } from './geom.js';

const CELL = 8;
export const SURFACE = { GRASS: 0, PAVED: 1, SAND: 2 };

// Height of a roof above a point in the building's local (u, w) frame.
export function roofHeight(c, u, w) {
  let k = 1 - Math.abs(w) / c.hv;
  if (c.roof === 'hip') k = Math.min(k, 1 - (Math.abs(u) - (c.hu - c.hv)) / c.hv);
  return c.base + c.wallH + c.roofH * Math.max(0, k);
}

const ground = (x, z) => groundHeight(x, z);

export class World {
  constructor(layout) {
    this.layout = layout;
    this.halfW = layout.world.halfW;
    this.halfH = layout.world.halfH;
    this.cols = Math.ceil((this.halfW * 2) / CELL);
    this.rows = Math.ceil((this.halfH * 2) / CELL);
    this.grid = Array.from({ length: this.cols * this.rows }, () => []);
    this.pools = layout.pools;
    this.platforms = layout.platforms;
    this.water = layout.water;
    this.empty = [];
    this.onPlatform = null;

    for (const h of layout.houses) {
      this.addRect({ t: 'house', ...h, e: 0.25, keep: 0.5, name: 'house' });
      if (h.porch) this.addPorch(h);
    }
    for (const car of layout.cars) {
      const y0 = ground(car.cx, car.cz);
      this.addRect({ t: 'box', cx: car.cx, cz: car.cz, hu: car.hu, hv: car.hv, cos: car.cos, sin: car.sin,
        y0: y0 - 1, y1: y0 + car.h, e: 0.4, keep: 0.6, name: 'car' });
    }
    for (const hd of layout.hedges) this.addWall(hd, hd.w / 2, hd.h, { e: 0.05, keep: 0.3, name: 'hedge' });
    for (const f of layout.fences) this.addWall(f, f.kind === 'picket' ? 0.05 : 0.07, f.h, { e: 0.3, keep: 0.5, name: 'fence' });
    for (const p of layout.pools) {
      this.addRect({ t: 'box', cx: p.cx, cz: p.cz, hu: p.hu, hv: p.hv, cos: p.cos, sin: p.sin,
        y0: p.low - 1, y1: p.top, e: 0.2, keep: 0.5, name: 'pool', pool: true });
    }
    for (const m of layout.mailboxes) this.addPost(m.x, m.z, 0.16, 1.25, 'mailbox');
    for (const l of layout.lamps) this.addPost(l.x, l.z, 0.1, 5.6, 'pole');
    for (const tr of layout.trees) this.addTree(tr);
    for (const pf of layout.platforms) this.addPlatform(pf);
    for (const p of layout.props) this.addProp(p);
    for (const h of layout.holes) if (h.sign) this.addPost(h.sign.x, h.sign.z, 0.07, 1.7, 'pole');
    this.buildMask();
  }

  // ------------------------------------------------------------- colliders
  add(c, minx, maxx, minz, maxz) {
    const x0 = Math.max(0, Math.floor((minx + this.halfW) / CELL)), x1 = Math.min(this.cols - 1, Math.floor((maxx + this.halfW) / CELL));
    const z0 = Math.max(0, Math.floor((minz + this.halfH) / CELL)), z1 = Math.min(this.rows - 1, Math.floor((maxz + this.halfH) / CELL));
    for (let iz = z0; iz <= z1; iz++) for (let ix = x0; ix <= x1; ix++) this.grid[iz * this.cols + ix].push(c);
  }

  addRect(c) {
    const ex = Math.abs(c.hu * c.cos) + Math.abs(c.hv * c.sin) + 0.3;
    const ez = Math.abs(c.hu * c.sin) + Math.abs(c.hv * c.cos) + 0.3;
    this.add(c, c.cx - ex, c.cx + ex, c.cz - ez, c.cz + ez);
    return c;
  }

  addCircle(c, r) {
    this.add(c, c.x - r - 0.2, c.x + r + 0.2, c.z - r - 0.2, c.z + r + 0.2);
    return c;
  }

  addPost(x, z, r, h, name, extra) {
    const y = ground(x, z);
    return this.addCircle({ t: 'cyl', x, z, r, y0: y - 1, y1: y + h, e: 0.35, keep: 0.55, name, ...extra }, r + 0.3);
  }

  // A thin wall between two points (hedge, fence, stone wall).
  addWall(s, half, height, props) {
    const cx = (s.ax + s.bx) / 2, cz = (s.az + s.bz) / 2;
    const ang = Math.atan2(s.bz - s.az, s.bx - s.ax);
    const ga = ground(s.ax, s.az), gb = ground(s.bx, s.bz), gc = ground(cx, cz);
    this.addRect({ t: 'box', cx, cz, hu: Math.hypot(s.bx - s.ax, s.bz - s.az) / 2, hv: half,
      cos: Math.cos(ang), sin: Math.sin(ang), y0: Math.min(ga, gb, gc) - 0.6, y1: Math.max(ga, gb, gc) + height, ...props });
  }

  addPorch(h) {
    const p = h.porch, w = h.front * (h.hv + p.depth / 2);
    const cx = h.cx + p.u * h.cos - w * h.sin, cz = h.cz + p.u * h.sin + w * h.cos;
    this.addRect({ t: 'box', cx, cz, hu: p.width / 2, hv: p.depth / 2, cos: h.cos, sin: h.sin,
      y0: h.base + 2.3, y1: h.base + 2.62, e: 0.25, keep: 0.5, name: 'house' });
    for (const s of [-1, 1]) {
      const u = p.u + s * (p.width / 2 - 0.15), pw = h.front * (h.hv + p.depth - 0.15);
      this.addCircle({ t: 'cyl', x: h.cx + u * h.cos - pw * h.sin, z: h.cz + u * h.sin + pw * h.cos,
        r: 0.09, y0: h.base - 1, y1: h.base + 2.4, e: 0.35, keep: 0.55, name: 'pole' }, 0.4);
    }
  }

  addTree(tr) {
    const y = ground(tr.x, tr.z);
    const mid = y + (tr.bottom + tr.h) / 2;
    this.addCircle({ t: 'cyl', x: tr.x, z: tr.z, r: tr.trunkR, y0: y - 1, y1: tr.kind === 'pine' ? y + tr.h * 0.8 : mid,
      e: 0.35, keep: 0.55, name: 'trunk' }, tr.trunkR + 0.2);
    if (tr.kind === 'pine') {
      this.addCircle({ t: 'cone', x: tr.x, z: tr.z, r: tr.r * 0.62, y0: y + tr.bottom, y1: y + tr.h, dens: 1.25, name: 'tree' }, tr.r * 0.62);
    } else {
      const dens = tr.kind === 'bush' ? 1.5 : tr.kind === 'willow' ? 1.3 : 1;
      this.addCircle({ t: 'canopy', x: tr.x, y: mid, z: tr.z, r: tr.r, ry: (tr.h - tr.bottom) / 2, dens, name: 'tree' }, tr.r);
    }
  }

  addPlatform(pf) {
    this.addRect({ t: 'box', platform: true, cx: pf.cx, cz: pf.cz, hu: pf.hu, hv: pf.hv, cos: pf.cos, sin: pf.sin,
      y0: pf.top - 0.45, y1: pf.top, e: 0.3, keep: 0.6, name: 'deck' });
    if (!pf.rails) return;
    for (const s of [-1, 1]) {
      const w = s * (pf.hv - 0.06);
      this.addRect({ t: 'box', rail: true, cx: pf.cx - w * pf.sin, cz: pf.cz + w * pf.cos, hu: pf.hu, hv: 0.06,
        cos: pf.cos, sin: pf.sin, y0: pf.top, y1: pf.top + 0.95, e: 0.35, keep: 0.55, name: 'rail' });
    }
  }

  addProp(p) {
    const y = ground(p.x, p.z), cos = Math.cos(p.ang), sin = Math.sin(p.ang);
    const box = (hu, hv, y0, y1, name, du = 0, dw = 0, extra) => this.addRect({
      t: 'box', cx: p.x + du * cos - dw * sin, cz: p.z + du * sin + dw * cos, hu, hv, cos, sin,
      y0: y + y0, y1: y + y1, e: 0.3, keep: 0.55, name, ...extra,
    });
    switch (p.type) {
      case 'bench': box(0.9, 0.28, -0.5, 0.85, 'bench'); break;
      case 'table': box(0.95, 0.8, -0.5, 0.78, 'bench'); break;
      case 'canoe': box(2.2, 0.42, -0.5, 0.4, 'bench'); break;
      case 'boulder': {
        const r = p.r ?? 1;
        this.addCircle({ t: 'sphere', x: p.x, y: y + r * 0.35, z: p.z, r, e: 0.45, keep: 0.6, name: 'rock' }, r);
        break;
      }
      case 'umbrella': this.addPost(p.x, p.z, 0.045, 2.3, 'pole'); break;
      case 'snowman': {
        const s = p.size ?? 1;
        this.addCircle({ t: 'sphere', x: p.x, y: y + 0.45 * s, z: p.z, r: 0.5 * s, e: 0.2, keep: 0.4, name: 'snowman' }, 0.5 * s);
        this.addPost(p.x, p.z, 0.3 * s, 1.85 * s, 'snowman');
        break;
      }
      case 'lighthouse': this.addPost(p.x, p.z, 2.1, (p.h ?? 14) + 3, 'house'); break;
      case 'hydrant': this.addPost(p.x, p.z, 0.14, 0.8, 'mailbox'); break;
      case 'bin': this.addPost(p.x, p.z, 0.3, 1.0, 'mailbox'); break;
      case 'hoop':
        this.addPost(p.x, p.z, 0.07, 3.05, 'pole');
        box(0.04, 0.9, 2.85, 3.9, 'pole', 0.5, 0);
        break;
      case 'swing':
        for (const s of [-1, 1]) this.addPost(p.x + s * 2.3 * cos, p.z + s * 2.3 * sin, 0.08, 2.4, 'pole');
        box(2.3, 0.06, 2.25, 2.4, 'pole');
        break;
      case 'slide': box(1.7, 0.4, -0.5, 1.9, 'bench'); break;
      case 'leafpile': {
        const r = p.r ?? 1.5;
        this.addCircle({ t: 'canopy', x: p.x, y: y + 0.3, z: p.z, r, ry: 0.6, dens: 5, name: 'leaves', soft: true }, r);
        break;
      }
      case 'wall': {
        const a = { x: p.x - p.hu * cos, z: p.z - p.hu * sin }, b = { x: p.x + p.hu * cos, z: p.z + p.hu * sin };
        this.addWall({ ax: a.x, az: a.z, bx: b.x, bz: b.z }, 0.35, p.h ?? 1, { e: 0.4, keep: 0.6, name: 'house' });
        break;
      }
      case 'gazebo':
      case 'shelter': {
        const half = p.size / 2;
        this.addRect({ t: 'house', open: true, cx: p.x, cz: p.z, hu: half + 0.4, hv: half + 0.4, cos, sin,
          base: y + 2.6, wallH: 0, roofH: p.type === 'gazebo' ? 1.6 : 1.2, roof: p.type === 'gazebo' ? 'hip' : 'gable',
          e: 0.25, keep: 0.5, name: 'house' });
        for (const [u, w] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
          this.addPost(p.x + u * half * cos - w * half * sin, p.z + u * half * sin + w * half * cos, 0.12, 2.6, 'pole');
        }
        break;
      }
      default: break;
    }
  }

  near(x, z) {
    const ix = Math.floor((x + this.halfW) / CELL), iz = Math.floor((z + this.halfH) / CELL);
    if (ix < 0 || iz < 0 || ix >= this.cols || iz >= this.rows) return this.empty;
    return this.grid[iz * this.cols + ix];
  }

  // ------------------------------------------------------------- surfaces
  buildMask() {
    const W = this.halfW * 2, H = this.halfH * 2;
    const mask = (this.mask = new Uint8Array(W * H));
    const stamp = (x, z, r, v) => {
      for (let iz = Math.floor(z - r); iz <= Math.ceil(z + r); iz++) {
        for (let ix = Math.floor(x - r); ix <= Math.ceil(x + r); ix++) {
          const gx = ix + this.halfW, gz = iz + this.halfH;
          if (gx < 0 || gz < 0 || gx >= W || gz >= H) continue;
          if (Math.hypot(ix + 0.5 - x, iz + 0.5 - z) <= r) mask[gz * W + gx] = v;
        }
      }
    };
    const fill = (test, b, v) => {
      for (let iz = Math.floor(b.minZ); iz <= Math.ceil(b.maxZ); iz++) {
        for (let ix = Math.floor(b.minX); ix <= Math.ceil(b.maxX); ix++) {
          const gx = ix + this.halfW, gz = iz + this.halfH;
          if (gx < 0 || gz < 0 || gx >= W || gz >= H) continue;
          if (test(ix + 0.5, iz + 0.5)) mask[gz * W + gx] = v;
        }
      }
    };
    const L = this.layout;
    for (const s of L.sand) fill((x, z) => s.poly.contains(x, z), s.poly.bbox, SURFACE.SAND);
    for (const road of [...L.roads, ...L.footpaths]) {
      for (let s = 0; s <= road.length; s += 0.5) {
        const p = road.at(s);
        stamp(p.x, p.z, road.width / 2, SURFACE.PAVED);
      }
    }
    for (const p of L.paved) fill((x, z) => p.poly.contains(x, z), p.poly.bbox, SURFACE.PAVED);
    for (const d of L.driveways) {
      const b = {
        minX: Math.min(...d.map((q) => q.x)), maxX: Math.max(...d.map((q) => q.x)),
        minZ: Math.min(...d.map((q) => q.z)), maxZ: Math.max(...d.map((q) => q.z)),
      };
      fill((x, z) => inQuad(x, z, d), b, SURFACE.PAVED);
    }
  }

  surface(x, z) {
    const gx = Math.floor(x + this.halfW), gz = Math.floor(z + this.halfH);
    if (gx < 0 || gz < 0 || gx >= this.halfW * 2 || gz >= this.halfH * 2) return SURFACE.GRASS;
    return this.mask[gz * this.halfW * 2 + gx];
  }

  onRoad(x, z) {
    return this.surface(x, z) === SURFACE.PAVED;
  }

  // ---------------------------------------------------------------- water
  // The water body under a point, ignoring any deck above it.
  waterAt(x, z) {
    for (let i = 0; i < this.water.length; i++) {
      const w = this.water[i], b = w.bbox;
      if (x < b.minX || x > b.maxX || z < b.minZ || z > b.maxZ) continue;
      if (w.kind === 'level') {
        if (w.circle && Math.hypot(x - w.circle.x, z - w.circle.z) > w.circle.r) continue;
        if (ground(x, z) < w.level - 0.02) return w;
      } else if (w.segs.nearest(x, z, w.width).d < w.width / 2 + 0.5) {
        return w;
      }
    }
    return null;
  }

  waterLevel(w, x, z) {
    return w.kind === 'level' ? w.level : w.surfaceAt(x, z);
  }

  inWater(x, z) {
    return !!this.waterAt(x, z);
  }

  poolAt(x, z) {
    for (const p of this.pools) {
      const dx = x - p.cx, dz = z - p.cz;
      if (Math.abs(dx * p.cos + dz * p.sin) < p.hu && Math.abs(-dx * p.sin + dz * p.cos) < p.hv) return p;
    }
    return null;
  }

  // A roofed building whose footprint covers the point. Open shelters only count
  // when the point is up at roof height.
  houseAt(x, z, y) {
    for (const c of this.near(x, z)) {
      if (c.t !== 'house') continue;
      if (c.open && !(y > c.base - 0.2)) continue;
      const dx = x - c.cx, dz = z - c.cz;
      if (Math.abs(dx * c.cos + dz * c.sin) < c.hu && Math.abs(-dx * c.sin + dz * c.cos) < c.hv) return c;
    }
    return null;
  }

  platformAt(x, z) {
    for (const p of this.platforms) {
      const dx = x - p.cx, dz = z - p.cz;
      if (Math.abs(dx * p.cos + dz * p.sin) < p.hu && Math.abs(-dx * p.sin + dz * p.cos) < p.hv) return p;
    }
    return null;
  }

  // The highest walkable surface at (x, z) that is no higher than yRef: the ground or a
  // deck. Sets this.onPlatform to the deck, if that is what was found.
  floorAt(x, z, yRef) {
    let h = ground(x, z);
    this.onPlatform = null;
    for (const p of this.platforms) {
      if (p.top <= h || p.top > yRef + 0.08) continue;
      const dx = x - p.cx, dz = z - p.cz;
      if (Math.abs(dx * p.cos + dz * p.sin) < p.hu && Math.abs(-dx * p.sin + dz * p.cos) < p.hv) {
        h = p.top;
        this.onPlatform = p;
      }
    }
    return h;
  }

  // Where a player standing at (x, z) has their feet.
  standHeight(x, z) {
    return this.floorAt(x, z, Infinity);
  }

  // Why a spot is out of bounds, or null if it is fair ground. Streets are in play, and
  // so is anything resting on a deck. Pass y to account for decks and open shelters.
  outOfBounds(x, z, y) {
    if (Math.abs(x) > this.halfW - 2 || Math.abs(z) > this.halfH - 2) return 'bounds';
    if (y !== undefined) {
      const p = this.platformAt(x, z);
      if (p && y > p.top - 0.3) return null;
    }
    const w = this.waterAt(x, z);
    if (w) return w.name;
    if (this.poolAt(x, z)) return 'pool';
    if (this.houseAt(x, z, y)) return 'roof';
    return null;
  }

  // Nudge a lie out of anything solid so the next throw has room to be released.
  relief(x, z) {
    for (let pass = 0; pass < 4; pass++) {
      let moved = false;
      for (const c of this.near(x, z)) {
        if (c.t === 'cyl' || c.t === 'sphere') {
          const dx = x - c.x, dz = z - c.z, d = Math.hypot(dx, dz), min = c.r + 0.55;
          if (d < min) {
            const k = d > 1e-4 ? min / d : 1;
            x = c.x + (d > 1e-4 ? dx * k : min); z = c.z + dz * k; moved = true;
          }
        } else if ((c.t === 'box' && !c.platform && !c.rail) || (c.t === 'house' && !c.open)) {
          const dx = x - c.cx, dz = z - c.cz;
          let u = dx * c.cos + dz * c.sin, w = -dx * c.sin + dz * c.cos;
          const pu = c.hu + 0.6 - Math.abs(u), pw = c.hv + 0.6 - Math.abs(w);
          if (pu > 0 && pw > 0) {
            if (pu < pw) u = Math.sign(u || 1) * (c.hu + 0.6);
            else w = Math.sign(w || 1) * (c.hv + 0.6);
            x = c.cx + u * c.cos - w * c.sin; z = c.cz + u * c.sin + w * c.cos; moved = true;
          }
        }
      }
      if (!moved) break;
    }
    return { x, z };
  }
}
