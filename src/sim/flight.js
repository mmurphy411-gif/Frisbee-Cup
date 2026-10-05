// Disc flight. The disc is a spinning rigid wing: lift and drag depend on the angle of
// attack, and the aerodynamic pitching moment precesses the spin axis, which is what
// produces high-speed turn and low-speed fade. Hyzer, anhyzer, nose angle, rollers and
// overhand shots all fall out of the same model rather than being scripted.
import { groundHeight, groundNormal } from './terrain.js';
import { STYLES } from './discs.js';
import { roofHeight } from './world.js';

export const G = 9.81;
export const DISC_RADIUS = 0.105;
const RHO = 1.2, MASS = 0.175, RADIUS = DISC_RADIUS, DIAM = 0.21;
const AREA = Math.PI * RADIUS * RADIUS, INERTIA = 0.0012;

const SURFACES = {
  grass: { bounce: 0.2, keep: 0.6, mu: 0.62, roll: 1.7 },
  road: { bounce: 0.3, keep: 0.78, mu: 0.42, roll: 0.8 },
  sand: { bounce: 0.08, keep: 0.3, mu: 1.1, roll: 4 },
  deck: { bounce: 0.15, keep: 0.55, mu: 0.8, roll: 1.5 },
};
const BY_SURFACE = [SURFACES.grass, SURFACES.road, SURFACES.sand];
// Basket dimensions above its base, metres.
export const BASKET = { catchR: 0.3, trayY: 0.62, topY: 1.4, poleR: 0.04 };
export const CALM = { keep: 1, bounce: 1, mu: 1 };

const _gn = { x: 0, y: 1, z: 0 };
const _w = { x: 0, z: 0 };
const _surf = { bounce: 0, keep: 0, mu: 0, roll: 0, road: false, sand: false };

function emit(s, type, speed = 0, extra) {
  s.events.push({ type, speed, t: s.t, x: s.p.x, y: s.p.y, z: s.p.z, ...extra });
}

// Distance falls off much faster than release speed, so swing power maps onto speed
// along a curve that makes distance roughly proportional to power.
export function powerToSpeed(power) {
  return Math.min(power / 0.15, 1) * (0.34 + 0.66 * power);
}

/**
 * Build the initial state for a throw.
 * yaw: heading (atan2(z, x)); loft: launch angle; nose: disc pitch relative to the
 * launch line (+ is nose up); hyzer: + tilts the outside edge down (the natural fade
 * side for the grip and hand), - is anhyzer. Angles in radians, power 0..~1.1.
 */
export function createThrow(o) {
  const st = STYLES[o.style];
  const fadeSide = (o.style === 'bh' ? -1 : 1) * (o.hand === 'L' ? -1 : 1); // +1 fades right
  const speed = o.disc.vmax * st.speed * (o.modeScale ?? 1) * powerToSpeed(o.power);
  const yaw = o.yaw + (o.yawErr || 0);
  const cl = Math.cos(o.loft), sl = Math.sin(o.loft);
  const fx = Math.cos(yaw) * cl, fy = sl, fz = Math.sin(yaw) * cl;
  const rx = -Math.sin(yaw), rz = Math.cos(yaw); // right of travel
  // up-ish axis perpendicular to the launch line: r x f
  const ux = -rz * fy, uy = rz * fx - rx * fz, uz = rx * fy;
  const cn = Math.cos(o.nose), sn = Math.sin(o.nose);
  const dx = fx * cn + ux * sn, dy = fy * cn + uy * sn, dz = fz * cn + uz * sn;
  // flat disc normal: r x d
  const n0x = -rz * dy, n0y = rz * dx - rx * dz, n0z = rx * dy;
  // Overhand shots leave the hand near vertical with the top facing away from the fade side.
  const bank = (o.style === 'oh' ? -fadeSide * (Math.PI / 2 - o.hyzer) : fadeSide * o.hyzer) + (o.rollErr || 0);
  const cb = Math.cos(bank), sb = Math.sin(bank);
  const x = o.x + Math.cos(yaw) * 0.5, z = o.z + Math.sin(yaw) * 0.5;
  const y = (o.y ?? groundHeight(o.x, o.z)) + st.height;
  return {
    disc: o.disc, mode: 'fly', t: 0, t0: o.t0 || 0,
    p: { x, y, z }, v: { x: fx * speed, y: fy * speed, z: fz * speed },
    n: { x: n0x * cb + rx * sb, y: n0y * cb, z: n0z * cb + rz * sb },
    spin: fadeSide * Math.max(25, (speed / RADIUS) * st.adv),
    px: x, py: y, pz: z,
    start: { x: o.x, z: o.z }, lastIn: { x: o.x, z: o.z },
    events: [], skips: 0, holed: false, ob: null, maxH: 0, roll: null, speed0: speed,
  };
}

export function stepDisc(s, dt, env) {
  if (s.mode === 'rest') return;
  s.t += dt;
  s.px = s.p.x; s.py = s.p.y; s.pz = s.p.z;
  if (s.mode === 'fly') fly(s, dt, env);
  else if (s.mode === 'slide') slide(s, dt, env);
  else roll(s, dt, env);
  if (s.mode === 'rest') return;
  const ob = env.world.outOfBounds(s.p.x, s.p.z);
  if (!ob) { s.lastIn.x = s.p.x; s.lastIn.z = s.p.z; }
  else if (ob === 'bounds' || s.t > 30) rest(s, env);
  if (s.t > 30 && s.mode !== 'rest') rest(s, env);
}

// Run a throw to completion. With opts.trace, returns sampled [x, y, z, ...] points.
export function simulate(s, env, opts = {}) {
  const dt = opts.dt || 1 / 240, every = opts.every || 6, maxT = opts.maxT || 25;
  const pts = opts.trace ? [s.p.x, s.p.y, s.p.z] : null;
  let i = 0;
  while (s.mode !== 'rest' && s.t < maxT) {
    stepDisc(s, dt, env);
    if (pts && ++i % every === 0) pts.push(s.p.x, s.p.y, s.p.z);
  }
  if (pts) pts.push(s.p.x, s.p.y, s.p.z);
  return pts;
}

function rest(s, env) {
  s.mode = 'rest';
  s.v.x = s.v.y = s.v.z = 0;
  if (!s.holed) s.ob = env.world.outOfBounds(s.p.x, s.p.z, s.p.y);
}

function surfaceAt(env, x, z, deck) {
  const base = deck ? SURFACES.deck : BY_SURFACE[env.world.surface(x, z)] || SURFACES.grass;
  const w = env.weather || CALM;
  _surf.bounce = base.bounce * w.bounce;
  _surf.keep = base.keep * w.keep;
  _surf.mu = base.mu * w.mu;
  _surf.roll = base.roll * w.mu;
  _surf.road = base === SURFACES.road;
  _surf.sand = base === SURFACES.sand;
  return _surf;
}

// Ground normal, or straight up when on a deck.
function normalAt(x, z, deck) {
  if (deck) { _gn.x = 0; _gn.y = 1; _gn.z = 0; return _gn; }
  return groundNormal(x, z, _gn);
}

function splash(s, env, w, y) {
  s.p.y = y + 0.01;
  emit(s, 'splash', Math.abs(s.v.y), { water: w.name });
  rest(s, env);
}

function wobble(s, rng, amount) {
  const n = s.n;
  n.x += (rng() - 0.5) * amount; n.y += (rng() - 0.5) * amount; n.z += (rng() - 0.5) * amount;
  const k = 1 / Math.hypot(n.x, n.y, n.z);
  n.x *= k; n.y *= k; n.z *= k;
}

// ------------------------------------------------------------------ flight
function fly(s, dt, env) {
  const { p, v, n, disc } = s;
  let wx = 0, wz = 0;
  if (env.wind) {
    env.wind(s.t0 + s.t, p.y - groundHeight(p.x, p.z), _w);
    wx = _w.x; wz = _w.z;
  }
  const rx = v.x - wx, ry = v.y, rz = v.z - wz;
  const sp = Math.hypot(rx, ry, rz);
  let ax = 0, ay = -G, az = 0;
  if (sp > 0.3) {
    const hx = rx / sp, hy = ry / sp, hz = rz / sp;
    const sinA = Math.max(-1, Math.min(1, -(hx * n.x + hy * n.y + hz * n.z)));
    const cosA = Math.sqrt(1 - sinA * sinA);
    const q = 0.5 * RHO * sp * sp * AREA;
    const CL = disc.CL0 * cosA * cosA + disc.CLa * sinA * cosA;
    const sd = Math.sin(Math.asin(sinA) + disc.CL0 / disc.CLa);
    const CD = disc.CD0 + disc.CDa * sd * sd;
    ax -= (q * CD * hx) / MASS; ay -= (q * CD * hy) / MASS; az -= (q * CD * hz) / MASS;
    if (cosA > 1e-3) {
      // lift acts perpendicular to the airflow, towards the disc's top
      const k = (q * CL) / (MASS * cosA);
      ax += k * (n.x + sinA * hx); ay += k * (n.y + sinA * hy); az += k * (n.z + sinA * hz);
      // pitching moment precesses the spin axis sideways: turn, then fade
      const fx = (hx + sinA * n.x) / cosA, fy = (hy + sinA * n.y) / cosA, fz = (hz + sinA * n.z) / cosA;
      const CM = (disc.CM0 + disc.CMa * sinA) * cosA;
      const spin = s.spin >= 0 ? Math.max(s.spin, 25) : Math.min(s.spin, -25);
      const rate = ((q * DIAM * CM) / (INERTIA * spin)) * dt;
      const cx = fy * n.z - fz * n.y, cy = fz * n.x - fx * n.z, cz = fx * n.y - fy * n.x;
      n.x += rate * cx; n.y += rate * cy; n.z += rate * cz;
      const inv = 1 / Math.hypot(n.x, n.y, n.z);
      n.x *= inv; n.y *= inv; n.z *= inv;
    }
  }
  v.x += ax * dt; v.y += ay * dt; v.z += az * dt;
  p.x += v.x * dt; p.y += v.y * dt; p.z += v.z * dt;
  s.spin *= 1 - 0.06 * dt;

  collide(s, env, dt);
  if (s.mode !== 'fly') return;
  basket(s, env);
  if (s.mode !== 'fly') return;
  ground(s, env);
}

function ground(s, env) {
  const { p, v, n } = s, world = env.world;
  const gh = world.floorAt(p.x, p.z, Math.max(s.py, p.y));
  const deck = world.onPlatform;
  const wet = deck ? null : world.waterAt(p.x, p.z);
  if (wet) {
    // over water the first thing the disc meets is the surface
    const level = world.waterLevel(wet, p.x, p.z);
    if (p.y - level > s.maxH) s.maxH = p.y - level;
    if (p.y < level + 0.03) splash(s, env, wet, level);
    return;
  }
  const above = p.y - gh;
  if (above > s.maxH) s.maxH = above;
  normalAt(p.x, p.z, deck);
  const dotN = n.x * _gn.x + n.y * _gn.y + n.z * _gn.z;
  const clear = 0.025 + RADIUS * Math.sqrt(Math.max(0, 1 - dotN * dotN));
  if (above >= clear) return;
  p.y = gh + clear;
  const vn = v.x * _gn.x + v.y * _gn.y + v.z * _gn.z;
  if (vn >= 0) return;
  const surf = surfaceAt(env, p.x, p.z, deck);
  const tx = v.x - vn * _gn.x, ty = v.y - vn * _gn.y, tz = v.z - vn * _gn.z;
  const vt = Math.hypot(tx, ty, tz), impact = -vn;
  const onEdge = Math.abs(dotN) < 0.5;
  if (onEdge && vt > 5 && Math.abs(s.spin) > 20 && !surf.sand) {
    startRoll(s, tx, tz, vt, dotN);
    emit(s, 'roll', vt);
    return;
  }
  const keep = surf.keep * (onEdge ? 0.45 : 1);
  if (impact > 2.2 && s.skips < 3 && vt * keep > 1.5) {
    v.x = tx * keep + _gn.x * impact * surf.bounce;
    v.y = ty * keep + _gn.y * impact * surf.bounce;
    v.z = tz * keep + _gn.z * impact * surf.bounce;
    const sgn = dotN >= 0 ? 1 : -1;
    n.x = n.x * 0.5 + _gn.x * sgn * 0.5; n.y = n.y * 0.5 + _gn.y * sgn * 0.5; n.z = n.z * 0.5 + _gn.z * sgn * 0.5;
    const inv = 1 / Math.hypot(n.x, n.y, n.z);
    n.x *= inv; n.y *= inv; n.z *= inv;
    s.spin *= 0.7;
    s.skips++;
    emit(s, 'skip', impact, { road: surf.road, sand: surf.sand, deck: !!deck });
  } else {
    s.mode = 'slide';
    v.x = tx * keep; v.y = 0; v.z = tz * keep;
    emit(s, 'land', impact, { road: surf.road, sand: surf.sand, deck: !!deck });
  }
}

// ------------------------------------------------------------------- slide
function slide(s, dt, env) {
  const { p, v, n } = s, world = env.world;
  let floor = world.floorAt(p.x, p.z, p.y);
  let deck = world.onPlatform;
  if (!deck) {
    const wet = world.waterAt(p.x, p.z);
    if (wet) { splash(s, env, wet, world.waterLevel(wet, p.x, p.z)); return; }
  }
  if (p.y - floor > 0.2) { s.mode = 'fly'; v.y = 0; return; } // slid off the edge of a deck
  normalAt(p.x, p.z, deck);
  const surf = surfaceAt(env, p.x, p.z, deck);
  const gtx = G * _gn.y * _gn.x, gtz = G * _gn.y * _gn.z; // gravity along the slope
  const friction = surf.mu * G * _gn.y;
  const sp = Math.hypot(v.x, v.z);
  if (sp < 0.3 && Math.hypot(gtx, gtz) <= friction) {
    p.y = floor + 0.02;
    rest(s, env);
    return;
  }
  if (sp > 1e-4) {
    const dec = Math.min(friction * dt, sp);
    v.x -= (v.x / sp) * dec; v.z -= (v.z / sp) * dec;
  }
  v.x += gtx * dt; v.z += gtz * dt;
  p.x += v.x * dt; p.z += v.z * dt;
  floor = world.floorAt(p.x, p.z, p.y);
  deck = world.onPlatform;
  if (p.y - floor > 0.2) { s.mode = 'fly'; v.y = 0; return; }
  p.y = floor + 0.02;
  const sgn = n.x * _gn.x + n.y * _gn.y + n.z * _gn.z >= 0 ? 1 : -1;
  const b = Math.min(1, 10 * dt);
  n.x += (_gn.x * sgn - n.x) * b; n.y += (_gn.y * sgn - n.y) * b; n.z += (_gn.z * sgn - n.z) * b;
  const inv = 1 / Math.hypot(n.x, n.y, n.z);
  n.x *= inv; n.y *= inv; n.z *= inv;
  s.spin *= 1 - 3 * dt;
  collide(s, env, dt);
  if (s.mode === 'rest') return;
  basket(s, env);
}

// -------------------------------------------------------------------- roll
function startRoll(s, tx, tz, vt, dotN) {
  const n = s.n;
  const hl = Math.hypot(tx, tz) || 1;
  const hx = tx / hl, hz = tz / hl;
  // disc face direction, flattened and made perpendicular to the heading
  const along = n.x * hx + n.z * hz;
  let ex = n.x - along * hx, ez = n.z - along * hz;
  const el = Math.hypot(ex, ez);
  if (el < 1e-3) { ex = -hz; ez = hx; } else { ex /= el; ez /= el; }
  s.mode = 'roll';
  s.roll = { hx, hz, ex, ez, speed: vt * 0.8, lean: Math.asin(Math.max(-1, Math.min(1, dotN))) };
}

function roll(s, dt, env) {
  const { p, v, n } = s, r = s.roll, world = env.world;
  world.floorAt(p.x, p.z, p.y);
  const deck = world.onPlatform;
  if (!deck) {
    const wet = world.waterAt(p.x, p.z);
    if (wet) { splash(s, env, wet, world.waterLevel(wet, p.x, p.z)); return; }
  }
  normalAt(p.x, p.z, deck);
  const surf = surfaceAt(env, p.x, p.z, deck);
  r.speed += (G * _gn.y * (_gn.x * r.hx + _gn.z * r.hz) - surf.roll) * dt;
  const dir = r.lean >= 0 ? 1 : -1;
  r.lean += dir * (0.1 + 0.4 / Math.max(r.speed, 1.5)) * dt;
  // a leaning disc curls towards the side it is falling to
  const turn = Math.min(1.6, (G * Math.tan(Math.min(1.2, Math.abs(r.lean)))) / Math.max(r.speed, 3)) * 0.4 * dt;
  let hx = r.hx - dir * r.ex * turn, hz = r.hz - dir * r.ez * turn;
  const hl = Math.hypot(hx, hz);
  hx /= hl; hz /= hl;
  let ex = r.ex + dir * r.hx * turn, ez = r.ez + dir * r.hz * turn;
  const along = ex * hx + ez * hz;
  ex -= along * hx; ez -= along * hz;
  const el = Math.hypot(ex, ez) || 1;
  r.hx = hx; r.hz = hz; r.ex = ex / el; r.ez = ez / el;
  p.x += hx * r.speed * dt; p.z += hz * r.speed * dt;
  const cl = Math.cos(r.lean), sl = Math.sin(r.lean);
  const rolledY = world.floorAt(p.x, p.z, p.y) + RADIUS * cl + 0.02;
  if (p.y - rolledY > 0.25) {
    // rolled off a deck: let it drop
    s.mode = 'fly';
    v.x = hx * r.speed; v.y = 0; v.z = hz * r.speed;
    return;
  }
  p.y = rolledY;
  n.x = r.ex * cl; n.y = sl; n.z = r.ez * cl;
  v.x = hx * r.speed; v.y = 0; v.z = hz * r.speed;
  s.spin = Math.sign(s.spin || 1) * (r.speed / RADIUS);
  if (r.speed < 2.2 || Math.abs(r.lean) > 1.1) {
    s.mode = 'slide';
    v.x *= 0.5; v.z *= 0.5;
    return;
  }
  const before = s.events.length;
  collide(s, env, dt);
  if (s.mode === 'roll' && s.events.length > before) s.mode = 'slide';
}

// -------------------------------------------------------------- collisions
function bounce(s, nx, ny, nz, c, env) {
  const v = s.v;
  const vn = v.x * nx + v.y * ny + v.z * nz;
  if (vn >= 0) return;
  const j = (1 + c.e) * vn;
  v.x = (v.x - j * nx) * c.keep; v.y = (v.y - j * ny) * c.keep; v.z = (v.z - j * nz) * c.keep;
  s.spin *= 0.7;
  if (s.mode === 'fly') wobble(s, env.rng, 0.25);
  // a disc rattling along a rail or fence would otherwise report every touch
  if (s.lastHit !== c.name || s.t - s.lastHitT > 0.15) emit(s, c.name, -vn);
  s.lastHit = c.name;
  s.lastHitT = s.t;
}

function collide(s, env, dt) {
  const { p, v } = s;
  const list = env.world.near(p.x, p.z);
  for (let i = 0; i < list.length; i++) {
    const c = list[i];
    if (c.t === 'cyl') {
      if (p.y < c.y0 - RADIUS || p.y > c.y1 + RADIUS) continue;
      const dx = p.x - c.x, dz = p.z - c.z, rr = c.r + RADIUS;
      const d2 = dx * dx + dz * dz;
      if (d2 >= rr * rr) continue;
      const d = Math.sqrt(d2) || 1e-6, nx = dx / d, nz = dz / d;
      bounce(s, nx, 0, nz, c, env);
      p.x = c.x + nx * rr; p.z = c.z + nz * rr;
    } else if (c.t === 'sphere') {
      const dx = p.x - c.x, dy = p.y - c.y, dz = p.z - c.z, rr = c.r + RADIUS;
      const d2 = dx * dx + dy * dy + dz * dz;
      if (d2 >= rr * rr) continue;
      const d = Math.sqrt(d2) || 1e-6, nx = dx / d, ny = dy / d, nz = dz / d;
      bounce(s, nx, ny, nz, c, env);
      p.x = c.x + nx * rr; p.y = c.y + ny * rr; p.z = c.z + nz * rr;
      if (s.mode !== 'fly') { s.mode = 'fly'; v.y = Math.max(v.y, 0.5); }
      if (ny > 0.6 && Math.hypot(v.x, v.z) < 1) {
        // don't let a disc balance on top of a rock
        const hl = Math.hypot(nx, nz);
        v.x += (hl > 1e-3 ? nx / hl : 1) * 1.2; v.z += (hl > 1e-3 ? nz / hl : 0) * 1.2;
      }
    } else if (c.t === 'canopy' || c.t === 'cone') {
      if (env.canopy === false && !c.soft) continue;
      if (s.mode !== 'fly' && !c.soft) continue;
      const dx = p.x - c.x, dz = p.z - c.z;
      let inside;
      if (c.t === 'canopy') {
        const dy = p.y - c.y;
        inside = (dx * dx + dz * dz) / (c.r * c.r) + (dy * dy) / (c.ry * c.ry) < 1;
      } else {
        const f = (c.y1 - p.y) / (c.y1 - c.y0);
        inside = f > 0 && f < 1 && dx * dx + dz * dz < c.r * c.r * f * f;
      }
      if (!inside) continue;
      const sp = Math.hypot(v.x, v.y, v.z);
      const drag = Math.exp(-1.1 * c.dens * dt);
      v.x *= drag; v.y *= drag; v.z *= drag;
      if (c.soft) {
        // a leaf pile soaks up the disc and sends leaves flying
        if (!s.inLeaves) { s.inLeaves = true; emit(s, 'leaves', sp); }
        if (s.mode === 'roll') s.mode = 'slide';
        continue;
      }
      if (env.rng() < 0.1 * c.dens * sp * dt) {
        // clipped a branch: lose most of the speed and kick off line
        const keep = 0.25 + 0.3 * env.rng(), a = (env.rng() - 0.5) * 1.6;
        const ca = Math.cos(a), sa = Math.sin(a);
        const vx = v.x * keep, vz = v.z * keep;
        v.x = vx * ca - vz * sa; v.z = vx * sa + vz * ca; v.y = v.y * keep - 1;
        s.spin *= 0.55;
        wobble(s, env.rng, 0.5);
        emit(s, 'tree', sp);
      }
    } else {
      const dx = p.x - c.cx, dz = p.z - c.cz;
      const u = dx * c.cos + dz * c.sin, w = -dx * c.sin + dz * c.cos;
      const pu = c.hu + RADIUS - Math.abs(u), pw = c.hv + RADIUS - Math.abs(w);
      if (pu <= 0 || pw <= 0) continue;
      let top;
      if (c.t === 'house') {
        // open shelters only have a roof; the space under it is clear
        if (c.open && p.y < c.base - 0.1) continue;
        top = roofHeight(c, u, w);
        if (p.y >= top + RADIUS * 0.5) continue;
        const dx0 = s.px - c.cx, dz0 = s.pz - c.cz;
        const u0 = dx0 * c.cos + dz0 * c.sin, w0 = -dx0 * c.sin + dz0 * c.cos;
        const wasOver = Math.abs(u0) < c.hu + RADIUS && Math.abs(w0) < c.hv + RADIUS && s.py >= roofHeight(c, u0, w0);
        if (wasOver) {
          p.y = top + 0.06;
          s.n.x = 0; s.n.y = 1; s.n.z = 0;
          emit(s, 'roof');
          rest(s, env);
          // the eave strip (footprint plus RADIUS) is roof too, even past houseAt's edge
          if (!s.holed && !s.ob) s.ob = 'roof';
          return;
        }
      } else {
        top = c.y1;
        if (p.y >= top + RADIUS || p.y <= c.y0 - RADIUS) continue;
        if (c.platform) {
          // landing on or sliding across a deck is handled like ground
          if (p.y >= top - 0.06 || s.py >= top - 0.02) continue;
        } else if (s.py >= top && s.mode === 'fly') {
          if (c.pool) {
            p.y = top + 0.03;
            s.n.x = 0; s.n.y = 1; s.n.z = 0;
            emit(s, 'splash', Math.abs(v.y), { water: 'pool' });
            rest(s, env);
            return;
          }
          p.y = top + RADIUS;
          if (v.y < 0) {
            emit(s, c.name, -v.y);
            v.y = -v.y * c.e; v.x *= 0.8; v.z *= 0.8;
          }
          if (Math.hypot(v.x, v.z) < 1.2) {
            // don't let a disc settle on a car roof or hedge top; ease it off the near edge
            const lu = pu < pw ? Math.sign(u || 1) : 0, lw = pu < pw ? 0 : Math.sign(w || 1);
            v.x += (lu * c.cos - lw * c.sin) * 1.5; v.z += (lu * c.sin + lw * c.cos) * 1.5;
          }
          continue;
        }
      }
      // side hit: push out through the nearest wall
      const lu = pu < pw ? Math.sign(u || 1) : 0, lw = pu < pw ? 0 : Math.sign(w || 1);
      const nx = lu * c.cos - lw * c.sin, nz = lu * c.sin + lw * c.cos;
      bounce(s, nx, 0, nz, c, env);
      const pen = Math.min(pu, pw);
      p.x += nx * pen; p.z += nz * pen;
    }
  }
}

function basket(s, env) {
  const b = env.basket;
  if (!b) return;
  const { p, v } = s;
  const dx = p.x - b.x, dz = p.z - b.z;
  const d = Math.hypot(dx, dz);
  if (d > 0.6) return;
  const hy = p.y - b.y;
  if (hy < -0.1 || hy > 1.55) return;
  const nx = d > 1e-6 ? dx / d : 1, nz = d > 1e-6 ? dz / d : 0;
  const reach = BASKET.catchR + RADIUS * 0.6;
  if (hy < BASKET.trayY - 0.1) {
    if (d < BASKET.poleR + RADIUS) {
      bounce(s, nx, 0, nz, { e: 0.3, keep: 0.5, name: 'pole' }, env);
      p.x = b.x + nx * (BASKET.poleR + RADIUS); p.z = b.z + nz * (BASKET.poleR + RADIUS);
    }
    return;
  }
  if (d >= reach) return;
  const sp = Math.hypot(v.x, v.y, v.z);
  const rim = hy < BASKET.trayY + 0.06 && d > BASKET.catchR * 0.8 && v.y > -1;
  if (hy > BASKET.topY || rim) {
    bounce(s, nx, 0, nz, { e: 0.35, keep: 0.5, name: 'cage' }, env);
    p.x = b.x + nx * reach; p.z = b.z + nz * reach;
  } else if (sp < 18 && s.mode === 'fly') {
    s.holed = true;
    p.x = b.x + nx * 0.12; p.z = b.z + nz * 0.12; p.y = b.y + BASKET.trayY + 0.04;
    s.n.x = 0; s.n.y = 1; s.n.z = 0;
    emit(s, 'chains', sp);
    rest(s, env);
  } else if (s.mode === 'fly') {
    // too hot: the chains knock it down but it spits out
    v.x *= 0.25; v.y = -1; v.z *= 0.25;
    s.spin *= 0.4;
    emit(s, 'spit', sp);
  }
}

// Wind as a function of time and height above ground. `dir` is where it blows towards.
export function makeWind(speed, dir, gust) {
  if (speed <= 0) return null;
  return (t, h, out) => {
    const g = 1 + gust * (0.55 * Math.sin(0.9 * t + 1.3) + 0.45 * Math.sin(2.3 * t + 0.4));
    const hf = 0.5 + 0.5 * Math.min(1, Math.max(0, h) / 8);
    const a = dir + 0.2 * gust * Math.sin(0.6 * t + 2);
    out.x = Math.cos(a) * speed * g * hf;
    out.z = Math.sin(a) * speed * g * hf;
  };
}
