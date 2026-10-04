// Course 8: Seaside Bluffs. A shingled beach town on a bluff above the ocean. Play along
// the cliff top, drop down to the dunes, work along the beach and climb the headland to
// the lighthouse, then come back through Seaview Park to finish on the bluff edge.
import { smoothstep } from '../geom.js';
import { SEASIDE } from './themes.js';

const L = 1.5; // sea level
const LIGHT = { x: 172, z: 93 };

// The bluff edge and the shoreline both swing out round the headland in the east.
const cape = (x) => smoothstep(112, 142, x);
const edge = (x) => (30 + 5 * Math.sin(0.03 * x + 1)) * (1 - cape(x)) + 100 * cape(x);
const shore = (x) => (88 + 6 * Math.sin(0.02 * x)) * (1 - cape(x)) + 128 * cape(x);

function height(x, z) {
  const top = 16 + 1.2 * Math.sin(0.02 * x + 0.5) * Math.cos(0.025 * z) + 3 * smoothstep(0, -140, z);
  const e = edge(x), s = shore(x), foot = e + 16;
  let beach;
  if (z < s) {
    const k = Math.max(0, Math.min(1, (z - foot) / Math.max(4, s - foot)));
    const dunes = 1.3 * Math.max(0, Math.sin(0.11 * x + 0.7) * Math.cos(0.19 * z - 0.4) + 0.35) * smoothstep(0, 0.25, k) * (1 - smoothstep(0.55, 0.85, k));
    beach = 3.2 - k * (3.2 - (L + 0.25)) + dunes;
  } else {
    beach = Math.max(L - 3, L + 0.25 - (z - s) * 0.18);
  }
  return top + (beach - top) * smoothstep(e, foot, z);
}

const ring = (c, r, n = 24) => Array.from({ length: n }, (_, i) => [c.x + r * Math.cos((i / n) * Math.PI * 2), c.z + r * Math.sin((i / n) * Math.PI * 2)]);

export default {
  id: 'seaside',
  name: 'Seaside Bluffs',
  blurb: 'Cliff-top carries, a drop to the dunes and a climb to the lighthouse.',
  seed: 6620,
  world: { halfW: 200, halfH: 150 },
  theme: SEASIDE,

  create(b) {
    // ------------------------------------------------------------- plan
    const bluff = b.road(
      [[-215, -6], [-120, -14], [-20, -6], [80, -14], [215, -8]],
      { width: 7, name: 'Bluff Rd', lawn: 30, lines: true },
    );
    const dune = b.road(
      [[-215, -96], [-110, -104], [0, -98], [110, -106], [215, -100]],
      { width: 6.5, name: 'Dune Rd', lawn: 28 },
    );
    const lightRd = b.road([[160, -9], [164, 40], [158, 84]], { width: 6, name: 'Lighthouse Rd', lawn: 24 });
    b.lake([[-215, 70], [215, 70], [215, 170], [-215, 170]], L, { name: 'ocean', per: 1 });
    b.terrain(height);
    // the beach is sand from the foot of the bluff to the water
    const sandPts = [];
    for (let x = -210; x <= 126; x += 8) sandPts.push([x, edge(x) + 15]);
    for (let x = 126; x >= -210; x -= 8) sandPts.push([x, shore(x) + 2]);
    b.sandArea(sandPts);
    b.pavedArea(ring({ x: 158, z: 84 }, 9));
    b.lawnArea([[-80, -78], [80, -78], [80, -26], [-80, -26]]); // Seaview Park
    b.lawnArea(ring(LIGHT, 16));
    b.footpath([[-90, 18], [-86, 34], [-78, 40], [-74, 50]], { name: 'Beach stairs', color: '#c9b79c' });
    b.footpath([[-200, 14], [-150, 22], [-100, 16], [-40, 22], [20, 14], [80, 20], [120, 26]], { name: 'Cliff walk' });

    // ------------------------------------------------------------ holes
    const holes = [
      {
        name: 'Widow’s Walk', par: 3, tee: { x: -170, z: 6 }, basket: { x: -112, z: 21 },
        trees: [[{ x: -146, z: 6 }, 3.8, 'pine'], [{ x: -128, z: 24 }, 2.4, 'bush']],
      },
      {
        name: 'The Drop', par: 3, tee: { x: -100, z: 22 }, basket: { x: -70, z: 66 },
        trees: [[{ x: -82, z: 58 }, 1.8, 'bush'], [{ x: -62, z: 60 }, 1.6, 'bush']],
      },
      {
        name: 'Dune Line', par: 4, tee: { x: -60, z: 64 }, basket: { x: 40, z: 64 }, via: [{ x: -10, z: 74 }],
        trees: [[{ x: -34, z: 62 }, 1.8, 'bush'], [{ x: 14, z: 66 }, 2, 'bush']],
      },
      {
        name: 'Sandcastle', par: 3, tee: { x: 50, z: 70 }, basket: { x: 104, z: 76 },
        trees: [],
      },
      {
        name: 'Lighthouse', par: 3, tee: { x: 90, z: 66 }, basket: { x: 148, z: 90 },
        trees: [[{ x: 130, z: 76 }, 2.2, 'bush'], [{ x: 140, z: 92 }, 3.2, 'pine']],
      },
      {
        name: 'Keeper’s Cottage', par: 3, tee: { x: 172, z: 76 }, basket: { x: 178, z: 12 },
        trees: [[{ x: 184, z: 46 }, 3.6, 'pine'], [{ x: 170, z: 28 }, 3, 'broad']],
      },
      {
        name: 'Seaview Park', par: 4, tee: { x: 130, z: -30 }, basket: { x: 20, z: -46 }, via: [{ x: 80, z: -48 }],
        trees: [[{ x: 104, z: -34 }, 4, 'broad'], [{ x: 62, z: -40 }, 4.4, 'broad'], [{ x: 40, z: -54 }, 3.6, 'pine']],
      },
      {
        name: 'Kite Field', par: 3, tee: { x: 10, z: -56 }, basket: { x: -50, z: -68 },
        trees: [[{ x: -24, z: -66 }, 4, 'broad']],
      },
      {
        name: 'Last Light', par: 4, tee: { x: -60, z: -60 }, basket: { x: -150, z: 20 }, via: [{ x: -110, z: -36 }],
        trees: [[{ x: -88, z: -44 }, 4, 'broad'], [{ x: -126, z: -6 }, 3.6, 'pine'], [{ x: -138, z: 12 }, 2.4, 'bush']],
      },
    ];
    for (const h of holes) b.hole(h);

    // -------------------------------------------- lighthouse and boardwalks
    b.prop('lighthouse', LIGHT.x, LIGHT.z, { h: 15, r: 3 });
    b.placeHouse({
      kind: 'house', x: 188, z: 70, ang: Math.PI / 2, hu: 5.2, hv: 4.2, front: -1, stories: 1, driveway: false,
      wall: '#f4f1ea', roofColor: '#b5432f', fenceChance: 0, porchChance: 1,
    });
    for (const x of [-120, -30, 70]) {
      const a = { x, z: edge(x) + 17 }, c = { x, z: shore(x) - 10 };
      let top = 0;
      for (let k = 0; k <= 8; k++) top = Math.max(top, b.hf.get(x, a.z + ((c.z - a.z) * k) / 8));
      if (!b.inCorridor(x, (a.z + c.z) / 2, 3)) b.span(a, c, 2.4, top + 0.35, { kind: 'boardwalk', rails: true });
    }

    // ----------------------------------------------------------- houses
    for (let s = 14; s < bluff.length - 10; s += 25) {
      b.houseIfClear(bluff, s, 1, { fenceChance: 0.15, porchChance: 0.6 });
      b.houseIfClear(bluff, s + 12, -1, { fenceChance: 0.25, porchChance: 0.5 });
    }
    for (let s = 14; s < dune.length - 10; s += 26) {
      b.houseIfClear(dune, s, 1, { fenceChance: 0.25 });
      b.houseIfClear(dune, s + 13, -1, { fenceChance: 0.25 });
    }
    for (let s = 22; s < lightRd.length - 22; s += 24) {
      b.houseIfClear(lightRd, s, 1, { porchChance: 0.6 });
      b.houseIfClear(lightRd, s + 12, -1, { porchChance: 0.6 });
    }

    // ------------------------------------------------- hole furniture
    for (const h of holes) for (const [p, r, kind] of h.trees || []) b.tree(p, r, kind);
    const brolly = ['#e94f37', '#f2b134', '#3a86c8', '#4caf7d', '#ffffff'];
    for (const [x, z] of [[-140, 66], [-118, 70], [6, 82], [24, 78], [72, 84], [88, 82], [-176, 64]]) {
      if (!b.inCorridor(x, z, 3)) b.prop('umbrella', x, z, { r: 1.2, color: b.pick(brolly) });
    }
    b.prop('canoe', 116, 84, { ang: 0.4, r: 2.4, color: '#d9534f' });
    b.prop('canoe', -150, 74, { ang: -0.2, r: 2.4, color: '#2f7d6d' });
    for (const x of [-180, -60, 0, 50, 100]) {
      const z = edge(x) - 3;
      if (!b.inCorridor(x, z, 3)) b.prop('bench', x, z, { ang: Math.PI, r: 1 });
    }
    b.prop('bench', LIGHT.x - 8, LIGHT.z - 6, { ang: 2.4, r: 1 });
    b.prop('gazebo', -40, -36, { size: 4.2, r: 3.5 });
    b.prop('swing', 60, -70, { ang: 0.2, r: 2.6 });
    b.prop('slide', 44, -72, { ang: 1.4, r: 2 });
    b.prop('table', -20, -32, { ang: 0.3, r: 1.2 });
    b.prop('bin', -36, -28, { r: 0.5 });
    b.lampsAlong(bluff, 64, 4.6, 30);
    b.lampsAlong(dune, 70, -4.4, 40);
    for (const [x, z] of [[-40, 104], [60, 110]]) b.ducks.push({ x, z, r: 10, speed: 0.35, phase: x });

    // ------------------------------------------------------------ trees
    const roads = [bluff, dune, lightRd];
    b.scatter(8000, (x, z) => {
      const u = b.rng();
      if (z > edge(x) - 2) {
        // the bluff face and the dunes: scrub only
        if (b.rng() > 0.35) return null;
        return { kind: 'bush', r: b.R(1.1, 2.2) };
      }
      if (x > -80 && x < 80 && z > -78 && z < -26) {
        if (b.rng() > 0.12) return null; // Seaview Park
        return { kind: u < 0.6 ? 'broad' : 'pine', r: b.R(3.5, 5.5) };
      }
      const near = Math.min(...roads.map((r) => r.dist(x, z)));
      if (near < 30 || z > -110) {
        if (b.rng() > 0.25) return null;
        const kind = u < 0.45 ? 'pine' : u < 0.75 ? 'broad' : 'bush';
        return { kind, r: kind === 'bush' ? b.R(1.8, 3) : b.R(2.8, 4.6) };
      }
      return { kind: u < 0.7 ? 'pine' : 'broad', r: b.R(3.4, 5.6), tall: 1.2 };
    });
  },
};
