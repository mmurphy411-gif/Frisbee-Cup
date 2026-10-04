// Lists anything crowding a tee: trees whose canopy comes within reach of the thrower,
// the first stretch of the throw, or the camera spot behind the tee.
//   node tools/tee_check.mjs
import { COURSES, loadCourse } from '../src/sim/courses/index.js';
import { segDist } from '../src/sim/path.js';

for (const c of COURSES) {
  const { layout, world } = loadCourse(c.id);
  console.log(`\n== ${layout.name}`);
  for (const h of layout.holes) {
    const t = h.tee, cx = Math.cos(h.teeYaw), cz = Math.sin(h.teeYaw);
    const cam = { x: t.x - cx * 4.4 + cz * 1.0, z: t.z - cz * 4.4 - cx * 1.0 };
    const out = [];
    for (const tr of layout.trees) {
      const r = tr.kind === 'pine' ? tr.r * 0.62 : tr.r;
      const dTee = Math.hypot(tr.x - t.x, tr.z - t.z) - r;
      const dCam = Math.hypot(tr.x - cam.x, tr.z - cam.z) - r;
      const dLine = segDist(tr.x, tr.z, t.x, t.z, t.x + cx * 12, t.z + cz * 12) - r;
      if (dTee < 2.5 || dCam < 1.5 || dLine < 1) out.push(`${tr.kind} at (${tr.x.toFixed(0)}, ${tr.z.toFixed(0)}) r${tr.r.toFixed(1)}: tee ${dTee.toFixed(1)} cam ${dCam.toFixed(1)} line ${dLine.toFixed(1)}`);
    }
    if (world.houseAt(cam.x, cam.z)) out.push('camera spot is inside a building');
    console.log(`#${h.number} ${h.name}: ${out.length ? '\n   ' + out.join('\n   ') : 'clear'}`);
  }
}
