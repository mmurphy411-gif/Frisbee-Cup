// Renderers for props only downtown (Meridian City) uses, keyed by prop type. See props/index.js.
const STEEL = '#4b5a54', STEEL_DARK = '#36423d', CONCRETE = '#b8b3a9', GRANITE = '#a9a39a';
const CHROME = '#dfe5ec', ROOF = '#5d5f63';

// --------------------------------------------------------------- towers
function glassShaft(M, f, y, hu, hv, h, p, top) {
  // a curtain wall: glass, dark spandrel bands at each floor, mullion fins and corner piers
  M.glass.local(f, 'box', 0, y + h / 2, 0, hu * 2 - 0.3, h, hv * 2 - 0.3, '#ffffff');
  const fh = 3.8;
  for (let k = 1; k * fh < h - 1; k++) M.detail.local(f, 'box', 0, y + k * fh - 0.4, 0, hu * 2 - 0.1, 1.1, hv * 2 - 0.1, p.wall);
  // dark (unlit) panes scattered over each face, so towers aren't one solid glow at night
  let seed = Math.floor(Math.abs(Math.sin(f.cx * 12.9898 + f.cz * 78.233 + y) * 43758.5) * 1e4);
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const floors = Math.floor((h - 1) / fh);
  for (const [side, axis] of [[-1, 'w'], [1, 'w'], [-1, 'u'], [1, 'u']]) {
    const span = axis === 'w' ? hu : hv, nb = Math.max(2, Math.round((span * 2) / 3.1)), bw = (span * 2) / nb;
    for (let k = 0; k < Math.round(floors * nb * 0.16); k++) {
      const fl = Math.floor(rnd() * floors), bay = Math.floor(rnd() * nb);
      const a = -span + (bay + 0.5) * bw, yy = y + fl * fh + 1.85;
      if (axis === 'w') M.detail.local(f, 'box', a, yy, side * (hv - 0.13), bw - 0.2, fh - 1.15, 0.06, '#26313b');
      else M.detail.local(f, 'box', side * (hu - 0.13), yy, a, 0.06, fh - 1.15, bw - 0.2, '#26313b');
    }
  }
  for (const s of [-1, 1]) {
    const nu = Math.max(2, Math.round((hu * 2) / 3.1));
    for (let i = 1; i < nu; i++) M.detail.local(f, 'box', -hu + (i * hu * 2) / nu, y + h / 2, s * (hv - 0.1), 0.16, h, 0.3, p.wall);
    const nv = Math.max(2, Math.round((hv * 2) / 3.1));
    for (let i = 1; i < nv; i++) M.detail.local(f, 'box', s * (hu - 0.1), y + h / 2, -hv + (i * hv * 2) / nv, 0.3, h, 0.16, p.wall);
  }
  for (const [u, w] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) M.detail.local(f, 'box', u * (hu - 0.35), y + h / 2, w * (hv - 0.35), 0.8, h, 0.8, p.wall);
  if (top) M.detail.local(f, 'box', 0, y + h + 0.5, 0, hu * 2 + 0.1, 1.0, hv * 2 + 0.1, p.wall);
}

function crown(M, f, y, hu, hv, p) {
  // y is the roof line
  switch (p.crown) {
    case 'spire': {
      M.detail.local(f, 'box', 0, y + 3, 0, hu * 1.2, 6, hv * 1.2, p.wall);
      M.glass.local(f, 'box', 0, y + 3, 0, hu * 1.2 + 0.1, 3.2, hv * 1.2 + 0.1, '#ffffff');
      M.detail.local(f, 'box', 0, y + 7, 0, hu * 0.7, 2, hv * 0.7, p.wall);
      M.detail.put('cone', f.cx, y + 8 + 12, f.cz, 2.4, 24, 2.4, '#c9ced4');
      M.glow.put('smooth', f.cx, y + 32.4, f.cz, 0.7, 0.7, 0.7, '#ffffff');
      break;
    }
    case 'antenna':
      M.detail.local(f, 'box', 0, y + 1.6, 0, hu, 3.2, hv, '#7c8288');
      for (const s of [-1, 1]) {
        const ah = 9 + (s > 0 ? 4 : 0);
        M.detail.local(f, 'box', s * hu * 0.25, y + 3.2 + ah / 2, 0, 0.3, ah, 0.3, '#d9d9d9');
        M.glow.local(f, 'box', s * hu * 0.25, y + 3.3 + ah, 0, 0.5, 0.5, 0.5, '#ffffff');
      }
      break;
    case 'pyramid':
      M.glass.put('cone6', f.cx, y + 1 + Math.min(hu, hv) * 0.6, f.cz, hu * 2.2, Math.min(hu, hv) * 1.2, hv * 2.2, '#ffffff', -f.ang + Math.PI / 6);
      break;
    case 'slant': {
      // a sloping glass crown, rising across the tower
      const rise = Math.min(hu, hv) * 0.9, a = Math.atan2(rise, hu * 2);
      M.glass.local(f, 'box', 0, y + 1 + rise / 2, 0, Math.hypot(hu * 2, rise), 0.4, hv * 2 - 0.4, '#ffffff', 0, a);
      for (const s of [-1, 1]) M.roofs.tris(tri(f, [[-hu, y + 1, s * (hv - 0.2)], [hu, y + 1, s * (hv - 0.2)], [hu, y + 1 + rise, s * (hv - 0.2)]], s), p.wall);
      M.walls.local(f, 'box', hu - 0.2, y + 1 + rise / 2, 0, 0.4, rise, hv * 2 - 0.4, p.wall);
      break;
    }
    default:
      M.detail.local(f, 'box', hu * 0.2, y + 1.8, -hv * 0.15, hu * 0.9, 3.6, hv * 0.9, '#8a8f95');
      M.detail.local(f, 'cyl', -hu * 0.5, y + 1.6, hv * 0.4, 2.6, 2.2, 2.6, '#9aa0a6');
  }
}

// a triangle in a frame's local coordinates, wound to face side s
function tri(f, pts, s) {
  const out = [];
  const list = s > 0 ? pts : [pts[0], pts[2], pts[1]];
  for (const [u, yy, w] of list) out.push(f.cx + u * f.cos - w * f.sin, yy, f.cz + u * f.sin + w * f.cos);
  return out;
}

function masonry(M, f, y, p) {
  const { hu, hv, h } = p, office = p.style === 'office';
  M.walls.local(f, 'box', 0, y + h / 2, 0, hu * 2, h, hv * 2, p.wall);
  // storefronts: a glass band round the ground floor with an awning over each long side
  M.glass.local(f, 'box', 0, y + 1.75, 0, hu * 2 + 0.06, 2.5, hv * 2 + 0.06, '#ffffff');
  M.detail.local(f, 'box', 0, y + 3.35, 0, hu * 2 + 0.16, 0.45, hv * 2 + 0.16, p.trim);
  for (const s of [-1, 1]) M.detail.local(f, 'box', 0, y + 3.0, s * (hv + 0.7), hu * 2 - 1.2, 0.12, 1.3, p.accent, s * 0.25);
  // upper floors: windows in rows, broken up by piers (or ribbon windows on offices)
  const fh = 3.4, floors = Math.floor((h - 4.4) / fh);
  for (let k = 0; k < floors; k++) {
    const wy = y + 4.0 + k * fh + 1.8;
    M.glass.local(f, 'box', 0, wy, 0, hu * 2 + 0.06, office ? 1.9 : 1.6, hv * 2 + 0.06, '#ffffff');
    if (!office) M.detail.local(f, 'box', 0, wy - 1.0, 0, hu * 2 + 0.14, 0.14, hv * 2 + 0.14, p.trim);
  }
  if (!office && floors > 0) {
    const ph = floors * fh, py = y + 4.0 + ph / 2 + 0.1;
    for (const s of [-1, 1]) {
      const nu = Math.max(2, Math.round((hu * 2) / 3));
      for (let i = 0; i <= nu; i++) M.walls.local(f, 'box', -hu + 0.35 + (i * (hu * 2 - 0.7)) / nu, py, s * (hv + 0.09), 0.8, ph, 0.2, p.wall);
      const nv = Math.max(2, Math.round((hv * 2) / 3));
      for (let i = 0; i <= nv; i++) M.walls.local(f, 'box', s * (hu + 0.09), py, -hv + 0.35 + (i * (hv * 2 - 0.7)) / nv, 0.2, ph, 0.8, p.wall);
    }
  }
  // cornice and roof
  M.detail.local(f, 'box', 0, y + h - 0.3, 0, hu * 2 + 0.6, 0.6, hv * 2 + 0.6, p.trim);
  M.flat.local(f, 'box', 0, y + h + 0.02, 0, hu * 2 - 0.3, 0.1, hv * 2 - 0.3, ROOF);
  if (p.tank) {
    // a wooden water tank on steel legs
    const tu = hu * 0.45, tw = -hv * 0.3;
    for (const [du, dw] of [[-0.9, -0.9], [0.9, -0.9], [0.9, 0.9], [-0.9, 0.9]]) M.detail.local(f, 'box', tu + du, y + h + 1.1, tw + dw, 0.15, 2.2, 0.15, '#2e2f31');
    M.detail.local(f, 'cyl', tu, y + h + 3.4, tw, 2.8, 2.6, 2.8, '#7a5a3e');
    M.detail.local(f, 'cone', tu, y + h + 5.15, tw, 3.0, 0.9, 3.0, '#4e3a2a');
  }
  if (p.sign) {
    // a rooftop sign that lights up at night
    M.detail.local(f, 'box', 0, y + h + 0.9, hv - 0.6, hu * 1.1, 1.8, 0.12, '#2a2a2e');
    M.glow.local(f, 'box', 0, y + h + 2.6, hv - 0.6, hu * 1.0, 1.4, 0.2, '#ffffff');
    M.detail.local(f, 'box', 0, y + h + 2.6, hv - 0.72, hu * 1.06, 1.6, 0.1, p.accent);
  }
}

function civic(M, f, y, p) {
  // City Hall: a stone block with a columned portico facing the pool and a dome
  const { hu, hv, h } = p;
  M.walls.local(f, 'box', 0, y + h / 2, 0, hu * 2, h, hv * 2, p.wall);
  M.flat.local(f, 'box', 0, y + 0.6, 0, hu * 2 + 1.2, 1.2, hv * 2 + 1.2, GRANITE);
  for (let k = 0; k < 3; k++) {
    const wy = y + 3 + k * 4.2;
    if (wy > y + h - 2) break;
    for (let i = 0; i < 6; i++) {
      const w = -hv + 2 + (i * (hv * 2 - 4)) / 5;
      for (const s of [-1, 1]) M.glass.local(f, 'box', s * (hu + 0.03), wy, w, 0.06, 2.4, 1.2, '#ffffff');
    }
  }
  // portico on the -u face
  const pu = -hu - 2.4, colH = h - 3;
  M.flat.local(f, 'box', pu, y + 0.8, 0, 5.2, 1.6, hv * 1.4, GRANITE);
  for (let i = 0; i < 6; i++) {
    const w = -hv * 0.62 + (i * hv * 1.24) / 5;
    M.detail.local(f, 'cyl', pu - 1.4, y + 1.6 + colH / 2, w, 1.0, colH, 1.0, p.trim);
  }
  M.detail.local(f, 'box', pu + 0.2, y + 1.6 + colH + 0.5, 0, 5.0, 1.0, hv * 1.4, p.trim);
  const ped = { cx: f.cx + (pu + 0.2) * f.cos, cz: f.cz + (pu + 0.2) * f.sin, cos: f.cos, sin: f.sin, ang: f.ang };
  M.roofs.tris(tri(ped, [[-2.5, y + colH + 2.6, -hv * 0.7], [-2.5, y + colH + 2.6, hv * 0.7], [-2.5, y + colH + 5.2, 0]], 1), p.trim);
  M.roofs.tris([...tri(ped, [[-2.6, y + colH + 2.6, hv * 0.72], [2.6, y + colH + 2.6, hv * 0.72], [2.6, y + colH + 5.2, 0]], -1),
    ...tri(ped, [[-2.6, y + colH + 2.6, hv * 0.72], [2.6, y + colH + 5.2, 0], [-2.6, y + colH + 5.2, 0]], -1),
    ...tri(ped, [[-2.6, y + colH + 2.6, -hv * 0.72], [2.6, y + colH + 5.2, 0], [2.6, y + colH + 2.6, -hv * 0.72]], -1),
    ...tri(ped, [[-2.6, y + colH + 2.6, -hv * 0.72], [-2.6, y + colH + 5.2, 0], [2.6, y + colH + 5.2, 0]], -1)], '#6f7f86');
  M.detail.local(f, 'box', 0, y + h + 0.3, 0, hu * 2 + 0.6, 0.6, hv * 2 + 0.6, p.trim);
  // drum, dome and lantern
  const r = Math.min(hu, hv) * 0.62;
  M.walls.put('cyl', f.cx, y + h + 1.6, f.cz, r * 2.1, 2.6, r * 2.1, p.wall);
  for (let k = 0; k < 10; k++) {
    const a = (k / 10) * Math.PI * 2;
    M.detail.put('box', f.cx + Math.cos(a) * r * 1.06, y + h + 1.6, f.cz + Math.sin(a) * r * 1.06, 0.4, 2.6, 0.4, p.trim);
  }
  M.roofs.put('smooth', f.cx, y + h + 2.9, f.cz, r * 2, r * 1.7, r * 2, '#6f9a8e');
  M.detail.put('cyl', f.cx, y + h + 3 + r * 0.85 + 0.6, f.cz, 1.2, 1.4, 1.2, p.trim);
  M.glow.put('cyl', f.cx, y + h + 3 + r * 0.85 + 0.6, f.cz, 0.9, 1.0, 0.9, '#ffffff');
  M.detail.put('cone', f.cx, y + h + 3 + r * 0.85 + 1.8, f.cz, 1.3, 1.1, 1.3, '#6f9a8e');
}

function tower(p, { M, f, y }) {
  const y0 = p.y ?? y;
  // foundation plinth so the building meets uneven ground cleanly
  M.flat.local(f, 'box', 0, y0 - 0.4, 0, p.hu * 2 + 0.2, 1.2, p.hv * 2 + 0.2, CONCRETE);
  if (p.style === 'civic') return civic(M, f, y0, p);
  if (p.style !== 'glass' && p.style !== 'setback') return masonry(M, f, y0, p);
  // glass towers: a dark lobby, then the curtain wall
  M.detail.local(f, 'box', 0, y0 + 2.6, 0, p.hu * 2 + 0.4, 0.5, p.hv * 2 + 0.4, p.wall);
  if (p.style === 'setback') {
    const h1 = p.h * p.split, k = p.upper;
    glassShaft(M, f, y0, p.hu, p.hv, h1, p, true);
    M.flat.local(f, 'box', 0, y0 + h1 + 1.02, 0, p.hu * 2 - 0.2, 0.06, p.hv * 2 - 0.2, ROOF);
    glassShaft(M, f, y0 + h1, p.hu * k, p.hv * k, p.h - h1, p, true);
    crown(M, f, y0 + p.h + 1, p.hu * k, p.hv * k, p);
  } else {
    glassShaft(M, f, y0, p.hu, p.hv, p.h, p, true);
    crown(M, f, y0 + p.h + 1, p.hu, p.hv, p);
  }
}

// --------------------------------------------------------------- the El
function el(p, { M, f, y }) {
  const top = y + p.clear, hw = p.w / 2;
  // deck, plate girders with stiffeners, and the tracks
  M.detail.local(f, 'box', 0, top + 0.2, 0, p.hu * 2, 0.4, p.w - 0.6, STEEL_DARK);
  for (const s of [-1, 1]) {
    M.detail.local(f, 'box', 0, top + 0.75, s * (hw - 0.2), p.hu * 2, 1.5, 0.3, STEEL);
    M.detail.local(f, 'box', 0, top + 1.55, s * (hw - 0.2), p.hu * 2, 0.12, 0.55, STEEL_DARK);
    for (let u = -p.hu; u <= p.hu; u += 3) M.detail.local(f, 'box', u, top + 0.75, s * (hw + 0.0), 0.16, 1.5, 0.18, STEEL_DARK);
  }
  for (const t of [-1.7, 1.7]) {
    M.detail.local(f, 'box', 0, top + 0.5, t, p.hu * 2, 0.18, 2.4, '#5a4a3e');
    for (const r of [-0.72, 0.72]) M.detail.local(f, 'box', 0, top + 0.66, t + r, p.hu * 2, 0.14, 0.1, '#9aa0a6');
  }
  // columns and cross beams
  for (const u of p.cols) {
    for (const s of [-1, 1]) {
      const w = s * (hw - 0.45), x = f.cx + u * f.cos - w * f.sin, z = f.cz + u * f.sin + w * f.cos;
      M.detail.put('box', x, y + p.clear / 2 - 0.2, z, 0.6, p.clear + 0.4, 0.6, STEEL, -f.ang);
      M.detail.put('box', x, y + 0.2, z, 1.0, 0.4, 1.0, CONCRETE, -f.ang);
      M.detail.local(f, 'box', u + 0.9, top - 0.7, w - s * 0.7, 0.18, 1.8, 0.18, STEEL_DARK, 0, s * 0.7);
    }
    M.detail.local(f, 'box', u, top - 0.3, 0, 0.8, 0.8, p.w + 0.3, STEEL);
  }
}

function station(p, { M, f, y }) {
  const top = y + p.clear, hw = p.w / 2;
  for (const s of [-1, 1]) {
    const w = s * (hw + 1.6);
    M.detail.local(f, 'box', 0, top + 0.6, w, p.hu * 2, 0.5, 3.2, '#9a958c');
    M.detail.local(f, 'box', 0, top + 0.1, w, p.hu * 2, 0.6, 3.0, STEEL);
    // canopy on posts, a glass windbreak and lamps under the canopy
    for (let u = -p.hu + 1; u <= p.hu - 0.9; u += (p.hu * 2 - 2) / 6) {
      const pw = s * (hw + 3.0);
      M.detail.local(f, 'box', u, top + 2.6, pw, 0.22, 3.6, 0.22, STEEL);
      M.detail.local(f, 'box', u, y + p.clear / 2, pw, 0.55, p.clear, 0.55, STEEL);
      M.glow.local(f, 'box', u + 1.7, top + 4.0, w, 0.5, 0.08, 0.5, '#ffffff');
    }
    M.roofs.local(f, 'box', 0, top + 4.45, w + s * 0.1, p.hu * 2 + 0.6, 0.18, 3.8, '#2f6b5a', -s * 0.08);
    M.glass.local(f, 'box', 0, top + 2.0, s * (hw + 3.05), p.hu * 2 - 2, 2.2, 0.06, '#ffffff');
    // the station sign
    M.detail.local(f, 'box', 0, top + 3.6, s * (hw + 3.15), 7, 0.9, 0.12, '#2f6b5a');
    M.glow.local(f, 'box', 0, top + 3.6, s * (hw + 3.23), 6.4, 0.5, 0.06, '#ffffff');
    // stair towers at each end, down to the sidewalk
    for (const e of [-1, 1]) {
      const u = e * (p.hu + 2.6), sw = s * 6.6, h = p.clear + 1.4;
      M.walls.local(f, 'box', u, y + h / 2 - 0.3, sw, 4.8, h + 0.6, 3.0, '#a94c3a');
      M.glass.local(f, 'box', u, y + h / 2 + 0.6, sw, 4.86, h - 3, 2.4, '#ffffff');
      M.roofs.local(f, 'box', u, y + h + 0.35, sw, 5.2, 0.3, 3.4, '#2f6b5a');
      M.detail.local(f, 'box', u - e * 2.5, top + 0.7, (sw + w) / 2, 0.8, 0.4, Math.abs(sw - w) + 1, STEEL);
    }
  }
}

function train(p, { M, f, y }) {
  const base = y + p.clear + 1.0, n = p.cars ?? 2, carL = (p.hu * 2) / n;
  for (let k = 0; k < n; k++) {
    const u = -p.hu + (k + 0.5) * carL, w = p.track;
    M.walls.local(f, 'box', u, base + 1.75, w, carL - 0.8, 2.9, 2.8, '#c9ccd1');
    M.glass.local(f, 'box', u, base + 2.25, w, carL - 1.6, 0.9, 2.86, '#ffffff');
    M.detail.local(f, 'box', u, base + 1.2, w, carL - 0.76, 0.35, 2.86, '#c0392b');
    M.roofs.local(f, 'box', u, base + 3.3, w, carL - 1.0, 0.3, 2.5, '#8d9298');
    M.detail.local(f, 'box', u, base + 0.2, w, carL - 2, 0.5, 2.2, '#2b2b2b');
    for (const d of [-0.3, 0.3]) M.detail.local(f, 'box', u + d * carL, base + 1.7, w, 1.3, 2.4, 2.9, '#7d8288');
    if (k === 0 || k === n - 1) {
      const e = k === 0 ? -1 : 1;
      for (const lw of [-0.8, 0.8]) M.glow.local(f, 'box', u + e * (carL / 2 - 0.38), base + 1.0, w + lw, 0.06, 0.25, 0.4, '#ffffff');
    }
  }
}

// ---------------------------------------------------------- the plaza
function fountain(p, { M, y }) {
  const r = p.r;
  // a granite rim round a shallow pool of water
  M.detail.put('cyl', p.x, y + 0.3, p.z, r * 2 - 0.5, 0.7, r * 2 - 0.5, '#4f9fc0');
  for (let k = 0; k < 16; k++) {
    const a = (k / 16) * Math.PI * 2, x = p.x + Math.cos(a) * (r - 0.3), z = p.z + Math.sin(a) * (r - 0.3);
    M.flat.put('box', x, y + 0.38, z, 0.6, 0.85, (2 * Math.PI * r) / 16 + 0.15, GRANITE, -a);
    M.flat.put('box', x, y + 0.83, z, 0.8, 0.08, (2 * Math.PI * r) / 16 + 0.2, '#c4beb3', -a);
  }
  M.flat.put('cyl', p.x, y + 1.6, p.z, 1.6, 2.2, 1.6, GRANITE);
  M.flat.put('cyl', p.x, y + 2.6, p.z, 4.4, 0.35, 4.4, '#c4beb3');
  M.detail.put('cyl', p.x, y + 2.79, p.z, 3.9, 0.05, 3.9, '#5fb0d0');
  M.flat.put('cyl', p.x, y + 3.4, p.z, 0.8, 1.4, 0.8, GRANITE);
  M.flat.put('cyl', p.x, y + 4.15, p.z, 2.2, 0.25, 2.2, '#c4beb3');
  // the jets: a tall plume in the middle, a ring of arcs round the basin
  M.detail.put('cone', p.x, y + 6.2, p.z, 0.5, 4, 0.5, '#eaf6fc');
  M.detail.put('smooth', p.x, y + 4.5, p.z, 2.1, 0.7, 2.1, '#d6eef8');
  for (let k = 0; k < 10; k++) {
    const a = (k / 10) * Math.PI * 2, rr = r - 1.3;
    M.detail.put('cone', p.x + Math.cos(a) * rr, y + 1.45, p.z + Math.sin(a) * rr, 0.32, 1.6, 0.32, '#eaf6fc');
    M.glow.put('box', p.x + Math.cos(a) * (r - 0.25), y + 0.7, p.z + Math.sin(a) * (r - 0.25), 0.3, 0.12, 0.3, '#ffffff');
  }
}

function sculpture(p, { M, y }) {
  // "The Orbit": three mirror-steel rings, a gyroscope taller than a bus
  M.flat.put('box', p.x, y + 0.4, p.z, 4.4, 0.8, 4.4, '#8d8a85');
  M.flat.put('box', p.x, y + 0.84, p.z, 4.6, 0.08, 4.6, '#c4beb3');
  for (let k = 0; k < 3; k++) M.detail.put('torus', p.x, y + 5.3, p.z, 9, 9, 9, CHROME, (k * Math.PI) / 3 + 0.3, 0, 0);
  M.detail.put('torus', p.x, y + 5.3, p.z, 9, 9, 9, '#c9d0d8', 0, Math.PI / 2, 0);
  M.detail.put('smooth', p.x, y + 5.3, p.z, 2.2, 2.2, 2.2, '#f2f5f8');
}

function truck(p, { M, f, y }) {
  const c = p.color ?? '#e94f37';
  M.walls.local(f, 'box', -0.5, y + 1.95, 0, 4.6, 2.5, 2.3, c);
  M.walls.local(f, 'box', 2.35, y + 1.3, 0, 1.6, 1.8, 2.2, '#f4f1ea');
  M.glass.local(f, 'box', 2.6, y + 1.75, 0, 1.2, 0.7, 2.24, '#ffffff');
  M.detail.local(f, 'box', -0.4, y + 2.0, -1.17, 3.0, 1.1, 0.06, '#2b2b2b');
  M.glow.local(f, 'box', -0.4, y + 2.55, -1.2, 2.8, 0.12, 0.04, '#ffffff');
  M.detail.local(f, 'box', -0.4, y + 2.9, -1.6, 3.4, 0.08, 1.0, '#f4f1ea', -0.25);
  M.detail.local(f, 'box', -0.4, y + 1.4, -1.35, 3.0, 0.08, 0.4, '#a5825c');
  M.detail.local(f, 'box', -0.5, y + 3.35, 0, 2.4, 0.5, 0.15, '#f2b134');
  M.glow.local(f, 'box', -0.5, y + 3.35, 0, 2.2, 0.36, 0.2, '#ffffff');
  M.detail.local(f, 'box', 0.2, y + 0.55, 0, 5.8, 0.5, 2.1, '#2f3640');
  for (const [u, w] of [[1.9, 1.05], [1.9, -1.05], [-1.8, 1.05], [-1.8, -1.05]]) M.detail.local(f, 'cyl', u, y + 0.4, w, 0.8, 0.3, 0.8, '#1d1e22', Math.PI / 2);
}

function planter(p, { M, f, y, rng, theme }) {
  M.flat.local(f, 'box', 0, y + 0.4, 0, p.hu * 2, 0.9, p.hv * 2, CONCRETE);
  M.flat.local(f, 'box', 0, y + 0.84, 0, p.hu * 2 - 0.3, 0.05, p.hv * 2 - 0.3, '#5a4632');
  if (p.grate) return;
  const long = p.hu > p.hv, n = Math.max(2, Math.round((long ? p.hu : p.hv) / 0.9));
  for (let k = 0; k < n; k++) {
    const t = -1 + (2 * (k + 0.5)) / n, s = 0.8 + rng() * 0.35;
    const u = long ? t * (p.hu - 0.5) : 0, w = long ? 0 : t * (p.hv - 0.5);
    M.flat.local(f, 'ball', u, y + 1.05 + s * 0.3, w, s * 1.3, s, s * 1.3, theme.foliage.bush[k % theme.foliage.bush.length]);
    if (rng() < 0.5) M.detail.local(f, 'smooth', u + 0.3, y + 1.35 + s * 0.4, w + 0.2, 0.25, 0.25, 0.25, rng() < 0.5 ? '#f2a7c4' : '#f4d35e');
  }
}

function busstop(p, { M, f, y }) {
  M.glass.local(f, 'box', 0, y + 1.3, -0.7, 3.6, 1.9, 0.06, '#ffffff');
  M.detail.local(f, 'box', 0, y + 2.3, -0.7, 3.8, 0.12, 0.12, '#3a4350');
  for (const u of [-1.9, 1.9]) {
    M.detail.local(f, 'box', u, y + 1.25, -0.7, 0.12, 2.5, 0.12, '#3a4350');
    M.detail.local(f, 'box', u, y + 1.25, 0.6, 0.12, 2.5, 0.12, '#3a4350');
  }
  M.roofs.local(f, 'box', 0, y + 2.52, 0, 4.2, 0.12, 1.9, '#3a4350', 0.08);
  M.detail.local(f, 'box', 0, y + 0.48, -0.4, 2.6, 0.08, 0.45, '#9aa0a6');
  M.detail.local(f, 'box', 2.0, y + 1.3, 0, 0.12, 1.8, 1.1, '#2b2b2b');
  M.glow.local(f, 'box', 2.07, y + 1.35, 0, 0.04, 1.6, 0.95, '#ffffff');
  M.detail.local(f, 'box', -1.9, y + 3.0, 0.6, 0.08, 0.5, 0.5, '#2f6b8a');
}

function signal(p, { M, f, y }) {
  // a mast-arm traffic signal on the corner, reaching out over the street
  M.detail.put('cyl', p.x, y + 2.85, p.z, 0.26, 5.7, 0.26, '#2f3337');
  M.detail.local(f, 'box', 3.0, y + 5.5, 0, 6.0, 0.16, 0.16, '#2f3337');
  for (const u of [2.6, 5.4]) {
    M.detail.local(f, 'box', u, y + 4.85, 0, 0.36, 1.1, 0.4, '#d4a020');
    for (const k of [-1, 0, 1]) M.glow.local(f, 'box', u, y + 4.85 + k * 0.33, -0.21, 0.2, 0.2, 0.03, '#ffffff');
  }
  M.detail.local(f, 'box', 0.4, y + 2.6, 0, 0.3, 0.4, 0.3, '#2b2b2b');
  M.detail.local(f, 'box', 0.9, y + 5.1, 0, 0.9, 0.3, 0.06, '#2f7a4a');
}

function crosswalk(p, { M, G }) {
  // zebra stripes on each arm of a crossing (three arms where a street ends at a T)
  const half = p.half, off = half + 2.1;
  const arms = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  for (const [ax, az] of arms) {
    if (p.tee && az > 0) continue;
    const cx = p.x + ax * off, cz = p.z + az * off;
    for (let k = 0; k < 8; k++) {
      const t = -half + 0.7 + (k * (half * 2 - 1.4)) / 7;
      const x = ax ? cx : p.x + t, z = ax ? p.z + t : cz;
      M.flat.put('box', x, G(x, z) + 0.05, z, ax ? 3 : 0.55, 0.04, ax ? 0.55 : 3, '#e9e6de');
    }
  }
}

function stairs(p, { M, G }) {
  // the Grand Stair down Bluff Park: steps that follow the slope, with planted cheek walls
  const len = Math.hypot(p.bx - p.ax, p.bz - p.az), n = Math.round(len / 0.9), ang = Math.atan2(p.bz - p.az, p.bx - p.ax);
  for (let k = 0; k < n; k++) {
    const t = (k + 0.5) / n, x = p.ax + (p.bx - p.ax) * t, z = p.az + (p.bz - p.az) * t;
    M.flat.put('box', x, G(x, z) + 0.02, z, len / n + 0.02, 0.24, p.w, k % 2 ? '#d8d1c4' : '#cfc8bb', -ang);
  }
  for (const s of [-1, 1]) {
    for (let k = 0; k < 12; k++) {
      const t = (k + 0.5) / 12, x = p.ax + (p.bx - p.ax) * t - Math.sin(ang) * s * (p.w / 2 + 0.3), z = p.az + (p.bz - p.az) * t + Math.cos(ang) * s * (p.w / 2 + 0.3);
      M.flat.put('box', x, G(x, z) + 0.2, z, len / 12 + 0.1, 0.6, 0.5, '#b3ab9d', -ang);
    }
  }
}

function boat(p, { M, f, y }) {
  // a river water taxi
  M.walls.local(f, 'smooth', 0, y + 0.3, 0, 12, 1.6, 3.8, p.color ?? '#e6b422');
  M.detail.local(f, 'box', 0, y + 0.85, 0, 10.4, 0.2, 3.2, '#f4f1ea');
  M.walls.local(f, 'box', -0.6, y + 1.9, 0, 6.4, 1.9, 2.8, '#f4f1ea');
  M.glass.local(f, 'box', -0.6, y + 2.1, 0, 6.0, 0.8, 2.86, '#ffffff');
  M.roofs.local(f, 'box', -0.6, y + 2.95, 0, 6.8, 0.15, 3.1, '#2f3640');
  M.glow.local(f, 'box', 5.0, y + 1.3, 0, 0.3, 0.3, 0.3, '#ffffff');
}

export default {
  'downtown:tower': tower,
  'downtown:el': el,
  'downtown:station': station,
  'downtown:train': train,
  'downtown:fountain': fountain,
  'downtown:sculpture': sculpture,
  'downtown:truck': truck,
  'downtown:planter': planter,
  'downtown:busstop': busstop,
  'downtown:signal': signal,
  'downtown:crosswalk': crosswalk,
  'downtown:stairs': stairs,
  'downtown:boat': boat,
};
