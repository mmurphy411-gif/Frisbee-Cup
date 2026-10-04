// Course 9: Frostwood. A snowed-in neighbourhood in the pines. Skid a putt across the
// frozen pond, climb the sledding hill and ride the toboggan run back down, storm the
// snow fort and finish round the far side of the pond. Ice is slick: discs slide on it.
import { smoothstep } from '../geom.js';
import { WINTER } from './themes.js';

const SLED = { x: 60, z: -50 };
const POND = { x: -90, z: 40, r: 24 };
const BULB = { x: 0, z: 52, r: 11 };
const ICE = '#cfe4ee';

function base(x, z) {
  const sx = x - SLED.x, sz = z - SLED.z;
  return (
    8 + 16 * Math.exp(-(sx * sx + sz * sz) / 2888) + 4 * smoothstep(-60, -150, z) +
    1.0 * Math.sin(0.02 * x + 0.4) * Math.cos(0.024 * z - 0.3) + 0.4 * Math.sin(0.05 * x - 0.04 * z)
  );
}

const ICE_H = base(POND.x, POND.z) - 2.2;

function land(x, z) {
  let h = base(x, z);
  const dp = Math.hypot(x - POND.x, z - POND.z);
  if (dp < POND.r + 12) h = ICE_H + (h - ICE_H) * smoothstep(POND.r, POND.r + 12, dp);
  const db = Math.hypot(x - BULB.x, z - BULB.z);
  if (db < BULB.r + 6) h += (base(BULB.x, BULB.z) - h) * (1 - smoothstep(BULB.r, BULB.r + 6, db));
  return h;
}

const ring = (c, r, n = 24) => Array.from({ length: n }, (_, i) => [c.x + r * Math.cos((i / n) * Math.PI * 2), c.z + r * Math.sin((i / n) * Math.PI * 2)]);

export default {
  id: 'frostwood',
  name: 'Frostwood',
  blurb: 'Snowy pines, a frozen pond that sends discs skidding and a sledding hill.',
  seed: 1224,
  world: { halfW: 200, halfH: 150 },
  theme: WINTER,

  create(b) {
    // ------------------------------------------------------------- plan
    const frost = b.road(
      [[-215, 92], [-100, 100], [0, 92], [100, 100], [215, 94]],
      { width: 7, name: 'Frost Ln', lawn: 30, lines: true },
    );
    const holly = b.road([[-158, -165], [-160, 0], [-156, 96]], { width: 6.5, name: 'Holly Rd', lawn: 28 });
    const summit = b.road(
      [[-215, -112], [-100, -120], [0, -114], [100, -124], [215, -116]],
      { width: 6.5, name: 'Summit Dr', lawn: 28 },
    );
    const court = b.road([[0, 93], [1, 72], [BULB.x, BULB.z]], { width: 6, name: 'Evergreen Ct', lawn: 20 });
    b.terrain(land);
    b.pavedArea(ring(POND, POND.r + 0.5, 40), { color: ICE }); // the ice
    b.pavedArea(ring(BULB, BULB.r));
    b.lawnArea(ring(BULB, 5));
    b.lawnArea(ring(SLED, 52, 32)); // the open sledding slope
    b.footpath([[-150, 60], [-122, 66], [-104, 72], [-80, 70], [-60, 60]], { name: 'Pond path' });

    // ------------------------------------------------------------ holes
    const holes = [
      {
        name: 'Thin Ice', par: 3, tee: { x: -140, z: 30 }, basket: { x: -84, z: 44 },
        trees: [[{ x: -124, z: 22 }, 3.6, 'pine'], [{ x: -118, z: 46 }, 3.2, 'pine']],
      },
      {
        name: 'Rink Side', par: 4, tee: { x: -60, z: 50 }, basket: { x: 10, z: -20 }, via: [{ x: -30, z: 20 }],
        trees: [[{ x: -44, z: 32 }, 4, 'pine'], [{ x: -16, z: 6 }, 4.2, 'broad'], [{ x: 0, z: -6 }, 3.4, 'pine']],
      },
      {
        name: 'Sledding Hill', par: 4, tee: { x: 6, z: 2 }, basket: { x: 60, z: -50 },
        trees: [[{ x: 22, z: -6 }, 3.2, 'pine']],
      },
      {
        name: 'Toboggan Run', par: 3, tee: { x: 66, z: -56 }, basket: { x: 130, z: -20 },
        trees: [[{ x: 112, z: -38 }, 3.6, 'pine'], [{ x: 122, z: -14 }, 3, 'broad']],
      },
      {
        name: 'Snow Fort', par: 3, tee: { x: 140, z: -10 }, basket: { x: 170, z: 50 },
        trees: [[{ x: 150, z: 18 }, 3.8, 'pine'], [{ x: 178, z: 28 }, 3.2, 'pine']],
      },
      {
        name: 'Evergreen', par: 4, tee: { x: 160, z: 64 }, basket: { x: 60, z: 40 }, via: [{ x: 110, z: 70 }],
        trees: [[{ x: 136, z: 62 }, 4, 'pine'], [{ x: 96, z: 58 }, 4.2, 'pine'], [{ x: 74, z: 50 }, 3.4, 'broad']],
      },
      {
        name: 'Cocoa Break', par: 3, tee: { x: 54, z: 30 }, basket: { x: 1, z: 47 },
        trees: [[{ x: 28, z: 44 }, 3.4, 'pine']],
      },
      {
        name: 'Icicle Lane', par: 4, tee: { x: -12, z: 70 }, basket: { x: -110, z: 124 }, via: [{ x: -40, z: 118 }],
        trees: [[{ x: -28, z: 88 }, 3.2, 'broad'], [{ x: -66, z: 128 }, 4, 'pine'], [{ x: -88, z: 114 }, 3.6, 'pine']],
      },
      {
        name: 'Home for the Holidays', par: 4, tee: { x: -124, z: 112 }, basket: { x: -180, z: 24 }, via: [{ x: -130, z: 70 }],
        trees: [[{ x: -138, z: 90 }, 3.8, 'pine'], [{ x: -150, z: 54 }, 3.4, 'broad'], [{ x: -170, z: 36 }, 3.6, 'pine']],
      },
    ];
    for (const h of holes) b.hole(h);

    // ----------------------------------------------------------- houses
    const lots = (path, from, step, side, o = {}) => {
      for (let s = from; s < path.length - 10; s += step) b.houseIfClear(path, s, side, { fenceChance: 0.2, porchChance: 0.55, ...o });
    };
    lots(frost, 14, 25, 1);
    lots(frost, 26, 25, -1);
    lots(holly, 20, 25, 1);
    lots(holly, 32, 25, -1);
    lots(summit, 14, 25, -1);
    lots(summit, 26, 25, 1);
    for (let deg = 0; deg < 360; deg += 45) {
      const t = (deg * Math.PI) / 180, hv = b.R(4.2, 5), R = BULB.r + 9 + hv;
      const x = BULB.x + R * Math.cos(t), z = BULB.z + R * Math.sin(t);
      const rect = { cx: x, cz: z, hu: 6.4, hv, cos: Math.cos(t + Math.PI / 2), sin: Math.sin(t + Math.PI / 2) };
      if (!b.rectClear(rect, 5) || court.dist(x, z) < 14 || frost.dist(x, z) < 16) continue;
      if (b.houses.some((h) => Math.hypot(h.cx - x, h.cz - z) < 14)) continue;
      b.placeHouse({ x, z, ang: t + Math.PI / 2, hu: b.R(5.6, 6.8), hv, front: 1, setback: 9, fenceChance: 0, porchChance: 0.6 });
    }

    // ------------------------------------------------- hole furniture
    for (const h of holes) for (const [p, r, kind] of h.trees || []) b.tree(p, r, kind);
    // snowmen dotted about, a snow fort on the fifth and boards along the rink
    for (const [x, z, s, c] of [[-70, 58, 1, '#d33a2c'], [-116, 18, 0.9, '#2f5d8a'], [40, -24, 1.1, '#3d7a4a'], [86, -70, 1, '#d33a2c'],
      [156, 34, 1.2, '#2f5d8a'], [182, 56, 0.9, '#c98a1b'], [14, 40, 1, '#7a2f4f'], [-40, 104, 1, '#3d7a4a'], [-164, 66, 1.1, '#d33a2c']]) {
      if (!b.inCorridor(x, z, 2.5)) b.prop('snowman', x, z, { size: s, color: c, ang: b.R(0, 6.3), r: 0.6 * s });
    }
    for (const [x, z, ang] of [[160, 26, 0.5], [165, 30, 0.5], [176, 40, 1.9], [180, 46, 1.9]]) {
      b.prop('wall', x, z, { ang, hu: 2.2, h: 1.1, r: 2.2, color: '#f2f6f9', cap: '#ffffff' });
    }
    for (const deg of [200, 230, 300, 330]) {
      const t = (deg * Math.PI) / 180, R = POND.r + 0.8;
      b.prop('wall', POND.x + R * Math.cos(t), POND.z + R * Math.sin(t), { ang: t + Math.PI / 2, hu: 4.5, h: 0.5, r: 1.5, color: '#ffffff', cap: '#d33a2c' });
    }
    for (const [x, z, ang] of [[-112, 20, 0.8], [-66, 22, 2.4], [70, -82, 0], [44, -64, 0.6]]) b.prop('bench', x, z, { ang, r: 1 });
    b.prop('shelter', -120, 70, { size: 6, ang: 0.1, r: 4.5 }); // warming hut
    b.prop('table', -120, 70, { ang: 0.1, r: 1 });
    b.prop('bin', -110, 76, { r: 0.5 });
    b.lampsAlong(frost, 60, 4.6, 30);
    b.lampsAlong(holly, 64, -4.4, 30);
    b.lampsAlong(summit, 70, 4.4, 40);

    // ------------------------------------------------------------ trees
    const roads = [frost, holly, summit, court];
    b.scatter(10000, (x, z) => {
      const u = b.rng();
      if (Math.hypot(x - SLED.x, z - SLED.z) < 48) return null; // keep the sledding hill open
      const near = Math.min(...roads.map((r) => r.dist(x, z)));
      if (near < 30) {
        if (b.rng() > 0.3) return null;
        const kind = u < 0.6 ? 'pine' : u < 0.85 ? 'broad' : 'birch';
        return { kind, r: b.R(2.8, 4.6) };
      }
      const kind = u < 0.75 ? 'pine' : u < 0.92 ? 'broad' : 'birch';
      return { kind, r: kind === 'pine' ? b.R(3, 5) : b.R(3.4, 5.2), tall: 1.25 };
    });
  },
};
