// Course construction kit. A course script lays down roads and water, shapes the
// terrain, then places holes, houses and scenery through this builder. The result is
// plain data shared by the physics and the renderer, and generation is seeded so a
// course comes out the same every run.
import { mulberry32 } from './rng.js';
import { Path, catmullRom, segDist } from './path.js';
import { Heightfield, setTerrain, groundHeight, WORLD } from './terrain.js';
import { Polygon, SegmentSet, closedSpline, inQuad } from './geom.js';

const TREE_CELL = 10;

const inRect = (x, z, o, pad) => {
  const dx = x - o.cx, dz = z - o.cz;
  return Math.abs(dx * o.cos + dz * o.sin) < o.hu + pad && Math.abs(-dx * o.sin + dz * o.cos) < o.hv + pad;
};

export class CourseBuilder {
  constructor(def) {
    this.def = def;
    this.theme = def.theme;
    this.halfW = def.world.halfW;
    this.halfH = def.world.halfH;
    WORLD.halfW = this.halfW;
    WORLD.halfH = this.halfH;
    this.rng = mulberry32(def.seed);
    this.roads = []; this.footpaths = []; this.water = [];
    this.lawnAreas = []; this.greens = []; this.paved = []; this.sand = []; this.clearZones = [];
    this.houses = []; this.driveways = []; this.cars = []; this.mailboxes = [];
    this.hedges = []; this.fences = []; this.pools = []; this.lamps = [];
    this.trees = []; this.platforms = []; this.props = []; this.ducks = [];
    this.holeDefs = [];
    this.treeGrid = new Map();
  }

  R(a, b) { return a + (b - a) * this.rng(); }
  chance(p) { return this.rng() < p; }
  pick(list) { return list[Math.floor(this.rng() * list.length)]; }

  // ------------------------------------------------------------ ground plan
  road(ctrl, o = {}) {
    const path = new Path(catmullRom(ctrl, o.per ?? 14), o.width ?? 7, o.name ?? '');
    Object.assign(path, { lawn: o.lawn ?? 0, flatten: o.flatten ?? true, shoulder: o.shoulder ?? 6, lines: !!o.lines });
    this.roads.push(path);
    return path;
  }

  footpath(ctrl, o = {}) {
    const path = new Path(catmullRom(ctrl, 10), o.width ?? 1.8, o.name ?? 'path');
    path.color = o.color ?? this.theme.ground.path;
    this.footpaths.push(path);
    return path;
  }

  lawnArea(pts) { this.lawnAreas.push(pts); }
  greenArea(pts) { this.greens.push(pts); } // closely mown putting surface
  pavedArea(pts, o = {}) { this.paved.push({ pts, poly: new Polygon(pts), color: o.color }); }
  sandArea(pts) { this.sand.push({ pts, poly: new Polygon(closedSpline(pts, 6)) }); }
  clearZone(x, z, r) { this.clearZones.push({ x, z, r }); }

  // Water whose surface sits at `level`; the terrain decides the shoreline.
  lake(ctrl, level, o = {}) {
    const poly = new Polygon(closedSpline(ctrl, o.per ?? 8));
    const b = poly.bbox, pad = 3;
    const body = {
      kind: 'level', name: o.name ?? 'lake', level, poly,
      bbox: { minX: b.minX - pad, maxX: b.maxX + pad, minZ: b.minZ - pad, maxZ: b.maxZ + pad },
    };
    this.water.push(body);
    return body;
  }

  pond(x, z, reach, level, name = 'pond') {
    const body = { kind: 'level', name, level, circle: { x, z, r: reach }, bbox: { minX: x - reach, maxX: x + reach, minZ: z - reach, maxZ: z + reach } };
    this.water.push(body);
    return body;
  }

  // A flowing creek: the bed falls from bed[0] to bed[1] along the path.
  creek(ctrl, o) {
    const path = new Path(catmullRom(ctrl, 10), o.width, o.name ?? 'creek');
    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
    for (const [x, z] of path.pts) {
      minX = Math.min(minX, x); maxX = Math.max(maxX, x); minZ = Math.min(minZ, z); maxZ = Math.max(maxZ, z);
    }
    const pad = o.width + 2;
    const body = {
      kind: 'creek', name: o.name ?? 'creek', path, width: o.width, depth: o.depth ?? 0.35,
      bed0: o.bed[0], bed1: o.bed[1], segs: new SegmentSet(path.pts, false, 8),
      bbox: { minX: minX - pad, maxX: maxX + pad, minZ: minZ - pad, maxZ: maxZ + pad },
    };
    body.sAt = (x, z, maxR = 60) => {
      const r = body.segs.nearest(x, z, maxR);
      if (r.i < 0) return null;
      return { s: path.cum[r.i] + r.t * (path.cum[r.i + 1] - path.cum[r.i]), d: r.d };
    };
    body.bedAt = (s) => body.bed0 + (body.bed1 - body.bed0) * (s / path.length);
    body.surfaceAt = (x, z) => {
      const q = body.sAt(x, z);
      return q ? body.bedAt(q.s) + body.depth : -Infinity;
    };
    this.water.push(body);
    return body;
  }

  // Cut a creek channel with rounded banks into a height.
  carveCreek(body, x, z, h, bank = 0.6) {
    const q = body.sAt(x, z, 40);
    if (!q) return h;
    const bed = body.bedAt(q.s), half = body.width / 2;
    const cut = q.d < half ? bed - 0.3 * (1 - (q.d / half) ** 2) : bed + (q.d - half) * bank;
    // smooth minimum, so the ravine rim is rounded rather than creased
    const k = 2.5, d = Math.max(k - Math.abs(h - cut), 0) / k;
    return Math.min(h, cut) - d * d * k * 0.25;
  }

  terrain(fn) {
    const hf = new Heightfield(this.halfW, this.halfH, 1, fn);
    for (const road of this.roads) if (road.flatten) hf.flattenRoad(road, road.width / 2 + 0.8, road.shoulder);
    setTerrain(hf);
    this.hf = hf;
    return hf;
  }

  // ------------------------------------------------------------------ holes
  hole(def) {
    this.holeDefs.push(def);
    return def;
  }

  // Is a point near a tee, basket or the line of play of any hole?
  inCorridor(x, z, pad) {
    for (const h of this.holeDefs) {
      if (Math.hypot(x - h.tee.x, z - h.tee.z) < pad - 0.5) return true;
      if (Math.hypot(x - h.basket.x, z - h.basket.z) < pad - 1) return true;
      const route = [h.tee, ...(h.via || []), h.basket];
      const lane = Math.min(pad, h.corridor ?? pad);
      // keep the space behind each tee open for the camera
      const dx = route[1].x - h.tee.x, dz = route[1].z - h.tee.z, dl = Math.hypot(dx, dz) || 1;
      if (segDist(x, z, h.tee.x, h.tee.z, h.tee.x - (dx / dl) * 9, h.tee.z - (dz / dl) * 9) < pad - 1) return true;
      for (let k = 1; k < route.length; k++) {
        if (segDist(x, z, route[k - 1].x, route[k - 1].z, route[k].x, route[k].z) < lane) return true;
      }
    }
    return false;
  }

  rectClear(o, pad) {
    for (const [u, w] of [[0, 0], [-1, -1], [1, -1], [1, 1], [-1, 1], [0, -1], [0, 1], [-1, 0], [1, 0]]) {
      const lu = u * o.hu, lw = w * o.hv;
      if (this.inCorridor(o.cx + lu * o.cos - lw * o.sin, o.cz + lu * o.sin + lw * o.cos, pad)) return false;
    }
    return true;
  }

  // --------------------------------------------------------------- houses
  // A house on a lot beside a road; side +1 is the right of travel.
  house(path, s, side, o = {}) {
    const hu = o.hu ?? this.R(5.6, 7.4), hv = o.hv ?? this.R(4.1, 5.2);
    const setback = o.setback ?? this.R(9, 12);
    const q = path.offset(s, side * (path.width / 2 + setback + hv));
    return this.placeHouse({ ...o, x: q.x, z: q.z, ang: Math.atan2(q.tz, q.tx), hu, hv, front: -side, setback });
  }

  // The same, but the lot is skipped if the house would sit on a line of play, in water,
  // on a road or on another building.
  houseIfClear(path, s, side, o = {}) {
    const hu = o.hu ?? this.R(5.6, 7.4), hv = o.hv ?? this.R(4.1, 5.2);
    const setback = o.setback ?? this.R(9, 12);
    const q = path.offset(s, side * (path.width / 2 + setback + hv));
    const ang = Math.atan2(q.tz, q.tx);
    const rect = { cx: q.x, cz: q.z, hu, hv, cos: Math.cos(ang), sin: Math.sin(ang) };
    if (!this.rectClear(rect, o.pad ?? 4)) return null;
    for (const [u, w] of [[0, 0], [-1, -1], [1, -1], [1, 1], [-1, 1]]) {
      const x = q.x + u * (hu + 1) * rect.cos - w * (hv + 1) * rect.sin, z = q.z + u * (hu + 1) * rect.sin + w * (hv + 1) * rect.cos;
      if (Math.abs(x) > this.halfW - 3 || Math.abs(z) > this.halfH - 3) return null;
      if (this.wet(x, z, 0.6)) return null;
      for (const road of this.roads) if (road.dist(x, z) < road.width / 2 + 1.5) return null;
      for (const p of this.paved) if (p.poly.contains(x, z)) return null;
    }
    for (const h of this.houses) if (inRect(q.x, q.z, h, Math.max(hu, hv) + 3)) return null;
    return this.house(path, s, side, { ...o, hu, hv, setback });
  }

  setBase(h) {
    const hs = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([u, w]) =>
      groundHeight(h.cx + u * h.hu * h.cos - w * h.hv * h.sin, h.cz + u * h.hu * h.sin + w * h.hv * h.cos));
    h.base = Math.max(...hs) + 0.25;
    h.low = Math.min(...hs) - 0.4;
  }

  // `front` is the local w side (+1 or -1) that faces the street.
  placeHouse(o) {
    const t = this.theme;
    const { x, z, ang, hu, hv } = o;
    const cos = Math.cos(ang), sin = Math.sin(ang), front = o.front ?? -1;
    const local = (u, w) => ({ x: x + u * cos - w * sin, z: z + u * sin + w * cos });
    const stories = o.stories ?? (this.chance(o.twoStory ?? 0.35) ? 2 : 1);
    const house = {
      kind: o.kind ?? 'house', cx: x, cz: z, hu, hv, ang, cos, sin, front, stories,
      setback: o.setback ?? 10,
      wallH: o.wallH ?? (stories === 2 ? 5.6 : 3.1),
      roofH: o.roofH ?? this.R(1.9, 2.7),
      roof: o.roof ?? (hu > hv + 0.6 && this.chance(o.hip ?? 0.35) ? 'hip' : 'gable'),
      wall: o.wall ?? this.pick(t.walls),
      roofColor: o.roofColor ?? this.pick(t.roofs),
      trim: o.trim ?? t.trim ?? '#ffffff',
      door: o.door ?? this.pick(t.doors),
      shutters: o.shutters !== undefined ? o.shutters : this.chance(0.45) ? this.pick(t.shutters) : null,
      chimney: o.chimney ?? this.chance(0.65),
      home: !!o.home, doorU: o.doorU ?? 0, porch: null, garage: null,
      decor: o.decor ?? t.porchDecor ?? null, windows: o.windows ?? true,
      balcony: o.balcony ?? null, // 'balcony' (iron railing) or 'gallery' (deep, on columns over the sidewalk)
    };
    this.setBase(house);
    this.houses.push(house);
    if (house.kind !== 'house') return house;

    if (o.driveway !== false) {
      const dside = o.driveSide ?? (this.chance(0.5) ? -1 : 1);
      let du = dside * (hu - 1.9);
      if (o.garage ?? this.chance(0.45)) {
        const gu = 3.3, gv = Math.min(hv, 3.6), gc = dside * (hu + gu + 0.04);
        const c = local(gc, front * (hv - gv));
        const garage = {
          kind: 'garage', cx: c.x, cz: c.z, hu: gu, hv: gv, ang, cos, sin, front, stories: 1,
          wallH: 2.7, roofH: 1.25, roof: 'gable', wall: house.wall, roofColor: house.roofColor,
          trim: house.trim, door: house.door, shutters: null, chimney: false, home: false, windows: false,
          doorU: 0, porch: null,
        };
        if (this.rectClear(garage, 2.5)) {
          this.setBase(garage);
          this.houses.push(garage);
          house.garage = garage;
          garage.side = dside;
          du = gc;
        }
      }
      house.doorU = o.doorU ?? -Math.sign(du) * this.R(0.4, 1.8);
      const half = house.garage ? 2.7 : 1.6;
      const wFront = front * hv, wStreet = front * (hv + house.setback + 0.6);
      this.driveways.push([local(du - half, wFront), local(du + half, wFront), local(du + half, wStreet), local(du - half, wStreet)]);
      if (this.chance(o.carChance ?? 0.4)) {
        const cp = local(du + (house.garage ? this.pick([-1.3, 1.3]) : 0), front * (hv + house.setback * 0.42));
        if (!this.inCorridor(cp.x, cp.z, 3.5)) this.car(cp, ang + Math.PI / 2);
      }
      const mb = local(du + Math.sign(du) * (half + 1), front * (hv + house.setback - 0.8));
      this.mailboxes.push({ x: mb.x, z: mb.z, ang });
      if (this.chance(o.hoopChance ?? 0.12)) {
        const hp = local(du + Math.sign(du) * (half + 0.4), front * (hv + house.setback * 0.55));
        if (!this.inCorridor(hp.x, hp.z, 4)) this.prop('hoop', hp.x, hp.z, { ang: ang + (front > 0 ? -Math.PI / 2 : Math.PI / 2) });
      }
    }
    if (this.chance(o.porchChance ?? 0.4)) {
      const width = Math.min(2 * hu - 1.5, this.R(3.4, 5.6));
      house.porch = { u: Math.max(-hu + width / 2 + 0.3, Math.min(hu - width / 2 - 0.3, house.doorU)), width, depth: 1.9 };
    }
    if (this.chance(o.fenceChance ?? 0.22)) this.backyardFence(house, local);
    return house;
  }

  backyardFence(h, local) {
    const back = -h.front, depth = this.R(9, 15);
    let uL = -h.hu - 1.2, uR = h.hu + 1.2;
    if (h.garage) {
      const outer = h.hu + 2 * h.garage.hu + 0.6;
      if (h.garage.side > 0) uR = outer; else uL = -outer;
    }
    const wb = back * h.hv, wy = back * (h.hv + depth);
    const pts = [local(uL, wb), local(uL, wy), local(uR, wy), local(uR, wb)];
    for (let k = 1; k < pts.length; k++) {
      const a = pts[k - 1], b = pts[k], n = Math.ceil(Math.hypot(b.x - a.x, b.z - a.z) / 2.5);
      for (let i = 0; i <= n; i++) {
        if (this.inCorridor(a.x + ((b.x - a.x) * i) / n, a.z + ((b.z - a.z) * i) / n, 3.5)) return;
      }
    }
    const kind = this.chance(0.35) ? 'picket' : 'privacy';
    for (let k = 1; k < pts.length; k++) this.fence(pts[k - 1], pts[k], kind);
  }

  // ---------------------------------------------------------- small things
  car(p, ang, color) {
    this.cars.push({
      cx: p.x, cz: p.z, ang, cos: Math.cos(ang), sin: Math.sin(ang), hu: 2.2, hv: 0.92, h: 1.45,
      color: color ?? Math.floor(this.rng() * 8),
    });
  }

  pool(p, ang, hu = 5.2, hv = 3.2) {
    const cos = Math.cos(ang), sin = Math.sin(ang);
    const hs = [[-hu, -hv], [hu, -hv], [hu, hv], [-hu, hv]].map(([u, w]) =>
      groundHeight(p.x + u * cos - w * sin, p.z + u * sin + w * cos));
    this.pools.push({ cx: p.x, cz: p.z, hu, hv, ang, cos, sin, top: Math.max(...hs) + 0.12, low: Math.min(...hs) - 0.4 });
  }

  hedge(a, b, o = {}) {
    this.hedges.push({ ax: a.x, az: a.z, bx: b.x, bz: b.z, h: o.h ?? 1.5, w: o.w ?? 1.1 });
  }

  fence(a, b, kind = 'privacy') {
    this.fences.push({ ax: a.x, az: a.z, bx: b.x, bz: b.z, kind, h: kind === 'picket' ? 1.05 : kind === 'iron' ? 1.6 : 1.8 });
  }

  lampsAlong(path, every, d, start = 30) {
    for (let s = start; s < path.length - 15; s += every) {
      const p = path.offset(s, d);
      if (!this.inCorridor(p.x, p.z, 2.5)) this.lamps.push({ x: p.x, z: p.z, ang: Math.atan2(p.tz, p.tx) + (d < 0 ? Math.PI : 0) });
    }
  }

  prop(type, x, z, o = {}) {
    const p = { type, x, z, ang: o.ang ?? 0, ...o };
    this.props.push(p);
    return p;
  }

  platform(o) {
    const ang = o.ang ?? 0;
    const pf = {
      kind: o.kind ?? 'dock', cx: o.x, cz: o.z, hu: o.hu, hv: o.hv, ang,
      cos: Math.cos(ang), sin: Math.sin(ang), top: o.top, rails: o.rails ?? false,
    };
    this.platforms.push(pf);
    return pf;
  }

  // A straight deck between two points: bridge, boardwalk or pier.
  span(a, b, width, top, o = {}) {
    return this.platform({
      ...o, x: (a.x + b.x) / 2, z: (a.z + b.z) / 2, hu: Math.hypot(b.x - a.x, b.z - a.z) / 2, hv: width / 2,
      ang: Math.atan2(b.z - a.z, b.x - a.x), top,
    });
  }

  // ------------------------------------------------------------------ trees
  makeTree(x, z, r, kind = 'broad', o = {}) {
    const tall = o.tall ?? 1;
    let h, bottom, trunkR;
    if (kind === 'pine') {
      h = (7 + 1.7 * r + this.R(0, 3)) * tall; bottom = 1.6; trunkR = 0.14 + 0.03 * r;
    } else if (kind === 'bush') {
      h = 1.8 + 1.5 * r; bottom = 0.6; trunkR = 0.12;
    } else if (kind === 'willow') {
      h = (3.8 + 1.0 * r + this.R(0, 1)) * tall; bottom = 0.9; trunkR = 0.22 + 0.04 * r;
    } else if (kind === 'palm') {
      // a tall bare trunk with a tuft of fronds at the top
      h = (7 + 1.1 * r + this.R(0, 3.5)) * tall; bottom = h - 2.4; trunkR = 0.17 + 0.015 * r;
    } else if (kind === 'cypress') {
      // Monterey cypress: low, broad and wind-flattened
      h = (4.2 + 0.85 * r + this.R(0, 1.5)) * tall; bottom = h * 0.5; trunkR = 0.24 + 0.05 * r;
    } else if (kind === 'birch') {
      h = (5 + 1.6 * r + this.R(0, 2)) * tall; bottom = 2.8 + 0.2 * r; trunkR = 0.1 + 0.025 * r;
    } else {
      h = (2.6 + 1.55 * r + this.R(0, 1.5)) * tall; bottom = 2.2 + 0.25 * r; trunkR = 0.16 + 0.045 * r;
    }
    const palette = this.theme.foliage[kind] ?? this.theme.foliage.broad;
    return {
      x, z, r, h, bottom, kind, trunkR, color: o.color ?? this.pick(palette),
      tint: this.rng(), variant: Math.floor(this.rng() * 3),
    };
  }

  addTree(t) {
    this.trees.push(t);
    const key = `${Math.floor(t.x / TREE_CELL)},${Math.floor(t.z / TREE_CELL)}`;
    if (!this.treeGrid.has(key)) this.treeGrid.set(key, []);
    this.treeGrid.get(key).push(t);
    return t;
  }

  tree(p, r, kind = 'broad', o = {}) {
    return this.addTree(this.makeTree(p.x, p.z, r, kind, o));
  }

  treeOverlap(x, z, r) {
    const gx = Math.floor(x / TREE_CELL), gz = Math.floor(z / TREE_CELL);
    for (let ix = gx - 1; ix <= gx + 1; ix++) {
      for (let iz = gz - 1; iz <= gz + 1; iz++) {
        const list = this.treeGrid.get(`${ix},${iz}`);
        if (!list) continue;
        for (const t of list) if (Math.hypot(x - t.x, z - t.z) < 0.8 * (r + t.r)) return true;
      }
    }
    return false;
  }

  // Ground at or below the water line, or inside a creek channel.
  wet(x, z, rise = 0.5) {
    for (const w of this.water) {
      const b = w.bbox;
      if (x < b.minX - 4 || x > b.maxX + 4 || z < b.minZ - 4 || z > b.maxZ + 4) continue;
      if (w.kind === 'level') {
        if (groundHeight(x, z) < w.level + rise) return true;
      } else if (w.segs.nearest(x, z, w.width * 2).d < w.width / 2 + 1.5 + rise * 2) {
        return true;
      }
    }
    return false;
  }

  blocked(x, z, pad) {
    for (const h of this.houses) if (inRect(x, z, h, pad)) return true;
    for (const p of this.pools) if (inRect(x, z, p, pad)) return true;
    for (const p of this.platforms) if (inRect(x, z, p, pad)) return true;
    for (const c of this.cars) if (inRect(x, z, c, pad * 0.5)) return true;
    for (const d of this.driveways) {
      if (inQuad(x, z, d)) return true;
      const cx = (d[0].x + d[2].x) / 2, cz = (d[0].z + d[2].z) / 2;
      if (Math.hypot(x - cx, z - cz) < Math.hypot(d[0].x - d[2].x, d[0].z - d[2].z) * 0.5 + pad * 0.4) {
        for (const q of d) if (Math.hypot(x - q.x, z - q.z) < pad) return true;
      }
    }
    for (const p of this.paved) if (p.poly.sdf(x, z, pad + 1) < pad * 0.6) return true;
    for (const s of this.sand) if (s.poly.contains(x, z)) return true;
    for (const hd of this.hedges) if (segDist(x, z, hd.ax, hd.az, hd.bx, hd.bz) < pad) return true;
    for (const f of this.fences) if (segDist(x, z, f.ax, f.az, f.bx, f.bz) < pad * 0.8) return true;
    for (const p of this.props) if (Math.hypot(x - p.x, z - p.z) < (p.r ?? 1.5) + pad) return true;
    return false;
  }

  clearForTree(x, z, r, o = {}) {
    if (Math.abs(x) > this.halfW - 4 || Math.abs(z) > this.halfH - 4) return false;
    if (this.inCorridor(x, z, o.corridor ?? 7.5)) return false;
    if (this.treeOverlap(x, z, r)) return false;
    for (const zc of this.clearZones) if (Math.hypot(x - zc.x, z - zc.z) < zc.r) return false;
    for (const road of this.roads) if (road.dist(x, z) < road.width / 2 + (o.roadPad ?? 5)) return false;
    for (const p of this.footpaths) if (p.dist(x, z) < p.width / 2 + 2.2) return false;
    if (this.blocked(x, z, 2.6)) return false;
    if (!o.wet && this.wet(x, z, o.shoreRise ?? 0.45)) return false;
    return true;
  }

  // Throw `count` darts at the map; `spec(x, z)` says what (if anything) grows there.
  scatter(count, spec) {
    for (let i = 0; i < count; i++) {
      const x = this.R(-this.halfW + 4, this.halfW - 4), z = this.R(-this.halfH + 4, this.halfH - 4);
      const t = spec(x, z);
      if (t && this.clearForTree(x, z, t.r, t)) this.addTree(this.makeTree(x, z, t.r, t.kind, t));
    }
  }

  // ----------------------------------------------------------------- result
  finish() {
    const holes = this.holeDefs.map((h, i) => {
      const route = [h.tee, ...(h.via || []), h.basket].map((p) => ({ x: p.x, z: p.z }));
      let playLength = 0;
      for (let k = 1; k < route.length; k++) playLength += Math.hypot(route[k].x - route[k - 1].x, route[k].z - route[k - 1].z);
      const tee = route[0], yaw = Math.atan2(route[1].z - tee.z, route[1].x - tee.x);
      // tee sign at the front left of the pad, facing the thrower; none on decks
      const sp = { x: tee.x + Math.cos(yaw) * 0.6 + Math.sin(yaw) * 2.6, z: tee.z + Math.sin(yaw) * 0.6 - Math.cos(yaw) * 2.6 };
      const onDeck = (p) => this.platforms.some((pf) => inRect(p.x, p.z, pf, 0.3));
      const sign = onDeck(tee) || onDeck(sp) || this.wet(sp.x, sp.z, 0.1) ? null : { ...sp, ang: yaw };
      return {
        index: i, number: i + 1, name: h.name, par: h.par,
        tee, basket: route[route.length - 1], route, teeYaw: yaw, sign,
        length: Math.hypot(route[route.length - 1].x - tee.x, route[route.length - 1].z - tee.z),
        playLength,
      };
    });
    return {
      id: this.def.id, name: this.def.name, blurb: this.def.blurb, tier: this.def.tier ?? null, theme: this.theme,
      world: { halfW: this.halfW, halfH: this.halfH }, heightfield: this.hf,
      roads: this.roads, footpaths: this.footpaths, water: this.water,
      lawnAreas: this.lawnAreas, greens: this.greens, paved: this.paved, sand: this.sand,
      houses: this.houses, driveways: this.driveways, cars: this.cars, mailboxes: this.mailboxes,
      hedges: this.hedges, fences: this.fences, pools: this.pools, lamps: this.lamps,
      trees: this.trees, platforms: this.platforms, props: this.props, ducks: this.ducks, holes,
    };
  }
}
