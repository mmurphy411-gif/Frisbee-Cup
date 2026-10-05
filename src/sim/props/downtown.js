// Colliders for props only downtown (Meridian City) uses, keyed by prop type. See props/index.js.

// A flat-topped building: landing on its roof is out of bounds like any other roof.
const roofed = (world, p, cx, cz, hu, hv, cos, sin, base, height, extra) => world.addRect({
  t: 'house', cx, cz, hu, hv, cos, sin, base, wallH: height, roofH: 0.02, roof: 'gable', e: 0.25, keep: 0.5, name: 'house', ...extra,
});

export default {
  'downtown:tower': (p, { world, y, cos, sin, box }) => {
    roofed(world, p, p.x, p.z, p.hu, p.hv, cos, sin, y, p.h);
    if (p.style === 'civic') {
      box(2.4, p.hv * 0.7, -0.5, p.h, 'house', -p.hu - 2.0, 0); // the portico
      // the dome on its drum
      world.addCircle({ t: 'sphere', x: p.x, y: y + p.h + 3.2, z: p.z, r: Math.min(p.hu, p.hv) * 0.62, e: 0.35, keep: 0.55, name: 'house' }, Math.min(p.hu, p.hv) * 0.62);
    }
  },

  // The elevated line: a deck on steel columns. The space beneath is open; anything that
  // comes to rest up on the tracks is out of bounds.
  'downtown:el': (p, { world, y, cos, sin }) => {
    roofed(world, p, p.x, p.z, p.hu, p.w / 2, cos, sin, y + p.clear, 1.7, { open: true, name: 'car' });
    for (const u of p.cols) {
      for (const s of [-1, 1]) {
        const w = s * (p.w / 2 - 0.45);
        world.addPost(p.x + u * cos - w * sin, p.z + u * sin + w * cos, 0.36, p.clear + 0.2, 'pole');
      }
    }
  },

  'downtown:station': (p, { world, y, cos, sin, box }) => {
    for (const s of [-1, 1]) {
      const w = s * (p.w / 2 + 1.6);
      roofed(world, p, p.x - w * sin, p.z + w * cos, p.hu, 1.6, cos, sin, y + p.clear, 4.6, { open: true });
      for (let u = -p.hu + 1; u <= p.hu - 0.9; u += (p.hu * 2 - 2) / 6) {
        const pw = s * (p.w / 2 + 3.0);
        world.addPost(p.x + u * cos - pw * sin, p.z + u * sin + pw * cos, 0.3, p.clear, 'pole');
      }
      // stair towers down to the sidewalks at each end
      for (const e of [-1, 1]) box(2.4, 1.5, -0.5, p.clear + 1.4, 'house', e * (p.hu + 2.6), s * 6.6);
    }
  },

  'downtown:train': (p, { box }) => {
    box(p.hu, 1.45, p.clear + 1.0, p.clear + 4.6, 'car', 0, p.track);
  },

  'downtown:fountain': (p, { world, y }) => {
    world.addCircle({ t: 'cyl', x: p.x, z: p.z, r: p.r, y0: y - 1, y1: y + 0.75, e: 0.4, keep: 0.6, name: 'rock' }, p.r + 0.3);
    world.addCircle({ t: 'cyl', x: p.x, z: p.z, r: 2.2, y0: y - 1, y1: y + 2.6, e: 0.4, keep: 0.6, name: 'rock' }, 2.5);
    world.addCircle({ t: 'cyl', x: p.x, z: p.z, r: 0.6, y0: y - 1, y1: y + 4.6, e: 0.4, keep: 0.6, name: 'rock' }, 0.9);
  },

  'downtown:sculpture': (p, { world, y, box }) => {
    box(2.2, 2.2, -0.5, 0.8, 'rock');
    world.addCircle({ t: 'sphere', x: p.x, y: y + 5.3, z: p.z, r: 4.4, e: 0.45, keep: 0.6, name: 'pole' }, 4.4);
  },

  'downtown:truck': (p, { box }) => box(3.3, 1.25, -0.5, 3.2, 'car'),

  'downtown:planter': (p, { box }) => box(p.hu, p.hv, -0.5, 0.85, 'rock'),

  'downtown:busstop': (p, { world, y, cos, sin, box }) => {
    box(1.9, 0.1, -0.5, 2.4, 'rail', 0, -0.7);
    roofed(world, p, p.x, p.z, 2.1, 0.95, cos, sin, y + 2.45, 0.15, { open: true });
    world.addPost(p.x + 1.9 * cos - 0.6 * sin, p.z + 1.9 * sin + 0.6 * cos, 0.06, 2.45, 'pole');
    world.addPost(p.x - 1.9 * cos - 0.6 * sin, p.z - 1.9 * sin + 0.6 * cos, 0.06, 2.45, 'pole');
  },

  'downtown:signal': (p, { world, box }) => {
    world.addPost(p.x, p.z, 0.13, 5.7, 'pole');
    box(3, 0.12, 5.4, 5.6, 'pole', 3, 0);
  },

  'downtown:boat': (p, { box }) => box(6, 1.9, -1.0, 2.6, 'car'),
};
