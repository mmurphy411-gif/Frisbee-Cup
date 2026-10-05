// Championship course 4: The Old Links. A homage to the oldest course of them all: out
// along the beach and back again over one vast shared fairway, with seven double greens
// carrying two baskets each, a loop at the far end by the estuary, gorse everywhere and
// hardly a tree. The Swilcan Burn guards the 1st, the 17th is the Road Hole (a hotel
// to carry, the road and a wall behind the green), Hell Bunker swallows second shots on
// the 14th, and the 18th comes home over the old stone bridge to the Valley of Sin, with
// the grey town along its right. Par 72.
import { smoothstep } from '../geom.js';
import { LINKS } from './themes.js';
import { along, bunkerList, bunkerDip, dressHoles, bridgeOver } from './golf.js';

const L = 1.5; // sea level
const CLUB = { x: -466, z: -30 };
const VALLEY = { x: -424, z: 8 };
const SEA = [
  [-392, -270], [-386, -142], [-300, -127], [-150, -122], [0, -124], [150, -127], [300, -130], [430, -132], [472, -112],
  [474, -40], [476, 70], [500, 72], [500, -270],
];

// The double greens share a basket pair: out-hole basket first, in-hole basket second.
const HOLES = [
  { name: 'Burn', par: 4, tee: [-425, -42], basket: [-325, -18], bunkers: [] },
  { name: 'Dyke', par: 4, tee: [-310, -48], basket: [-200, -8], bunkers: [[62, 10, 3, 2.4], [-6, -8, 3, 2.4]] },
  { name: 'Cartgate (Out)', par: 4, tee: [-180, -50], basket: [-85, -8], bunkers: [[-9, 6, 4, 3], [55, 8, 2.8, 2.2], [60, 3, 2.8, 2.2]] },
  { name: 'Ginger Beer', par: 4, tee: [-70, -50], basket: [35, -8], bunkers: [[58, 6, 6, 4], [72, -8, 3, 2.4]] },
  { name: 'Hole o’ Cross (Out)', par: 5, tee: [50, -50], via: [[130, -60]], basket: [200, -8], bunkers: [[70, 8, 3, 2.4], [74, 2, 3, 2.4], [140, -6, 3, 2.4]] },
  { name: 'Heathery (Out)', par: 4, tee: [215, -50], basket: [305, -8], bunkers: [[50, 7, 3, 2.4], [56, 2, 3, 2.4], [-12, 0, 3, 2.4]] },
  { name: 'High (Out)', par: 4, tee: [320, -50], via: [[365, -60]], basket: [405, -20], bunkers: [[-10, 8, 5, 3.5]] },
  { name: 'Short', par: 3, tee: [420, -42], basket: [455, 15], bunkers: [[-10, -2, 3.2, 2.4]] },
  { name: 'End', par: 4, tee: [466, 35], basket: [452, 130], bunkers: [[45, 6, 3, 2.4], [-8, -7, 3, 2.4]] },
  { name: 'Bobby Jones', par: 4, tee: [430, 142], basket: [442, 28], bunkers: [[60, 8, 3, 2.4], [-14, 6, 3, 2.4]] },
  { name: 'High (In)', par: 3, tee: [425, 55], basket: [395, -4], bunkers: [[-8, -6, 3.6, 2.8], [-5, 8, 3, 2.4]] },
  { name: 'Heathery (In)', par: 4, tee: [395, 50], basket: [315, 10], bunkers: [[40, 0, 3, 2.4], [52, 5, 3, 2.4], [60, -4, 3, 2.4]] },
  { name: 'Hole o’ Cross (In)', par: 4, tee: [290, 48], basket: [210, 10], bunkers: [[48, 7, 3, 2.4], [52, 2, 3, 2.4], [56, -3, 3, 2.4]] },
  { name: 'Long', par: 5, tee: [195, 50], via: [[120, 62]], basket: [45, 10], bunkers: [[48, -10, 3, 2.4], [52, -6, 3, 2.4], [56, -10, 3, 2.4]] },
  { name: 'Cartgate (In)', par: 4, tee: [15, 48], basket: [-75, 10], bunkers: [[55, -6, 3, 2.4], [-10, -6, 4, 3]] },
  { name: 'Corner of the Dyke', par: 4, tee: [-105, 48], basket: [-190, 10], bunkers: [[48, 2, 2.6, 2.2], [51, -2, 2.6, 2.2], [54, 2, 2.6, 2.2], [-8, 8, 3, 2.4]] },
  { name: 'Road', par: 4, tee: [-160, 58], via: [[-215, 52]], basket: [-275, 45], green: 7.5, bunkers: [[-7, -7, 2.8, 2.6]] },
  { name: 'Tom Morris', par: 4, tee: [-300, 10], basket: [-440, 8], bunkers: [] },
];
// Hell Bunker: a great sandy pit in front of the 14th's second shot
const HELL = { x: 92, z: 43, rx: 9, rz: 7, ang: -0.6 };
const BUNKERS = [...bunkerList(HOLES), HELL];

function height(sea, x, z) {
  const sd = sea.poly.sdf(x, z, 60);
  if (sd < 0) return L - Math.min(3, 0.5 + -sd * 0.08); // a long, shallow beach shelf
  // humpy links ground, dunes along the beach
  let h = 3.8 + 0.7 * Math.sin(0.06 * x + 0.3) * Math.cos(0.05 * z - 0.2) + 0.45 * Math.sin(0.13 * x - 0.11 * z) + 0.3 * Math.sin(0.21 * x + 0.17 * z);
  h += 2.2 * smoothstep(-70, -105, z) * (1 - smoothstep(-110, -122, z)) * (0.6 + 0.4 * Math.sin(0.07 * x));
  h = L + 0.3 + (h - L - 0.3) * smoothstep(0, 22, sd);
  // the Valley of Sin, in front of the 18th green
  const dv = Math.hypot((x - VALLEY.x) / 1.4, z - VALLEY.z);
  h -= 1.3 * (1 - smoothstep(0, 9, dv));
  const dh = Math.hypot((x - HELL.x) / 1.2, z - HELL.z);
  h -= 1.2 * (1 - smoothstep(4, 10, dh));
  return h - bunkerDip(BUNKERS, x, z) * 1.3;
}

export default {
  id: 'oldlinks',
  name: 'The Old Links',
  blurb: 'Championship links: double greens, the Road Hole, Hell Bunker and the Swilcan Burn.',
  tier: 'championship',
  seed: 1552,
  world: { halfW: 490, halfH: 175 },
  theme: LINKS,

  create(b) {
    // ------------------------------------------------------------- plan
    const links = b.road([[-495, -84], [-420, -86], [-340, -88], [-300, -96]], { width: 6.5, name: 'The Links', lawn: 0 });
    const wynd = b.road([[-395, -84], [-394, 0], [-393, 90], [-392, 180]], { width: 4, name: 'the Wynd', lawn: 0, flatten: true });
    const road = b.road([[-290, 180], [-290, 100], [-291, 40], [-300, 25], [-330, 20]], { width: 5, name: 'the Road', lawn: 0 });
    const sea = b.lake(SEA, L, { name: 'sea', per: 3 });
    const burn = b.creek(
      [[-300, 180], [-330, 95], [-342, 40], [-345, -5], [-348, -60], [-360, -110], [-370, -140]],
      { width: 4, bed: [1.8, 0.4], depth: 0.35, name: 'Swilcan Burn' },
    );
    b.terrain((x, z) => b.carveCreek(burn, x, z, height(sea, x, z)));

    // one vast shared fairway, then the holes dressed over it
    b.lawnArea([[-445, -78], [470, -82], [478, 160], [380, 165], [380, 78], [-445, 82]]);
    const sandPts = [];
    for (let x = -380; x <= 460; x += 20) sandPts.push([x, -96]);
    for (let x = 460; x >= -380; x -= 20) sandPts.push([x, -132]);
    b.sandArea(sandPts); // the beach

    // ------------------------------------------------------------ holes
    const holes = HOLES.map((h) => ({ ...h, tee: { x: h.tee[0], z: h.tee[1] }, basket: { x: h.basket[0], z: h.basket[1] }, via: (h.via || []).map(([x, z]) => ({ x, z })) }));
    for (const h of holes) b.hole(h);
    dressHoles(b, holes, BUNKERS);

    // ------------------------------------------------- the old grey town
    b.placeHouse({
      kind: 'clubhouse', x: CLUB.x, z: CLUB.z, ang: Math.PI / 2, hu: 20, hv: 11, front: 1, stories: 3, wallH: 9, roofH: 3, roof: 'hip',
      wall: '#c9bfae', roofColor: '#4a4f57', trim: '#e8e2d6', door: '#2f4a3a', shutters: null, chimney: true, doorU: 0,
    });
    for (let x = -480; x <= -320; x += 17) {
      b.placeHouse({ kind: 'shop', x, z: -104, ang: 0, hu: 8, hv: 6.5, front: 1, stories: x % 34 === 0 ? 3 : 2, roof: 'gable', windows: true });
    }
    // the hotel the Road Hole drives over, and the wall behind its green
    b.placeHouse({
      kind: 'hotel', x: -175, z: 105, ang: 0.08, hu: 34, hv: 11, front: -1, stories: 3, wallH: 9.5, roofH: 2.4, roof: 'hip',
      wall: '#b8a990', roofColor: '#4a4f57', trim: '#e8e2d6', shutters: null, chimney: false,
    });
    for (let z = 32; z <= 120; z += 4.4) b.prop('wall', -297, z, { ang: Math.PI / 2, hu: 2.2, h: 1.3, r: 2.2, color: '#a59c8c', cap: '#b7ae9e' });

    // ----------------------------------------------- burn, bridge and benches
    bridgeOver(b, burn, along(holes[17], 50).x, along(holes[17], 50).z, { reach: 3, width: 3.4 }); // the Swilcan Bridge
    for (const [x, z, ang] of [[-440, -60, 0], [-300, -70, 0], [-380, 60, 3.14], [420, 100, 1.6]]) {
      if (!b.inCorridor(x, z, 4)) b.prop('bench', x, z, { ang, r: 1 });
    }

    // ---------------------------------------- gorse, heather and dune grass
    const GORSE = ['#d9bb1f', '#e2c62a', '#c9a81a', '#4f6332', '#5a6e38'];
    b.scatter(26000, (x, z) => {
      const u = b.rng();
      if (x < -300 && z < -80) return null; // the town
      if (wynd.dist(x, z) < 6 || links.dist(x, z) < 6 || road.dist(x, z) < 6) return null;
      if (Math.hypot(x - CLUB.x, z - CLUB.z) < 40) return null;
      if (Math.abs(x + 175) < 45 && Math.abs(z - 105) < 22) return null; // hotel
      const edge = z > 75 || z < -82 || (x > 380 && x < 480 && z > 60);
      if (!edge && u > 0.06) return null; // the shared fairway stays open, bar a few gorse patches
      if (edge && u > 0.55) return null;
      if (z > 130 && x < -200 && b.rng() < 0.5) return { kind: 'broad', r: b.R(3.5, 5.5), corridor: 14 };
      return { kind: 'bush', r: b.R(1.4, 2.8), color: b.rng() < 0.1 ? '#8a5a8a' : b.pick(GORSE), corridor: 13 };
    });
  },
};
