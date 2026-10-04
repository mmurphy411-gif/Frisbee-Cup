// Course 1: Horseshoe Terrace. Two terraces joined by a west bend with a pond and a
// knoll inside it, closed off by Rockaway Rd on the east.
import { SUMMER } from './themes.js';

const KNOLL = { x: -119, z: 12 };
const POND = { x: -98, z: 2 };

function height(x, z) {
  const kx = x - KNOLL.x, kz = z - KNOLL.z, px = x - POND.x, pz = z - POND.z;
  return (
    6 +
    3.0 * Math.sin(0.014 * x + 0.6) * Math.cos(0.017 * z - 0.4) +
    1.8 * Math.sin(0.021 * z + 0.009 * x + 1.3) -
    0.012 * x -
    0.022 * z +
    2.4 * Math.exp(-(kx * kx + kz * kz) / 242) -
    1.7 * Math.exp(-(px * px + pz * pz) / 162)
  );
}

export default {
  id: 'horseshoe',
  name: 'Horseshoe Terrace',
  blurb: 'Tree-lined streets, mailbox rows and a park pond in the bend.',
  seed: 1136,
  world: { halfW: 200, halfH: 150 },
  theme: SUMMER,

  create(b) {
    const LOT = 27;
    // s runs west along North Terrace, round the bend, then east along South Terrace.
    // d > 0 is the outside of the horseshoe, d < 0 the block in the middle.
    const horseshoe = b.road(
      [[150, -44], [95, -40], [35, -35], [-30, -40], [-85, -37], [-120, -24], [-138, 4],
        [-122, 34], [-88, 47], [-30, 45], [30, 50], [95, 46], [150, 52]],
      { width: 7, name: 'Horseshoe Terrace', lawn: 52 },
    );
    // s runs south; d > 0 is the west side, towards the horseshoe
    const rockaway = b.road(
      [[150, -150], [150, -100], [150, -44], [155, 4], [150, 52], [150, 100], [150, 150]],
      { width: 7, name: 'Rockaway Rd', lawn: 52, lines: true },
    );
    b.road([[-138, 4], [-166, 0], [-200, 8]], { width: 6, name: 'Gatsby Ct', lawn: 34 });
    b.terrain(height);
    b.pond(POND.x, POND.z, 18, height(POND.x, POND.z) + 0.95);
    b.clearZone(POND.x, POND.z, 16);
    const H = (s, d) => horseshoe.offset(s, d);
    const K = (s, d) => rockaway.offset(s, d);

    // Trees on each hole are [point, canopy radius, kind].
    const holes = [
      {
        name: 'Welcome Wagon', par: 3, tee: H(14, 0), basket: H(97.5, 10),
        trees: [[H(60, 6.3), 5.5, 'broad'], [H(80, -6.5), 5, 'broad'], [H(110, 7), 3.2, 'pine'], [H(92, 17), 3, 'bush']],
      },
      {
        name: 'Mailbox Row', par: 3, tee: H(108, -1.5), basket: H(165.5, -9.5),
        trees: [[H(124, 6.3), 5, 'broad'], [H(131, -6.5), 5, 'broad'], [H(148, 6.5), 5.5, 'broad'], [H(152, -6.3), 4.5, 'broad'], [H(174, -14), 3.5, 'bush']],
        cars: [[H(141, -2.3), 0]],
      },
      {
        name: 'The Horseshoe', par: 4, tee: H(180, 1.5), basket: { x: -121, z: 11 }, via: [H(266, 0)],
        trees: [
          [H(236, -8), 5.5, 'broad'], [H(251, -15), 6, 'broad'], [H(268, -9), 5, 'broad'], [H(284, -9), 5.5, 'broad'], [H(246, -27), 5, 'broad'],
          [{ x: -72, z: -8 }, 6, 'broad'], [{ x: -80, z: -23 }, 5, 'pine'], [{ x: -77, z: 8 }, 5.5, 'broad'],
          [H(240, 6.5), 5, 'broad'], [H(272, 6.5), 4.5, 'pine'], [H(298, 6.8), 5, 'broad'],
          [{ x: -111, z: 23 }, 4, 'broad'],
        ],
      },
      {
        name: 'Poolside', par: 3, tee: H(331, -1.5), basket: H(376, 13.5),
        trees: [[H(353, 6.5), 5, 'broad'], [H(367, -6.5), 4.5, 'broad'], [H(390, 8), 3.5, 'pine']],
        pool: H(378, 27),
      },
      {
        name: 'The Long Haul', par: 4, tee: H(391, -1.5), basket: H(513.5, 10), via: [H(455, 0)],
        trees: [
          [H(412, 6.5), 5, 'broad'], [H(430, -6.5), 5.5, 'broad'], [H(452, 6.5), 6, 'broad'], [H(470, -6.3), 5, 'broad'],
          [H(491, 5.8), 4.5, 'broad'], [H(505, 14), 3.6, 'bush'],
        ],
        cars: [[H(444, 2.3), 0], [H(477, -2.3), Math.PI]],
      },
      {
        name: 'Side Yard', par: 3, tee: H(508, 1.5), basket: H(552.5, -25), via: [H(548, -4)],
        trees: [[H(531, -8), 3.6, 'broad'], [H(558, -8.5), 4.5, 'broad'], [H(552, -36), 4.5, 'pine']],
        hedges: [[H(545, -31), H(560, -31)]],
      },
      {
        name: 'Corner Pocket', par: 3, tee: H(563, 1.5), basket: K(222, -11),
        trees: [[H(586, 8), 5.5, 'broad'], [K(203, -7), 4.5, 'broad'], [K(236, -8), 4, 'pine'], [{ x: 139, z: 63 }, 3.4, 'bush']],
      },
      {
        name: 'Rockaway', par: 3, tee: K(206, -1.5), basket: K(134, 10),
        trees: [[K(161, 6.5), 5.5, 'broad'], [K(177, -6.5), 5, 'broad'], [K(141, -6.5), 4.5, 'broad'], [K(122, 14), 3.5, 'bush']],
        cars: [[K(186, 2.3), Math.PI / 2]],
      },
      {
        name: 'Home', par: 3, tee: K(120, 1.5), basket: H(70.5, 10), via: [H(22, -1)],
        trees: [[{ x: 136, z: -33 }, 5, 'broad'], [H(31, -7), 4.5, 'broad'], [H(46, 7), 4, 'pine']],
      },
    ];
    for (const h of holes) b.hole(h);

    // ------------------------------------------------------------ houses
    for (let k = 0; k < 8; k++) b.house(horseshoe, 30 + LOT * k, 1, { home: k === 1 });
    for (let k = 0; k < 7; k++) b.house(horseshoe, 44 + LOT * k, -1);
    for (const s of [256, 290, 324, 358]) b.house(horseshoe, s, 1);
    for (let k = 0; k < 8; k++) b.house(horseshoe, 392 + LOT * k, 1);
    for (let k = 0; k < 7; k++) b.house(horseshoe, 404 + LOT * k, -1);
    for (const s of [40, 70, 118, 146, 174, 202, 240, 270]) b.house(rockaway, s, -1);
    for (const s of [45, 154, 236, 266]) b.house(rockaway, s, 1);

    // ------------------------------------------------- hole furniture
    for (const h of holes) {
      for (const [p, r, kind] of h.trees || []) b.tree(p, r, kind);
      for (const [p, turn] of h.cars || []) b.car(p, Math.atan2(p.tz, p.tx) + turn);
      for (const [a, c] of h.hedges || []) b.hedge(a, c);
      if (h.pool) b.pool(h.pool, Math.atan2(h.pool.tz, h.pool.tx));
    }
    const scenic = H(138, 33);
    b.pool(scenic, Math.atan2(scenic.tz, scenic.tx), 4.6, 2.8);
    b.lampsAlong(horseshoe, 62, 4.6, 40);
    b.lampsAlong(rockaway, 70, -4.6, 25);
    for (let s = 70; s < horseshoe.length - 30; s += 95) {
      const p = H(s, -4.4);
      if (!b.inCorridor(p.x, p.z, 3)) b.prop('hydrant', p.x, p.z, { r: 0.3 });
    }
    // the park in the bend
    b.prop('bench', -88, -12, { ang: 2.6, r: 1 });
    b.prop('table', -112, -8, { ang: 0.4, r: 1.2 });
    b.prop('bench', -84, 16, { ang: -2.2, r: 1 });

    // ------------------------------------------------------------- trees
    b.scatter(4200, (x, z) => {
      const near = Math.min(horseshoe.dist(x, z), rockaway.dist(x, z));
      const u = b.rng();
      if (near < 50) {
        if (b.rng() > 0.3) return null; // yards stay fairly open
        const kind = u < 0.6 ? 'broad' : u < 0.76 ? 'pine' : u < 0.88 ? 'bush' : 'birch';
        return { kind, r: kind === 'bush' ? b.R(2.2, 3.4) : b.R(2.8, 5) };
      }
      return { kind: u < 0.62 ? 'broad' : 'pine', r: b.R(4, 6.5), tall: 1.3 };
    });
  },
};
