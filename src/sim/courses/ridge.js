// Course 3: Maple Ridge. An autumn hillside: tee off from the overlook deck, play down
// the slope to the creekside homes, cross the ravine on the footbridge, loop through
// Hollow Park, then climb back to the ridge and finish beside the first tee.
import { smoothstep } from '../geom.js';
import { AUTUMN } from './themes.js';

const BULB = { x: -92, z: -62, r: 11 };

function base(x, z) {
  const crest = 26 + 2.5 * Math.sin(0.011 * x + 0.8);
  let h = z < -105 ? crest - 9 * smoothstep(-105, -165, z) : 6 + (crest - 6) * smoothstep(5, -105, z);
  h += 5 * smoothstep(45, 160, z); // Hollow Park rises again to the south
  const sx = (x + 95) / 24, sz = (z + 68) / 26;
  h += 7.5 * Math.exp(-(sx * sx + sz * sz) / 2); // the overlook spur
  h += 0.7 * Math.sin(0.031 * x + 0.4) * Math.cos(0.027 * z - 0.2);
  return h;
}

const ring = (c, r, n = 24) => Array.from({ length: n }, (_, i) => [c.x + r * Math.cos((i / n) * Math.PI * 2), c.z + r * Math.sin((i / n) * Math.PI * 2)]);

export default {
  id: 'ridge',
  name: 'Maple Ridge',
  blurb: 'Autumn hills: big drops from the overlook, a creek ravine and leaf piles.',
  seed: 7781,
  world: { halfW: 210, halfH: 160 },
  theme: AUTUMN,

  create(b) {
    // ------------------------------------------------------------- plan
    const ridge = b.road(
      [[-215, -104], [-140, -108], [-60, -102], [20, -108], [100, -104], [215, -100]],
      { width: 7, name: 'Ridge Rd', lawn: 38, lines: true },
    );
    const court = b.road([[-95, -104], [-94.5, -84], [-92, -66]], { width: 6, name: 'Overlook Ct', lawn: 22, shoulder: 5 });
    const lane = b.road(
      [[40, -106], [50, -86], [80, -72], [106, -55], [116, -32], [124, -12], [130, 1]],
      { width: 6, name: 'Maple Ln', lawn: 26, shoulder: 8 },
    );
    const creekside = b.road(
      [[-215, 2], [-120, -4], [-40, 4], [40, 0], [100, 0], [160, 8], [215, 4]],
      { width: 7, name: 'Creekside Dr', lawn: 34 },
    );
    const creek = b.creek(
      [[215, 26], [150, 36], [90, 30], [40, 40], [0, 32], [-50, 42], [-110, 34], [-160, 44], [-215, 38]],
      { width: 5, bed: [3.5, 0.6], depth: 0.35, name: 'creek' },
    );
    b.terrain((x, z) => {
      let h = base(x, z);
      // level the cul-de-sac bulb on top of the spur
      const db = Math.hypot(x - BULB.x, z - BULB.z);
      if (db < BULB.r + 6) h += (base(BULB.x, BULB.z) - h) * (1 - smoothstep(BULB.r, BULB.r + 6, db));
      return b.carveCreek(creek, x, z, h);
    });
    b.pavedArea(ring(BULB, BULB.r));
    b.lawnArea(ring(BULB, 5));
    b.lawnArea([[-215, 48], [215, 40], [215, 160], [-215, 160]]);
    b.footpath([[0, 4], [1, 20.5]], { name: 'Trail' });
    b.footpath([[0, 47], [3, 70], [10, 96], [30, 120], [70, 134]], { name: 'Trail' });

    // ------------------------------------------------------------ holes
    const holes = [
      {
        name: 'Overlook', par: 3, tee: { x: -79, z: -52 }, basket: { x: -30, z: -14 },
        trees: [[{ x: -56, z: -40 }, 4.5, 'broad'], [{ x: -48, z: -26 }, 4, 'broad'], [{ x: -36, z: -30 }, 3.6, 'birch'], [{ x: -62, z: -24 }, 4.2, 'broad']],
      },
      {
        name: 'Creekside', par: 4, tee: { x: -22, z: -4 }, basket: { x: 78, z: 16 },
        trees: [[{ x: 10, z: -6 }, 5, 'broad'], [{ x: 30, z: 7 }, 4.8, 'broad'], [{ x: 52, z: -6 }, 5, 'broad'], [{ x: 66, z: 8 }, 4.2, 'broad']],
        cars: [[{ x: 22, z: 3.2 }, 0], [{ x: 46, z: -2.3 }, Math.PI]],
        piles: [{ x: 4, z: 5.5 }, { x: 38, z: -5.4 }, { x: 60, z: 5.4 }],
      },
      {
        name: 'Footbridge', par: 3, tee: { x: 88, z: 10 }, basket: { x: 62, z: 68 },
        trees: [[{ x: 54, z: 58 }, 4.2, 'broad'], [{ x: 72, z: 76 }, 4, 'pine'], [{ x: 92, z: 52 }, 4.5, 'broad']],
      },
      {
        name: 'Hollow', par: 4, tee: { x: 54, z: 78 }, basket: { x: -50, z: 84 },
        trees: [[{ x: 26, z: 92 }, 5, 'broad'], [{ x: -22, z: 70 }, 4.6, 'broad'], [{ x: -30, z: 98 }, 4, 'pine'], [{ x: -62, z: 92 }, 3.6, 'birch']],
      },
      {
        name: 'Stepping Stones', par: 3, tee: { x: -62, z: 76 }, basket: { x: -84, z: 16 },
        trees: [[{ x: -90, z: 28 }, 4, 'birch'], [{ x: -60, z: 52 }, 4.4, 'broad'], [{ x: -96, z: 60 }, 4.6, 'broad']],
        rocks: [[{ x: -74, z: 38.5 }, 1.2], [{ x: -79, z: 37 }, 0.9], [{ x: -70.5, z: 40.5 }, 1.1], [{ x: -82, z: 41 }, 1.4], [{ x: -66, z: 36 }, 0.8]],
      },
      {
        name: 'Leaf Pile', par: 4, tee: { x: -96, z: 7 }, basket: { x: -186, z: 2 },
        trees: [[{ x: -118, z: -7 }, 5, 'broad'], [{ x: -140, z: 9 }, 4.8, 'broad'], [{ x: -164, z: -7 }, 4.5, 'broad'], [{ x: -176, z: 10 }, 3.6, 'birch']],
        cars: [[{ x: -132, z: 0.4 }, Math.PI]],
        piles: [{ x: -120, z: 4.6 }, { x: -151, z: 3.8 }, { x: -168, z: 2.4 }, { x: -108, z: -6.5 }],
      },
      {
        name: 'Uphill Battle', par: 4, tee: { x: -180, z: -10 }, basket: { x: -162, z: -84 }, corridor: 6,
        trees: [[{ x: -168, z: -42 }, 4.2, 'broad'], [{ x: -176, z: -62 }, 4, 'pine'], [{ x: -158, z: -70 }, 3.8, 'birch']],
        rocks: [[{ x: -174, z: -30 }, 1.3]],
      },
      {
        name: 'Ridge Run', par: 4, tee: { x: -150, z: -95 }, basket: { x: -42, z: -95 },
        trees: [[{ x: -126, z: -94 }, 5, 'broad'], [{ x: -112, z: -100 }, 4.5, 'broad'], [{ x: -72, z: -92 }, 5, 'broad'], [{ x: -58, z: -100 }, 4, 'birch']],
        piles: [{ x: -100, z: -97 }],
      },
      {
        name: 'Sky Hook', par: 3, tee: { x: -32, z: -100 }, basket: { x: -88, z: -60 },
        trees: [[{ x: -92, z: -62 }, 3, 'broad'], [{ x: -58, z: -84 }, 4.6, 'broad'], [{ x: -48, z: -78 }, 3.8, 'pine']],
      },
    ];
    for (const h of holes) b.hole(h);

    // ----------------------------------------------------- decks and bridges
    const deckAng = Math.atan2(48, 62);
    const d0 = { x: BULB.x + 11.3 * Math.cos(deckAng), z: BULB.z + 11.3 * Math.sin(deckAng) };
    const d1 = { x: d0.x + 8.5 * Math.cos(deckAng), z: d0.z + 8.5 * Math.sin(deckAng) };
    b.span(d0, d1, 3.4, b.hf.get(d0.x, d0.z) + 0.3, { kind: 'deck', rails: true });
    const bridge = (a, c) => b.span(a, c, 2.4, Math.max(b.hf.get(a.x, a.z), b.hf.get(c.x, c.z)) + 0.15, { kind: 'bridge', rails: true });
    bridge({ x: 80, z: 20 }, { x: 77, z: 45 });
    bridge({ x: 1, z: 20.5 }, { x: 0, z: 47 });

    // ----------------------------------------------------------- houses
    const lots = (path, xs, side, o) => {
      for (const x of xs) b.house(path, path.sAlong(0, x), side, o);
    };
    lots(ridge, [-195, -165, -135, -105, -75, -45, -15, 15, 45, 75, 105, 135, 165, 195], -1);
    lots(ridge, [-195, 10, 105, 135, 165, 195], 1);
    lots(creekside, [-200, -140, -112, 40, 70, 160, 190], -1);
    lots(creekside, [-200, -150, -125, -40, 20, 140, 170, 200], 1);
    for (const s of [42, 80, 118]) {
      b.house(lane, s, 1);
      b.house(lane, s + 14, -1);
    }
    for (const deg of [140, 190, 230, 300]) {
      const t = (deg * Math.PI) / 180, hv = b.R(4.2, 5), R = BULB.r + 9 + hv;
      b.placeHouse({ x: BULB.x + R * Math.cos(t), z: BULB.z + R * Math.sin(t), ang: t + Math.PI / 2, hu: b.R(5.6, 6.8), hv, front: 1, setback: 9 });
    }

    // ------------------------------------------------- hole furniture
    for (const h of holes) {
      for (const [p, r, kind] of h.trees || []) b.tree(p, r, kind);
      for (const [p, ang] of h.cars || []) b.car(p, ang);
      for (const p of h.piles || []) b.prop('leafpile', p.x, p.z, { r: 1.5 });
      for (const [p, r] of h.rocks || []) b.prop('boulder', p.x, p.z, { r });
    }
    for (const s of [30, 90, 150, 210, 270, 330]) {
      for (const side of [-1, 1]) {
        const p = creekside.offset(s + side * 12, side * 5.6);
        if (!b.inCorridor(p.x, p.z, 4)) b.prop('leafpile', p.x, p.z, { r: b.R(1.1, 1.5) });
      }
    }
    // guard wall round the overlook rim, open where the deck is
    for (let deg = 62; deg <= 138; deg += 19) {
      const t = (deg * Math.PI) / 180;
      b.prop('wall', BULB.x + (BULB.r + 1.6) * Math.cos(t), BULB.z + (BULB.r + 1.6) * Math.sin(t), { ang: t + Math.PI / 2, hu: 2, h: 0.9, r: 2 });
    }
    b.prop('bench', BULB.x + 13 * Math.cos(1.2), BULB.z + 13 * Math.sin(1.2), { ang: 1.2 + Math.PI / 2, r: 1 });
    b.prop('shelter', 2, 82, { size: 7, ang: 0.1, r: 5 });
    b.prop('table', 2, 80, { ang: 0.1, r: 1 });
    b.prop('table', 4, 86, { ang: 0.1, r: 1 });
    b.prop('swing', 40, 112, { ang: -0.3, r: 2.6 });
    for (const [x, z, r] of [[-120, -60, 1.6], [-20, -60, 1.4], [30, -80, 1.8], [120, -80, 1.5], [-140, 100, 1.6], [90, 120, 1.4], [150, 70, 1.3]]) b.prop('boulder', x, z, { r });
    for (const [x, z, r] of [[-104, 42, 1], [-60, 46, 1.2], [20, 34, 0.9], [118, 36, 1.1], [160, 38, 1.2], [-130, 37, 1]]) b.prop('boulder', x, z, { r });
    b.lampsAlong(ridge, 66, 4.6, 30);
    b.lampsAlong(creekside, 70, -4.6, 35);

    // ------------------------------------------------------------ trees
    b.scatter(9500, (x, z) => {
      const u = b.rng();
      const road = Math.min(ridge.dist(x, z), creekside.dist(x, z), lane.dist(x, z), court.dist(x, z));
      const slope = z > -97 && z < -14;
      if (slope && road > 16) return { kind: u < 0.6 ? 'broad' : u < 0.8 ? 'pine' : 'birch', r: b.R(3.2, 5.6), tall: 1.1 };
      if (road < 40) {
        if (b.rng() > 0.28) return null;
        const kind = u < 0.62 ? 'broad' : u < 0.78 ? 'pine' : u < 0.9 ? 'birch' : 'bush';
        return { kind, r: kind === 'bush' ? b.R(2.2, 3.4) : b.R(2.8, 5) };
      }
      if (z > 48) {
        if (b.rng() > 0.16) return null; // the open meadow of Hollow Park
        return { kind: u < 0.72 ? 'broad' : u < 0.88 ? 'pine' : 'birch', r: b.R(3.5, 6) };
      }
      return { kind: u < 0.58 ? 'broad' : 'pine', r: b.R(4, 6.5), tall: 1.25 };
    });
  },
};
