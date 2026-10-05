// Colliders for props only hilltown (Santa Brisa) uses, keyed by prop type. See props/index.js.
// Shared shape helpers live here too, so the renderer and the colliders agree.

// The stepped soffit of an archway: N slices between the springing and the crown, each with
// the half-width of the opening at the top of the slice.
export function archSlices(p) {
  const R = p.open / 2, spring = p.spring, n = 6, out = [];
  for (let k = 0; k < n; k++) {
    const y0 = spring + (k * R) / n, y1 = spring + ((k + 1) * R) / n;
    out.push({ y0, y1, half: Math.sqrt(Math.max(0, R * R - (y1 - spring) ** 2)) });
  }
  return out;
}

const post = (world, x, z, r, y0, y1, name, e = 0.35, keep = 0.55) =>
  world.addCircle({ t: 'cyl', x, z, r, y0, y1, e, keep, name }, r + 0.3);

export default {
  // a blue dome on a drum, sitting on a flat roof
  'hilltown:dome'(p, { world, y }) {
    const r = p.r ?? 2.4, drum = p.drum ?? 1.0;
    post(world, p.x, p.z, r, y - 1, y + drum, 'house');
    world.addCircle({ t: 'sphere', x: p.x, y: y + drum, z: p.z, r, e: 0.3, keep: 0.5, name: 'house' }, r);
  },
  'hilltown:campanile'(p, { world, y, cos, sin }) {
    const w = p.w ?? 5, h = p.h ?? 24;
    world.addRect({ t: 'house', cx: p.x, cz: p.z, hu: w / 2 + 0.3, hv: w / 2 + 0.3, cos, sin, base: y - 1, wallH: h * 0.86 + 1, roofH: h * 0.14,
      roof: 'hip', e: 0.25, keep: 0.5, name: 'house' });
  },
  'hilltown:fountain'(p, { world, y }) {
    const r = p.r ?? 3;
    post(world, p.x, p.z, r, y - 1, y + 0.75, 'rock', 0.4, 0.55);
    post(world, p.x, p.z, 0.45, y - 1, y + 3.1, 'rock');
    world.addCircle({ t: 'cyl', x: p.x, z: p.z, r: 1.3, y0: y + 1.6, y1: y + 1.85, e: 0.4, keep: 0.55, name: 'rock' }, 1.6);
  },
  'hilltown:table'(p, { world, y }) {
    post(world, p.x, p.z, 0.45, y - 1, y + 0.78, 'bench');
  },
  // a stone archway: two piers, a stepped soffit and a roof terrace a disc can land on
  'hilltown:arch'(p, { world, y, box, cos, sin }) {
    const R = p.open / 2, pier = p.pier, t = p.thick / 2, top = p.spring + R + p.over;
    for (const s of [-1, 1]) box(t, pier / 2, -1, top, 'house', 0, s * (R + pier / 2));
    for (const sl of archSlices(p)) {
      if (sl.half >= R - 0.05) continue;
      const wid = R - sl.half;
      for (const s of [-1, 1]) box(t, wid / 2, sl.y0, sl.y1 + 0.02, 'house', 0, s * (sl.half + wid / 2));
    }
    world.addRect({ t: 'house', open: true, cx: p.x, cz: p.z, hu: t, hv: R + pier, cos, sin, base: y + p.spring + R - 0.02, wallH: p.over + 0.02, roofH: 0,
      roof: 'gable', e: 0.25, keep: 0.5, name: 'house' });
  },
  'hilltown:rampart'(p, { box }) {
    box(p.hu, (p.t ?? 1.4) / 2, -2, p.h, 'house', 0, 0, { e: 0.4, keep: 0.6 });
  },
  'hilltown:tower'(p, { world, y, cos, sin }) {
    if (p.sq) {
      world.addRect({ t: 'house', cx: p.x, cz: p.z, hu: p.r, hv: p.r, cos, sin, base: y - 2, wallH: p.h + 2, roofH: 0, roof: 'gable', e: 0.4, keep: 0.6, name: 'house' });
    } else {
      post(world, p.x, p.z, p.r, y - 2, y + p.h, 'house', 0.4, 0.6);
    }
  },
  'hilltown:boat'(p, { box }) {
    box((p.len ?? 6) / 2, (p.beam ?? 2.2) / 2, -0.6, 0.8, 'car');
  },
  'hilltown:light'(p, { world, y }) {
    post(world, p.x, p.z, 0.9, y - 1, y + 7.2, 'house');
  },
  'hilltown:bollard'(p, { world, y }) {
    post(world, p.x, p.z, 0.18, y - 1, y + 0.6, 'mailbox');
  },
};
