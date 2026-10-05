// Course 4: Pinecrest Woods. A winding drive through tall pines with three cul-de-sacs
// off it. Thread tunnel shots up to Fox Run, play across the north woods to Owl Court,
// cross the drive and the creek, round the mill pond and finish at the bottom of Elk Court.
import { smoothstep } from '../geom.js';
import { PINES } from './themes.js';

const BULBS = [{ x: -104, z: -72, r: 11 }, { x: 88, z: -74, r: 11 }, { x: -34, z: 70, r: 11 }];
const POND = { x: 52, z: 90 };

function base(x, z) {
  return (
    9 + 6 * smoothstep(-10, -140, z) - 3 * smoothstep(20, 120, z) +
    2.4 * Math.sin(0.019 * x + 0.5) * Math.cos(0.023 * z - 0.2) +
    1.0 * Math.sin(0.041 * x + 0.03 * z + 0.7)
  );
}

function land(x, z) {
  let h = base(x, z);
  // each cul-de-sac bulb is levelled
  for (const bl of BULBS) {
    const d = Math.hypot(x - bl.x, z - bl.z);
    if (d < bl.r + 8) h += (base(bl.x, bl.z) - h) * (1 - smoothstep(bl.r, bl.r + 8, d));
  }
  const px = x - POND.x, pz = z - POND.z;
  return h - 5 * Math.exp(-(px * px + pz * pz) / 260);
}

const ring = (c, r, n = 24) => Array.from({ length: n }, (_, i) => [c.x + r * Math.cos((i / n) * Math.PI * 2), c.z + r * Math.sin((i / n) * Math.PI * 2)]);

export default {
  id: 'pinecrest',
  name: 'Pinecrest Woods',
  blurb: 'Tunnel shots through tall pines, three cul-de-sacs and a mill pond.',
  seed: 3319,
  world: { halfW: 200, halfH: 150 },
  theme: PINES,

  create(b) {
    // ------------------------------------------------------------- plan
    const drive = b.road(
      [[-215, 0], [-150, -8], [-90, 6], [-30, -4], [30, 8], [90, -2], [150, 6], [215, 0]],
      { width: 7, name: 'Pinecrest Dr', lawn: 30 },
    );
    const courts = [
      b.road([[-100, 3], [-101, -35], [-104, -72]], { width: 6, name: 'Fox Run', lawn: 22 }),
      b.road([[82, 0], [83, -38], [88, -74]], { width: 6, name: 'Owl Ct', lawn: 22 }),
      b.road([[-30, -2], [-32, 35], [-34, 70]], { width: 6, name: 'Elk Ct', lawn: 22 }),
    ];
    const pondLevel = land(POND.x, POND.z) + 2.2;
    const creek = b.creek(
      [[215, 40], [180, 36], [140, 50], [104, 58], [76, 76], [62, 86]],
      { width: 4.5, bed: [pondLevel + 1.4, pondLevel - 0.35], depth: 0.35, name: 'creek' },
    );
    b.terrain((x, z) => b.carveCreek(creek, x, z, land(x, z)));
    b.pond(POND.x, POND.z, 20, pondLevel, 'mill pond');
    b.clearZone(POND.x, POND.z, 17);
    for (const bl of BULBS) {
      b.pavedArea(ring(bl, bl.r));
      b.lawnArea(ring(bl, 5));
    }
    b.footpath([[-190, -6], [-196, -40], [-188, -80], [-170, -116]], { name: 'Pine Trail' });
    b.footpath([[44, -10], [40, -50], [26, -86], [-10, -112], [-60, -126], [-100, -96]], { name: 'Ridge Trail' });

    // ------------------------------------------------------------ holes
    const holes = [
      {
        name: 'Trailhead', par: 3, tee: { x: -178, z: -18 }, basket: { x: -158, z: -96 }, corridor: 5,
        trees: [[{ x: -172, z: -52 }, 3.6, 'pine'], [{ x: -160, z: -70 }, 3.2, 'pine'], [{ x: -150, z: -100 }, 3, 'pine']],
      },
      {
        name: 'Fox Run', par: 3, tee: { x: -152, z: -106 }, basket: { x: -105, z: -77 }, corridor: 6,
        trees: [[{ x: -134, z: -98 }, 3.4, 'pine'], [{ x: -120, z: -84 }, 3, 'birch']],
      },
      {
        name: 'Over the Ridge', par: 4, tee: { x: -94, z: -92 }, basket: { x: 34, z: -104 }, via: [{ x: -24, z: -120 }], corridor: 6,
        trees: [[{ x: -60, z: -110 }, 4, 'pine'], [{ x: -36, z: -112 }, 3.6, 'pine'], [{ x: 4, z: -106 }, 4, 'broad'], [{ x: 20, z: -116 }, 3.4, 'pine']],
        rocks: [[{ x: -48, z: -120 }, 1.4], [{ x: 12, z: -102 }, 1.1]],
      },
      {
        name: 'Owl Court', par: 3, tee: { x: 40, z: -116 }, basket: { x: 89, z: -79 },
        trees: [[{ x: 62, z: -102 }, 4, 'pine'], [{ x: 74, z: -88 }, 3.4, 'birch']],
      },
      {
        name: 'Night Owl', par: 4, tee: { x: 100, z: -62 }, basket: { x: 186, z: -34 }, via: [{ x: 150, z: -78 }], corridor: 5.5,
        trees: [[{ x: 124, z: -66 }, 3.6, 'pine'], [{ x: 140, z: -84 }, 3.8, 'pine'], [{ x: 164, z: -62 }, 4, 'broad'], [{ x: 178, z: -46 }, 3.2, 'pine']],
      },
      {
        name: 'The Crossing', par: 3, tee: { x: 190, z: -20 }, basket: { x: 176, z: 62 },
        trees: [[{ x: 170, z: 22 }, 4, 'broad'], [{ x: 190, z: 54 }, 3.4, 'pine']],
      },
      {
        name: 'Mill Pond', par: 4, drop: [58, 112], tee: { x: 164, z: 74 }, basket: { x: 28, z: 110 }, via: [{ x: 112, z: 104 }],
        trees: [[{ x: 134, z: 80 }, 4.2, 'broad'], [{ x: 118, z: 112 }, 3.8, 'pine'], [{ x: 86, z: 116 }, 4.5, 'broad'], [{ x: 26, z: 120 }, 3.2, 'birch']],
      },
      {
        name: 'Elk Court', par: 3, tee: { x: 18, z: 116 }, basket: { x: -34, z: 75 },
        trees: [[{ x: 6, z: 96 }, 4.2, 'pine'], [{ x: -12, z: 90 }, 3.6, 'broad']],
      },
      {
        name: 'Homeward', par: 4, tee: { x: -50, z: 56 }, basket: { x: -160, z: 26 }, via: [{ x: -100, z: 40 }], corridor: 6,
        trees: [[{ x: -76, z: 44 }, 4, 'pine'], [{ x: -96, z: 52 }, 3.8, 'pine'], [{ x: -126, z: 30 }, 4.2, 'broad'], [{ x: -144, z: 40 }, 3.4, 'birch']],
        rocks: [[{ x: -116, z: 46 }, 1.3]],
      },
    ];
    for (const h of holes) b.hole(h);

    // ----------------------------------------------------- bridges and docks
    const bridge = (a, c) => b.span(a, c, 2.4, Math.max(b.hf.get(a.x, a.z), b.hf.get(c.x, c.z)) + 0.15, { kind: 'bridge', rails: true });
    bridge({ x: 160, z: 34 }, { x: 160, z: 52 });
    b.span({ x: 42, z: 104 }, { x: 46, z: 92 }, 2.2, pondLevel + 0.5, { kind: 'dock' });

    // ----------------------------------------------------------- houses
    for (let s = 12; s < drive.length - 10; s += 26) {
      b.houseIfClear(drive, s, -1, { fenceChance: 0.1 });
      b.houseIfClear(drive, s + 13, 1, { fenceChance: 0.1 });
    }
    for (const court of courts) {
      for (let s = 24; s < court.length - 16; s += 24) {
        b.houseIfClear(court, s, -1, { fenceChance: 0.1 });
        b.houseIfClear(court, s + 10, 1, { fenceChance: 0.1 });
      }
    }
    for (const bl of BULBS) {
      for (let deg = 0; deg < 360; deg += 45) {
        const t = (deg * Math.PI) / 180, hv = b.R(4.2, 5), R = bl.r + 9 + hv;
        const x = bl.x + R * Math.cos(t), z = bl.z + R * Math.sin(t);
        const rect = { cx: x, cz: z, hu: 6.4, hv, cos: Math.cos(t + Math.PI / 2), sin: Math.sin(t + Math.PI / 2) };
        if (!b.rectClear(rect, 5) || courts.some((c) => c.dist(x, z) < 14)) continue;
        if (b.houses.some((h) => Math.hypot(h.cx - x, h.cz - z) < 14)) continue;
        b.placeHouse({ x, z, ang: t + Math.PI / 2, hu: b.R(5.6, 6.8), hv, front: 1, setback: 9, fenceChance: 0 });
      }
    }

    // ------------------------------------------------- hole furniture
    for (const h of holes) {
      for (const [p, r, kind] of h.trees || []) b.tree(p, r, kind);
      for (const [p, r] of h.rocks || []) b.prop('boulder', p.x, p.z, { r });
    }
    for (const [x, z, r] of [[-186, -60, 1.5], [-130, -128, 1.8], [-70, -60, 1.4], [10, -60, 1.6], [120, -110, 1.7], [196, 90, 1.5], [-120, 90, 1.6], [-180, 120, 1.4], [100, 130, 1.3]]) {
      if (!b.inCorridor(x, z, 4)) b.prop('boulder', x, z, { r });
    }
    b.prop('bench', 36, 102, { ang: 2.4, r: 1 });
    b.prop('bench', -190, -26, { ang: 0.2, r: 1 });
    b.prop('table', 70, 76, { ang: 0.6, r: 1.2 });
    b.prop('bin', -186, -30, { r: 0.5 });
    b.lampsAlong(drive, 70, 4.6, 40);
    b.ducks.push({ x: POND.x - 2, z: POND.z + 2, r: 6, speed: 0.4, phase: 1 });
    for (const [px, pz] of ring(POND, 15, 30)) {
      const g = b.hf.get(px, pz) - pondLevel;
      if (g > -0.35 && g < 0.2 && b.chance(0.5)) b.prop('reeds', px + b.R(-1, 1), pz + b.R(-1, 1), { n: 5 + Math.floor(b.rng() * 7), r: 0.6 });
    }

    // ------------------------------------------------------------ trees
    const roads = [drive, ...courts];
    b.scatter(11000, (x, z) => {
      const u = b.rng();
      const near = Math.min(...roads.map((r) => r.dist(x, z)));
      if (near < 30) {
        if (b.rng() > 0.35) return null;
        const kind = u < 0.55 ? 'pine' : u < 0.8 ? 'broad' : u < 0.9 ? 'birch' : 'bush';
        return { kind, r: kind === 'bush' ? b.R(2.2, 3.2) : b.R(2.8, 4.6) };
      }
      const kind = u < 0.68 ? 'pine' : u < 0.9 ? 'broad' : 'birch';
      return { kind, r: kind === 'pine' ? b.R(3, 4.8) : b.R(3.4, 5.4), tall: 1.3 };
    });
  },
};
