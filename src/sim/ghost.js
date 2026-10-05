// Throw recordings for ghosts. A recorded throw keeps where it was thrown from, how it
// was aimed, the disc's path sampled a dozen-odd times a second, and everything that
// happened on the way (hits, splashes, chains). Replaying it rebuilds a flight state the
// game can treat like a live one, so the ghost's disc follows exactly the same path.
const RATE = 1 / 15; // seconds between samples
const MODES = ['fly', 'slide', 'roll', 'rest'];
const r2 = (v) => Math.round(v * 100) / 100;
const r3 = (v) => Math.round(v * 1000) / 1000;

export function recordThrow(from, aim, s) {
  return {
    from: { x: r3(from.x), z: r3(from.z) },
    aim: { yaw: r3(aim.yaw), loft: r3(aim.loft), nose: r3(aim.nose), hyzer: r3(aim.hyzer), disc: aim.disc, style: aim.style, mode: aim.mode },
    spin: r2(s.spin),
    path: [], // t, x, y, z, nx, ny, nz, mode — flattened
    events: [],
    next: 0,
  };
}

function pushSample(rec, s) {
  rec.path.push(r3(s.t), r2(s.p.x), r2(s.p.y), r2(s.p.z), r3(s.n.x), r3(s.n.y), r3(s.n.z), MODES.indexOf(s.mode));
}

// Call after each physics update while the disc is moving.
export function sampleThrow(rec, s) {
  if (s.t >= rec.next) {
    pushSample(rec, s);
    rec.next = s.t + RATE;
  }
}

// Call once the disc has come to rest.
export function finishThrow(rec, s) {
  pushSample(rec, s);
  delete rec.next;
  rec.events = s.events.map((e) => {
    const out = { type: e.type, t: r3(e.t ?? 0), x: r2(e.x), y: r2(e.y), z: r2(e.z), speed: r2(e.speed || 0) };
    for (const k of ['road', 'sand', 'deck', 'water']) if (e[k]) out[k] = e[k];
    return out;
  });
  rec.end = { x: r3(s.p.x), y: r3(s.p.y), z: r3(s.p.z), lastIn: { x: r3(s.lastIn.x), z: r3(s.lastIn.z) }, holed: s.holed, ob: s.ob };
}

// A flight state that plays a recording back instead of simulating.
export function replayState(rec) {
  const P = rec.path;
  const s = {
    replay: rec, cursor: 0, mode: MODES[P[7]], t: 0, spin: rec.spin,
    p: { x: P[1], y: P[2], z: P[3] }, v: { x: 0, y: 0, z: 0 }, n: { x: P[4], y: P[5], z: P[6] },
    start: { x: rec.from.x, z: rec.from.z }, lastIn: { x: rec.from.x, z: rec.from.z },
    events: [], holed: false, ob: null, maxH: 0,
  };
  return s;
}

export function advanceReplay(s, dt) {
  const rec = s.replay, P = rec.path, n = P.length / 8;
  s.t += dt;
  while (s.cursor < n - 2 && P[(s.cursor + 1) * 8] <= s.t) s.cursor++;
  const i = s.cursor * 8, j = Math.min(n - 1, s.cursor + 1) * 8;
  const span = P[j] - P[i] || 1;
  const k = Math.max(0, Math.min(1, (s.t - P[i]) / span));
  const lerp = (o) => P[i + o] + (P[j + o] - P[i + o]) * k;
  const x = lerp(1), y = lerp(2), z = lerp(3);
  if (dt > 0) { s.v.x = (x - s.p.x) / dt; s.v.y = (y - s.p.y) / dt; s.v.z = (z - s.p.z) / dt; }
  s.p.x = x; s.p.y = y; s.p.z = z;
  s.n.x = lerp(4); s.n.y = lerp(5); s.n.z = lerp(6);
  const len = Math.hypot(s.n.x, s.n.y, s.n.z) || 1;
  s.n.x /= len; s.n.y /= len; s.n.z /= len;
  s.mode = MODES[P[i + 7]];
  // events happen as their moment comes round
  while (s.events.length < rec.events.length && rec.events[s.events.length].t <= s.t) s.events.push(rec.events[s.events.length]);
  if (s.t >= P[(n - 1) * 8]) {
    const e = rec.end;
    s.p.x = e.x; s.p.y = e.y; s.p.z = e.z;
    s.lastIn = { ...e.lastIn };
    s.holed = e.holed; s.ob = e.ob;
    s.events = rec.events.slice();
    s.mode = 'rest';
    s.spin = 0;
  } else if (s.mode !== 'fly') {
    s.spin = rec.spin * 0.5;
  }
}
