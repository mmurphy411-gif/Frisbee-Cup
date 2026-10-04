// Headless checks for the simulation:
//   node tools/sim_test.mjs flight        flight table for every disc on level ground
//   node tools/sim_test.mjs course [id]   a search bot plays every hole (all courses by default)
import { setFlatForTests } from '../src/sim/terrain.js';
import { DISCS, POWER_MODES } from '../src/sim/discs.js';
import { createThrow, simulate, makeWind, CALM } from '../src/sim/flight.js';
import { COURSES, loadCourse } from '../src/sim/courses/index.js';
import { mulberry32 } from '../src/sim/rng.js';

const deg = Math.PI / 180;
const flatWorld = {
  near: () => [], outOfBounds: () => null, waterAt: () => null, surface: () => 0, onRoad: () => false,
  floorAt() { this.onPlatform = null; return 0; }, standHeight: () => 0,
};

function fly(o, wind) {
  const s = createThrow({ x: 0, z: 0, yaw: 0, loft: 8 * deg, nose: 0, hyzer: 0, power: 1, style: 'bh', hand: 'R', ...o });
  simulate(s, { world: flatWorld, basket: null, wind, weather: CALM, rng: mulberry32(1) });
  // heading is +x, so +z is to the right of the line
  return { dist: s.p.x, right: s.p.z, time: s.t, apex: s.maxH, mode: s.events.map((e) => e.type).join(',') };
}

function flightTable() {
  setFlatForTests(true);
  const row = (label, r) =>
    console.log(`${label.padEnd(34)} dist ${r.dist.toFixed(1).padStart(6)}  right ${r.right.toFixed(1).padStart(6)}  apex ${r.apex.toFixed(1).padStart(5)}  t ${r.time.toFixed(1)}  ${r.mode}`);
  for (const disc of DISCS) {
    console.log(`\n== ${disc.name} ${disc.flight.join('/')}`);
    row('flat, full power', fly({ disc }));
    row('flat, 75% power', fly({ disc, power: 0.75 }));
    row('flat, 50% power', fly({ disc, power: 0.5 }));
    row('flat, 25% power', fly({ disc, power: 0.25 }));
    row('hyzer 20', fly({ disc, hyzer: 20 * deg }));
    row('anhyzer 20', fly({ disc, hyzer: -20 * deg }));
    row('nose up 8', fly({ disc, nose: 8 * deg }));
    row('nose down 4', fly({ disc, nose: -4 * deg }));
    row('loft 16', fly({ disc, loft: 16 * deg }));
    row('loft 3 (line drive)', fly({ disc, loft: 3 * deg }));
    row('forehand flat', fly({ disc, style: 'fh' }));
    row('overhand, loft 30', fly({ disc, style: 'oh', loft: 30 * deg }));
    row('roller (anhyzer 55, loft 6)', fly({ disc, hyzer: -55 * deg, loft: 6 * deg }));
    row('headwind 6 m/s', fly({ disc }, makeWind(6, Math.PI, 0)));
    row('tailwind 6 m/s', fly({ disc }, makeWind(6, 0, 0)));
    row('crosswind from left 6 m/s', fly({ disc }, makeWind(6, Math.PI / 2, 0)));
    for (const m of POWER_MODES.slice(1)) {
      for (const power of [1, 0.6, 0.3]) row(`${m.name} mode, ${power * 100}% swing`, fly({ disc, modeScale: m.scale, power, loft: 10 * deg }));
    }
  }
}

// A brute-force player: tries a spread of throws from the lie and keeps the best.
function bestThrow(world, hole, lie, basket) {
  const y = world.standHeight(lie.x, lie.z);
  const [, approach, putt] = POWER_MODES.map((m) => m.scale);
  const toBasket = Math.atan2(hole.basket.z - lie.z, hole.basket.x - lie.x);
  const dist = Math.hypot(hole.basket.x - lie.x, hole.basket.z - lie.z);
  const env = { world, basket, wind: null, weather: CALM, rng: null };
  let best = null;
  const options = [];
  if (dist < 14) {
    for (const power of [0.35, 0.45, 0.55, 0.65, 0.75, 0.85, 0.95]) for (const loft of [5, 9, 14]) {
      for (const yaw of [-3, 0, 3]) options.push({ disc: DISCS[2], modeScale: putt, power, loft, yaw, hyzer: 0, style: 'bh' });
    }
  } else {
    const discs = dist > 70 ? [DISCS[0], DISCS[1]] : dist > 40 ? [DISCS[1], DISCS[2]] : [DISCS[2]];
    const scale = dist > 45 ? 1 : approach;
    for (const disc of discs) for (const style of ['bh', 'fh']) for (const hyzer of [-25, -10, 0, 12, 28]) {
      for (const loft of [4, 9, 15]) for (const power of [0.6, 0.8, 1.0]) {
        for (let yaw = -40; yaw <= 40; yaw += 8) options.push({ disc, modeScale: scale, power, loft, yaw, hyzer, style });
      }
    }
  }
  for (const o of options) {
    env.rng = mulberry32(7);
    const s = createThrow({ x: lie.x, z: lie.z, y, nose: 0, hand: 'R', ...o, yaw: toBasket + o.yaw * deg, loft: o.loft * deg, hyzer: o.hyzer * deg });
    simulate(s, env);
    const end = s.ob ? s.lastIn : s.p;
    let score = s.holed ? -100 : Math.hypot(hole.basket.x - end.x, hole.basket.z - end.z);
    if (s.ob) score += 25;
    if (!best || score < best.score) best = { score, s, o };
  }
  return best;
}

function playCourse(id) {
  const t0 = performance.now();
  const { layout, world } = loadCourse(id);
  const L = layout;
  console.log(`\n######## ${L.name}  (built in ${(performance.now() - t0).toFixed(0)} ms)`);
  console.log(`houses ${L.houses.length}, trees ${L.trees.length}, cars ${L.cars.length}, props ${L.props.length}, decks ${L.platforms.length}, fences ${L.fences.length}`);
  let total = 0, par = 0;
  for (const hole of layout.holes) {
    const basket = { x: hole.basket.x, z: hole.basket.z, y: world.standHeight(hole.basket.x, hole.basket.z) };
    const teeY = world.standHeight(hole.tee.x, hole.tee.z);
    const why = world.outOfBounds(hole.tee.x, hole.tee.z, teeY) || world.outOfBounds(basket.x, basket.z, basket.y);
    if (why) console.log(`   !! hole ${hole.number}: tee or basket is out of bounds (${why})`);
    let lie = { ...hole.tee }, strokes = 0;
    const log = [];
    while (strokes < 9) {
      const b = bestThrow(world, hole, lie, basket);
      strokes++;
      if (b.s.ob) strokes++;
      const tag = `${b.o.disc.id[0]}${b.o.style} y${b.o.yaw} h${b.o.hyzer} l${b.o.loft} p${b.o.power}`;
      if (b.s.holed) { log.push(`${tag} -> IN`); break; }
      const end = b.s.ob ? b.s.lastIn : b.s.p;
      lie = world.relief(end.x, end.z);
      log.push(`${tag} -> ${Math.hypot(hole.basket.x - lie.x, hole.basket.z - lie.z).toFixed(1)} m${b.s.ob ? ' OB:' + b.s.ob : ''}`);
    }
    total += strokes; par += hole.par;
    console.log(`\n#${hole.number} ${hole.name}  par ${hole.par}  ${hole.length.toFixed(0)} m direct, ${hole.playLength.toFixed(0)} m route, tee ${teeY.toFixed(1)} m, basket ${basket.y.toFixed(1)} m  => bot ${strokes}`);
    for (const l of log) console.log('   ' + l);
  }
  console.log(`\nbot total ${total} vs par ${par}`);
}

const what = process.argv[2] || 'flight';
if (what === 'flight') flightTable();
else for (const c of COURSES) if (!process.argv[3] || process.argv[3] === c.id) playCourse(c.id);
