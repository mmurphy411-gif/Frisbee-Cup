// Harvest Hollow. The last street on the edge of town, where the back fences give way
// to farmland. Open on Harvest Lane, drop through the backyards into the creek hollow,
// walk the apple orchard rows, carry the farm pond, cut across the hay field past the
// old red barn and come home up the country road to where you started.
import { smoothstep } from '../geom.js';
import { AUTUMN } from './themes.js';

// late-season fields: the lawns are a little more golden than in town
const THEME = {
  ...AUTUMN,
  ground: {
    ...AUTUMN.ground,
    lawn: '#9aae4e', lawnMottle: ['#90a447', '#a6b85a', '#b3b65e', '#879d43', '#b9ad5a'],
  },
};

const BULB = { x: 6, z: -34, r: 11 };
const POND = { x: 8, z: 92 };
const ORCHARD = { x0: -186, x1: -82, z0: 62, z1: 118 };
const HAY = { x0: 36, x1: 128, z0: 34, z1: 140 };
const APPLE = ['#8fa83a', '#a3a843', '#b9a83f', '#7f9a3a', '#c98a2e'];

function base(x, z) {
  let h = 9;
  h += 5 * smoothstep(20, -100, z); // town sits up on the rise to the north
  h += 2.4 * Math.sin(0.016 * x + 0.5) * Math.cos(0.019 * z - 0.4);
  h += 1.1 * Math.sin(0.037 * x + 0.024 * z + 1.2);
  h += 2.6 * smoothstep(45, 140, z) * Math.sin(0.03 * x - 0.6); // swells in the farm fields
  return h;
}

const POND_DIP = 7;
const pondDip = (x, z) => POND_DIP * Math.exp(-((x - POND.x) ** 2 + (z - POND.z) ** 2) / 560);
const POND_LEVEL = base(POND.x, POND.z) - POND_DIP + 2.4;

const ring = (c, r, n = 24) => Array.from({ length: n }, (_, i) => [c.x + r * Math.cos((i / n) * Math.PI * 2), c.z + r * Math.sin((i / n) * Math.PI * 2)]);
const rect = (r) => [[r.x0, r.z0], [r.x1, r.z0], [r.x1, r.z1], [r.x0, r.z1]];
const inBox = (x, z, r, pad = 0) => x > r.x0 - pad && x < r.x1 + pad && z > r.z0 - pad && z < r.z1 + pad;

export default {
  id: 'harvest',
  name: 'Harvest Hollow',
  blurb: 'Edge-of-town autumn: a creek hollow, apple orchard rows, a farm pond and the hay field.',
  seed: 2871,
  world: { halfW: 200, halfH: 150 },
  theme: THEME,

  create(b) {
    // ------------------------------------------------------------- plan
    // Harvest Ln runs west from the county road; d > 0 is the north (uphill) side.
    const lane = b.road(
      [[140, -80], [96, -85], [44, -78], [-8, -83], [-60, -77], [-112, -83], [-160, -78], [-206, -82]],
      { width: 7, name: 'Harvest Ln', lawn: 34 },
    );
    const court = b.road([[8, -80], [7.5, -58], [BULB.x, BULB.z]], { width: 6, name: 'Cider Ct', lawn: 22, shoulder: 5 });
    const county = b.road(
      [[138, -156], [134, -100], [138, -40], [136, 14], [140, 70], [134, 156]],
      { width: 7, name: 'County Rd 9', lawn: 9, lines: true },
    );
    const farmLane = b.road([[136, 14], [112, 12], [92, 17], [78, 19]], { width: 5, name: 'Old Farm Ln', lawn: 0, shoulder: 4 });
    const creek = b.creek(
      [[-206, 24], [-166, 32], [-126, 20], [-86, 30], [-48, 34], [-20, 40], [-4, 56], [4, 74], [7, 86]],
      { width: 4.5, bed: [POND_LEVEL + 0.7, POND_LEVEL - 0.35], depth: 0.35, name: 'creek' },
    );
    b.terrain((x, z) => {
      let h = base(x, z) - pondDip(x, z);
      const db = Math.hypot(x - BULB.x, z - BULB.z);
      if (db < BULB.r + 7) h += (base(BULB.x, BULB.z) - h) * (1 - smoothstep(BULB.r, BULB.r + 7, db));
      // the hollow: a broad valley whose floor follows the creek bed down to the pond
      const q = creek.sAt(x, z, 45);
      if (q) {
        const floor = creek.bedAt(q.s) + 1.8 + 0.011 * q.d * q.d;
        const k = 2, d = Math.max(k - Math.abs(h - floor), 0) / k;
        h = Math.min(h, floor) - d * d * k * 0.25;
      }
      return b.carveCreek(creek, x, z, h);
    });
    b.pond(POND.x, POND.z, 24, POND_LEVEL, 'farm pond');
    b.clearZone(POND.x, POND.z, 22);
    b.pavedArea(ring(BULB, BULB.r));
    b.lawnArea(ring(BULB, 5));
    b.lawnArea(rect(HAY));
    b.lawnArea(rect({ x0: ORCHARD.x0 - 6, x1: ORCHARD.x1 + 6, z0: ORCHARD.z0 - 8, z1: ORCHARD.z1 + 6 }));
    b.pavedArea([[50, 8], [80, 11], [81, 28], [50, 29]], { color: '#a89a7c' }); // gravel farmyard
    b.footpath([[-6, -22], [-16, 0], [-24, 20], [-29, 30]], { name: 'Hollow Trail' });
    b.footpath([[-33, 46], [-37, 64], [-38, 82], [-30, 100]], { name: 'Hollow Trail' });
    const HL = (s, d) => lane.offset(s, d);

    // ------------------------------------------------------------ holes
    const holes = [
      {
        name: 'Pumpkin Porch', par: 3, tee: HL(26, 0), basket: HL(88, 11),
        trees: [[HL(46, 6.6), 4.6, 'broad'], [HL(60, -6.6), 4.8, 'broad'], [HL(76, 7), 3.8, 'birch'], [HL(98, 17), 3, 'bush']],
        cars: [[HL(52, -2.4), 0], [HL(70, 2.4), Math.PI]],
        piles: [HL(40, -5), HL(66, 5.4), HL(82, -5.2)],
        hedges: [[HL(78, 21), HL(97, 21)]],
      },
      {
        name: 'Cider Court', par: 3, tee: { x: 44, z: -66 }, basket: { x: 4, z: -26 },
        trees: [[{ x: 22, z: -54 }, 4.2, 'broad'], [{ x: 40, z: -48 }, 3.8, 'broad'], [{ x: -6, z: -40 }, 3.4, 'birch']],
        cars: [[{ x: 11.5, z: -60 }, Math.PI / 2]],
        piles: [{ x: 18, z: -36 }],
      },
      {
        name: 'Over the Back Fence', par: 3, tee: { x: -6, z: -16 }, basket: { x: -60, z: 20 },
        trees: [[{ x: -24, z: 6 }, 4.4, 'broad'], [{ x: -38, z: -12 }, 4, 'broad'], [{ x: -50, z: 28 }, 3.4, 'birch']],
        piles: [{ x: -44, z: 12 }],
        fences: [[{ x: -28.7, z: -10.5 }, { x: -19.9, z: 2.9 }]], // the back fence itself
      },
      {
        name: 'Creek Bend', par: 4, tee: { x: -70, z: 13 }, basket: { x: -160, z: 47 }, via: [{ x: -114, z: 6 }],
        trees: [[{ x: -92, z: -2 }, 4.5, 'broad'], [{ x: -104, z: 18 }, 3.6, 'birch'], [{ x: -128, z: -2 }, 4.4, 'broad'], [{ x: -172, z: 52 }, 4, 'broad'], [{ x: -188, z: 48 }, 3.2, 'pine']],
        rocks: [[{ x: -138, z: 33 }, 1.2], [{ x: -146, z: 29 }, 0.9], [{ x: -120, z: 26 }, 1.1]],
      },
      {
        name: 'Orchard Row', par: 3, tee: { x: -147, z: 56 }, basket: { x: -147, z: 124 }, corridor: 7,
        piles: [{ x: -154, z: 84 }, { x: -140, z: 106 }],
      },
      {
        name: 'Windfall', par: 4, tee: { x: -136, z: 132 }, basket: { x: -26, z: 106 }, via: [{ x: -76, z: 134 }],
        trees: [[{ x: -106, z: 142 }, 3.6, 'broad'], [{ x: -52, z: 132 }, 4, 'broad'], [{ x: -40, z: 96 }, 3.4, 'birch']],
        piles: [{ x: -96, z: 128 }, { x: -60, z: 124 }],
      },
      {
        name: 'Farm Pond', par: 3, tee: { x: -34, z: 90 }, basket: { x: 46, z: 96 },
        trees: [[{ x: -18, z: 78 }, 3.8, 'willow'], [{ x: -14, z: 106 }, 3.6, 'willow'], [{ x: 60, z: 90 }, 4, 'broad'], [{ x: 40, z: 84 }, 3, 'bush']],
      },
      {
        name: 'Hayfield Oak', par: 3, tee: { x: 58, z: 108 }, basket: { x: 112, z: 50 },
        trees: [[{ x: 89, z: 81 }, 5.4, 'broad'], [{ x: 100, z: 46 }, 3, 'bush']],
      },
      {
        name: 'Country Mile', par: 4, tee: { x: 118, z: 40 }, basket: { x: 118, z: -60 }, via: [{ x: 106, z: -8 }],
        trees: [[{ x: 124, z: 22 }, 4.2, 'broad'], [{ x: 96, z: 6 }, 4, 'broad'], [{ x: 96, z: -30 }, 4.6, 'broad'], [{ x: 124, z: -36 }, 4, 'birch'], [{ x: 127, z: -66 }, 3, 'bush']],
        piles: [{ x: 128, z: -14 }, { x: 127, z: 4 }],
      },
    ];
    for (const h of holes) b.hole(h);

    // ----------------------------------------------------- bridges and dock
    const bridge = (a, c) => b.span(a, c, 2.4, Math.max(b.hf.get(a.x, a.z), b.hf.get(c.x, c.z)) + 0.15, { kind: 'bridge', rails: true });
    bridge({ x: -29, z: 30 }, { x: -33, z: 46 });
    bridge({ x: -178, z: 20 }, { x: -177, z: 40 });
    b.span({ x: 1, z: 116 }, { x: 3, z: 104 }, 2.2, POND_LEVEL + 0.5, { kind: 'dock' });

    // ----------------------------------------------------------- the farm
    b.placeHouse({
      x: 64, z: 0, ang: 0, hu: 9, hv: 6.5, front: 1, stories: 2, roof: 'gable', roofH: 3.2,
      wall: '#9b3426', roofColor: '#4a4f57', trim: '#f4f1ea', door: '#f4f1ea', shutters: null,
      chimney: false, driveway: false, porchChance: 0, fenceChance: 0,
    });
    b.placeHouse({
      x: 92, z: -6, ang: 0, hu: 6.4, hv: 4.8, front: 1, stories: 2, setback: 16, wall: '#f2e8d5',
      roofColor: '#4f5560', driveSide: -1, garage: false, porchChance: 1, fenceChance: 0, carChance: 1,
    });
    // white board fences round the hay field and the farmhouse yard
    const boards = (pts) => {
      for (let k = 1; k < pts.length; k++) {
        const a = pts[k - 1], c = pts[k], n = Math.max(1, Math.round(Math.hypot(c.x - a.x, c.z - a.z) / 8));
        for (let i = 0; i < n; i++) {
          const p = { x: a.x + ((c.x - a.x) * i) / n, z: a.z + ((c.z - a.z) * i) / n };
          const q = { x: a.x + ((c.x - a.x) * (i + 1)) / n, z: a.z + ((c.z - a.z) * (i + 1)) / n };
          const m = { x: (p.x + q.x) / 2, z: (p.z + q.z) / 2 };
          if (b.inCorridor(p.x, p.z, 4) || b.inCorridor(q.x, q.z, 4) || b.inCorridor(m.x, m.z, 4)) continue;
          if (b.wet(m.x, m.z, 0.3)) continue;
          b.fence(p, q, 'picket');
        }
      }
    };
    boards([{ x: 98, z: 33 }, { x: 34, z: 33 }, { x: 34, z: 74 }]);
    boards([{ x: 128, z: 140 }, { x: 128, z: 60 }]);
    boards([{ x: 82, z: -14 }, { x: 82, z: -24 }, { x: 102, z: -24 }, { x: 102, z: -14 }]);
    // a fieldstone wall down the east side of the orchard
    for (let z = ORCHARD.z0 + 2; z < ORCHARD.z1; z += 6.4) {
      if (!b.inCorridor(-75, z, 4)) b.prop('wall', -75, z, { ang: Math.PI / 2, hu: 3.1, h: 0.8, r: 3.2 });
    }
    b.car({ x: 70, z: 18 }, 0.3, 3);
    b.prop('market', 152, 0, { ang: Math.PI / 2, hu: 4.2, hv: 2.4, r: 5 }); // the roadside farm stand
    b.prop('bench', 150, -10, { ang: Math.PI / 2, r: 1 });

    // ----------------------------------------------------------- houses
    for (let s = 14; s < lane.length - 8; s += 25) {
      b.houseIfClear(lane, s, 1, { home: s === 39 });
      b.houseIfClear(lane, s + 12, -1);
    }
    for (const s of [16, 34]) {
      b.houseIfClear(court, s, 1);
      b.houseIfClear(court, s + 6, -1);
    }
    for (let deg = 0; deg < 360; deg += 40) {
      const t = (deg * Math.PI) / 180, hv = b.R(4.2, 5), R = BULB.r + 9 + hv;
      const x = BULB.x + R * Math.cos(t), z = BULB.z + R * Math.sin(t);
      const rc = { cx: x, cz: z, hu: 6.4, hv, cos: Math.cos(t + Math.PI / 2), sin: Math.sin(t + Math.PI / 2) };
      if (!b.rectClear(rc, 5) || court.dist(x, z) < 14) continue;
      if (b.houses.some((h) => Math.hypot(h.cx - x, h.cz - z) < 14)) continue;
      // no garages around the bulb: they would push into the neighbour on the ring
      // (the roll is still drawn so the rest of the layout keeps its random stream)
      b.chance(0.45);
      b.placeHouse({ x, z, ang: t + Math.PI / 2, hu: b.R(5.6, 6.8), hv, front: 1, setback: 9, garage: false });
    }
    // a few farmhouses out along the county road
    for (const s of [40, 120, 250, 280]) b.houseIfClear(county, s, -1, { setback: 14, fenceChance: 0 });

    // ------------------------------------------------- hole furniture
    for (const h of holes) {
      for (const [p, r, kind] of h.trees || []) b.tree(p, r, kind);
      for (const [p, turn] of h.cars || []) b.car(p, (p.tz !== undefined ? Math.atan2(p.tz, p.tx) : 0) + turn);
      for (const p of h.piles || []) b.prop('leafpile', p.x, p.z, { r: 1.5 });
      for (const [p, r] of h.rocks || []) b.prop('boulder', p.x, p.z, { r });
      for (const [a, c] of h.hedges || []) b.hedge(a, c);
      for (const [a, c] of h.fences || []) b.fence(a, c, 'privacy');
    }
    // backyard pools on the downhill side of the lane
    for (const s of [150, 205, 290]) {
      const p = HL(s, -30);
      if (!b.inCorridor(p.x, p.z, 9) && !b.blocked(p.x, p.z, 5)) b.pool(p, Math.atan2(p.tz, p.tx), 4.6, 2.8);
    }
    for (let s = 50; s < lane.length - 20; s += 60) {
      const p = HL(s, -4.4);
      if (!b.inCorridor(p.x, p.z, 3)) b.prop('hydrant', p.x, p.z, { r: 0.3 });
    }
    for (let s = 30; s < lane.length - 20; s += 34) {
      for (const side of [-1, 1]) {
        const p = HL(s + side * 9, side * 5.4);
        if (!b.inCorridor(p.x, p.z, 4) && !b.blocked(p.x, p.z, 1)) b.prop('leafpile', p.x, p.z, { r: b.R(1.1, 1.5) });
      }
    }
    b.lampsAlong(lane, 60, 4.6, 30);
    b.lampsAlong(court, 30, -4, 12);
    b.prop('swing', -100, -50, { ang: 0.1, r: 2.6 });
    // the hollow
    for (const [x, z, r] of [[-196, 34, 1.3], [-110, 34, 1.5], [-70, 40, 1.2], [-40, 30, 1.1], [-24, 56, 1.4], [-160, 18, 1.2], [-90, 22, 0.9]]) {
      if (!b.inCorridor(x, z, 4)) b.prop('boulder', x, z, { r });
    }
    b.prop('bench', -40, 52, { ang: 2.8, r: 1 });
    // round the farm pond
    b.prop('shelter', 30, 124, { size: 7, ang: 0.2, r: 5 });
    b.prop('table', 29, 123, { ang: 0.2, r: 1 });
    b.prop('table', 33, 127, { ang: 0.2, r: 1 });
    b.prop('canoe', -8, 116, { ang: 1.4, color: '#c9762e', r: 2 });
    b.prop('bench', -14, 118, { ang: -0.6, r: 1 });
    b.ducks.push({ x: POND.x + 2, z: POND.z - 3, r: 7, speed: 0.4, phase: 2 });
    // reeds in the shallows, found by walking out from the middle to the shore
    for (let k = 0; k < 34; k++) {
      const a = (k / 34) * Math.PI * 2, c = Math.cos(a), s = Math.sin(a);
      let r = 6;
      while (r < 26 && b.hf.get(POND.x + c * r, POND.z + s * r) < POND_LEVEL - 0.3) r += 0.5;
      const px = POND.x + c * r, pz = POND.z + s * r;
      if (r < 26 && b.chance(0.6) && !b.inCorridor(px, pz, 3)) b.prop('reeds', px, pz, { n: 5 + Math.floor(b.rng() * 7), r: 0.6 });
    }
    b.prop('lily', POND.x - 6, POND.z + 4, { n: 9, r: 0.1 });
    b.prop('lily', POND.x + 7, POND.z + 6, { n: 7, r: 0.1 });

    // ------------------------------------------------------------ orchard
    // apple trees in rows, with one wide alley left open for Orchard Row
    for (const x of [-183, -171, -159, -135, -123, -111, -99, -87]) {
      for (let z = ORCHARD.z0 + 2; z <= ORCHARD.z1; z += 8.6) {
        const r = b.R(3.0, 3.5);
        if (b.clearForTree(x, z, r, { corridor: r + 3, roadPad: 3 })) {
          b.tree({ x, z }, r, 'broad', { color: b.pick(APPLE), tall: 0.8 });
        }
      }
    }

    // ------------------------------------------------------------ trees
    const roads = [lane, court, county, farmLane];
    b.scatter(9000, (x, z) => {
      if (inBox(x, z, ORCHARD, 8) || inBox(x, z, HAY, 2)) return null;
      if (x > 44 && x < 112 && z > -28 && z < 34) return null; // the farmyard
      const u = b.rng();
      const near = Math.min(...roads.map((r) => r.dist(x, z)));
      if (near < 36) {
        if (b.rng() > 0.3) return null; // yards and verges stay open
        const kind = u < 0.62 ? 'broad' : u < 0.78 ? 'pine' : u < 0.9 ? 'birch' : 'bush';
        return { kind, r: kind === 'bush' ? b.R(2.2, 3.4) : b.R(2.8, 5) };
      }
      const cq = creek.sAt(x, z, 40);
      if (cq && cq.d < 30) {
        if (b.rng() > 0.55) return null; // the hollow is wooded, but airy
        return { kind: u < 0.55 ? 'broad' : u < 0.8 ? 'birch' : 'willow', r: b.R(3, 5) };
      }
      if (z > 40 && b.rng() > 0.5) return null; // farm meadows
      return { kind: u < 0.6 ? 'broad' : u < 0.85 ? 'pine' : 'birch', r: b.R(3.6, 6), tall: 1.2 };
    });
  },
};
