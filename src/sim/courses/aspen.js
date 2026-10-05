// Aspen Switchbacks. A mountain neighbourhood on a steep pine slope: the street zigzags up
// the hillside in three hairpins, with log cabins on the terraces between. Cross the creek
// and climb the west side through Hairpin Island to the ridge, drop off the overlook deck,
// ride the east hairpin back down, then play Cabin Row and the ravine home to the creek.
import { smoothstep } from '../geom.js';
import { PINES } from './themes.js';

// early autumn in the high country: the aspens (birch) have turned gold
const THEME = {
  ...PINES,
  foliage: { ...PINES.foliage, birch: ['#f2d04b', '#e8c23a', '#f5dc63', '#d9b836', '#a2cf5f'] },
};

const LOW = 10; // the lowest terrace, along Aspen Way
// the hillside climbs in steep pitches between the terraces the switchbacks run along
const PITCHES = [{ z: 56, rise: 12 }, { z: -10, rise: 12 }, { z: -78, rise: 12 }];
const TOP = LOW + PITCHES.reduce((s, p) => s + p.rise, 0); // the ridge-top plateau

function slope(z) {
  let stair = LOW;
  for (const p of PITCHES) stair += p.rise * smoothstep(p.z + 24, p.z - 24, z);
  const f = Math.min(1, Math.max(0, (94 - z) / 196));
  return 0.45 * (LOW + (TOP - LOW) * f) + 0.55 * stair;
}

function land(x, z) {
  let h = slope(z);
  // the ravine: the slope keeps falling to the creek, then the far wall rises again
  h -= 4.2 * smoothstep(94, 118, z);
  h += 4.5 * smoothstep(126, 150, z);
  // spurs and gullies running down the hill, calmer in the ravine
  const calm = 1 - 0.7 * smoothstep(90, 115, z);
  h += calm * (2.2 * Math.sin(0.021 * x + 0.4) * Math.cos(0.017 * z - 0.3) + 1.0 * Math.sin(0.043 * x + 0.031 * z + 0.8));
  return h;
}

// points round a hairpin from angle a0 to a1 (degrees)
const arc = (cx, cz, r, a0, a1, n) =>
  Array.from({ length: n + 1 }, (_, i) => {
    const t = ((a0 + ((a1 - a0) * i) / n) * Math.PI) / 180;
    return [cx + r * Math.cos(t), cz + r * Math.sin(t)];
  });

export default {
  id: 'aspen',
  name: 'Aspen Switchbacks',
  blurb: 'Switchback streets up a pine mountainside: uphill climbs, a ridge-top overlook drop and a creek ravine.',
  seed: 5562,
  world: { halfW: 200, halfH: 150 },
  theme: THEME,

  create(b) {
    // ------------------------------------------------------------- plan
    // Aspen Way climbs from the west along the lowest terrace, turns the east hairpin and
    // runs back west; Switchback Rd turns the west hairpin and the upper east one; Ridgeline
    // Rd runs along the top of the hill.
    const aspen = b.road(
      [[-215, 90], [-160, 86], [-100, 90], [-40, 86], [20, 90], [80, 86], [124, 88],
        ...arc(148, 55, 33, 80, -80, 6), [124, 22], [70, 25], [10, 21], [-50, 25], [-110, 22], [-150, 22]],
      { width: 7, name: 'Aspen Way', lawn: 26 },
    );
    const switchback = b.road(
      [[-130, 22], [-150, 22], ...arc(-150, -10, 32, 95, 265, 7), [-130, -42], [-70, -40], [-10, -44], [50, -40], [124, -42],
        ...arc(148, -78, 36, 80, -80, 7), [124, -114]],
      { width: 6.5, name: 'Switchback Rd', lawn: 24, shoulder: 7 },
    );
    const ridgeline = b.road(
      [[148, -114], [124, -114], [70, -112], [10, -116], [-50, -112], [-110, -116], [-160, -112], [-215, -115]],
      { width: 6.5, name: 'Ridgeline Rd', lawn: 24 },
    );
    const creek = b.creek(
      [[215, 116], [165, 122], [115, 116], [65, 124], [15, 126], [-35, 128], [-80, 122], [-120, 117], [-165, 118], [-215, 112]],
      { width: 5, bed: [2.4, 0.4], depth: 0.35, name: 'Aspen Creek' },
    );

    // ------------------------------------------------------------ holes
    const holes = [
      {
        name: 'Trailhead', par: 3, tee: { x: -140, z: 132 }, basket: { x: -118, z: 60 }, corridor: 6,
        trees: [[{ x: -122, z: 104 }, 3.6, 'birch'], [{ x: -132, z: 78 }, 3.4, 'pine'], [{ x: -110, z: 50 }, 3, 'birch']],
      },
      {
        // the tee sits up on the terrace, clear of the trailhead basket's pad below it
        name: 'Hairpin Island', par: 3, tee: { x: -129.3, z: 41.5 }, basket: { x: -160, z: -8 }, corridor: 6,
        trees: [[{ x: -146, z: 32 }, 3.6, 'pine'], [{ x: -136, z: 14 }, 3.2, 'birch'], [{ x: -168, z: -18 }, 3, 'pine']],
      },
      {
        name: 'Switchback Climb', par: 4, tee: { x: -150, z: -20 }, basket: { x: -66, z: -84 }, via: [{ x: -122, z: -66 }], corridor: 6.5,
        trees: [[{ x: -146, z: -54 }, 3.4, 'birch'], [{ x: -112, z: -54 }, 3.6, 'pine'], [{ x: -98, z: -82 }, 4, 'pine'], [{ x: -76, z: -72 }, 3.4, 'birch']],
        rocks: [[{ x: -136, z: -58 }, 1.4], [{ x: -90, z: -66 }, 1.2]],
      },
      {
        name: 'Ridgeline', par: 4, tee: { x: -56, z: -94 }, basket: { x: 72, z: -132 }, via: [{ x: 6, z: -128 }], corridor: 6,
        trees: [[{ x: -30, z: -100 }, 3.6, 'pine'], [{ x: 10, z: -138 }, 3.4, 'pine'], [{ x: 40, z: -122 }, 3.4, 'birch'], [{ x: 84, z: -138 }, 3, 'birch']],
        rocks: [[{ x: 30, z: -137 }, 1.3]],
      },
      {
        name: 'The Overlook', par: 3, tee: { x: 50.5, z: -97 }, basket: { x: 100, z: -6 }, deck: true,
        trees: [[{ x: 76, z: -66 }, 4, 'pine'], [{ x: 64, z: -50 }, 3.4, 'birch'], [{ x: 110, z: -14 }, 3, 'birch']],
      },
      {
        name: 'Hairpin Bend', par: 3, tee: { x: 114, z: 2 }, basket: { x: 150, z: 50 },
        trees: [[{ x: 124, z: 32 }, 3.4, 'birch'], [{ x: 146, z: 32 }, 3.2, 'pine'], [{ x: 136, z: 46 }, 3.4, 'pine'], [{ x: 158, z: 60 }, 3, 'birch']],
      },
      {
        name: 'Cabin Row', par: 3, tee: { x: 136, z: 81 }, basket: { x: 34, z: 80 },
        trees: [[{ x: 100, z: 72.5 }, 3.6, 'birch'], [{ x: 70, z: 71.5 }, 3.4, 'birch'], [{ x: 44, z: 70 }, 3, 'birch']],
        cars: [[{ x: 78, z: 89.4 }, 0], [{ x: 54, z: 85 }, Math.PI]],
        tub: { x: 60, z: 70 },
      },
      {
        name: 'Ravine Drop', par: 3, tee: { x: 28, z: 84 }, basket: { x: -28, z: 116 },
        trees: [[{ x: 6, z: 104 }, 3.4, 'birch'], [{ x: -14, z: 96 }, 3.6, 'pine']],
      },
      {
        name: 'Homeward', par: 4, tee: { x: -38, z: 110 }, basket: { x: -128, z: 136 }, via: [{ x: -92, z: 106 }], corridor: 6,
        trees: [[{ x: -60, z: 100 }, 3.6, 'pine'], [{ x: -78, z: 114 }, 3.2, 'birch'], [{ x: -104, z: 128 }, 3.4, 'birch'], [{ x: -118, z: 142 }, 3, 'pine']],
      },
    ];
    for (const h of holes) b.hole(h);

    // ----------------------------------------------------------- terrain
    // every tee and basket gets a small level pad cut into the hillside, eased back into the
    // slope over a wide ring so the pitches don't pack into a wall at the pad's edge; the
    // baskets go in last so the next hole's tee never tilts a basket's level ground, and they
    // ease off before reaching a tee's own level ground so its mat doesn't float either
    const pads = [...holes.filter((h) => !h.deck).map((h) => ({ ...h.tee, tee: true })), ...holes.map((h) => ({ ...h.basket, tee: false }))]
      .map((p) => ({ x: p.x, z: p.z, tee: p.tee, h: land(p.x, p.z), r0: p.tee ? 4 : 3, r1: p.tee ? 18 : 16 }));
    b.terrain((x, z) => {
      let h = land(x, z);
      for (const p of pads) {
        const d = Math.hypot(x - p.x, z - p.z);
        if (d >= p.r1) continue;
        let k = 1 - smoothstep(p.r0, p.r1, d);
        if (!p.tee) for (const t of pads) if (t.tee) k *= smoothstep(t.r0, t.r0 + 6, Math.hypot(x - t.x, z - t.z));
        h += (p.h - h) * k;
      }
      return b.carveCreek(creek, x, z, h);
    });
    b.lawnArea([[-215, 96], [215, 96], [215, 140], [-215, 140]]); // the creekside green
    b.footpath([[-150, 140], [-146, 128], [-150, 112], [-142, 96]], { name: 'Creek Trail' });
    b.footpath([[30, -104], [44, -100], [52, -96]], { name: 'Overlook Trail' });

    // ------------------------------------------------- the overlook deck
    const d0 = { x: 49.1, z: -99.6 }, d1 = { x: 52.9, z: -92.6 }; // the tee of hole 5 sits on it
    b.span(d0, d1, 3.4, b.hf.get(d0.x, d0.z) + 0.3, { kind: 'deck', rails: true });
    const bridge = (a, c) => b.span(a, c, 2.4, Math.max(b.hf.get(a.x, a.z), b.hf.get(c.x, c.z)) + 0.15, { kind: 'bridge', rails: true });
    bridge({ x: -152, z: 108 }, { x: -150, z: 128 });

    // ----------------------------------------------------------- cabins
    const ISLANDS = [{ x: 148, z: 55 }, { x: -150, z: -10 }];
    const cabin = () => ({
      hu: b.R(4.6, 6), hv: b.R(3.8, 4.5), twoStory: 0.2, chimney: b.chance(0.85), garage: b.chance(0.2),
      fenceChance: 0.05, hoopChance: 0.05, carChance: 0.35, pad: 6,
    });
    for (const road of [aspen, switchback, ridgeline]) {
      for (let s = 14; s < road.length - 10; s += 30) {
        for (const side of [-1, 1]) {
          const sl = s + (side > 0 ? 15 : 0);
          const lot = road.offset(sl, side * 18);
          if (road === aspen && lot.z > 96) continue; // the creekside green stays open
          if (ISLANDS.some((c) => Math.hypot(lot.x - c.x, lot.z - c.z) < 30)) continue; // hairpin islands are woods
          if (b.chance(0.2)) continue; // a wooded lot
          b.houseIfClear(road, sl, side, cabin());
        }
      }
    }

    // ------------------------------------------------- hole furniture
    // a hole's own tree shuffles over a little if a cabin, car or driveway took its spot
    const plant = (p, r, kind) => {
      for (let k = 0; k < 17; k++) {
        const a = (k * Math.PI) / 4, d = k === 0 ? 0 : k <= 8 ? 2.5 : 5;
        const q = { x: p.x + d * Math.cos(a), z: p.z + d * Math.sin(a) };
        if (!b.blocked(q.x, q.z, 1.5) && !b.inCorridor(q.x, q.z, 3.5)) return b.tree(q, r, kind);
      }
      return null;
    };
    for (const h of holes) {
      for (const [p, r, kind] of h.trees || []) plant(p, r, kind);
      for (const [p, r] of h.rocks || []) b.prop('boulder', p.x, p.z, { r });
      for (const [p, ang] of h.cars || []) b.car(p, ang);
      // a hot tub out on a cabin deck, nudged clear of the cabins
      if (h.tub) {
        for (let k = 0; k < 12; k++) {
          const x = h.tub.x + (k % 4) * 3 - 4.5, z = h.tub.z - Math.floor(k / 4) * 3;
          if (!b.blocked(x, z, 3) && !b.inCorridor(x, z, 6)) { b.pool({ x, z }, 0.2, 1.7, 1.7); break; }
        }
      }
    }
    // guard wall along the rim either side of the deck
    for (const [x, z, ang] of [[42, -100, 0.15], [60, -98.5, -0.1]]) b.prop('wall', x, z, { ang, hu: 3, h: 0.9, r: 3 });
    b.prop('bench', 44, -104, { ang: Math.PI, r: 1 });
    b.prop('bench', -150, -2, { ang: 0.3, r: 1 });
    b.prop('table', -70, 97, { ang: 0.2, r: 1.2 });
    b.prop('table', 2, 111, { ang: -0.3, r: 1.2 });
    b.prop('shelter', -160, 100, { size: 6, ang: 0.1, r: 4.5 });
    b.prop('bin', -144, 140, { r: 0.5 });
    for (const [x, z, r] of [[-180, 60, 1.6], [-60, 40, 1.4], [20, -10, 1.8], [-30, -70, 1.5], [90, -84, 1.6], [170, -20, 1.4],
      [-100, -136, 1.7], [120, -138, 1.5], [60, 104, 1.2], [140, 106, 1.3], [-180, 128, 1.4], [176, 132, 1.6]]) {
      if (!b.inCorridor(x, z, 4)) b.prop('boulder', x, z, { r });
    }
    for (let s = 18; s < creek.path.length - 10; s += 33) {
      const q = creek.path.offset(s, (s % 2 ? 1 : -1) * 3.3);
      if (!b.inCorridor(q.x, q.z, 5)) b.prop('reeds', q.x, q.z, { n: 5 + Math.floor(b.rng() * 6), r: 0.6 });
    }
    b.lampsAlong(aspen, 64, -4.4, 30);
    b.lampsAlong(switchback, 66, -4.2, 30);
    b.lampsAlong(ridgeline, 70, 4.2, 30);

    // ------------------------------------------------------------ trees
    const roads = [aspen, switchback, ridgeline];
    b.scatter(14000, (x, z) => {
      const u = b.rng();
      const near = Math.min(...roads.map((r) => r.dist(x, z)));
      // aspen groves come in patches
      const grove = Math.sin(0.045 * x + 1.1) * Math.cos(0.05 * z - 0.6) > 0.45;
      if (z > 96 && z < 140) {
        if (b.rng() > 0.25) return null; // the creekside green is open
        const kind = grove || u < 0.4 ? 'birch' : u < 0.8 ? 'pine' : 'broad';
        return { kind, r: b.R(2.8, 4.4) };
      }
      if (near < 24) {
        if (b.rng() > 0.4) return null;
        const kind = grove ? (u < 0.75 ? 'birch' : 'pine') : u < 0.6 ? 'pine' : u < 0.8 ? 'birch' : u < 0.9 ? 'broad' : 'bush';
        return { kind, r: kind === 'bush' ? b.R(2.2, 3.2) : b.R(2.8, 4.4) };
      }
      const kind = grove ? (u < 0.7 ? 'birch' : 'pine') : u < 0.75 ? 'pine' : u < 0.9 ? 'birch' : 'broad';
      return { kind, r: kind === 'pine' ? b.R(3, 4.8) : b.R(3, 4.6), tall: 1.25 };
    });
  },
};
