// Championship course 2: Stadium Island. A homage to the stadium course in north
// Florida: lagoons on almost every hole, long waste bunkers, live oaks, palms and
// slash pines. It builds to the most famous finish in golf: 16 down the side of the
// big lake, the island-green 17 with its little walkway, and 18 with water all the way
// down the left, all framed by spectator mounds. Par 72.
import { smoothstep } from '../geom.js';
import { SAWGRASS } from './themes.js';
import { along, bunkerList, bunkerDip, dressHoles } from './golf.js';

const L = 2; // lagoon level
const CLUB = { x: 205, z: -140 };
const ISLAND = { x: 140, z: 70, r: 10 };
const LAKE = [[100, -60], [130, -76], [165, -62], [173, 0], [171, 60], [168, 100], [140, 110], [110, 106], [96, 72], [98, 20], [95, -20]];

const HOLES = [
  { name: 'Opening Act', par: 4, tee: [160, -185], basket: [50, -200],
    bunkers: [[60, 15, 8, 4], [-9, -10, 4.5, 3], [-6, 10, 4, 3]] },
  { name: 'Long Reach', par: 5, tee: [25, -200], via: [[-80, -195]], basket: [-160, -170],
    bunkers: [[95, -19, 45, 4.5], [-10, 10, 4.5, 3], [-12, -9, 4, 3]] },
  { name: 'Plateau', par: 3, tee: [-175, -155], basket: [-220, -100], green: 7.5,
    bunkers: [[-10, -8, 5, 3], [-2, 10, 3.5, 2.6]] },
  { name: 'Bulkhead', par: 4, tee: [-240, -95], basket: [-270, 20],
    bunkers: [[62, -15, 6, 4], [-9, 10, 4.5, 3]] },
  { name: 'Live Oak', par: 4, tee: [-260, 40], basket: [-270, 160],
    bunkers: [[68, 15, 8, 4], [-10, -10, 4, 3], [-8, 10, 4, 3]] },
  { name: 'Tight Six', par: 4, tee: [-240, 180], basket: [-140, 190], fairway: 11, corridor: 10,
    bunkers: [[-9, 10, 4, 3], [-4, -11, 3.5, 2.6]] },
  { name: 'Lagoon', par: 4, tee: [-125, 170], basket: [-150, 60],
    bunkers: [[58, -16, 7, 4], [-10, -9, 4.5, 3]] },
  { name: 'Long Iron', par: 3, tee: [-160, 40], basket: [-120, -30],
    bunkers: [[-10, -9, 5, 3], [-6, 10, 4.5, 3]] },
  { name: 'The Turn', par: 5, tee: [-95, -75], via: [[0, -135]], basket: [100, -145],
    bunkers: [[105, 18, 40, 4.5], [-11, 10, 4.5, 3], [-2, 11, 3.5, 2.6]] },
  { name: 'Waste Land', par: 4, tee: [240, -110], via: [[265, -50]], basket: [270, 30],
    bunkers: [[55, -18, 30, 4.5], [-10, -9, 4.5, 3], [-9, 10, 4, 3]] },
  { name: 'Risk and Reward', par: 5, tee: [280, 45], via: [[280, 150]], basket: [215, 190],
    bunkers: [[60, 18, 35, 4.5], [-11, 9, 4.5, 3], [-3, -11, 4, 3]] },
  { name: 'Drivable', par: 4, tee: [190, 195], basket: [100, 170], green: 8,
    bunkers: [[-14, 9, 3.5, 2.6], [-9, -9, 4, 3]] },
  { name: 'Lake Left', par: 3, tee: [75, 185], basket: [10, 165],
    bunkers: [[-8, -10, 4.5, 3]] },
  { name: 'Mounds', par: 4, tee: [-15, 160], basket: [-60, 60],
    bunkers: [[60, -15, 8, 4], [-10, 9, 4.5, 3], [-11, -10, 4, 3]] },
  { name: 'Backstretch', par: 4, tee: [-35, 35], basket: [15, -95],
    bunkers: [[70, 15, 8, 4], [-9, -10, 4.5, 3]] },
  { name: 'Last Chance', par: 5, tee: [55, -110], via: [[52, -20]], basket: [70, 70],
    bunkers: [[120, -17, 30, 4.5], [-9, -10, 4, 3], [-3, 11, 4, 3]] },
  { name: 'The Island', par: 3, drop: [91, 75], tee: [78, 92], basket: [ISLAND.x, ISLAND.z], green: 7.5,
    bunkers: [[-6, -7, 2.4, 2]] },
  { name: 'Water’s Edge', par: 4, drop: [180, -45], tee: [180, 75], via: [[192, 5]], basket: [185, -75],
    bunkers: [[50, 16, 7, 4], [-9, 10, 4.5, 3], [-11, -8, 4, 3]] },
];

// lagoons: [x, z, spread]
const PONDS = [[-248, 10, 200], [-118, 110, 320], [248, 194, 200], [45, 198, 220], [88, -162, 140], [288, -18, 180]];
// spectator mounds round the finish: [x, z, radius, height]
const MOUNDS = [[203, 40, 12, 3.2], [208, 100, 14, 3.6], [60, 105, 10, 3], [100, 132, 14, 3.4], [215, -35, 11, 3], [40, 50, 9, 2.6], [170, 128, 12, 3.2]];
const BUNKERS = bunkerList(HOLES);

function height(lake, x, z) {
  const sd = lake.poly.sdf(x, z, 80);
  // the island green sits up on its bulkhead
  const di = Math.hypot(x - ISLAND.x, z - ISLAND.z);
  if (di < ISLAND.r + 2.5) return L + 1.1 - 2.6 * smoothstep(ISLAND.r, ISLAND.r + 2.5, di) - bunkerDip(BUNKERS, x, z) * 0.6;
  if (sd < 0) return L - Math.min(2.6, 0.9 + -sd * 0.4);
  let h = L + 1.2 + 0.8 * Math.sin(0.021 * x + 0.3) * Math.cos(0.017 * z - 0.5) + 0.4 * Math.sin(0.05 * x - 0.04 * z);
  h = L + 1.0 + (h - L - 1.0) * smoothstep(0, 12, sd);
  for (const [mx, mz, r, mh] of MOUNDS) {
    const d = Math.hypot(x - mx, z - mz);
    if (d < r * 1.6) h += mh * (1 - smoothstep(0, r * 1.6, d)) ** 1.5;
  }
  for (const [px, pz, s2] of PONDS) {
    const dx = x - px, dz = z - pz;
    h -= 3.4 * Math.exp(-(dx * dx + dz * dz) / s2);
  }
  return h - bunkerDip(BUNKERS, x, z);
}

export default {
  id: 'stadium',
  name: 'Stadium Island',
  blurb: 'Championship stadium golf: lagoons everywhere and the island-green 17th.',
  tier: 'championship',
  seed: 1717,
  world: { halfW: 320, halfH: 230 },
  theme: SAWGRASS,

  create(b) {
    // ------------------------------------------------------------- plan
    const drive = b.road([[205, -240], [205, -200], [205, -160]], { width: 7, name: 'Stadium Way', lawn: 16 });
    const lake = b.lake(LAKE, L, { name: 'lake' });
    b.terrain((x, z) => height(lake, x, z));
    for (const [px, pz, s2] of PONDS) b.pond(px, pz, Math.sqrt(s2) * 1.25, b.hf.get(px, pz) + 2.0, 'lagoon');
    b.pavedArea([[235, -222], [290, -222], [290, -180], [235, -180]]); // car park

    // ------------------------------------------------------------ holes
    const holes = HOLES.map((h) => ({ ...h, tee: { x: h.tee[0], z: h.tee[1] }, basket: { x: h.basket[0], z: h.basket[1] }, via: (h.via || []).map(([x, z]) => ({ x, z })) }));
    for (const h of holes) b.hole(h);
    dressHoles(b, holes, BUNKERS);
    b.lawnArea(Array.from({ length: 20 }, (_, i) => [CLUB.x + Math.cos((i / 20) * Math.PI * 2) * 50, CLUB.z + 18 + Math.sin((i / 20) * Math.PI * 2) * 34]));
    for (const [mx, mz, r] of MOUNDS) b.lawnArea(Array.from({ length: 16 }, (_, i) => [mx + Math.cos((i / 16) * Math.PI * 2) * r * 1.5, mz + Math.sin((i / 16) * Math.PI * 2) * r * 1.5]));

    // ------------------------------------------------------- the island 17th
    // the walkway out to the island, along the back right of the green
    b.span({ x: ISLAND.x + 7, z: ISLAND.z + 8 }, { x: ISLAND.x + 20, z: ISLAND.z + 37 }, 2.2, L + 0.7, { kind: 'boardwalk', rails: false });

    // --------------------------------------------------------- clubhouse
    b.placeHouse({
      kind: 'clubhouse', x: CLUB.x, z: CLUB.z, ang: 0, hu: 30, hv: 13, front: -1, stories: 2, wallH: 6.6, roofH: 3, roof: 'hip',
      wall: '#efe2c8', roofColor: '#b5533a', trim: '#ffffff', door: '#3d5a40', shutters: null, chimney: false, doorU: 0,
    });
    for (const [x, z, ang] of [[242, -214, 0], [252, -214, 0], [262, -214, 0], [272, -214, 0], [242, -188, Math.PI], [258, -188, Math.PI], [276, -188, Math.PI]]) b.car({ x, z }, ang + Math.PI / 2);
    for (let z = -226; z <= -170; z += 12) for (const s of [-1, 1]) b.tree({ x: 205 + s * 9, z }, b.R(2.6, 3.2), 'palm');

    // ------------------------------------------------ furniture and life
    for (const [x, z, ang] of [[210, 18, 1.6], [214, 60, 1.6], [70, 122, 0.2], [110, 140, 0], [226, -45, 2]]) {
      if (!b.inCorridor(x, z, 4)) b.prop('bench', x, z, { ang, r: 1 });
    }
    b.ducks.push({ x: 130, z: 20, r: 12, speed: 0.35, phase: 0.4 });
    b.ducks.push({ x: -118, z: 110, r: 5, speed: 0.3, phase: 2 });
    // palms ring the island green's walkway end and the 18th tee
    for (const [x, z] of [[163, 112], [172, 104], [186, 92], [70, 112], [55, 96]]) if (!b.inCorridor(x, z, 6)) b.tree({ x, z }, b.R(2.6, 3.3), 'palm');
    // the big live oak short and right of the 16th green
    const oak = along(holes[15], -34, 18);
    b.tree(oak, 8, 'broad', { tall: 0.85 });

    // ------------------------------------------------------------ trees
    b.scatter(24000, (x, z) => {
      const u = b.rng();
      if (drive.dist(x, z) < 12) return null;
      if (Math.hypot(x - CLUB.x, z - CLUB.z - 14) < 52) return null;
      if (MOUNDS.some(([mx, mz, r]) => Math.hypot(x - mx, z - mz) < r * 1.5)) return null;
      if (u < 0.18) return { kind: 'palm', r: b.R(2.5, 3.4), corridor: 15 };
      if (u < 0.42) return { kind: 'broad', r: b.R(4.5, 7.5), tall: 0.75, corridor: 16 };
      if (u < 0.55) return { kind: 'bush', r: b.R(1.6, 2.6), corridor: 13 };
      return { kind: 'pine', r: b.R(3, 4.2), tall: b.R(1.4, 1.7), corridor: 15 };
    });
  },
};
