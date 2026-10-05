// Oakbrook Cul-de-sacs. A summer subdivision strung along one looping collector road,
// with three cul-de-sacs off it and a stormwater retention pond in the pocket park in the
// middle. Play down the Loop, round the west bend into Acorn Court, over the backyard
// pools, along the north side to Hickory Court, back across the pools into Chestnut
// Court, over the retention pond and home down the greenway to the front gate.
import { smoothstep } from '../geom.js';
import { segDist } from '../path.js';
import { SUMMER } from './themes.js';

const BULBS = [{ x: -44, z: -108, r: 11 }, { x: 160, z: 4, r: 11 }, { x: 52, z: 20, r: 11 }];
const POND = { x: -22, z: 2 };

function base(x, z) {
  return (
    7 + 2.2 * Math.sin(0.016 * x + 0.4) * Math.cos(0.019 * z - 0.5) +
    1.1 * Math.sin(0.027 * z - 0.011 * x + 1.2) + 0.012 * x - 0.018 * z
  );
}

function land(x, z) {
  let h = base(x, z);
  // each cul-de-sac bulb is levelled
  for (const bl of BULBS) {
    const d = Math.hypot(x - bl.x, z - bl.z);
    if (d < bl.r + 8) h += (base(bl.x, bl.z) - h) * (1 - smoothstep(bl.r, bl.r + 8, d));
  }
  // the retention pond: a dug bowl in the pocket park
  const px = x - POND.x, pz = (z - POND.z) * 1.25;
  return h - 4.8 * Math.exp(-(px * px + pz * pz) / 520);
}

const ring = (c, r, n = 24) => Array.from({ length: n }, (_, i) => [c.x + r * Math.cos((i / n) * Math.PI * 2), c.z + r * Math.sin((i / n) * Math.PI * 2)]);

const inRect = (x, z, o, pad) => {
  const dx = x - o.cx, dz = z - o.cz;
  return Math.abs(dx * o.cos + dz * o.sin) < o.hu + pad && Math.abs(-dx * o.sin + dz * o.cos) < o.hv + pad;
};

export default {
  id: 'oakbrook',
  name: 'Oakbrook Cul-de-sacs',
  blurb: 'One loop road, three cul-de-sacs, backyard pools and a retention pond in the park.',
  seed: 6127,
  world: { halfW: 200, halfH: 150 },
  theme: SUMMER,

  create(b) {
    // ------------------------------------------------------------- plan
    // The Loop starts at the front gate heading west; d > 0 is the inside of the loop.
    const loop = b.road(
      [[0, 66], [-48, 68], [-96, 56], [-120, 22], [-120, -22], [-96, -58], [-48, -68], [0, -66],
        [48, -68], [96, -58], [120, -22], [120, 22], [96, 56], [48, 68], [0, 66]],
      { width: 7, name: 'Oakbrook Loop', lawn: 40 },
    );
    // s runs north from the edge of the map to the Loop
    const pkwy = b.road([[2, 165], [1, 120], [0, 66]], { width: 7.5, name: 'Oakbrook Pkwy', lawn: 30, lines: true });
    const acorn = b.road([[-40, -67], [-42, -88], [BULBS[0].x, BULBS[0].z]], { width: 6, name: 'Acorn Ct', lawn: 22 });
    const hickory = b.road([[120, 0], [140, 2], [BULBS[1].x, BULBS[1].z]], { width: 6, name: 'Hickory Ct', lawn: 22 });
    const chestnut = b.road([[50, 67], [51, 44], [BULBS[2].x, BULBS[2].z]], { width: 6, name: 'Chestnut Ct', lawn: 22 });
    const courts = [acorn, hickory, chestnut];
    const roads = [loop, pkwy, ...courts];
    b.terrain(land);
    const pondLevel = b.hf.get(POND.x, POND.z) + 2.2;
    b.pond(POND.x, POND.z, 30, pondLevel, 'retention pond');
    b.clearZone(POND.x, POND.z, 22);
    for (const bl of BULBS) {
      b.pavedArea(ring(bl, bl.r));
      b.lawnArea(ring(bl, 5));
    }
    // the pocket park in the middle of the Loop, and the greenway out to the front gate
    b.lawnArea([[-92, -30], [40, -30], [40, 30], [-92, 30]]);
    b.footpath([[-14, 26], [-13, 44], [-12, 62]], { name: 'Greenway' });
    b.footpath([[-54, 4], [-46, -16], [-24, -24], [0, -16], [8, 4], [-4, 22], [-14, 26], [-34, 22], [-50, 14], [-54, 4]], { name: 'Pond loop' });
    const H = (s, d) => loop.offset(s, d);
    const A = (s, d) => acorn.offset(s, d);

    // ------------------------------------------------------------ holes
    // Trees on each hole are [point, canopy radius, kind].
    const holes = [
      {
        name: 'Welcome Home', par: 3, tee: H(26, 1.5), basket: H(108, 9),
        trees: [[H(50, -7), 5, 'broad'], [H(64, 7.5), 5.5, 'broad'], [H(86, -7), 4.5, 'broad'], [H(118, 14), 3.4, 'bush']],
        cars: [[H(74, -2.3), Math.PI]],
        hedges: [[H(77, -7), H(77, -19)]], // property lines between the lots
      },
      {
        name: 'Round the Bend', par: 3, tee: H(116, 1.5), basket: H(190, -10),
        trees: [[H(140, -7), 5, 'broad'], [H(160, 9), 4.5, 'broad'], [H(176, -7.5), 4, 'pine'], [H(200, -15), 3.4, 'bush']],
        hedges: [[H(142, 10), H(142, 21)]],
      },
      {
        name: 'Acorn Court', par: 4, tee: H(200, 1.5), basket: { x: -45.5, z: -115.5 }, via: [A(5, 0)],
        trees: [
          [H(222, 7), 5, 'broad'], [H(236, -7.5), 5.5, 'broad'], [H(252, 7.5), 5, 'broad'], [H(268, -7), 4.5, 'pine'],
          [A(20, -6.5), 4, 'broad'], [A(30, 6.5), 3.6, 'bush'], [{ x: -56, z: -124 }, 3.4, 'pine'],
        ],
      },
      {
        name: 'Over the Fence', par: 3, tee: { x: -31, z: -112 }, basket: { x: 34, z: -82 },
        trees: [[{ x: -6, z: -106 }, 4.5, 'broad'], [{ x: 12, z: -86 }, 4, 'broad'], [{ x: 44, z: -90 }, 3.2, 'bush']],
        pools: [[{ x: 6, z: -100 }, 0.43], [{ x: 22.4, z: -93.9 }, 0.43]],
        fences: [[{ x: -7.2, z: -92.1 }, { x: -0.4, z: -106.7 }, 'picket']],
      },
      {
        name: 'The Collector', par: 4, tee: H(372, 1.5), basket: { x: 167, z: -1 }, via: [H(445, 0)],
        trees: [
          [H(390, 7.5), 5, 'broad'], [H(404, -7), 5.5, 'broad'], [H(424, 7), 4.5, 'broad'],
          [{ x: 130, z: -40 }, 5, 'broad'], [{ x: 146, z: -22 }, 4, 'pine'], [{ x: 172, z: -10 }, 3, 'bush'],
        ],
        cars: [[H(396, 2.3), 0]],
        hedges: [[H(389, -7), H(389, -19)]],
      },
      {
        name: 'Pool Party', par: 3, tee: { x: 154, z: 17 }, basket: { x: 120, z: 76 },
        trees: [[{ x: 156, z: 50 }, 4, 'broad'], [{ x: 128, z: 86 }, 3.4, 'bush']],
        pools: [[{ x: 146.7, z: 41.6 }, 2.09], [{ x: 124.4, z: 55.4 }, 2.09]],
        hedges: [[{ x: 137.9, z: 30.8 }, { x: 129.9, z: 44.7 }]],
      },
      {
        name: 'Chestnut Court', par: 4, tee: { x: 108, z: 80 }, basket: { x: 52.5, z: 12.5 }, via: [{ x: 50.4, z: 62 }],
        trees: [[{ x: 84, z: 80 }, 4.5, 'broad'], [{ x: 72, z: 77 }, 4, 'broad'], [{ x: 44, z: 46 }, 3.6, 'broad'], [{ x: 60, z: 36 }, 3.2, 'bush'], [{ x: 84, z: 46 }, 5, 'broad']],
      },
      {
        name: 'Retention Pond', par: 3, tee: { x: 38, z: 17 }, basket: { x: -58, z: -12 },
        trees: [[{ x: 16, z: 22 }, 4, 'broad'], [{ x: -66, z: -22 }, 4.5, 'broad'], [{ x: -48, z: -26 }, 3.2, 'birch']],
      },
      {
        name: 'Home Stretch', par: 4, tee: { x: -66, z: -2 }, basket: { x: -10, z: 86 }, via: [{ x: -14, z: 30 }],
        trees: [[{ x: -40, z: 24 }, 4.5, 'broad'], [{ x: -4, z: -11 }, 3.4, 'willow'], [{ x: -26, z: 46 }, 3.6, 'broad'], [{ x: -27, z: 80 }, 3.2, 'bush']],
        hedges: [[{ x: -18.5, z: 36 }, { x: -18, z: 56 }], [{ x: -7, z: 36 }, { x: -6.5, z: 56 }]],
      },
    ];
    for (const h of holes) b.hole(h);

    // the pools that are part of a hole go in first, so the lots keep clear of them
    for (const h of holes) for (const [p, ang] of h.pools || []) b.pool(p, ang, 4.4, 2.6);

    // ----------------------------------------------------------- houses
    const greenway = b.footpaths[0];
    const GATE = { x: 1, z: 136 }; // the stone walls at the entrance
    const placed = [], yards = []; // yards: the run of b.fences each backyard fence takes up
    // Is a house of this reach centred at (x, z) clear of the hole pools, the greenway hedges,
    // the gate and the tees and baskets? `tight` means there is no room for a garage beside it.
    const lotRoom = (x, z, reach) => {
      const room = (extra) =>
        greenway.dist(x, z) >= reach + 6 + extra && Math.hypot(x - GATE.x, z - GATE.z) >= reach + 16 + extra &&
        !b.pools.some((p) => Math.hypot(p.cx - x, p.cz - z) < reach + Math.hypot(p.hu, p.hv) + 1 + extra) &&
        !holes.some((h) => Math.hypot(h.tee.x - x, h.tee.z - z) < reach + 7 + extra || Math.hypot(h.basket.x - x, h.basket.z - z) < reach + 4 + extra);
      return room(0) ? { tight: !room(7) } : null;
    };
    const lot = (path, s, side, o = {}) => {
      // if the usual lot is on a line of play, try a house set further back, then a smaller one
      for (const fit of [{}, { setback: 16 }, { setback: 8.5, hu: 5.4, hv: 4.1 }]) {
        const hu = fit.hu ?? b.R(5.6, 7.4), hv = fit.hv ?? b.R(4.1, 5.2), setback = fit.setback ?? b.R(9, 12);
        const q = path.offset(s, side * (path.width / 2 + setback + hv));
        const room = lotRoom(q.x, q.z, Math.hypot(hu, hv));
        if (!room) continue;
        const f0 = b.fences.length;
        const h = b.houseIfClear(path, s, side, {
          carChance: 0.55, hoopChance: 0.3, fenceChance: 0.3, ...o, hu, hv, setback, ...(room.tight ? { garage: false } : {}),
        });
        if (b.fences.length > f0) yards.push([f0, b.fences.length]);
        if (h) {
          placed.push(h);
          return h;
        }
      }
      return null;
    };
    for (let s = 12; s < loop.length - 8; s += 26) {
      lot(loop, s, -1);
      lot(loop, s + 13, 1);
    }
    for (let s = 20; s < pkwy.length - 16; s += 24) {
      lot(pkwy, s, -1);
      lot(pkwy, s + 12, 1);
    }
    for (const court of courts) {
      for (let s = 16; s < court.length - 14; s += 22) {
        lot(court, s, -1, { fenceChance: 0.2 });
        lot(court, s + 8, 1, { fenceChance: 0.2 });
      }
    }
    // the bulbs: houses all the way round, facing in
    for (const bl of BULBS) {
      for (let deg = 0; deg < 360; deg += 40) {
        const t = (deg * Math.PI) / 180, hu = b.R(5.6, 6.8), hv = b.R(4.2, 5), R = bl.r + 9 + hv;
        const x = bl.x + R * Math.cos(t), z = bl.z + R * Math.sin(t);
        if (Math.abs(x) > 188 || Math.abs(z) > 138) continue;
        const rect = { cx: x, cz: z, hu, hv, cos: Math.cos(t + Math.PI / 2), sin: Math.sin(t + Math.PI / 2) };
        if (!b.rectClear(rect, 5) || roads.some((r) => r.dist(x, z) < 13)) continue;
        if (b.houses.some((h) => inRect(x, z, h, 9)) || b.wet(x, z, 0.6)) continue;
        const room = lotRoom(x, z, Math.hypot(hu, hv));
        if (!room) continue;
        const f0 = b.fences.length;
        placed.push(b.placeHouse({
          x, z, ang: t + Math.PI / 2, hu, hv, front: 1, setback: 9, fenceChance: 0.2, carChance: 0.6, ...(room.tight ? { garage: false } : {}),
        }));
        if (b.fences.length > f0) yards.push([f0, b.fences.length]);
      }
    }

    // a pool behind a house, if the yard has room for it
    const tees = holes.map((h) => h.tee), baskets = holes.map((h) => h.basket);
    const backyardPool = (h, hu = 4.4, hv = 2.6) => {
      const back = -h.front, w = back * (h.hv + 6), u = b.R(-0.35, 0.35) * h.hu;
      const p = { x: h.cx + u * h.cos - w * h.sin, z: h.cz + u * h.sin + w * h.cos };
      for (const [cu, cw] of [[0, 0], [-1, -1], [1, -1], [1, 1], [-1, 1]]) {
        const x = p.x + cu * hu * h.cos - cw * hv * h.sin, z = p.z + cu * hu * h.sin + cw * hv * h.cos;
        if (b.houses.some((o) => inRect(x, z, o, 1.2)) || b.pools.some((o) => inRect(x, z, o, 1.5))) return;
        if (roads.some((r) => r.dist(x, z) < r.width / 2 + 3) || b.wet(x, z, 0.5)) return;
        if (Math.abs(x) > 196 || Math.abs(z) > 146) return;
      }
      if (tees.some((t) => Math.hypot(t.x - p.x, t.z - p.z) < 14) || baskets.some((t) => Math.hypot(t.x - p.x, t.z - p.z) < 9)) return;
      if (b.footpaths.some((f) => f.dist(p.x, p.z) < 6)) return;
      if (holes.some((hd) => (hd.hedges || []).some(([a, c]) => segDist(p.x, p.z, a.x, a.z, c.x, c.z) < hu + 2))) return;
      b.pool(p, h.ang, hu, hv);
    };
    for (const h of placed) if (b.chance(0.3)) backyardPool(h);

    // a backyard fence that would run through a neighbour's house or pool comes down
    const crosses = (f) => {
      for (let k = 1; k < 10; k++) {
        const x = f.ax + ((f.bx - f.ax) * k) / 10, z = f.az + ((f.bz - f.az) * k) / 10;
        if (b.houses.some((o) => inRect(x, z, o, -0.2)) || b.pools.some((o) => inRect(x, z, o, 0.3))) return true;
        if (roads.some((r) => r.dist(x, z) < r.width / 2 + 0.5)) return true;
      }
      return false;
    };
    const down = new Set();
    for (const [i0, i1] of yards) {
      if (b.fences.slice(i0, i1).some(crosses)) for (let i = i0; i < i1; i++) down.add(i);
    }
    const standing = b.fences.filter((_, i) => !down.has(i));
    b.fences.splice(0, b.fences.length, ...standing);

    // ------------------------------------------------- hole furniture
    // a hole's trees stand where planned, or nudged just clear of a house, a road or the pond
    const treeRoom = (x, z, r) =>
      !b.houses.some((o) => inRect(x, z, o, 0.8)) && !b.pools.some((o) => inRect(x, z, o, 1)) &&
      !roads.some((rd) => rd.dist(x, z) < rd.width / 2 + Math.min(r * 0.4, 2)) && !b.wet(x, z, 0.2);
    for (const h of holes) {
      for (const [p, r, kind] of h.trees || []) {
        const spot = [[0, 0], [2.5, 0], [-2.5, 0], [0, 2.5], [0, -2.5], [4, 4], [-4, -4], [4, -4], [-4, 4]]
          .map(([dx, dz]) => ({ x: p.x + dx, z: p.z + dz })).find((q) => treeRoom(q.x, q.z, r));
        if (spot) b.tree(spot, r, kind);
      }
      for (const [p, turn] of h.cars || []) b.car(p, Math.atan2(p.tz, p.tx) + turn);
      for (const [a, c] of h.hedges || []) b.hedge(a, c);
      for (const [a, c, kind] of h.fences || []) b.fence(a, c, kind);
    }
    b.lampsAlong(loop, 58, -4.6, 20);
    b.lampsAlong(loop, 58, 4.6, 49);
    b.lampsAlong(pkwy, 40, 4.8, 20);
    for (let s = 40; s < loop.length - 20; s += 90) {
      const p = H(s, 4.4);
      if (!b.inCorridor(p.x, p.z, 3)) b.prop('hydrant', p.x, p.z, { r: 0.3 });
    }

    // the front gate: stone walls either side of the Parkway
    for (const s of [-1, 1]) {
      b.prop('wall', GATE.x + s * 11, GATE.z, { hu: 4.5, h: 1.3, ang: s * 0.35, r: 4.5, color: '#b8a48c', cap: '#d6cbb8' });
      b.tree({ x: GATE.x + s * 12, z: GATE.z + 4 }, 2.4, 'bush');
      b.tree({ x: GATE.x + s * 18, z: GATE.z + 6 }, 2.8, 'bush');
    }

    // the pocket park: playground, benches, picnic table, shelter
    b.prop('swing', 20, -8, { ang: 1.4, r: 2.6 });
    b.prop('slide', 26, 4, { ang: 2.0, r: 2 });
    b.prop('shelter', -72, 12, { size: 4.5, ang: 0.3, r: 3.6 });
    b.prop('table', -72, 12, { ang: 0.3, r: 1.2 });
    for (const [x, z, ang] of [[-6, -22, 1.4], [-44, 20, -1.2], [4, 14, 2.6]]) b.prop('bench', x, z, { ang, r: 1 });
    b.prop('bin', -10, -24, { r: 0.5 });
    // rip-rap at the inlet and outlet of the pond, just above the waterline
    for (const a of [Math.PI - 0.12, Math.PI + 0.1, 0.32, 0.5]) {
      let d = 8;
      while (d < 30 && b.hf.get(POND.x + d * Math.cos(a), POND.z + d * Math.sin(a)) < pondLevel + 0.3) d += 0.5;
      b.prop('boulder', POND.x + (d + 1) * Math.cos(a), POND.z + (d + 1) * Math.sin(a), { r: b.R(0.8, 1.15) });
    }
    b.ducks.push({ x: POND.x + 2, z: POND.z - 1, r: 6, speed: 0.4, phase: 1.3 });
    for (const [px, pz] of ring(POND, 15, 36)) {
      const g = b.hf.get(px, pz) - pondLevel;
      if (g > -0.35 && g < 0.2 && b.chance(0.45)) b.prop('reeds', px + b.R(-1, 1), pz + b.R(-1, 1), { n: 5 + Math.floor(b.rng() * 7), r: 0.6 });
    }

    // ------------------------------------------------------------ trees
    b.scatter(9000, (x, z) => {
      const u = b.rng();
      const park = x > -92 && x < 40 && Math.abs(z) < 30;
      if (park) {
        if (b.rng() > 0.15) return null; // big old oaks shading the park
        return { kind: u < 0.8 ? 'broad' : 'birch', r: b.R(3.5, 6) };
      }
      const near = Math.min(...roads.map((r) => r.dist(x, z)));
      if (near < 46) {
        if (b.rng() > 0.3) return null; // yards stay fairly open
        const kind = u < 0.62 ? 'broad' : u < 0.76 ? 'pine' : u < 0.88 ? 'bush' : 'birch';
        return { kind, r: kind === 'bush' ? b.R(2.2, 3.4) : b.R(2.8, 5) };
      }
      return { kind: u < 0.7 ? 'broad' : 'pine', r: b.R(4, 6.5), tall: 1.3 };
    });
  },
};
