// Golf-course kit for the championship courses. A hole is a tee, optional dogleg points
// and a basket; this dresses it like a golf hole (tee box, fairway, green and apron,
// bunkers) and offers helpers for placing things relative to the line of play.
import { smoothstep } from '../geom.js';

const P = (p) => ({ x: p[0] ?? p.x, z: p[1] ?? p.z });

export function route(h) {
  return [P(h.tee), ...(h.via || []).map(P), P(h.basket)];
}

function lengths(pts) {
  const cum = [0];
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].z - pts[i - 1].z));
  return cum;
}

// Point s metres along the line of play (negative s counts back from the basket),
// d metres to the right of travel.
export function along(h, s, d = 0) {
  const pts = route(h), cum = lengths(pts), L = cum[cum.length - 1];
  if (s < 0) s = L + s;
  s = Math.max(0, Math.min(L, s));
  let i = 1;
  while (i < pts.length - 1 && cum[i] < s) i++;
  const a = pts[i - 1], b = pts[i], seg = cum[i] - cum[i - 1] || 1, k = (s - cum[i - 1]) / seg;
  const tx = (b.x - a.x) / seg, tz = (b.z - a.z) / seg;
  return { x: a.x + (b.x - a.x) * k - tz * d, z: a.z + (b.z - a.z) * k + tx * d, tx, tz };
}

export function holeLength(h) {
  const c = lengths(route(h));
  return c[c.length - 1];
}

const ellipse = (c, rx, rz, ang = 0, n = 18) => Array.from({ length: n }, (_, i) => {
  const t = (i / n) * Math.PI * 2, u = Math.cos(t) * rx, w = Math.sin(t) * rz;
  return [c.x + u * Math.cos(ang) - w * Math.sin(ang), c.z + u * Math.sin(ang) + w * Math.cos(ang)];
});

// Bunkers are [s, d, rx, rz] relative to their hole (rx along the line, rz across it).
export function bunkerList(holes) {
  const out = [];
  for (const h of holes) {
    for (const [s, d, rx, rz] of h.bunkers || []) {
      const q = along(h, s, d);
      out.push({ x: q.x, z: q.z, rx, rz, ang: Math.atan2(q.tz, q.tx) });
    }
  }
  return out;
}

// How far the ground sinks for the bunkers at (x, z).
export function bunkerDip(bunkers, x, z) {
  let dip = 0;
  for (const b of bunkers) {
    const dx = x - b.x, dz = z - b.z;
    if (Math.abs(dx) > b.rx + b.rz + 2 || Math.abs(dz) > b.rx + b.rz + 2) continue;
    const u = (dx * Math.cos(b.ang) + dz * Math.sin(b.ang)) / (b.rx + 1.5);
    const w = (-dx * Math.sin(b.ang) + dz * Math.cos(b.ang)) / (b.rz + 1.5);
    const r = Math.hypot(u, w);
    if (r < 1) dip = Math.max(dip, 0.75 * (1 - smoothstep(0.55, 1, r)));
  }
  return dip;
}

// Fairway strip along the route, from just in front of the tee to the green.
function fairway(h, half) {
  const L = holeLength(h), start = h.par === 3 ? 10 : 16, end = L - 4;
  const left = [], right = [];
  for (let s = start; s <= end + 0.01; s += 5) {
    const k = smoothstep(start, start + 30, s) * 0.55 + 0.45;
    const w = half * k;
    const a = along(h, s, -w), b = along(h, s, w);
    left.push([a.x, a.z]); right.push([b.x, b.z]);
  }
  return [...left, ...right.reverse()];
}

// Tee box, fairway, apron and green for every hole, then the bunkers.
export function dressHoles(b, holes, bunkers) {
  for (const h of holes) {
    const t = along(h, 0), ang = Math.atan2(t.tz, t.tx);
    const box = along(h, 2);
    b.lawnArea(ellipse(box, 9, 5, ang, 12));
    b.lawnArea(fairway(h, h.fairway ?? 15));
    const g = P(h.basket), end = along(h, -1), gAng = Math.atan2(end.tz, end.tx);
    b.lawnArea(ellipse(g, (h.green ?? 9) + 7, (h.green ?? 9) + 6, gAng, 20));
    b.greenArea(ellipse(along(h, -1.5), (h.green ?? 9) * 1.15, h.green ?? 9, gAng, 22));
  }
  for (const k of bunkers) b.sandArea(ellipse(k, k.rx, k.rz, k.ang, 12));
}

// A footbridge square across a creek near (x, z).
export function bridgeOver(b, creek, x, z, o = {}) {
  const q = creek.sAt(x, z, 80);
  const c = creek.path.at(q.s), half = creek.width / 2 + (o.reach ?? 3.5);
  const a = { x: c.x + c.tz * half, z: c.z - c.tx * half }, e = { x: c.x - c.tz * half, z: c.z + c.tx * half };
  const top = Math.max(b.hf.get(a.x, a.z), b.hf.get(e.x, e.z)) + 0.25;
  return b.span(a, e, o.width ?? 2.6, top, { kind: o.kind ?? 'stone', rails: true });
}
