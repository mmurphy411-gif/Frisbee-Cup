// Championship course 3: Monterey Cliffs. A homage to the great clifftop links on the
// Pacific: a short inland start, then seven holes along the cliffs — the tiny downhill
// 7th out on a point, the 8th's approach over a chasm in the rocks — before the inland
// back nine returns to the sea for the 17th and the 18th, which runs along the seawall
// with the ocean down the entire left and a cypress in the fairway. Par 72.
import { smoothstep } from '../geom.js';
import { MONTEREY } from './themes.js';
import { along, bunkerList, bunkerDip, dressHoles } from './golf.js';

const L = 1.5; // sea level
const LODGE = { x: -296, z: 140 };

// The ocean wraps the south, east and north-east of the course. The east coast has a
// rocky point (the 7th green) and a narrow chasm (in front of the 8th green).
const OCEAN = [
  [-360, 196], [-280, 193], [-200, 197], [-120, 201], [-40, 198], [30, 196], [100, 201], [170, 203], [230, 201], [268, 190],
  [290, 165], [296, 100], [293, 20], [291, -28],
  [302, -33], [318, -40], [323, -52], [314, -63], [294, -63],
  [291, -110], [293, -126], [262, -131], [258, -138], [262, -145], [293, -149],
  [292, -172], [280, -198], [200, -207], [120, -210], [40, -208], [-20, -212], [-40, -270],
  [360, -270], [360, 270], [-360, 270],
];

const HOLES = [
  { name: 'Opening Bend', par: 4, tee: [-255, 110], via: [[-250, 25]], basket: [-215, -25],
    bunkers: [[70, 14, 7, 4], [-9, -10, 4.5, 3], [-5, 10, 4, 3]] },
  { name: 'Barranca', par: 5, tee: [-200, -45], via: [[-165, -135]], basket: [-85, -180],
    bunkers: [[110, -15, 8, 4], [-11, -9, 4.5, 3], [-11, 9, 4.5, 3]] },
  { name: 'Toward the Sea', par: 4, tee: [-70, -165], via: [[-45, -90]], basket: [-60, -20],
    bunkers: [[72, -14, 7, 4], [-9, 10, 4.5, 3]] },
  { name: 'Stillwater', par: 4, tee: [20, 160], basket: [135, 168],
    bunkers: [[60, -15, 6, 4], [-10, -9, 4.5, 3], [-4, 11, 4, 3]] },
  { name: 'Cliffside', par: 3, tee: [150, 180], basket: [210, 182], green: 7.5,
    bunkers: [[-9, -9, 4, 3]] },
  { name: 'Up the Headland', par: 5, tee: [230, 165], via: [[255, 80]], basket: [245, -5],
    bunkers: [[100, -16, 8, 4], [-10, -9, 4.5, 3], [-11, 9, 4, 3]] },
  { name: 'The Point', par: 3, tee: [255, -20], basket: [305, -48], green: 6.5,
    bunkers: [[-7, -7, 2.6, 2], [-2, 7, 2.6, 2], [5, -5, 2.4, 2]] },
  { name: 'The Chasm', par: 4, tee: [265, -70], via: [[250, -115]], basket: [270, -170], green: 7.5,
    bunkers: [[-10, -9, 4, 3], [-3, 10, 3.5, 2.6]] },
  { name: 'Rim', par: 4, tee: [250, -190], via: [[190, -198]], basket: [130, -185],
    bunkers: [[-10, 9, 4.5, 3], [-8, -10, 4, 3]] },
  { name: 'Carmel Bay', par: 4, tee: [115, -195], basket: [0, -185],
    bunkers: [[64, 14, 7, 4], [-10, 10, 4.5, 3]] },
  { name: 'Cypress', par: 4, tee: [10, -160], basket: [30, -50],
    bunkers: [[66, 15, 7, 4], [-9, -10, 4.5, 3]] },
  { name: 'Hidden Green', par: 3, tee: [50, -40], basket: [115, -55],
    bunkers: [[-9, 9, 4.5, 3], [-6, -10, 4, 3]] },
  { name: 'Sidehill', par: 4, tee: [130, -70], basket: [200, 20],
    bunkers: [[60, -14, 6, 4], [-10, -9, 4.5, 3]] },
  { name: 'Long Five', par: 5, tee: [195, 40], via: [[135, 110]], basket: [55, 85],
    bunkers: [[60, 15, 8, 4], [130, -15, 8, 4], [-11, -9, 4.5, 3], [-9, 10, 4, 3]] },
  { name: 'Inland', par: 4, tee: [40, 70], basket: [-20, -15],
    bunkers: [[60, -14, 6, 4], [-9, 10, 4.5, 3]] },
  { name: 'Turning Home', par: 4, tee: [-35, 0], basket: [-50, 110],
    bunkers: [[64, 14, 7, 4], [-10, -9, 4.5, 3]] },
  { name: 'Hourglass', par: 3, tee: [-40, 125], basket: [-95, 160], green: 8,
    bunkers: [[-10, -9, 4.5, 3], [-2, 0, 3, 2.2], [-8, 10, 4, 3]] },
  { name: 'Seawall', par: 5, tee: [-85, 172], via: [[-180, 180]], basket: [-262, 160],
    bunkers: [[120, 14, 8, 4], [-10, 10, 4.5, 3], [-12, -8, 4, 3]] },
];
const BUNKERS = bunkerList(HOLES);

function height(ocean, x, z) {
  const sd = ocean.poly.sdf(x, z, 60);
  if (sd < 0) return L - Math.min(4, 1 + -sd * 0.3);
  // higher ground to the north and up on the eastern headland; lower by the seawall
  let top = 8 + 6 * smoothstep(160, -80, z) + 5 * smoothstep(170, 265, x) * smoothstep(200, 40, z);
  top += 1.6 * Math.sin(0.018 * x + 0.2) * Math.cos(0.021 * z - 0.4) + 0.6 * Math.sin(0.05 * x - 0.04 * z);
  top -= 3.5 * smoothstep(-20, -200, x) * smoothstep(80, 170, z); // down to the seawall along the 18th
  top -= 9 * Math.max(0, Math.min(1, (x - 258) / 44)) * (1 - smoothstep(26, 44, Math.abs(z + 44))); // the point sits well below the 7th tee
  // cliffs: a rocky shelf just above the water, then a steep face
  const cliff = smoothstep(1.5, 9, sd);
  return L + 0.5 + (top - L - 0.5) * cliff - bunkerDip(BUNKERS, x, z) * cliff;
}

export default {
  id: 'monterey',
  name: 'Monterey Cliffs',
  blurb: 'Championship clifftop links: the tiny 7th on the point and 18 along the sea.',
  tier: 'championship',
  seed: 1919,
  world: { halfW: 340, halfH: 250 },
  theme: MONTEREY,

  create(b) {
    // ------------------------------------------------------------- plan
    const ocean = b.lake(OCEAN, L, { name: 'ocean', per: 3 });
    b.terrain((x, z) => height(ocean, x, z));
    const drive = b.road([[-345, 70], [-310, 100], [-296, 118]], { width: 6.5, name: 'Lodge Dr', lawn: 14 });

    // ------------------------------------------------------------ holes
    const holes = HOLES.map((h) => ({ ...h, tee: { x: h.tee[0], z: h.tee[1] }, basket: { x: h.basket[0], z: h.basket[1] }, via: (h.via || []).map(([x, z]) => ({ x, z })) }));
    for (const h of holes) b.hole(h);
    dressHoles(b, holes, BUNKERS);
    b.lawnArea(Array.from({ length: 20 }, (_, i) => [LODGE.x + 18 + Math.cos((i / 20) * Math.PI * 2) * 34, LODGE.z + Math.sin((i / 20) * Math.PI * 2) * 40]));

    // ------------------------------------------------------- lodge
    b.placeHouse({
      kind: 'clubhouse', x: LODGE.x, z: LODGE.z, ang: Math.PI / 2, hu: 28, hv: 11, front: -1, stories: 2, wallH: 6.4, roofH: 2.8, roof: 'hip',
      wall: '#f2ece0', roofColor: '#4a5560', trim: '#ffffff', door: '#2f4f6f', shutters: '#2f4f6f', chimney: true, doorU: 0,
    });
    for (const [x, z] of [[-322, 70], [-318, 40]]) b.placeHouse({ kind: 'cottage', x, z, ang: Math.PI / 2, hu: 7, hv: 5, front: -1, stories: 1, wall: '#e6dccb', roofColor: '#5b6470', chimney: true });

    // --------------------------------------------- the sea and its rocks
    // a seawall of stacked stone along the 18th, and rocks at the foot of every cliff
    for (let x = -255; x <= -60; x += 4.5) {
      const p = { x, z: 191 + 2.5 * Math.sin(x * 0.05) };
      if (!b.wet(p.x, p.z, 0.2)) b.prop('wall', p.x, p.z, { ang: 0, hu: 2.4, h: 1.2, r: 2.4, color: '#a39a8c', cap: '#b8b0a2' });
    }
    for (const [x, z] of OCEAN.slice(0, 33)) {
      for (let k = 0; k < 3; k++) {
        const rx = x + b.R(-6, 6), rz = z + b.R(-6, 6), g = b.hf.get(rx, rz);
        if (g > L - 1.2 && g < L + 1.4 && !b.inCorridor(rx, rz, 6)) b.prop('boulder', rx, rz, { r: b.R(1, 2.6) });
      }
    }

    // ------------------------------------------------------------ trees
    // the cypress that stands in the 18th fairway, and a lone cypress on the rocks
    b.tree(along(holes[17], 100, 13), 6.5, 'cypress');
    b.tree({ x: 290, z: -70 }, 4.5, 'cypress'); // a lone cypress at the root of the point
    for (const [x, z] of [[205, 150], [258, 40], [275, -95], [210, -170], [60, -175], [160, 160], [-130, 150]]) {
      if (!b.inCorridor(x, z, 8) && !b.wet(x, z, 0.5)) b.tree({ x, z }, b.R(5, 7), 'cypress');
    }
    b.scatter(15000, (x, z) => {
      const u = b.rng();
      if (drive.dist(x, z) < 12 || Math.hypot(x - LODGE.x - 10, z - LODGE.z) < 44) return null;
      const sd = ocean.poly.sdf(x, z, 60);
      if (sd < 3) return null;
      if (sd < 26) {
        // windswept clifftops: cypress and low scrub only
        if (b.rng() > 0.35) return null;
        return u < 0.5 ? { kind: 'cypress', r: b.R(3.5, 6), corridor: 15 } : { kind: 'bush', r: b.R(1.3, 2.4), corridor: 13 };
      }
      if (u < 0.55) return { kind: 'pine', r: b.R(3.2, 4.6), tall: b.R(1.3, 1.6), corridor: 15 };
      if (u < 0.8) return { kind: 'cypress', r: b.R(4, 6.5), corridor: 15 };
      return { kind: 'broad', r: b.R(3.5, 5.5), corridor: 15 };
    });
    for (const [x, z, ang] of [[-200, 186, 0], [195, 192, 0], [282, 0, 1.6], [180, -200, Math.PI], [-110, 186, 0]]) {
      if (!b.inCorridor(x, z, 4) && !b.wet(x, z, 0.4)) b.prop('bench', x, z, { ang, r: 1 });
    }
  },
};
