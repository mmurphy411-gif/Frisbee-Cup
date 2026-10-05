// Marina Point. A harbour town on a point: a marina basin walled in by a seawall
// promenade, with Point Rd running out past the waterfront houses to the lighthouse at
// the tip. Play along the seawall, down the ocean side of the point to the lighthouse,
// carry the basin mouth, cross the dunes on the beach and climb the hill before dropping
// back to the harbour front.
import { smoothstep } from '../geom.js';
import { SEASIDE } from './themes.js';

const L = 1.5; // sea level
const LIGHT = { x: 74, z: 120 };

// Harbour-town colours: brighter clapboard than the bluff cottages.
const THEME = {
  ...SEASIDE,
  walls: ['#f4f1ea', '#9fb8c8', '#e8c9a0', '#c95f4a', '#5f8fa8', '#e8e2d2', '#7d9a8a', '#f2d48a'],
  foliage: { ...SEASIDE.foliage, cypress: ['#3f6b4a', '#4a7752', '#365f42'] },
};

const beachZ = (x) => 96 + 3 * Math.sin(0.04 * x + 1);
const coveZ = (x) => 22 - 4 * Math.sin(0.05 * x);

// The water's edge, as one closed outline round the sea and the basin.
function coast() {
  const pts = [];
  // the beach, west of the basin
  for (let x = -215; x <= -58; x += 6) pts.push([x, beachZ(x)]);
  // the basin: west seawall, the harbour head and the east seawall
  pts.push([-46, 93], [-40, 87], [-40, 0], [-34, -6], [24, -6], [30, 0], [30, 86]);
  // round the point to the lighthouse and up its ocean side
  pts.push([32, 98], [38, 110], [48, 120], [60, 127], [74, 130], [87, 125], [97, 114], [102, 98], [104, 80], [106, 62], [110, 46], [118, 34], [130, 26]);
  // the cove
  for (let x = 140; x <= 215; x += 8) pts.push([x, coveZ(x)]);
  pts.push([215, 170], [-215, 170]);
  return pts;
}

function height(sea, x, z) {
  const sd = sea.poly.sdf(x, z, 60);
  // which kind of shore: sand on the beach and the cove, a seawall round the basin,
  // rock everywhere else
  const sand = Math.min(1, smoothstep(-50, -72, x) + smoothstep(112, 130, x));
  const wall = (1 - sand) * smoothstep(96, 86, z) * smoothstep(40, 32, x);
  const rock = 1 - sand - wall;
  if (sd < 0) {
    const d = -sd;
    return wall * (L - Math.min(2.6, 1.0 + d * 0.5)) + rock * (L - Math.min(2.8, 0.4 + d * 0.25)) + sand * Math.max(L - 3, L - 0.05 - d * 0.1);
  }
  const roll = 0.5 * Math.sin(0.021 * x + 0.3) * Math.cos(0.017 * z - 0.5) + 0.3 * Math.sin(0.045 * x - 0.035 * z);
  const hill = 8 * smoothstep(-40, -150, z) + 1.5 * smoothstep(-60, -150, z) * Math.sin(0.02 * x);
  const inland = L + 2.6 + roll + hill;
  const dunes = 1.6 * Math.max(0, Math.sin(0.13 * x + 0.7) * Math.cos(0.21 * z - 0.4) + 0.3) * smoothstep(8, 16, sd) * (1 - smoothstep(30, 40, sd));
  const wallP = L + 1.3 + Math.min(sd, 4) * 0.1 + (inland - L - 1.7) * smoothstep(4, 22, sd);
  const rockP = L + 0.5 + Math.min(sd, 8) * 0.2 + 0.35 * Math.sin(0.7 * x) * Math.cos(0.6 * z) * (1 - smoothstep(6, 12, sd));
  const rockIn = rockP + (inland - rockP) * smoothstep(6, 24, sd);
  const sandP = L + 0.15 + Math.min(sd, 45) * 0.045 + dunes;
  const sandIn = sandP + (inland - sandP) * smoothstep(34, 56, sd);
  return wall * wallP + rock * rockIn + sand * sandIn;
}

const ring = (c, r, n = 24) => Array.from({ length: n }, (_, i) => [c.x + r * Math.cos((i / n) * Math.PI * 2), c.z + r * Math.sin((i / n) * Math.PI * 2)]);

export default {
  id: 'marina',
  name: 'Marina Point',
  blurb: 'Seawall drives, a carry over the basin mouth and a basket by the lighthouse.',
  seed: 7319,
  world: { halfW: 200, halfH: 150 },
  theme: THEME,

  create(b) {
    // ------------------------------------------------------------- plan
    // s runs east; side +1 is the harbour side
    const harbor = b.road(
      [[-215, -44], [-150, -40], [-80, -44], [-10, -40], [70, -44], [140, -40], [215, -44]],
      { width: 7.5, name: 'Harbor Rd', lawn: 26, lines: true },
    );
    // s runs south out the point; side +1 is the basin side
    const point = b.road([[70, -44], [68, 0], [72, 45], [70, 86]], { width: 6.5, name: 'Point Rd', lawn: 22 });
    // s runs south then west behind the beach; side -1 is the beach side
    const dune = b.road([[-88, -44], [-90, -10], [-104, 24], [-140, 35], [-215, 33]], { width: 6.5, name: 'Dune Rd', lawn: 26 });
    // s runs east; side +1 faces down the hill
    const hill = b.road(
      [[-215, -118], [-120, -114], [-20, -120], [80, -114], [215, -118]],
      { width: 6.5, name: 'Hill St', lawn: 26 },
    );
    const lookout = b.road([[130, -40], [128, -80], [132, -116]], { width: 6, name: 'Lookout Ln', lawn: 22 });
    const sea = b.lake(coast(), L, { name: 'harbour', per: 1 });
    b.terrain((x, z) => height(sea, x, z));

    // the beach and the cove are sand from the waterline back to the dunes
    const beach = [];
    for (let x = -210; x <= -64; x += 8) beach.push([x, beachZ(x) - 38]);
    for (let x = -64; x >= -210; x -= 8) beach.push([x, beachZ(x) + 3]);
    b.sandArea(beach);
    const cove = [];
    for (let x = 136; x <= 210; x += 8) cove.push([x, coveZ(x) - 12]);
    for (let x = 210; x >= 136; x -= 8) cove.push([x, coveZ(x) + 3]);
    b.sandArea(cove);
    b.pavedArea(ring({ x: 70, z: 92 }, 8)); // turnaround at the end of Point Rd
    b.pavedArea([[80, -32], [112, -32], [112, -16], [80, -16]]); // marina lot
    b.lawnArea(ring(LIGHT, 18));
    b.lawnArea([[76, 10], [104, 10], [104, 96], [76, 96]]); // Point Park
    b.lawnArea([[-74, -32], [-40, -32], [-40, 90], [-74, 90]]); // Harbour Green
    b.lawnArea([[-40, -32], [50, -32], [50, -6], [-40, -6]]); // the harbour front
    b.lawnArea([[30, -6], [50, -6], [50, 92], [30, 92]]); // backyards on the basin
    // the seawall promenade round the basin; d > 0 is the water side all the way
    const prom = b.footpath(
      [[-46, 84], [-46, 20], [-45, -10], [-30, -12.5], [10, -12.5], [27, -11], [36, 6], [36, 40], [36, 78]],
      { name: 'Promenade', color: '#cfc6b4', width: 3.4 },
    );
    b.footpath([[-122, 40], [-120, 52], [-118, 60]], { name: 'Beach access', color: '#c9b79c' });

    // ------------------------------------------------------------ holes
    const holes = [
      {
        name: 'Cast Off', par: 3, drop: [-14, -19], tee: { x: -62, z: -20 }, basket: { x: 16, z: -18 },
        trees: [[{ x: -30, z: -29 }, 3.4, 'broad'], [{ x: 2, z: -28 }, 3, 'broad']],
      },
      {
        name: 'Point Park', par: 4, tee: { x: 34, z: -24 }, basket: { x: 88, z: 66 }, via: [{ x: 86, z: 16 }],
        trees: [[{ x: 79, z: 32 }, 3.2, 'broad'], [{ x: 98, z: 40 }, 3, 'cypress'], [{ x: 78, z: 56 }, 3.2, 'cypress']],
        cars: [[{ x: 66.2, z: -16 }, Math.PI / 2]],
      },
      {
        name: 'The Beacon', par: 3, tee: { x: 96, z: 74 }, basket: { x: 58, z: 106 },
        trees: [[{ x: 68, z: 107 }, 3, 'cypress']],
      },
      {
        name: 'Basin Crossing', par: 3, tee: { x: 44, z: 102 }, basket: { x: -52, z: 80 },
        trees: [],
      },
      {
        name: 'Sandpiper Run', par: 4, tee: { x: -62, z: 88 }, basket: { x: -165, z: 57 }, via: [{ x: -115, z: 72 }],
        trees: [[{ x: -92, z: 72 }, 2, 'bush'], [{ x: -140, z: 72 }, 2.2, 'bush']],
      },
      {
        name: 'Beach Access', par: 3, tee: { x: -176, z: 50 }, basket: { x: -147, z: -26 },
        trees: [[{ x: -149, z: 8 }, 3.6, 'broad'], [{ x: -170, z: -6 }, 3.4, 'broad']],
      },
      {
        name: 'Crow’s Nest', par: 3, tee: { x: -137, z: -32 }, basket: { x: -120, z: -94 },
        trees: [[{ x: -116, z: -70 }, 3.6, 'pine']],
      },
      {
        name: 'Lookout', par: 4, tee: { x: -110, z: -101 }, basket: { x: -10, z: -70 }, via: [{ x: -50, z: -86 }],
        trees: [[{ x: -80, z: -106 }, 3.6, 'broad'], [{ x: -46, z: -73 }, 3.6, 'broad'], [{ x: -2, z: -78 }, 2.6, 'bush']],
        pool: { x: -66, z: -78 },
      },
      {
        name: 'Homeport', par: 3, tee: { x: -4, z: -64 }, basket: { x: -70, z: -28 },
        trees: [[{ x: -32, z: -60 }, 3.4, 'broad'], [{ x: -80, z: -22 }, 2.4, 'bush']],
        hedges: [[{ x: -84, z: -33 }, { x: -74, z: -33 }]],
      },
    ];
    for (const h of holes) b.hole(h);

    // ------------------------------------------- lighthouse, docks and decks
    b.prop('lighthouse', LIGHT.x, LIGHT.z, { h: 15, r: 3 });
    b.prop('bench', LIGHT.x - 7, LIGHT.z - 6, { ang: 2.6, r: 1 });
    // finger docks off both seawalls and a central pier, with a boat tied up at each
    const clearSpan = (a, c, pad) => {
      for (let k = 0; k <= 10; k++) if (b.inCorridor(a.x + ((c.x - a.x) * k) / 10, a.z + ((c.z - a.z) * k) / 10, pad)) return false;
      return true;
    };
    const boats = ['#d9534f', '#f4f1ea', '#3a86c8', '#2f7d6d', '#f2b134'];
    const slip = (a, c, width, boatSide, at = 0.62) => {
      if (!clearSpan(a, c, 4)) return;
      b.span(a, c, width, L + 0.6, { kind: 'dock' });
      const len = Math.hypot(c.x - a.x, c.z - a.z), ux = (c.x - a.x) / len, uz = (c.z - a.z) / len;
      const m = { x: a.x + ux * len * at - uz * boatSide * (width / 2 + 1.1), z: a.z + uz * len * at + ux * boatSide * (width / 2 + 1.1) };
      b.prop('canoe', m.x, m.z, { y: L - 0.12, ang: Math.atan2(uz, ux), r: 2.4, color: b.pick(boats) });
    };
    for (const z of [16, 40, 64]) {
      slip({ x: -42, z }, { x: -22, z }, 2.4, 1);
      slip({ x: 32, z }, { x: 12, z }, 2.4, -1);
    }
    slip({ x: -4, z: -9 }, { x: -4, z: 54 }, 3, 1, 0.5);
    for (const z of [4, 28, 52]) {
      slip({ x: -5.5, z }, { x: -15, z }, 2, 1);
      slip({ x: -2.5, z }, { x: 7, z }, 2, -1);
    }
    b.placeHouse({
      kind: 'boathouse', x: -60, z: 40, ang: 0, hu: 6, hv: 4, front: 1, stories: 1,
      wallH: 3.6, roofH: 2.2, roof: 'gable', wall: '#c95f4a', roofColor: '#3f4a45', trim: '#ffffff',
      shutters: null, chimney: false, windows: false,
    });
    b.prop('table', -62, 54, { ang: 0.3, r: 1.2 });
    b.prop('bin', -56, 58, { r: 0.5 });
    b.prop('gazebo', -62, 6, { size: 4.2, r: 3.5 });
    // boardwalks over the dunes to the beach, where they stay clear of play
    for (const x of [-196, -100, -78]) {
      const a = { x, z: beachZ(x) - 40 }, c = { x, z: beachZ(x) - 10 };
      let top = 0;
      for (let k = 0; k <= 8; k++) top = Math.max(top, b.hf.get(x, a.z + ((c.z - a.z) * k) / 8));
      if (clearSpan(a, c, 5)) b.span(a, c, 2.4, top + 0.35, { kind: 'boardwalk', rails: true });
    }

    // ----------------------------------------------------------- houses
    const homes = [];
    const lots = (path, from, step, side, o) => {
      for (let s = from; s < path.length - 10; s += step) {
        const h = b.houseIfClear(path, s, side, o);
        if (h) homes.push(h);
      }
    };
    lots(harbor, 14, 24, -1, { porchChance: 0.5 });
    lots(harbor, 26, 24, 1, { porchChance: 0.5 });
    lots(point, 24, 22, 1, { porchChance: 0.6, fenceChance: 0.1 });
    lots(point, 35, 22, -1, { porchChance: 0.6, fenceChance: 0.1 });
    lots(dune, 24, 24, 1, { fenceChance: 0.25 });
    lots(dune, 36, 24, -1, { fenceChance: 0.15, porchChance: 0.6 });
    lots(hill, 14, 25, 1, { fenceChance: 0.3 });
    lots(hill, 26, 25, -1, { fenceChance: 0.3 });
    lots(lookout, 20, 24, 1, {});
    lots(lookout, 32, 24, -1, {});
    // the odd backyard pool, kept well off the lines of play
    for (const h of homes) {
      if (!b.chance(0.3)) continue;
      const wx = -h.sin * -h.front, wz = h.cos * -h.front;
      const p = { x: h.cx + wx * (h.hv + 7), z: h.cz + wz * (h.hv + 7) };
      const rect = { cx: p.x, cz: p.z, hu: 4.6, hv: 2.8, cos: h.cos, sin: h.sin };
      if (b.rectClear(rect, 3) && !b.inCorridor(p.x, p.z, 8) && !b.blocked(p.x, p.z, 3) && !b.wet(p.x + wx * 5, p.z + wz * 5, 0.6) && Math.abs(p.z) < 140) b.pool(p, h.ang, 4.6, 2.8);
    }

    // ------------------------------------------------- hole furniture
    for (const h of holes) {
      for (const [p, r, kind] of h.trees || []) b.tree(p, r, kind);
      for (const [p, ang] of h.cars || []) b.car(p, ang);
      for (const [a, c] of h.hedges || []) b.hedge(a, c);
      if (h.pool && b.rectClear({ cx: h.pool.x, cz: h.pool.z, hu: 4.6, hv: 2.8, cos: 1, sin: 0 }, 3)) b.pool(h.pool, 0, 4.6, 2.8);
    }
    // cars parked at the kerb
    for (const [road, x, d] of [[dune, -160, -2.3], [dune, -196, 2.3], [harbor, -118, -2.6], [harbor, 30, 2.6], [harbor, 160, -2.6], [hill, -40, 2.3], [hill, 100, -2.3]]) {
      const p = road.offset(road.sAlong(0, x), d);
      if (!b.inCorridor(p.x, p.z, 4)) b.car(p, Math.atan2(p.tz, p.tx));
    }
    // the marina lot
    for (const [x, z, ang] of [[84, -28, Math.PI / 2], [90, -28, Math.PI / 2], [102, -28, Math.PI / 2], [86, -20, -Math.PI / 2], [98, -20, -Math.PI / 2], [108, -20, -Math.PI / 2]]) b.car({ x, z }, ang);
    // Point Park and the rocks round the point
    b.prop('gazebo', 97, 88, { size: 4.2, r: 3.5 });
    for (const [x, z, ang] of [[100, 54, -Math.PI / 2], [96, 26, -Math.PI / 2]]) if (!b.inCorridor(x, z, 3)) b.prop('bench', x, z, { ang, r: 1 });
    for (let i = 0; i < 120; i++) {
      const x = b.R(28, 135), z = b.R(20, 135), g = b.hf.get(x, z);
      if (g < L - 0.6 || g > L + 1.1 || b.inCorridor(x, z, 6) || b.blocked(x, z, 1.5)) continue;
      if (x < 34 && z < 92) continue; // the seawall
      b.prop('boulder', x, z, { r: b.R(0.8, 1.9) });
    }
    // the harbour front
    for (const [x, z, ang] of [[-20, -9, 0], [8, -9, 0], [-43, 30, -Math.PI / 2], [-43, 70, -Math.PI / 2], [33, 30, Math.PI / 2], [33, 52, Math.PI / 2]]) {
      if (!b.inCorridor(x, z, 3)) b.prop('bench', x, z, { ang, r: 1 });
    }
    b.lampsAlong(prom, 26, 2.4, 10);
    b.lampsAlong(harbor, 60, -5, 30);
    b.lampsAlong(point, 50, -4.4, 20);
    b.lampsAlong(dune, 60, 4.4, 30);
    b.lampsAlong(hill, 70, 4.4, 30);
    for (let s = 50; s < harbor.length - 30; s += 90) {
      const p = harbor.offset(s, -4.6);
      if (!b.inCorridor(p.x, p.z, 3)) b.prop('hydrant', p.x, p.z, { r: 0.3 });
    }
    // the beach
    const brolly = ['#e94f37', '#f2b134', '#3a86c8', '#4caf7d', '#ffffff'];
    for (const [x, z] of [[-190, 86], [-174, 84], [-150, 88], [-128, 86], [-100, 86], [-80, 90], [160, 18], [184, 20]]) {
      if (!b.inCorridor(x, z, 3)) b.prop('umbrella', x, z, { r: 1.2, color: b.pick(brolly) });
    }
    b.prop('canoe', -138, 90, { ang: 0.3, r: 2.4, color: '#d9534f' });
    b.prop('canoe', 172, 16, { ang: -0.2, r: 2.4, color: '#2f7d6d' });
    // a playground on the hill
    b.prop('swing', 60, -88, { ang: 0.1, r: 2.6 });
    b.prop('slide', 46, -90, { ang: 1.4, r: 2 });
    for (const [x, z, r] of [[-5, 74, 8], [-120, 120, 14], [170, 60, 14]]) b.ducks.push({ x, z, r, speed: 0.35, phase: x * 0.1 });

    // ------------------------------------------------------------ trees
    const roads = [harbor, point, dune, hill, lookout];
    b.scatter(9000, (x, z) => {
      const u = b.rng();
      if (z > 40 && x < -60) {
        if (b.rng() > 0.3) return null; // the beach: dune scrub only
        return { kind: 'bush', r: b.R(1.1, 2.2) };
      }
      if (x > 30 && z > -10) {
        if (b.rng() > 0.25) return null; // the point: wind-bent cypress and scrub
        return u < 0.4 ? { kind: 'cypress', r: b.R(3, 4.6) } : { kind: 'bush', r: b.R(1.4, 2.6) };
      }
      if (x > -76 && x < 30 && z > -34) {
        if (b.rng() > 0.1) return null; // the harbour green
        return { kind: 'broad', r: b.R(3.2, 4.8) };
      }
      const near = Math.min(...roads.map((r) => r.dist(x, z)));
      if (near < 24) {
        if (b.rng() > 0.25) return null; // yards stay open
        const kind = u < 0.45 ? 'broad' : u < 0.75 ? 'pine' : 'bush';
        return { kind, r: kind === 'bush' ? b.R(1.8, 3) : b.R(2.8, 4.6) };
      }
      if (b.rng() > 0.6) return null;
      return { kind: u < 0.6 ? 'pine' : 'broad', r: b.R(3.4, 5.6), tall: 1.2 };
    });
  },
};
