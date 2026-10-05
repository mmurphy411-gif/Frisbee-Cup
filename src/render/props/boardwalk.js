// Renderers for props only boardwalk (Starlight Pier) uses, keyed by prop type. See props/index.js.
// Everything is static merged geometry; the M.glow bulbs light up towards evening.
const WHITE = '#f7f3ea', RED = '#e5484d', GOLD = '#e9b949', STEEL = '#eef0f2';
const BULBS = ['#fff3c4', '#ffd36b', '#ffb3c7', '#bfefff', '#d4ffb8'];

// local frame point -> world [x, y, z]
const W = (f, u, y, w) => [f.cx + u * f.cos - w * f.sin, y, f.cz + u * f.sin + w * f.cos];

// A cone of alternating coloured gores, with a ceiling underneath.
function tent(M, cx, cz, y0, y1, r, n, colors, rot = 0) {
  for (let k = 0; k < n; k++) {
    const a0 = rot + (k / n) * Math.PI * 2, a1 = rot + ((k + 1) / n) * Math.PI * 2;
    const p0 = [cx + Math.cos(a0) * r, y0, cz + Math.sin(a0) * r], p1 = [cx + Math.cos(a1) * r, y0, cz + Math.sin(a1) * r];
    M.roofs.tris([...p0, cx, y1, cz, ...p1], colors[k % colors.length]);
    M.roofs.tris([cx, y0 - 0.02, cz, p0[0], y0 - 0.02, p0[2], p1[0], y0 - 0.02, p1[2]], '#f3e6c8');
  }
}

// A sagging string of bulbs between two world points.
function bulbString(M, a, b, sag, step = 0.9, size = 0.15) {
  const len = Math.hypot(b[0] - a[0], b[2] - a[2]), n = Math.max(2, Math.round(len / step));
  let prev = a;
  for (let k = 0; k <= n; k++) {
    const t = k / n, pt = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t - sag * 4 * t * (1 - t), a[2] + (b[2] - a[2]) * t];
    if (k > 0 && k < n) M.glow.put('ball', pt[0], pt[1] - 0.1, pt[2], size, size * 1.25, size, BULBS[k % BULBS.length], k);
    if (k > 0 && k % 3 === 0) M.detail.beam('box', prev, pt, 0.025, '#2b2b2b');
    if (k % 3 === 0) prev = pt;
  }
  if (prev !== b) M.detail.beam('box', prev, b, 0.025, '#2b2b2b');
}

function stripes(M, f, u0, u1, y, w, depth, colors, pitch, width = 1.0) {
  const n = Math.max(1, Math.round((u1 - u0) / width)), sw = (u1 - u0) / n;
  for (let k = 0; k < n; k++) {
    const u = u0 + (k + 0.5) * sw;
    M.roofs.local(f, 'box', u, y, w, sw + 0.02, 0.08, depth, colors[k % colors.length], pitch);
    // scalloped valance along the outer edge
    const we = w + Math.sign(pitch || 1) * (depth / 2) * Math.cos(pitch), ye = y - (depth / 2) * Math.sin(Math.abs(pitch));
    M.detail.local(f, 'box', u, ye - 0.2, we, sw - 0.08, 0.4, 0.05, colors[k % colors.length]);
  }
}

export default {
  // ------------------------------------------------------------- Ferris wheel
  'boardwalk:ferris': (p, { M, f, y }) => {
    const R = p.R ?? 11, H = y + (p.hub ?? 12.6);
    const cars = ['#e5484d', '#f2c14e', '#5bc0eb', '#8fd694', '#b388eb', '#ff9f59'];
    M.flat.local(f, 'box', 0, y + 0.2, 0, 18, 0.4, 9, '#cfc6b4');
    M.detail.local(f, 'box', 0, y + 0.45, -4.4, 6, 0.1, 0.8, '#b5432f'); // loading ramp
    // A-frame legs and cross braces
    for (const s of [-1, 1]) {
      for (const e of [-1, 1]) M.detail.beam('box', W(f, e * 7, y, s * 3.4), W(f, 0, H, s * 1.7), 0.45, STEEL);
      for (const t of [0.3, 0.62]) M.detail.beam('box', W(f, -7 * (1 - t), y + (H - y) * t, s * (3.4 - 1.7 * t)), W(f, 7 * (1 - t), y + (H - y) * t, s * (3.4 - 1.7 * t)), 0.22, STEEL);
      for (const e of [-1, 1]) M.flat.local(f, 'box', e * 7, y + 0.5, s * 3.4, 1.2, 0.6, 1.2, '#9a958c');
    }
    // axle and hub
    M.detail.local(f, 'cyl', 0, H, 0, 0.7, 4.4, 0.7, '#9aa1aa', Math.PI / 2);
    for (const s of [-1, 1]) M.detail.local(f, 'cyl', 0, H, s * 1.15, 2.4, 0.5, 2.4, RED, Math.PI / 2);
    // two rims, each with an inner ring and sixteen spokes
    for (const s of [-1, 1]) {
      const w = s * 1.1;
      for (const [rr, th] of [[R, 0.32], [R * 0.6, 0.18]]) {
        const N = rr === R ? 36 : 24;
        for (let k = 0; k < N; k++) {
          const a = ((k + 0.5) / N) * Math.PI * 2;
          M.detail.local(f, 'box', rr * Math.cos(a), H + rr * Math.sin(a), w, (2 * Math.PI * rr) / N + 0.06, th, th, rr === R ? RED : STEEL, 0, a + Math.PI / 2);
        }
      }
      for (let k = 0; k < 16; k++) {
        const a = (k / 16) * Math.PI * 2;
        M.detail.local(f, 'box', (R / 2) * Math.cos(a), H + (R / 2) * Math.sin(a), w, R, 0.14, 0.14, STEEL, 0, a);
        for (const t of [0.35, 0.55, 0.75, 0.95]) M.glow.put('rock', ...W(f, R * t * Math.cos(a), H + R * t * Math.sin(a), w + s * 0.12), 0.22, 0.22, 0.22, BULBS[(k + Math.round(t * 4)) % BULBS.length], k);
      }
      for (let k = 0; k < 32; k++) {
        const a = ((k + 0.5) / 32) * Math.PI * 2;
        M.glow.put('rock', ...W(f, (R + 0.25) * Math.cos(a), H + (R + 0.25) * Math.sin(a), w + s * 0.1), 0.26, 0.26, 0.26, BULBS[k % 2 ? 1 : 0], k);
      }
    }
    for (const s of [-1, 1]) M.glow.local(f, 'cyl', 0, H, s * 1.45, 1.4, 0.1, 1.4, '#fff3c4', Math.PI / 2);
    // sixteen gondolas hanging level from the rim
    for (let k = 0; k < 16; k++) {
      const a = (k / 16) * Math.PI * 2, u = R * Math.cos(a), yy = H + R * Math.sin(a), c = cars[k % cars.length];
      M.detail.local(f, 'box', u, yy - 0.35, 0, 0.12, 0.7, 2.3, '#55606b');
      M.walls.local(f, 'box', u, yy - 1.55, 0, 1.5, 1.1, 1.8, c);
      M.glass.local(f, 'box', u, yy - 1.35, 0, 1.52, 0.5, 1.5, '#ffffff');
      M.roofs.local(f, 'box', u, yy - 0.82, 0, 1.7, 0.16, 2.0, WHITE);
      M.detail.local(f, 'box', u, yy - 2.12, 0, 1.4, 0.06, 1.7, '#3b3f45');
    }
    // ticket booth beside the ramp
    M.walls.local(f, 'box', -6, y + 1.3, -6.2, 1.8, 2.2, 1.6, RED);
    M.glass.local(f, 'box', -6, y + 1.6, -6.2, 1.82, 0.7, 1.0, '#ffffff');
    M.roofs.local(f, 'box', -6, y + 2.55, -6.2, 2.3, 0.2, 2.1, WHITE);
  },

  // ------------------------------------------------------- wooden roller coaster
  'boardwalk:coaster': (p, { M, G }) => {
    const T = p.track, n = T.length, wood = '#f4efe4', shade = '#ddd5c4', rail = '#d8343a';
    const bents = [];
    for (let i = 0; i < n; i++) {
      const a = T[i], b = T[(i + 1) % n];
      const dx = b[0] - a[0], dz = b[1] - a[1], len = Math.hypot(dx, dz) || 1, nx = -dz / len, nz = dx / len, yaw = -Math.atan2(dz, dx);
      // running rails on a deep white ledger
      for (const s of [-0.62, 0.62]) M.detail.beam('box', [a[0] + nx * s, a[2] + 0.05, a[1] + nz * s], [b[0] + nx * s, b[2] + 0.05, b[1] + nz * s], 0.16, rail);
      for (const s of [-0.95, 0.95]) M.detail.beam('box', [a[0] + nx * s, a[2] - 0.45, a[1] + nz * s], [b[0] + nx * s, b[2] - 0.45, b[1] + nz * s], 0.45, wood);
      M.detail.put('box', a[0], a[2] - 0.12, a[1], 0.3, 0.14, 2.2, shade, yaw);
      // walkway handrail on the outside
      if (i % 2 === 0) M.detail.put('box', a[0] + nx * 1.25, a[2] + 0.35, a[1] + nz * 1.25, 0.08, 0.9, 0.08, wood);
      M.detail.beam('box', [a[0] + nx * 1.25, a[2] + 0.8, a[1] + nz * 1.25], [b[0] + nx * 1.25, b[2] + 0.8, b[1] + nz * 1.25], 0.07, wood);
      // a chain of lights along both sides
      for (const s of [-1.02, 1.02]) M.glow.put('rock', a[0] + nx * s, a[2] - 0.72, a[1] + nz * s, 0.2, 0.2, 0.2, BULBS[i % BULBS.length], i);
      if (!a[3]) continue;
      // a support bent: two posts, ledgers and an X-brace
      const g = G(a[0], a[1]) - 0.1, top = a[2] - 0.65, h = top - g;
      const L = [a[0] - nx * 1.2, a[1] - nz * 1.2], Rr = [a[0] + nx * 1.2, a[1] + nz * 1.2];
      for (const q of [L, Rr]) {
        M.detail.put('box', q[0], g + h / 2, q[1], 0.26, h, 0.26, wood, yaw);
        M.flat.put('box', q[0], g + 0.15, q[1], 0.6, 0.4, 0.6, '#b9b2a6', yaw);
      }
      for (let yy = g + 3; yy < top - 1; yy += 3.2) M.detail.put('box', a[0], yy, a[1], 0.16, 0.16, 2.7, wood, yaw);
      M.detail.beam('box', [L[0], g + 0.4, L[1]], [Rr[0], top, Rr[1]], 0.1, shade);
      M.detail.beam('box', [Rr[0], g + 0.4, Rr[1]], [L[0], top, L[1]], 0.1, shade);
      bents.push({ i, g, top, L, R: Rr });
    }
    // the lattice: diagonals and girts between neighbouring bents
    for (let k = 0; k < bents.length; k++) {
      const A = bents[k], B = bents[(k + 1) % bents.length];
      if ((B.i - A.i + n) % n > 3) continue; // a gap: the tunnel under the track
      for (const side of ['L', 'R']) {
        const a = A[side], b = B[side], lo = Math.max(A.g, B.g) + 0.4, hi = Math.min(A.top, B.top);
        if (hi - lo < 1.5) continue;
        M.detail.beam('box', [a[0], lo, a[1]], [b[0], hi, b[1]], 0.09, shade);
        for (let yy = lo + 2.6; yy < hi - 0.6; yy += 3.2) M.detail.beam('box', [a[0], yy, a[1]], [b[0], yy, b[1]], 0.1, wood);
      }
    }
    // a train waiting in the station
    const cols = ['#2b6cb0', '#f2c14e', '#e5484d', '#8fd694'];
    for (let k = 0; k < 4; k++) {
      const a = T[(p.train + k) % n], b = T[(p.train + k + 1) % n];
      const yaw = -Math.atan2(b[1] - a[1], b[0] - a[0]), cx = (a[0] + b[0]) / 2, cz = (a[1] + b[1]) / 2, cy = (a[2] + b[2]) / 2;
      M.walls.put('box', cx, cy + 0.6, cz, 2.3, 0.8, 1.6, cols[k], yaw);
      M.detail.put('box', cx, cy + 1.05, cz, 0.6, 0.2, 1.4, '#2b2b2b', yaw);
    }
  },

  // ------------------------------------------------------------- arcade halls
  'boardwalk:arcade': (p, { M, f, y }) => {
    const { hu, hv } = p, h = p.h ?? 6, trim = p.trim ?? WHITE, cols = p.stripes ?? [RED, WHITE];
    M.walls.local(f, 'box', 0, y + h / 2 - 0.4, 0, hu * 2, h + 0.8, hv * 2, p.wall);
    M.roofs.local(f, 'box', 0, y + h + 0.12, 0, hu * 2 + 0.3, 0.25, hv * 2 + 0.3, '#8a8f96');
    M.detail.local(f, 'box', 0, y + 0.15, 0, hu * 2 + 0.1, 0.3, hv * 2 + 0.1, '#bdb6a6');
    for (const s of p.both ? [-1, 1] : [p.front ?? 1]) {
      const wf = s * (hv + 0.15);
      // the false front: a tall board with a stepped crown and a lit sign
      M.walls.local(f, 'box', 0, y + h + 1.5, wf, hu * 2 + 0.4, 3.2, 0.3, trim);
      M.walls.local(f, 'box', 0, y + h + 3.6, wf, hu * (p.grand ? 1.1 : 0.8), 1.4, 0.3, trim);
      M.detail.local(f, 'box', 0, y + h + 1.6, s * (hv + 0.32), hu * 1.5, 1.9, 0.06, p.sign ?? RED);
      for (let k = 0; k < 6; k++) M.detail.local(f, 'box', -hu * 0.55 + k * hu * 0.22, y + h + 1.6, s * (hv + 0.37), hu * 0.14, 1.1, 0.04, k % 2 ? WHITE : (p.letters ?? GOLD));
      const m = Math.round(hu * 1.5);
      for (let k = 0; k <= m; k++) {
        const u = -hu * 0.75 + (k * hu * 1.5) / m;
        for (const yy of [y + h + 0.55, y + h + 2.65]) M.glow.put('rock', ...W(f, u, yy, s * (hv + 0.4)), 0.2, 0.2, 0.2, BULBS[k % BULBS.length], k);
      }
      const cm = Math.round(hu * (p.grand ? 1.1 : 0.8));
      for (let k = 0; k <= cm; k++) M.glow.put('rock', ...W(f, -hu * (p.grand ? 0.55 : 0.4) + (k * hu * (p.grand ? 1.1 : 0.8)) / cm, y + h + 4.35, s * (hv + 0.35)), 0.2, 0.2, 0.2, BULBS[(k + 2) % BULBS.length], k);
      if (p.grand) {
        for (const e of [-1, 1]) {
          M.walls.local(f, 'box', e * (hu - 0.6), y + h + 3.2, wf, 1.6, 6.4, 1.6, trim);
          M.roofs.put('cone6', ...W(f, e * (hu - 0.6), y + h + 7.3, wf), 2.4, 1.8, 2.4, RED, -f.ang);
          M.glow.put('rock', ...W(f, e * (hu - 0.6), y + h + 8.4, wf), 0.35, 0.35, 0.35, '#fff3c4', e);
        }
      }
      // wide glass doors and windows, under a striped awning
      M.glass.local(f, 'box', 0, y + 1.35, s * (hv + 0.03), Math.min(6, hu), 2.5, 0.06, '#ffffff');
      M.detail.local(f, 'box', 0, y + 2.68, s * (hv + 0.06), Math.min(6, hu) + 0.3, 0.16, 0.08, trim);
      for (const e of [-1, 1]) M.glass.local(f, 'box', e * hu * 0.68, y + 1.6, s * (hv + 0.03), hu * 0.4, 1.7, 0.06, '#ffffff');
      stripes(M, f, -hu + 0.3, hu - 0.3, y + 3.15, s * (hv + 1.15), 2.3, cols, s * 0.36);
    }
  },

  // ----------------------------------------------------------- midway booths
  'boardwalk:booth': (p, { M, f, y, rng }) => {
    const fr = p.front ?? 1, hu = p.hu ?? 2.2, hv = p.hv ?? 1.6, c = p.color ?? RED, wall = p.wall ?? WHITE;
    M.walls.local(f, 'box', 0, y + 1.3, -fr * (hv - 0.1), hu * 2, 2.6, 0.2, wall);
    for (const s of [-1, 1]) {
      M.walls.local(f, 'box', s * (hu - 0.1), y + 1.3, 0, 0.2, 2.6, hv * 2, wall);
      M.detail.local(f, 'box', s * (hu - 0.1), y + 1.3, fr * (hv - 0.05), 0.24, 2.6, 0.24, c);
    }
    M.detail.local(f, 'box', 0, y + 0.55, fr * (hv - 0.3), hu * 2 - 0.3, 1.1, 0.6, c);
    M.detail.local(f, 'box', 0, y + 1.12, fr * (hv - 0.3), hu * 2 - 0.1, 0.08, 0.75, WHITE);
    stripes(M, f, -hu - 0.1, hu + 0.1, y + 2.85, fr * 0.45, hv * 2 + 1.0, [c, WHITE], fr * 0.2, 0.75);
    // the header board, its bulbs, and the prizes on the back wall
    M.detail.local(f, 'box', 0, y + 3.35, fr * (hv + 0.15), hu * 1.6, 0.55, 0.08, p.sign ?? GOLD);
    for (let k = 0; k < 7; k++) M.glow.put('rock', ...W(f, -hu * 0.8 + (k * hu * 1.6) / 6, y + 3.7, fr * (hv + 0.15)), 0.17, 0.17, 0.17, BULBS[k % BULBS.length], k);
    const plush = ['#f78fb3', '#5bc0eb', '#f2c14e', '#8fd694', '#b388eb', '#ff9f59'];
    for (let k = 0; k < 8; k++) {
      const u = -hu + 0.5 + (k % 4) * ((hu * 2 - 1) / 3), yy = y + (k < 4 ? 2.15 : 1.6), s = 0.4 + rng() * 0.15;
      M.detail.local(f, 'smooth', u, yy, -fr * (hv - 0.4), s, s * 1.15, s, plush[Math.floor(rng() * plush.length)]);
    }
    // the game on the counter: bottles, milk cans or rubber ducks
    for (let k = 0; k < 3; k++) {
      const u = -hu * 0.5 + k * hu * 0.5;
      if (p.game === 'ducks') M.detail.local(f, 'smooth', u, y + 1.28, fr * (hv - 0.3), 0.3, 0.25, 0.25, '#f2d13a');
      else M.detail.local(f, 'cyl', u, y + 1.36, fr * (hv - 0.3), 0.2, 0.4, 0.2, p.game === 'cans' ? '#c0c4c8' : '#3d7a4a');
    }
  },

  // -------------------------------------------------- food stands with big signs
  'boardwalk:food': (p, { M, f, y }) => {
    const c = p.color ?? RED;
    M.walls.local(f, 'box', 0, y + 1.25, 0, 4, 2.7, 3.2, p.wall ?? WHITE);
    for (let k = 0; k < 5; k++) M.detail.local(f, 'box', -1.6 + k * 0.8, y + 0.45, 1.62, 0.4, 0.9, 0.04, c);
    M.glass.local(f, 'box', 0, y + 1.65, 1.62, 2.8, 1.0, 0.04, '#ffffff');
    M.detail.local(f, 'box', 0, y + 1.1, 1.85, 3.2, 0.08, 0.5, WHITE);
    M.roofs.local(f, 'box', 0, y + 2.7, 0.3, 4.6, 0.2, 4.2, c);
    for (let k = 0; k < 9; k++) M.glow.put('rock', ...W(f, -2.2 + k * 0.55, y + 2.55, 2.4), 0.16, 0.16, 0.16, BULBS[k % BULBS.length], k);
    const ys = y + 2.8;
    switch (p.kind) {
      case 'hotdog':
        M.detail.local(f, 'smooth', 0, ys + 0.75, 0, 3.6, 0.95, 1.3, '#e0a458');
        M.detail.local(f, 'smooth', 0, ys + 1.15, 0, 4.2, 0.62, 0.72, '#b5432f');
        for (let k = 0; k < 6; k++) M.detail.local(f, 'box', -1.4 + k * 0.56, ys + 1.47, 0, 0.6, 0.08, 0.14, '#f2d13a', 0, k % 2 ? 0.6 : -0.6);
        break;
      case 'candy':
        for (const [u, col] of [[-0.7, '#f78fb3'], [0.8, '#9fd8ff']]) {
          M.detail.local(f, 'cyl', u, ys + 0.8, 0, 0.12, 1.6, 0.12, WHITE);
          M.detail.local(f, 'ball', u, ys + 2.0, 0, 1.6, 1.5, 1.6, col);
        }
        break;
      case 'icecream':
        M.detail.local(f, 'cone', 0, ys + 0.95, 0, 1.3, 1.9, 1.3, '#d9a35b', Math.PI);
        M.detail.local(f, 'smooth', 0, ys + 2.05, 0, 1.4, 1.0, 1.4, '#f7c6d9');
        M.detail.local(f, 'smooth', 0, ys + 2.75, 0, 1.15, 0.9, 1.15, '#fff6e6');
        M.detail.local(f, 'smooth', 0.1, ys + 3.35, 0, 0.3, 0.3, 0.3, RED);
        break;
      case 'lemonade':
        M.detail.local(f, 'smooth', 0, ys + 1.0, 0, 2.8, 1.8, 1.8, '#f6d63a');
        M.detail.local(f, 'smooth', 1.0, ys + 1.9, 0.3, 0.8, 0.2, 0.45, '#4f9f45', 0, 0.4);
        break;
      default: // popcorn
        M.detail.local(f, 'taper', 0, ys + 0.9, 0, 1.8, 1.8, 1.8, RED, Math.PI);
        for (let k = 0; k < 4; k++) M.detail.local(f, 'box', 0, ys + 0.9, 0, 0.3, 1.82, 1.9, WHITE, 0, 0, (k / 4) * Math.PI);
        for (let k = 0; k < 7; k++) M.detail.local(f, 'ball', -0.6 + (k % 4) * 0.4, ys + 1.9 + (k > 3 ? 0.3 : 0), (k % 3) * 0.3 - 0.3, 0.6, 0.55, 0.6, '#fff1c2');
    }
  },

  // ------------------------------------------------------------------ carousel
  'boardwalk:carousel': (p, { M, y, rng }) => {
    const r = p.r ?? 8, x = p.x, z = p.z;
    M.flat.put('cyl', x, y + 0.25, z, 2 * r, 0.5, 2 * r, '#9c3b33');
    M.detail.put('cyl', x, y + 0.52, z, 2 * r - 0.4, 0.06, 2 * r - 0.4, '#d9c08a');
    M.walls.put('cyl', x, y + 2.2, z, 2.6, 3.4, 2.6, GOLD);
    for (let k = 0; k < 10; k++) {
      const a = (k / 10) * Math.PI * 2;
      M.glass.put('box', x + Math.cos(a) * 1.3, y + 2.3, z + Math.sin(a) * 1.3, 0.06, 1.8, 0.6, '#ffffff', -a);
    }
    const coats = ['#ffffff', '#f6e7cf', '#d9b48a', '#3b3f45', '#f2f2f2'];
    const saddles = [RED, '#5bc0eb', '#8fd694', '#b388eb', GOLD];
    for (const [rr, cnt] of [[r * 0.7, 14], [r * 0.45, 9]]) {
      for (let k = 0; k < cnt; k++) {
        const a = (k / cnt) * Math.PI * 2, hx = x + Math.cos(a) * rr, hz = z + Math.sin(a) * rr, yaw = -(a + Math.PI / 2), hy = y + (k % 2 ? 1.5 : 1.15);
        M.detail.put('cyl', hx, y + 2.15, hz, 0.08, 3.3, 0.08, GOLD);
        const fx = { cx: hx, cz: hz, cos: Math.cos(a + Math.PI / 2), sin: Math.sin(a + Math.PI / 2), ang: a + Math.PI / 2 };
        const coat = coats[Math.floor(rng() * coats.length)];
        M.detail.local(fx, 'smooth', 0, hy, 0, 1.5, 0.62, 0.48, coat);
        M.detail.local(fx, 'box', 0.75, hy + 0.42, 0, 0.3, 0.75, 0.26, coat, 0, -0.5);
        M.detail.local(fx, 'box', 0.95, hy + 0.7, 0, 0.5, 0.24, 0.22, coat);
        M.detail.local(fx, 'box', -0.05, hy + 0.3, 0, 0.6, 0.14, 0.54, saddles[k % saddles.length]);
        for (const e of [-1, 1]) M.detail.local(fx, 'box', e * 0.5, hy - 0.45, 0, 0.1, 0.6, 0.1, coat, 0, e * 0.5);
      }
    }
    tent(M, x, z, y + 3.8, y + 6.4, r + 0.4, 16, [RED, WHITE]);
    M.roofs.put('cone', x, y + 6.9, z, 1.4, 1.2, 1.4, GOLD);
    M.detail.put('cyl', x, y + 7.9, z, 0.08, 1.6, 0.08, '#3b3f45');
    M.detail.put('box', x + 0.4, y + 8.4, z, 0.8, 0.45, 0.04, RED);
    // the scalloped valance round the rim, hung with bulbs
    for (let k = 0; k < 24; k++) {
      const a = ((k + 0.5) / 24) * Math.PI * 2, rr = r + 0.38;
      M.detail.put('box', x + Math.cos(a) * rr, y + 3.5, z + Math.sin(a) * rr, 0.1, 0.65, (2 * Math.PI * rr) / 24, k % 2 ? GOLD : '#2b8a8a', -a);
      M.glow.put('rock', x + Math.cos(a) * (rr + 0.1), y + 3.3, z + Math.sin(a) * (rr + 0.1), 0.22, 0.22, 0.22, BULBS[k % BULBS.length], k);
      if (k % 2 === 0) M.glow.put('rock', x + Math.cos(a) * rr * 0.5, y + 3.8 + 2.6 * 0.5, z + Math.sin(a) * rr * 0.5, 0.2, 0.2, 0.2, '#fff3c4', k);
    }
  },

  // ----------------------------------------------------------------- bandstand
  'boardwalk:bandstand': (p, { M, y }) => {
    const r = p.r ?? 5, x = p.x, z = p.z, green = '#2f8f5b';
    M.flat.put('cyl6', x, y + 0.6, z, 2 * r + 0.4, 1.2, 2 * r + 0.4, '#e8e2d2', Math.PI / 6);
    M.detail.put('cyl6', x, y + 1.24, z, 2 * r + 0.6, 0.1, 2 * r + 0.6, '#b9b2a6', Math.PI / 6);
    for (let k = 0; k < 8; k++) {
      const a = ((k + 0.5) / 8) * Math.PI * 2, rr = r - 0.3, px = x + Math.cos(a) * rr, pz = z + Math.sin(a) * rr;
      M.detail.put('box', px, y + 2.65, pz, 0.24, 2.8, 0.24, WHITE);
      const a1 = ((k + 1.5) / 8) * Math.PI * 2, qx = x + Math.cos(a1) * rr, qz = z + Math.sin(a1) * rr;
      if (k !== 1) M.detail.beam('box', [px, y + 2.15, pz], [qx, y + 2.15, qz], 0.1, WHITE);
      M.glow.put('rock', px, y + 3.9, pz, 0.25, 0.25, 0.25, BULBS[k % BULBS.length], k);
      // bunting between the posts
      for (let j = 1; j < 5; j++) {
        const t = j / 5, bx = px + (qx - px) * t, bz = pz + (qz - pz) * t;
        M.detail.put('cone', bx, y + 3.55 - Math.sin(t * Math.PI) * 0.25, bz, 0.35, 0.4, 0.06, [RED, WHITE, '#2b6cb0'][j % 3], -Math.atan2(qz - pz, qx - px), Math.PI);
      }
    }
    tent(M, x, z, y + 4.0, y + 6.2, r + 0.5, 8, [green, WHITE], Math.PI / 8);
    M.roofs.put('cone', x, y + 6.5, z, 0.8, 0.8, 0.8, GOLD);
    M.detail.put('box', x, y + 0.6, z + r + 0.7, 2.4, 0.6, 1.2, '#d8d2c4', 0);
    // music stands and a drum
    for (let k = 0; k < 4; k++) M.detail.put('box', x - 2 + k * 1.3, y + 2.0, z - 1, 0.5, 0.35, 0.05, '#2b2b2b');
    M.detail.put('cyl', x, y + 1.7, z - 2.2, 0.9, 0.7, 0.9, RED);
  },

  // ----------------------------------------------------------- lifeguard tower
  'boardwalk:lifeguard': (p, { M, f, y }) => {
    const c = p.color ?? '#5bc0eb';
    for (const [u, w] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) M.detail.local(f, 'box', u * 0.95, y + 1.1, w * 0.95, 0.18, 2.4, 0.18, WHITE);
    for (const w of [-1, 1]) M.detail.beam('box', W(f, -0.95, y + 0.3, w * 0.95), W(f, 0.95, y + 2.0, w * 0.95), 0.08, WHITE);
    M.detail.local(f, 'box', 0, y + 2.25, 0.3, 3.0, 0.15, 3.2, WHITE);
    M.walls.local(f, 'box', 0, y + 3.25, 0, 2.4, 1.9, 2.4, c);
    M.glass.local(f, 'box', 0, y + 3.5, 0.02, 2.0, 0.8, 2.44, '#ffffff');
    M.roofs.local(f, 'box', 0, y + 4.3, 0.1, 2.9, 0.18, 3.0, WHITE, -0.12);
    M.detail.beam('box', W(f, 0, y + 2.2, -1.5), W(f, 0, y + 0.05, -5.2), 0.9, '#c9b48e');
    M.detail.local(f, 'torus', 1.23, y + 3.2, 0, 0.8, 0.8, 0.8, '#ff6b2d', 0, Math.PI / 2);
    M.detail.local(f, 'box', 0, y + 4.15, 1.24, 1.6, 0.35, 0.05, RED);
    M.detail.local(f, 'cyl', -1.1, y + 5.2, -1.0, 0.06, 2.0, 0.06, '#d8d8d8');
    M.detail.local(f, 'box', -0.7, y + 5.85, -1.0, 0.75, 0.5, 0.03, RED);
  },

  // --------------------------------------------------------------- water tower
  'boardwalk:watertower': (p, { M, y }) => {
    const r = p.r ?? 3.6, top = y + (p.h ?? 14), x = p.x, z = p.z;
    for (let k = 0; k < 4; k++) {
      const a = Math.PI / 4 + (k / 4) * Math.PI * 2, a1 = a + Math.PI / 2;
      const foot = [x + Math.cos(a) * r * 0.95, y, z + Math.sin(a) * r * 0.95], head = [x + Math.cos(a) * r * 0.62, top, z + Math.sin(a) * r * 0.62];
      M.detail.beam('box', foot, head, 0.32, '#c9ccd1');
      for (const t of [0.35, 0.7]) {
        const rr = r * (0.95 - 0.33 * t), yy = y + (top - y) * t;
        M.detail.beam('box', [x + Math.cos(a) * rr, yy, z + Math.sin(a) * rr], [x + Math.cos(a1) * rr, yy, z + Math.sin(a1) * rr], 0.12, '#c9ccd1');
      }
    }
    M.walls.put('cyl', x, top + 2.8, z, 2 * r, 5.6, 2 * r, '#5bc0eb');
    M.walls.put('cyl', x, top + 3.2, z, 2 * r + 0.06, 1.3, 2 * r + 0.06, WHITE);
    M.roofs.put('cone', x, top + 6.4, z, 2 * r + 0.3, 1.8, 2 * r + 0.3, RED);
    M.detail.put('cyl', x, top + 0.2, z, 2 * r + 1.4, 0.12, 2 * r + 1.4, '#9aa1aa');
    M.glow.put('rock', x, top + 7.45, z, 0.4, 0.4, 0.4, '#ff6b5a');
    for (let k = 0; k < 12; k++) {
      const a = (k / 12) * Math.PI * 2;
      M.glow.put('rock', x + Math.cos(a) * (r + 0.6), top + 0.45, z + Math.sin(a) * (r + 0.6), 0.22, 0.22, 0.22, BULBS[k % BULBS.length], k);
    }
  },

  // ---------------------------------------------------- light poles and strings
  'boardwalk:pole': (p, { M, y }) => {
    const h = p.h ?? 5;
    M.detail.put('cyl', p.x, y + h / 2, p.z, 0.16, h, 0.16, p.color ?? '#2f5d4a');
    M.detail.put('cyl', p.x, y + 0.2, p.z, 0.32, 0.4, 0.32, p.color ?? '#2f5d4a');
    M.glow.put('smooth', p.x, y + h + 0.2, p.z, 0.4, 0.4, 0.4, '#fff3c4');
    M.detail.put('cone', p.x, y + h + 0.5, p.z, 0.5, 0.3, 0.5, p.color ?? '#2f5d4a');
  },

  'boardwalk:lights': (p, { M }) => bulbString(M, [p.x, p.y0, p.z], [p.x2, p.y1, p.z2], p.sag ?? 0.7),

  'boardwalk:rail': (p, { M, y }) => {
    const len = Math.hypot(p.x2 - p.x, p.z2 - p.z), f = { cx: (p.x + p.x2) / 2, cz: (p.z + p.z2) / 2, cos: (p.x2 - p.x) / len, sin: (p.z2 - p.z) / len, ang: Math.atan2(p.z2 - p.z, p.x2 - p.x) };
    const wood = '#a07a52';
    for (let u = -len / 2; u <= len / 2 + 0.01; u += len / Math.max(1, Math.round(len / 1.8))) M.detail.local(f, 'box', u, y + 0.5, 0, 0.1, 1.0, 0.1, wood);
    M.detail.local(f, 'box', 0, y + 0.98, 0, len, 0.08, 0.13, wood);
    M.detail.local(f, 'box', 0, y + 0.52, 0, len, 0.05, 0.06, wood);
  },

  'boardwalk:towel': (p, { M, f, y }) => {
    M.flat.local(f, 'box', 0, y + 0.03, 0, 1.9, 0.04, 0.95, p.color ?? RED);
    for (const u of [-0.55, 0, 0.55]) M.flat.local(f, 'box', u, y + 0.055, 0, 0.18, 0.02, 0.96, WHITE);
  },

  // ------------------------------------------------------ the arch over the pier
  'boardwalk:arch': (p, { M, f, y }) => {
    const s = p.span ?? 7, h = p.h ?? 5;
    for (const e of [-1, 1]) {
      for (let k = 0; k < Math.ceil(h + 1); k++) M.walls.local(f, 'box', e * s, y + k + 0.5, 0, 1.4, 1.0, 1.4, k % 2 ? WHITE : RED);
      M.roofs.put('cone6', ...W(f, e * s, y + h + 2.2, 0), 2.0, 2.4, 2.0, '#2b6cb0', -f.ang);
      M.glow.put('rock', ...W(f, e * s, y + h + 3.6, 0), 0.4, 0.4, 0.4, '#fff3c4', e);
    }
    const N = 14;
    for (let k = 0; k < N; k++) {
      const a0 = (k / N) * Math.PI, a1 = ((k + 1) / N) * Math.PI;
      const A = [s * Math.cos(a0), y + h + 3 * Math.sin(a0)], B = [s * Math.cos(a1), y + h + 3 * Math.sin(a1)];
      M.detail.beam('box', W(f, A[0], A[1], 0), W(f, B[0], B[1], 0), 0.45, GOLD);
      M.glow.put('rock', ...W(f, A[0], A[1] + 0.35, 0), 0.26, 0.26, 0.26, BULBS[k % BULBS.length], k);
    }
    M.walls.local(f, 'box', 0, y + h + 3.3, 0, 8, 2.0, 0.35, '#2b6cb0');
    M.detail.local(f, 'box', 0, y + h + 3.3, 0, 7.2, 1.3, 0.4, WHITE);
    for (let k = 0; k < 7; k++) M.detail.local(f, 'box', -2.7 + k * 0.9, y + h + 3.3, 0, 0.5, 0.9, 0.44, k % 2 ? RED : '#2b6cb0');
    for (let k = 0; k <= 12; k++) for (const yy of [y + h + 2.25, y + h + 4.35]) M.glow.put('rock', ...W(f, -3.9 + k * 0.65, yy, 0), 0.2, 0.2, 0.2, '#fff3c4', k);
  },
};
