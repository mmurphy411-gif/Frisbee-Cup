// Championship course 1: Magnolia National. A homage to the most famous parkland course
// in golf: down Magnolia Lane to a white clubhouse on the hill, tall pines over pine
// straw, white sand, and holes named for flowering plants. The back nine falls away to
// Amen Corner, where Rae's Creek runs in front of the 12th, the 13th doglegs left along
// a tributary lined with azaleas, and ponds guard 11, 15 and 16. Par 72.
import { smoothstep } from '../geom.js';
import { MAGNOLIA } from './themes.js';
import { along, bunkerList, bunkerDip, dressHoles, bridgeOver } from './golf.js';

const CLUB = { x: 0, z: -184 };
const AZALEA = ['#e0457b', '#f06aa0', '#ffffff', '#d12f5e', '#f28aa8', '#e8567a', '#c93a8a'];
const DOGWOOD = ['#ffffff', '#f7e9ee', '#f2c9d8'];
const MAGNOLIA_GREEN = ['#24502a', '#2c5a2f', '#1f4726'];

// Bunkers: [s, d, rx, rz] — s metres from the tee (negative: back from the basket),
// d metres right of the line of play.
const HOLES = [
  { name: 'Tea Olive', par: 4, tee: [-35, -170], via: [[-40, -90]], basket: [-60, -35],
    bunkers: [[78, 14, 9, 5], [-10, -11, 5, 3.5]] },
  { name: 'Pink Dogwood', par: 5, tee: [-55, -10], via: [[-50, 90]], basket: [-80, 170],
    bunkers: [[95, 15, 10, 5], [-11, -10, 4.5, 3.5], [-11, 10, 4.5, 3.5]] },
  { name: 'Flowering Peach', par: 4, tee: [-105, 185], basket: [-115, 90],
    bunkers: [[48, -12, 4, 3], [56, -15, 4, 3], [64, -12, 4, 3], [72, -16, 4, 3], [-9, -9, 4, 3]] },
  { name: 'Flowering Crab Apple', par: 3, tee: [-110, 70], basket: [-105, -10],
    bunkers: [[-10, -9, 5, 3.5], [-4, 11, 4, 3]] },
  { name: 'Magnolia', par: 4, tee: [-110, -30], via: [[-112, -95]], basket: [-130, -140],
    bunkers: [[62, -14, 6, 4], [70, -16, 5, 3.5], [-8, 12, 3.5, 3], [-5, -11, 4, 3]] },
  { name: 'Juniper', par: 3, tee: [-160, -150], basket: [-178, -80],
    bunkers: [[-10, -9, 5.5, 3.5]] },
  { name: 'Pampas', par: 4, tee: [-182, -60], basket: [-180, 50], fairway: 10, corridor: 9,
    bunkers: [[-11, -9, 4, 3], [-11, 9, 4, 3], [-2, 12, 4, 3], [-2, -12, 4, 3], [7, 0, 5, 3]] },
  { name: 'Yellow Jasmine', par: 5, tee: [-215, 60], via: [[-240, -45]], basket: [-235, -160],
    bunkers: [[92, 15, 10, 6]] },
  { name: 'Carolina Cherry', par: 4, tee: [-220, -200], basket: [-80, -205],
    bunkers: [[-10, -10, 5, 3.5], [-4, -12, 4, 3]] },
  { name: 'Camellia', par: 4, tee: [35, -160], via: [[30, -80]], basket: [50, -15],
    bunkers: [[100, 18, 10, 6], [-6, 11, 5, 3.5]] },
  { name: 'White Dogwood', par: 4, tee: [55, 5], via: [[50, 80]], basket: [65, 140],
    bunkers: [[-4, 11, 5, 3.5]] },
  { name: 'Golden Bell', par: 3, tee: [90, 165], basket: [152, 195], green: 7.5,
    bunkers: [[-10, 0, 5, 2.8], [8, -7, 4, 2.6], [8, 7, 4, 2.6]] },
  { name: 'Azalea', par: 5, tee: [200, 215], via: [[265, 140]], basket: [250, 45],
    bunkers: [[9, -8, 3.5, 2.6], [10, -2, 3.5, 2.6], [10, 4, 3.5, 2.6], [9, 10, 3.5, 2.6]] },
  { name: 'Chinese Fir', par: 4, tee: [270, 30], basket: [275, -110], bunkers: [] },
  { name: 'Firethorn', par: 5, tee: [240, -150], via: [[190, -75]], basket: [185, 15], bunkers: [] },
  { name: 'Redbud', par: 3, tee: [180, 45], basket: [112, 75],
    bunkers: [[-6, 11, 5, 3.5], [3, 10, 4, 3], [-9, -10, 4, 3]] },
  { name: 'Nandina', par: 4, tee: [105, 60], basket: [100, -55],
    bunkers: [[-12, 0, 4.5, 3]] },
  { name: 'Holly', par: 4, tee: [110, -70], via: [[115, -130]], basket: [80, -180], fairway: 12, corridor: 10,
    bunkers: [[56, -15, 6, 4], [64, -17, 5, 3.5], [-11, -9, 5, 3.5], [-4, 11, 4, 3]] },
];

// Ponds: centre, reach of the dip, and how wide the water is.
const POND_11 = { x: 88, z: 138, s2: 206 };
const POND_15 = { x: 187, z: -5, s2: 170 };
const POND_16 = { x: 146, z: 61, s2: 680 };
const PONDS = [POND_11, POND_15, POND_16];
const BUNKERS = bunkerList(HOLES);

function base(x, z) {
  // high ground at the clubhouse, falling away to Amen Corner in the south-east
  let h = 6.5 + 20.5 * smoothstep(230, -230, z + 0.3 * x);
  h += 2.2 * Math.sin(0.016 * x + 0.4) * Math.cos(0.019 * z - 0.2) + 0.9 * Math.sin(0.045 * x - 0.035 * z);
  const dc = Math.hypot(x - CLUB.x, z - CLUB.z);
  if (dc < 50) h += (27 - h) * (1 - smoothstep(32, 50, dc));
  return h;
}

function land(x, z) {
  let h = base(x, z) - bunkerDip(BUNKERS, x, z);
  for (const p of PONDS) {
    const dx = x - p.x, dz = z - p.z;
    h -= 3.6 * Math.exp(-(dx * dx + dz * dz) / p.s2);
  }
  return h;
}

export default {
  id: 'magnolia',
  name: 'Magnolia National',
  blurb: 'Championship parkland: Amen Corner, Rae’s Creek, azaleas and pine straw.',
  tier: 'championship',
  seed: 4110,
  world: { halfW: 320, halfH: 230 },
  theme: MAGNOLIA,

  create(b) {
    // ------------------------------------------------------------- plan
    const lane = b.road([[0, -240], [0, -214], [0, -200]], { width: 6, name: 'Magnolia Lane', lawn: 14 });
    const raes = b.creek(
      [[-40, 232], [20, 215], [70, 185], [110, 176], [150, 178], [190, 196], [230, 203], [330, 198]],
      { width: 5, bed: [1.9, 0.9], depth: 0.4, name: 'Rae’s Creek' },
    );
    const trib = b.creek(
      [[228, 28], [238, 58], [245, 95], [240, 140], [222, 175], [212, 197]],
      { width: 3.6, bed: [3.2, 1.2], depth: 0.35, name: 'creek' },
    );
    b.terrain((x, z) => b.carveCreek(trib, x, z, b.carveCreek(raes, x, z, land(x, z))));
    for (const p of PONDS) b.pond(p.x, p.z, Math.sqrt(p.s2) * 1.2, b.hf.get(p.x, p.z) + 2.0, 'pond');
    b.pavedArea(Array.from({ length: 20 }, (_, i) => [Math.cos((i / 20) * Math.PI * 2) * 12, -204 + Math.sin((i / 20) * Math.PI * 2) * 9]));

    // ------------------------------------------------------------ holes
    const holes = HOLES.map((h) => ({ ...h, tee: { x: h.tee[0], z: h.tee[1] }, basket: { x: h.basket[0], z: h.basket[1] }, via: (h.via || []).map(([x, z]) => ({ x, z })) }));
    for (const h of holes) b.hole(h);
    dressHoles(b, holes, BUNKERS);
    b.lawnArea(Array.from({ length: 24 }, (_, i) => [CLUB.x + Math.cos((i / 24) * Math.PI * 2) * 48, CLUB.z + 20 + Math.sin((i / 24) * Math.PI * 2) * 36]));

    // ------------------------------------------------ clubhouse and cabins
    b.placeHouse({
      kind: 'clubhouse', x: CLUB.x, z: CLUB.z, ang: 0, hu: 24, hv: 10, front: -1, stories: 2, wallH: 6.4, roofH: 2.4, roof: 'hip',
      wall: '#f6f3ea', roofColor: '#3f5747', trim: '#ffffff', door: '#2f5d3a', shutters: '#2f5d3a', chimney: true, doorU: 0,
    });
    for (const [x, z] of [[46, -214], [70, -212], [-60, -222]]) {
      b.placeHouse({ kind: 'cabin', x, z, ang: 0, hu: 6, hv: 4.5, front: 1, stories: 1, wall: '#f6f3ea', roofColor: '#3f5747', shutters: '#2f5d3a', chimney: true });
    }
    b.tree({ x: CLUB.x, z: CLUB.z + 34 }, 11, 'broad', { tall: 1.15, color: '#2f6a35' }); // the big oak
    for (let z = -224; z <= -212; z += 6) {
      for (const s of [-1, 1]) b.tree({ x: s * 9, z }, 4.2, 'broad', { color: b.pick(MAGNOLIA_GREEN), tall: 1.1 });
    }

    // ----------------------------------------------- Amen Corner and water
    bridgeOver(b, raes, 122, 176); // Hogan Bridge to the 12th green
    bridgeOver(b, raes, 204, 199); // Nelson Bridge to the 13th tee
    const sarazen = along(holes[14], -24, -12);
    b.span({ x: sarazen.x - 6, z: sarazen.z }, { x: sarazen.x + 6, z: sarazen.z }, 2.4, b.hf.get(sarazen.x, sarazen.z) + 0.6, { kind: 'stone', rails: true });

    // azaleas: banks of them behind 12, along 13 and round the 16th pond
    const azaleas = (pts, n, spread) => {
      for (const [x0, z0] of pts) {
        for (let i = 0; i < n; i++) {
          const x = x0 + b.R(-spread, spread), z = z0 + b.R(-spread, spread);
          if (b.inCorridor(x, z, 7) || b.wet(x, z, 0.3) || b.treeOverlap(x, z, 1.6)) continue;
          b.tree({ x, z }, b.R(1.4, 2.3), 'bush', { color: b.pick(AZALEA) });
        }
      }
    };
    azaleas([[140, 214], [165, 214], [185, 212]], 6, 7);
    azaleas([[225, 100], [222, 125], [215, 155], [230, 75], [205, 185]], 7, 8);
    azaleas([[128, 40], [168, 82], [120, 92], [175, 30]], 5, 6);
    azaleas([[-40, -150], [40, -150], [-30, -205], [30, -205], [20, -168], [-20, -168]], 4, 5);
    azaleas([[78, 160], [100, 120], [60, 175]], 5, 6);
    for (const [x, z] of [[90, 150], [175, 205], [230, 20], [-95, 150], [35, -40], [-150, -60], [70, 105]]) {
      if (!b.inCorridor(x, z, 8) && !b.wet(x, z)) b.tree({ x, z }, b.R(2.8, 3.6), 'broad', { color: b.pick(DOGWOOD), tall: 0.8 });
    }
    // the tree that used to stand guard on the 17th
    const ike = along(holes[16], 70, -14);
    b.tree(ike, 5.5, 'pine', { tall: 1.25 });

    b.ducks.push({ x: POND_16.x, z: POND_16.z, r: 9, speed: 0.35, phase: 1 });
    b.ducks.push({ x: POND_11.x, z: POND_11.z, r: 4, speed: 0.3, phase: 3 });
    for (const [x, z, ang] of [[60, 120, 1.6], [160, 92, 3.6], [-30, -150, 0], [30, -150, 0], [260, 160, 2.6]]) {
      if (!b.inCorridor(x, z, 4)) b.prop('bench', x, z, { ang, r: 1 });
    }

    // ------------------------------------------------------------ trees
    b.scatter(26000, (x, z) => {
      const u = b.rng();
      if (lane.dist(x, z) < 14) return null;
      if (Math.hypot(x - CLUB.x, z - CLUB.z - 18) < 46) return null;
      if (u < 0.08) return { kind: 'broad', r: b.R(2.6, 3.4), color: b.pick(DOGWOOD), tall: 0.8, corridor: 15 };
      if (u < 0.2) return { kind: 'broad', r: b.R(4, 6.5), color: b.pick(MAGNOLIA_GREEN), tall: 1.1, corridor: 15 };
      return { kind: 'pine', r: b.R(3.2, 4.8), tall: b.R(1.45, 1.8), corridor: 15 };
    });
  },
};
